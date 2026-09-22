import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AppRole = 'admin' | 'supervisor' | 'teacher'

interface CreateUserPayload {
  email?: string
  password?: string
  fullName?: string
  role?: AppRole
  schoolId?: string | null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authorization = request.headers.get('Authorization')
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) throw new Error('การตั้งค่าฝั่งเซิร์ฟเวอร์ไม่ครบถ้วน')

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) throw new Error('กรุณาเข้าสู่ระบบใหม่')

    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role,status')
      .eq('id', userData.user.id)
      .single()
    if (profileError || callerProfile?.role !== 'admin' || callerProfile.status !== 'approved') throw new Error('เฉพาะผู้ดูแลระบบที่ได้รับอนุมัติ')

    const payload = await request.json() as CreateUserPayload
    const email = payload.email?.trim().toLowerCase() ?? ''
    const password = payload.password ?? ''
    const fullName = payload.fullName?.trim() ?? ''
    const role = payload.role ?? 'teacher'
    const schoolId = payload.schoolId || null

    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('รูปแบบอีเมลไม่ถูกต้อง')
    if (password.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
    if (!fullName) throw new Error('กรุณาระบุชื่อผู้ใช้งาน')
    if (!['admin', 'supervisor', 'teacher'].includes(role)) throw new Error('บทบาทไม่ถูกต้อง')
    if (role === 'teacher' && !schoolId) throw new Error('บัญชีครูต้องระบุโรงเรียน')

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, school_id: schoolId },
    })
    if (createError || !created.user) throw new Error(createError?.message ?? 'สร้างบัญชีไม่สำเร็จ')

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ email, full_name: fullName, role, status: 'approved', school_id: schoolId })
      .eq('id', created.user.id)

    if (updateError) {
      await adminClient.auth.admin.deleteUser(created.user.id)
      throw new Error(updateError.message)
    }

    return new Response(JSON.stringify({ id: created.user.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

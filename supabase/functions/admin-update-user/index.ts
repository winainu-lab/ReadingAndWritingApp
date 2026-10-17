import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateUserPayload {
  userId?: string
  fullName?: string
  email?: string
  password?: string
}

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

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

    const payload = await request.json() as UpdateUserPayload
    const userId = payload.userId ?? ''
    const fullName = payload.fullName?.trim()
    const email = payload.email?.trim().toLowerCase()
    const password = payload.password ?? ''

    if (!userId) throw new Error('ไม่พบผู้ใช้ที่ต้องการแก้ไข')
    if (fullName !== undefined && !fullName) throw new Error('กรุณาระบุชื่อผู้ใช้งาน')
    if (email !== undefined && !/^\S+@\S+\.\S+$/.test(email)) throw new Error('รูปแบบอีเมลไม่ถูกต้อง')
    if (password && password.length < 8) throw new Error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')

    const authChanges: { email?: string; password?: string; email_confirm?: boolean } = {}
    if (email) { authChanges.email = email; authChanges.email_confirm = true }
    if (password) authChanges.password = password
    if (Object.keys(authChanges).length) {
      const { error } = await adminClient.auth.admin.updateUserById(userId, authChanges)
      if (error) throw new Error(error.message)
    }

    const profileChanges: { full_name?: string; email?: string } = {}
    if (fullName) profileChanges.full_name = fullName
    if (email) profileChanges.email = email
    if (Object.keys(profileChanges).length) {
      const { error } = await adminClient.from('profiles').update(profileChanges).eq('id', userId)
      if (error) throw new Error(error.message)
    }

    return respond({ id: userId })
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด' }, 400)
  }
})

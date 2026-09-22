import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Plus, Search, UserCheck, Users } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Button, EmptyState, LoadingState, Modal, Notice, PageHeader } from '../components/ui'
import { SchoolOptions } from '../components/SchoolOptions'
import { supabase } from '../lib/supabase'
import type { SchoolChoice } from '../lib/schoolSorting'
import type { AppRole, Profile, ProfileStatus } from '../types/app'

export function UsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const profiles = useQuery({ queryKey: ['profiles-admin'], queryFn: async () => { const { data, error } = await supabase.from('profiles').select('id,email,full_name,role,requested_role,status,school_id,school:schools(name)').order('created_at', { ascending: false }); if (error) throw error; return data as unknown as Profile[] } })
  const schools = useQuery({ queryKey: ['active-schools'], queryFn: async () => { const { data, error } = await supabase.from('schools').select('id,name,district,network_center_id,network_center:network_centers(name,sort_order)').eq('is_active', true); if (error) throw error; return data as unknown as SchoolChoice[] } })
  const updateUser = useMutation({
    mutationFn: async ({ id, role, status, schoolId }: { id: string; role: AppRole; status: ProfileStatus; schoolId: string | null }) => { const { error } = await supabase.rpc('admin_update_profile', { p_profile_id: id, p_role: role, p_status: status, p_school_id: schoolId as string }); if (error) throw error },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['profiles-admin'] }); setMessage('บันทึกสิทธิ์และสถานะผู้ใช้แล้ว') },
  })
  const createUser = useMutation({
    mutationFn: async (payload: { email: string; password: string; fullName: string; role: AppRole; schoolId: string | null }) => {
      const { data, error } = await supabase.functions.invoke('admin-create-user', { body: payload })
      if (error) throw new Error((data as { error?: string } | null)?.error ?? error.message)
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['profiles-admin'] }); setShowCreate(false); setMessage('สร้างและอนุมัติบัญชีผู้ใช้เรียบร้อย') },
  })
  const rows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('th')
    return (profiles.data ?? []).filter((entry) => !keyword || entry.full_name.toLocaleLowerCase('th').includes(keyword) || entry.email?.toLocaleLowerCase('th').includes(keyword) || entry.school?.name?.toLocaleLowerCase('th').includes(keyword))
  }, [profiles.data, search])

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const role = String(form.get('role')) as AppRole
    createUser.mutate({ email: String(form.get('email')), password: String(form.get('password')), fullName: String(form.get('fullName')), role, schoolId: String(form.get('school') || '') || null })
  }

  return <>
    <PageHeader eyebrow="สำหรับผู้ดูแลระบบ" title="ผู้ใช้งานและการอนุมัติ" description="สร้างบัญชีให้ครูโดยตรง ตรวจผู้สมัคร กำหนดโรงเรียน บทบาท และสถานะได้จากหน้านี้" action={<Button onClick={() => setShowCreate(true)}><Plus size={18} /> เพิ่มผู้ใช้งาน</Button>} />
    {message && <Notice tone="success">{message}</Notice>}
    <section className="toolbar"><label className="search-box"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อ อีเมล หรือโรงเรียน" /></label><span className="result-count">รออนุมัติ {(profiles.data ?? []).filter((entry) => entry.status === 'pending').length} คน</span></section>
    {profiles.isLoading ? <LoadingState /> : rows.length ? <section className="table-card"><div className="data-table-wrap"><table className="data-table user-table"><thead><tr><th>ผู้ใช้งาน</th><th>โรงเรียน</th><th>บทบาท</th><th>สถานะ</th><th /></tr></thead><tbody>{rows.map((entry) => <UserRow key={entry.id} profile={entry} schools={schools.data ?? []} busy={updateUser.isPending} onSave={(role, status, schoolId) => updateUser.mutate({ id: entry.id, role, status, schoolId })} />)}</tbody></table></div></section> : <EmptyState icon={<Users />} title="ไม่พบผู้ใช้งาน" description="ลองเปลี่ยนคำค้นหา" />}

    {showCreate && <Modal title="เพิ่มผู้ใช้งาน" onClose={() => setShowCreate(false)}><form className="form-grid" onSubmit={handleCreate}>
      {createUser.error && <div className="form-grid__full"><Notice tone="error">{createUser.error.message}</Notice></div>}
      <label className="form-grid__full">ชื่อ–นามสกุล<input name="fullName" required placeholder="ชื่อผู้ใช้งาน" /></label>
      <label>อีเมล<input name="email" type="email" required placeholder="teacher@example.com" /></label>
      <label>รหัสผ่านชั่วคราว<input name="password" type="password" minLength={8} required placeholder="อย่างน้อย 8 ตัวอักษร" /></label>
      <label>บทบาท<select name="role" defaultValue="teacher"><option value="teacher">ครูผู้ทดสอบ</option><option value="supervisor">ศึกษานิเทศก์</option><option value="admin">ผู้ดูแลระบบ</option></select></label>
      <label>โรงเรียน<select name="school" defaultValue=""><option value="">สำนักงานเขตพื้นที่ / ไม่ระบุ</option><SchoolOptions schools={schools.data ?? []} /></select></label>
      <div className="form-grid__full info-callout"><UserCheck size={20} /><span>บัญชีที่แอดมินสร้างจะได้รับอนุมัติทันที ผู้ใช้เข้าสู่ระบบด้วยอีเมลและรหัสผ่านชั่วคราวนี้ได้</span></div>
      <div className="form-actions form-grid__full"><Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>ยกเลิก</Button><Button type="submit" disabled={createUser.isPending}>สร้างและอนุมัติบัญชี</Button></div>
    </form></Modal>}
  </>
}

function UserRow({ profile, schools, busy, onSave }: { profile: Profile; schools: SchoolChoice[]; busy: boolean; onSave: (role: AppRole, status: ProfileStatus, schoolId: string | null) => void }) {
  const [role, setRole] = useState(profile.status === 'pending' ? profile.requested_role ?? profile.role : profile.role)
  const [status, setStatus] = useState(profile.status)
  const [schoolId, setSchoolId] = useState(profile.school_id ?? '')
  const changed = role !== profile.role || status !== profile.status || schoolId !== (profile.school_id ?? '')
  const approve = () => { setStatus('approved'); onSave(role, 'approved', schoolId || null) }
  return <tr>
    <td><strong>{profile.full_name}</strong><small>{profile.email ?? 'ไม่มีอีเมลในข้อมูลเดิม'}</small>{profile.status === 'pending' && <small>คำขอ: {profile.requested_role === 'supervisor' ? 'ศึกษานิเทศก์ / ผู้คุมทดสอบ' : 'ครูผู้ทดสอบ'}</small>}</td>
    <td><select value={schoolId} onChange={(event) => setSchoolId(event.target.value)}><option value="">สำนักงานเขตพื้นที่ / ไม่ระบุ</option><SchoolOptions schools={schools} /></select></td>
    <td><select value={role} onChange={(event) => setRole(event.target.value as AppRole)}><option value="teacher">ครูผู้ทดสอบ</option><option value="supervisor">ศึกษานิเทศก์</option><option value="admin">ผู้ดูแลระบบ</option></select></td>
    <td><select value={status} onChange={(event) => setStatus(event.target.value as ProfileStatus)}><option value="pending">รออนุมัติ</option><option value="approved">อนุมัติ</option><option value="suspended">ระงับ</option></select></td>
    <td>{profile.status === 'pending' ? <Button disabled={busy || (role === 'teacher' && !schoolId)} onClick={approve}><CheckCircle2 size={17} /> อนุมัติ</Button> : <Button variant="secondary" disabled={busy || !changed || (role === 'teacher' && !schoolId)} onClick={() => onSave(role, status, schoolId || null)}><UserCheck size={17} /> บันทึก</Button>}</td>
  </tr>
}

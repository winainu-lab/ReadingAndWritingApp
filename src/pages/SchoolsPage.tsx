import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Edit3, Plus, Search, ToggleLeft, ToggleRight } from 'lucide-react'
import { Fragment, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Button, EmptyState, LoadingState, Modal, Notice, PageHeader } from '../components/ui'
import { supabase } from '../lib/supabase'
import type { NetworkCenter, School } from '../types/app'
import { groupSchoolsByNetwork } from '../lib/schoolSorting'

const blankSchool = { dmc_code: '', moe_code: '', name: '', subdistrict: '', district: 'จักราช', network_center_id: '' }

export function SchoolsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [networkFilter, setNetworkFilter] = useState('all')
  const [editing, setEditing] = useState<School | 'new' | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const networks = useQuery({
    queryKey: ['network-centers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('network_centers').select('*').order('sort_order')
      if (error) throw error
      return data as NetworkCenter[]
    },
  })
  const schools = useQuery({
    queryKey: ['schools'],
    queryFn: async () => {
      const { data, error } = await supabase.from('schools').select('*, network_center:network_centers(*)')
      if (error) throw error
      return data as School[]
    },
  })

  const visibleSchools = useMemo(() => (schools.data ?? []).filter((school) => {
    const matchesSearch = school.name.includes(search) || school.dmc_code.includes(search) || school.district.includes(search) || school.network_center?.name.includes(search)
    return matchesSearch && (networkFilter === 'all' || school.network_center_id === networkFilter)
  }), [schools.data, search, networkFilter])
  const visibleGroups = useMemo(() => groupSchoolsByNetwork(visibleSchools), [visibleSchools])

  const saveSchool = useMutation({
    mutationFn: async (payload: typeof blankSchool & { id?: string }) => {
      const { id, ...values } = payload
      const result = id
        ? await supabase.from('schools').update(values).eq('id', id)
        : await supabase.from('schools').insert(values)
      if (result.error) throw result.error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['schools'] })
      setEditing(null)
      setMessage('บันทึกข้อมูลโรงเรียนเรียบร้อย')
    },
  })

  const toggleSchool = useMutation({
    mutationFn: async (school: School) => {
      const { error } = await supabase.from('schools').update({ is_active: !school.is_active }).eq('id', school.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schools'] }),
  })

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    saveSchool.mutate({
      id: editing && editing !== 'new' ? editing.id : undefined,
      dmc_code: String(form.get('dmc_code')),
      moe_code: String(form.get('moe_code')),
      name: String(form.get('name')),
      subdistrict: String(form.get('subdistrict')),
      district: String(form.get('district')),
      network_center_id: String(form.get('network_center_id')),
    })
  }

  const formValue = editing && editing !== 'new' ? editing : blankSchool

  return (
    <>
      <PageHeader eyebrow="ข้อมูลอ้างอิง" title="โรงเรียนและศูนย์เครือข่าย" description="เรียงโรงเรียนตามศูนย์เครือข่ายอย่างคงที่ ค้นหา กรอง และปรับปรุงข้อมูลได้" action={profile?.role === 'admin' ? <Button onClick={() => setEditing('new')}><Plus size={18} /> เพิ่มโรงเรียน</Button> : undefined} />
      {message && <Notice tone="success">{message}</Notice>}
      <section className="toolbar">
        <label className="search-box"><Search size={19} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรือรหัสโรงเรียน" /></label>
        <select aria-label="กรองตามศูนย์เครือข่าย" value={networkFilter} onChange={(event) => setNetworkFilter(event.target.value)}>
          <option value="all">ทุกศูนย์เครือข่าย</option>
          {networks.data?.map((network) => <option key={network.id} value={network.id}>{network.name}</option>)}
        </select>
        <span className="result-count">{visibleSchools.length.toLocaleString('th-TH')} โรงเรียน</span>
      </section>

      {schools.isLoading ? <LoadingState /> : visibleSchools.length ? (
        <section className="table-card">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>โรงเรียน</th><th>รหัส DMC</th><th>อำเภอ</th><th>ศูนย์เครือข่าย</th><th>สถานะ</th>{profile?.role === 'admin' && <th aria-label="จัดการ" />}</tr></thead>
              <tbody>{visibleGroups.map((group) => (
                <Fragment key={group.id}>
                  <tr className="network-group-row"><th colSpan={profile?.role === 'admin' ? 6 : 5}>{group.name}<span>{group.schools.length} โรงเรียน</span></th></tr>
                  {group.schools.map((school) => (
                    <tr key={school.id} className={!school.is_active ? 'row-muted' : ''}>
                      <td><strong>{school.name}</strong><small>ต.{school.subdistrict || '–'}</small></td>
                      <td>{school.dmc_code}</td><td>{school.district}</td><td><span className="tag">{school.network_center?.name ?? 'ยังไม่กำหนด'}</span></td>
                      <td><span className={`status ${school.is_active ? 'status--active' : 'status--inactive'}`}>{school.is_active ? 'ใช้งาน' : 'ปิดใช้งาน'}</span></td>
                      {profile?.role === 'admin' && <td><div className="table-actions"><button onClick={() => setEditing(school)} aria-label={`แก้ไข ${school.name}`}><Edit3 size={18} /></button><button onClick={() => toggleSchool.mutate(school)} aria-label={school.is_active ? `ปิดใช้งาน ${school.name}` : `เปิดใช้งาน ${school.name}`}>{school.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}</button></div></td>}
                    </tr>
                  ))}
                </Fragment>
              ))}</tbody>
            </table>
          </div>
        </section>
      ) : <EmptyState icon={<Building2 />} title="ไม่พบโรงเรียน" description="ลองเปลี่ยนคำค้นหาหรือศูนย์เครือข่าย" />}

      {editing && (
        <Modal title={editing === 'new' ? 'เพิ่มโรงเรียน' : 'แก้ไขโรงเรียน'} onClose={() => setEditing(null)}>
          <form className="form-grid" onSubmit={handleSave}>
            {saveSchool.error && <div className="form-grid__full"><Notice tone="error">{saveSchool.error.message}</Notice></div>}
            <label className="form-grid__full">ชื่อโรงเรียน<input name="name" required defaultValue={formValue.name} /></label>
            <label>รหัส DMC<input name="dmc_code" required defaultValue={formValue.dmc_code} /></label>
            <label>รหัสกระทรวง<input name="moe_code" defaultValue={formValue.moe_code ?? ''} /></label>
            <label>ตำบล<input name="subdistrict" defaultValue={formValue.subdistrict ?? ''} /></label>
            <label>อำเภอ<select name="district" defaultValue={formValue.district}>{['จักราช','โชคชัย','หนองบุญมาก','ห้วยแถลง','เฉลิมพระเกียรติ'].map((district) => <option key={district}>{district}</option>)}</select></label>
            <label className="form-grid__full">ศูนย์เครือข่าย<select name="network_center_id" required defaultValue={formValue.network_center_id}><option value="" disabled>เลือกศูนย์เครือข่าย</option>{networks.data?.map((network) => <option key={network.id} value={network.id}>{network.name}</option>)}</select></label>
            <div className="form-actions form-grid__full"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>ยกเลิก</Button><Button type="submit" disabled={saveSchool.isPending}>บันทึกข้อมูล</Button></div>
          </form>
        </Modal>
      )}
    </>
  )
}

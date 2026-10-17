import { useQuery } from '@tanstack/react-query'
import { BarChart3, CheckCircle2, Download, Filter, GraduationCap, School, Users, BookOpenCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../auth/AuthProvider'
import { Button, EmptyState, LoadingState, PageHeader } from '../components/ui'
import { supabase } from '../lib/supabase'

interface SchoolRow {
  school_id: string
  school_name: string
  district_name: string
  network_id: string
  network_name: string
  classroom_count: number
  student_count: number
  session_count: number
  accuracy: number
}

interface GroupRow { key: string; name: string; district: string; schools: number; classrooms: number; students: number; sessions: number; accuracy: number }
type View = 'network' | 'school'

const weightedAccuracy = (rows: { session_count: number; accuracy: number }[]) => {
  const sessions = rows.reduce((sum, row) => sum + row.session_count, 0)
  return sessions ? rows.reduce((sum, row) => sum + row.accuracy * row.session_count, 0) / sessions : 0
}

function groupRows(rows: SchoolRow[], view: View): GroupRow[] {
  if (view === 'school') return rows.map((row) => ({ key: row.school_id, name: row.school_name, district: `${row.district_name} · ${row.network_name}`, schools: 1, classrooms: row.classroom_count, students: row.student_count, sessions: row.session_count, accuracy: row.accuracy }))
  const groups = new Map<string, SchoolRow[]>()
  for (const row of rows) groups.set(row.network_id, [...(groups.get(row.network_id) ?? []), row])
  return [...groups.values()].map((items) => ({
    key: items[0].network_id, name: items[0].network_name, district: items[0].district_name, schools: items.length,
    classrooms: items.reduce((sum, row) => sum + row.classroom_count, 0), students: items.reduce((sum, row) => sum + row.student_count, 0),
    sessions: items.reduce((sum, row) => sum + row.session_count, 0), accuracy: weightedAccuracy(items),
  }))
}

export function ReportsPage() {
  const { profile } = useAuth()
  const isManager = profile?.role === 'admin' || profile?.role === 'supervisor'
  const [district, setDistrict] = useState('all')
  const [networkId, setNetworkId] = useState('all')
  const [schoolId, setSchoolId] = useState('all')
  const [chosenView, setChosenView] = useState<View | null>(null)

  const report = useQuery({
    queryKey: ['school-report'],
    queryFn: async () => { const { data, error } = await supabase.rpc('get_school_report'); if (error) throw error; return (data ?? []) as SchoolRow[] },
  })
  const all = report.data ?? []

  const districts = useMemo(() => [...new Set(all.map((row) => row.district_name))].sort((a, b) => a.localeCompare(b, 'th')), [all])
  const networks = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of all) if (district === 'all' || row.district_name === district) map.set(row.network_id, row.network_name)
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [all, district])
  const schoolChoices = useMemo(() => all.filter((row) => (district === 'all' || row.district_name === district) && (networkId === 'all' || row.network_id === networkId)), [all, district, networkId])
  const rows = useMemo(() => schoolChoices.filter((row) => schoolId === 'all' || row.school_id === schoolId), [schoolChoices, schoolId])

  const view: View = chosenView ?? (isManager && networkId === 'all' && schoolId === 'all' ? 'network' : 'school')
  const groups = useMemo(() => groupRows(rows, view), [rows, view])
  const totals = useMemo(() => ({
    schools: rows.length, classrooms: rows.reduce((sum, row) => sum + row.classroom_count, 0), students: rows.reduce((sum, row) => sum + row.student_count, 0),
    sessions: rows.reduce((sum, row) => sum + row.session_count, 0), accuracy: weightedAccuracy(rows),
  }), [rows])

  const changeDistrict = (value: string) => { setDistrict(value); setNetworkId('all'); setSchoolId('all') }
  const changeNetwork = (value: string) => { setNetworkId(value); setSchoolId('all') }
  const scopeLabel = schoolId !== 'all' ? schoolChoices.find((row) => row.school_id === schoolId)?.school_name : networkId !== 'all' ? networks.find((entry) => entry.id === networkId)?.name : district !== 'all' ? `อำเภอ${district}` : 'ทุกโรงเรียนในเขต'

  const exportCsv = () => {
    const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
    const header = [view === 'network' ? 'ศูนย์เครือข่าย' : 'โรงเรียน', view === 'network' ? 'อำเภอ' : 'อำเภอ · ศูนย์เครือข่าย', 'โรงเรียน', 'ห้อง', 'นักเรียนสมมติ', 'ครั้งที่ประเมิน', 'ความถูกต้องเฉลี่ย (%)']
    const csv = [header.map(quote).join(','), ...groups.map((row) => [row.name, row.district, row.schools, row.classrooms, row.students, row.sessions, row.accuracy.toFixed(2)].map(quote).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = view === 'network' ? 'reading-report-by-network.csv' : 'reading-report-by-school.csv'; link.click(); URL.revokeObjectURL(url)
  }

  return <>
    <PageHeader eyebrow={isManager ? 'รายงานเพื่อการนิเทศ' : 'รายงานโรงเรียนของท่าน'} title={isManager ? 'ภาพรวมการอ่านทั้งเขต' : 'ภาพรวมการอ่านของโรงเรียน'} description={isManager ? 'กรองดูตามอำเภอ ศูนย์เครือข่าย และโรงเรียน โดยไม่เปิดเผยตัวตนนักเรียน' : 'แสดงเฉพาะผลประเมินของโรงเรียนที่ท่านสังกัด โดยไม่เปิดเผยตัวตนนักเรียน'} action={<Button variant="secondary" onClick={exportCsv} disabled={!groups.length}><Download size={18} /> ส่งออก CSV</Button>} />
    {isManager && <section className="toolbar report-filters" aria-label="ตัวกรองรายงาน">
      <label className="filter-label"><Filter size={18} /><select value={district} onChange={(event) => changeDistrict(event.target.value)} aria-label="อำเภอ"><option value="all">ทุกอำเภอ</option>{districts.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      <label className="filter-label"><select value={networkId} onChange={(event) => changeNetwork(event.target.value)} aria-label="ศูนย์เครือข่าย"><option value="all">ทุกศูนย์เครือข่าย</option>{networks.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
      <label className="filter-label"><select value={schoolId} onChange={(event) => setSchoolId(event.target.value)} aria-label="โรงเรียน"><option value="all">ทุกโรงเรียน ({schoolChoices.length})</option>{schoolChoices.map((row) => <option key={row.school_id} value={row.school_id}>{row.school_name}</option>)}</select></label>
      {(district !== 'all' || networkId !== 'all' || schoolId !== 'all') && <Button variant="ghost" onClick={() => changeDistrict('all')}>ล้างตัวกรอง</Button>}
      <span className="result-count">กำลังดู: {scopeLabel}</span>
    </section>}

    {report.isLoading ? <LoadingState /> : rows.length ? <>
      <section className="metric-grid" aria-label="สรุปข้อมูลตามตัวกรอง">
        <article className="metric-card metric-card--accent"><span className="metric-card__icon"><School /></span><div><span>โรงเรียน</span><strong>{totals.schools.toLocaleString('th-TH')}</strong><small>{scopeLabel}</small></div></article>
        <article className="metric-card"><span className="metric-card__icon"><GraduationCap /></span><div><span>ห้องเรียน</span><strong>{totals.classrooms.toLocaleString('th-TH')}</strong><small>ที่ยังใช้งาน</small></div></article>
        <article className="metric-card"><span className="metric-card__icon"><Users /></span><div><span>นักเรียนสมมติ</span><strong>{totals.students.toLocaleString('th-TH')}</strong></div></article>
        <article className="metric-card"><span className="metric-card__icon"><BookOpenCheck /></span><div><span>ครั้งที่ประเมิน</span><strong>{totals.sessions.toLocaleString('th-TH')}</strong></div></article>
        <article className="metric-card"><span className="metric-card__icon"><CheckCircle2 /></span><div><span>ความถูกต้องเฉลี่ย</span><strong>{totals.accuracy.toFixed(1)}%</strong><small>ถ่วงน้ำหนักตามจำนวนครั้ง</small></div></article>
      </section>

      {isManager && <div className="learn-segment tests-tabs" role="radiogroup" aria-label="มุมมองรายงาน">
        <button role="radio" aria-checked={view === 'network'} className={view === 'network' ? 'active' : ''} onClick={() => setChosenView('network')}>แยกตามศูนย์เครือข่าย</button>
        <button role="radio" aria-checked={view === 'school'} className={view === 'school' ? 'active' : ''} onClick={() => setChosenView('school')}>แยกตามโรงเรียน</button>
      </div>}

      <section className="panel report-chart"><header className="panel__header"><div><p className="eyebrow">เปรียบเทียบผล</p><h2>ความถูกต้องเฉลี่ย{view === 'network' ? 'ตามศูนย์เครือข่าย' : 'ตามโรงเรียน'}</h2></div></header><div className="report-chart-scroll"><div style={{ height: Math.max(300, groups.length * 36), minWidth: 520 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={groups} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#dce7eb" />
        <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontFamily: 'Sarabun', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={150} tick={{ fontFamily: 'Sarabun', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(value, _name, item) => [`${Number(value).toFixed(1)}% (${(item.payload as GroupRow).sessions} ครั้ง)`, 'ความถูกต้อง']} contentStyle={{ fontFamily: 'Sarabun', borderRadius: 12, border: '1px solid #dce7eb' }} />
        <Bar dataKey="accuracy" name="ความถูกต้อง" fill="#c9972f" radius={[0, 8, 8, 0]} />
      </BarChart></ResponsiveContainer></div></div></section>

      <section className="table-card"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>{view === 'network' ? 'ศูนย์เครือข่าย' : 'โรงเรียน'}</th><th>{view === 'network' ? 'อำเภอ' : 'อำเภอ · ศูนย์เครือข่าย'}</th>{view === 'network' && <th>โรงเรียน</th>}<th>ห้อง</th><th>นักเรียนสมมติ</th><th>ประเมิน</th><th>ความถูกต้อง</th></tr></thead><tbody>{groups.map((row) => <tr key={row.key}><td><strong>{row.name}</strong></td><td>{row.district}</td>{view === 'network' && <td>{row.schools}</td>}<td>{row.classrooms}</td><td>{row.students}</td><td>{row.sessions}</td><td>{row.sessions ? `${row.accuracy.toFixed(1)}%` : '–'}</td></tr>)}</tbody></table></div></section>
    </> : <EmptyState icon={<BarChart3 />} title="ยังไม่มีข้อมูลรายงาน" description={isManager ? 'ไม่พบโรงเรียนตามตัวกรองที่เลือก' : 'เมื่อมีการประเมินในโรงเรียนของท่าน ระบบจะสรุปผลให้อัตโนมัติ'} />}
  </>
}

import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpenCheck, Building2, CheckCircle2, ClipboardCheck, Filter, Network, School, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, LoadingState } from '../components/ui'
import { VisitStats } from '../components/VisitStats'
import { supabase } from '../lib/supabase'
import { getBrandLogoUrl, useAppSettings } from '../hooks/useAppSettings'
import { useAuth } from '../auth/AuthProvider'

interface Summary {
  schools: number
  networks: number
  classrooms: number
  students: number
  sessions: number
  completion_rate: number
  network_breakdown: { name: string; sessions: number; accuracy: number }[]
  recent_sessions: { id: string; school_name: string; grade_level: string; completed_at: string; accuracy: number }[]
}

interface SchoolRow { school_id: string; school_name: string; district_name: string; network_id: string; network_name: string }

const emptySummary: Summary = { schools: 0, networks: 0, classrooms: 0, students: 0, sessions: 0, completion_rate: 0, network_breakdown: [], recent_sessions: [] }

export function DashboardPage() {
  const { settings } = useAppSettings()
  const { profile } = useAuth()
  const isTeacher = profile?.role === 'teacher'
  const logoUrl = getBrandLogoUrl(settings.logo_path)
  const isManager = profile?.role === 'admin' || profile?.role === 'supervisor'
  const [district, setDistrict] = useState('all')
  const [networkId, setNetworkId] = useState('all')
  const [schoolId, setSchoolId] = useState('all')
  const schoolList = useQuery({
    queryKey: ['school-report'],
    enabled: isManager,
    queryFn: async () => { const { data, error } = await supabase.rpc('get_school_report'); if (error) throw error; return (data ?? []) as unknown as SchoolRow[] },
  })
  const districts = useMemo(() => [...new Set((schoolList.data ?? []).map((row) => row.district_name))].sort((a, b) => a.localeCompare(b, 'th')), [schoolList.data])
  const networks = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of schoolList.data ?? []) if (district === 'all' || row.district_name === district) map.set(row.network_id, row.network_name)
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [schoolList.data, district])
  const schoolChoices = useMemo(() => (schoolList.data ?? []).filter((row) => (district === 'all' || row.district_name === district) && (networkId === 'all' || row.network_id === networkId)), [schoolList.data, district, networkId])
  const filtered = district !== 'all' || networkId !== 'all' || schoolId !== 'all'
  const summary = useQuery({
    queryKey: ['dashboard-summary', district, networkId, schoolId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_summary', { p_district: district === 'all' ? undefined : district, p_network: networkId === 'all' ? undefined : networkId, p_school: schoolId === 'all' ? undefined : schoolId })
      if (error) throw error
      return (data ?? emptySummary) as unknown as Summary
    },
    placeholderData: (previous) => previous,
  })

  if (summary.isLoading) return <LoadingState />
  const data = summary.data ?? emptySummary

  return (
    <>
      <section className="dashboard-welcome thai-pattern">{logoUrl && <div className="dashboard-welcome__logo"><img src={logoUrl} alt={`โลโก้ ${settings.affiliation}`} /></div>}<div className="dashboard-welcome__content"><p className="eyebrow">{settings.affiliation}</p><h1>{settings.system_name}</h1><span>{isTeacher ? `สถานการณ์การอ่านและข้อมูลประเมินล่าสุดของ${profile?.school?.name ?? 'โรงเรียนของท่าน'}` : 'สถานการณ์การอ่านและข้อมูลประเมินล่าสุดจากทุกโรงเรียนในระบบ'}</span></div><Link className="button button--primary" to="/assessment"><ClipboardCheck size={19} /> เริ่มทดสอบ</Link></section>

      {isManager && <section className="toolbar dashboard-filters" aria-label="ตัวกรองภาพรวม">
        <label className="filter-label"><Filter size={18} /><select value={district} onChange={(event) => { setDistrict(event.target.value); setNetworkId('all'); setSchoolId('all') }} aria-label="อำเภอ"><option value="all">ทุกอำเภอ</option>{districts.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
        <label className="filter-label"><select value={networkId} onChange={(event) => { setNetworkId(event.target.value); setSchoolId('all') }} aria-label="ศูนย์เครือข่าย"><option value="all">ทุกศูนย์เครือข่าย</option>{networks.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
        <label className="filter-label"><select value={schoolId} onChange={(event) => setSchoolId(event.target.value)} aria-label="โรงเรียน"><option value="all">ทุกโรงเรียน ({schoolChoices.length})</option>{schoolChoices.map((row) => <option key={row.school_id} value={row.school_id}>{row.school_name}</option>)}</select></label>
        {filtered && <Button variant="ghost" onClick={() => { setDistrict('all'); setNetworkId('all'); setSchoolId('all') }}>ล้างตัวกรอง</Button>}
      </section>}

      <section className="metric-grid" aria-label="สรุปข้อมูล">
        <article className="metric-card metric-card--accent"><span className="metric-card__icon"><School /></span><div><span>{isTeacher ? 'โรงเรียนของท่าน' : 'โรงเรียนในระบบ'}</span><strong>{data.schools.toLocaleString('th-TH')}</strong><small>{isTeacher ? 'เห็นเฉพาะข้อมูลของโรงเรียนท่าน' : `ใน ${data.networks} ศูนย์เครือข่าย`}</small></div></article>
        <article className="metric-card"><span className="metric-card__icon"><Users /></span><div><span>นักเรียนสมมติ</span><strong>{data.students.toLocaleString('th-TH')}</strong><small>จาก {data.classrooms} ห้องเรียน</small></div></article>
        <article className="metric-card"><span className="metric-card__icon"><BookOpenCheck /></span><div><span>ประเมินแล้ว</span><strong>{data.sessions.toLocaleString('th-TH')}</strong><small>ครั้งสะสม</small></div></article>
        <article className="metric-card"><span className="metric-card__icon"><CheckCircle2 /></span><div><span>ความถูกต้องเฉลี่ย</span><strong>{data.completion_rate.toFixed(1)}%</strong><small>จากแบบทดสอบที่เสร็จสิ้น</small></div></article>
      </section>

      <section className="dashboard-grid">
        <article className="panel panel--chart">
          <header className="panel__header"><div><p className="eyebrow">เปรียบเทียบศูนย์เครือข่าย</p><h2>จำนวนครั้งที่ประเมิน</h2></div><Link to="/reports" className="text-link">ดูรายงานทั้งหมด <ArrowRight size={17} /></Link></header>
          <div className="chart-wrap">
            {data.network_breakdown.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.network_breakdown.slice(0, 10)} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#dce7eb" />
                  <XAxis dataKey="name" tick={{ fontFamily: 'Sarabun', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={62} />
                  <YAxis tick={{ fontFamily: 'Sarabun', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontFamily: 'Sarabun', borderRadius: 12, border: '1px solid #dce7eb' }} />
                  <Bar dataKey="sessions" name="ครั้งที่ประเมิน" fill="#c9972f" radius={[8, 8, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="chart-empty"><Network size={34} /><p>ข้อมูลจะแสดงเมื่อเริ่มมีผลการประเมิน</p></div>}
          </div>
        </article>

        <article className="panel">
          <header className="panel__header"><div><p className="eyebrow">รายการล่าสุด</p><h2>การประเมินล่าสุด</h2></div></header>
          <div className="activity-list">
            {data.recent_sessions.length ? data.recent_sessions.map((session) => (
              <div className="activity-item" key={session.id}>
                <span className="activity-item__icon"><Building2 size={18} /></span>
                <div><strong>{session.school_name}</strong><span>{session.grade_level} · {new Date(session.completed_at).toLocaleDateString('th-TH')}</span></div>
                <b>{session.accuracy.toFixed(0)}%</b>
              </div>
            )) : <div className="compact-empty">ยังไม่มีผลการประเมินล่าสุด</div>}
          </div>
        </article>
      </section>

      {profile?.role === 'admin' && <VisitStats />}
    </>
  )
}

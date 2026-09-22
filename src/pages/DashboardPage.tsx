import { useQuery } from '@tanstack/react-query'
import { ArrowRight, BookOpenCheck, Building2, CheckCircle2, ClipboardCheck, Network, School, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LoadingState } from '../components/ui'
import { supabase } from '../lib/supabase'
import { getBrandLogoUrl, useAppSettings } from '../hooks/useAppSettings'

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

const emptySummary: Summary = { schools: 0, networks: 0, classrooms: 0, students: 0, sessions: 0, completion_rate: 0, network_breakdown: [], recent_sessions: [] }

export function DashboardPage() {
  const { settings } = useAppSettings()
  const logoUrl = getBrandLogoUrl(settings.logo_path)
  const summary = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_summary')
      if (error) throw error
      return (data ?? emptySummary) as Summary
    },
  })

  if (summary.isLoading) return <LoadingState />
  const data = summary.data ?? emptySummary

  return (
    <>
      <section className="dashboard-welcome thai-pattern">{logoUrl && <div className="dashboard-welcome__logo"><img src={logoUrl} alt={`โลโก้ ${settings.affiliation}`} /></div>}<div className="dashboard-welcome__content"><p className="eyebrow">{settings.affiliation}</p><h1>{settings.system_name}</h1><span>สถานการณ์การอ่านและข้อมูลประเมินล่าสุดจากทุกโรงเรียนในระบบ</span></div><Link className="button button--primary" to="/assessment"><ClipboardCheck size={19} /> เริ่มทดสอบ</Link></section>

      <section className="metric-grid" aria-label="สรุปข้อมูล">
        <article className="metric-card metric-card--accent"><span className="metric-card__icon"><School /></span><div><span>โรงเรียนในระบบ</span><strong>{data.schools.toLocaleString('th-TH')}</strong><small>ใน {data.networks} ศูนย์เครือข่าย</small></div></article>
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
    </>
  )
}

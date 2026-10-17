import { useQuery } from '@tanstack/react-query'
import { Activity, Eye, UserCheck, Users } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../lib/supabase'

interface VisitRow { day: string; page: 'landing' | 'learn' | 'resources' | 'app'; visits: number; new_visitors: number }
interface Activity {
  total: number; pending: number; suspended: number; admins: number; supervisors: number; teachers: number
  active_today: number; active_7d: number; active_30d: number
}

const pageLabels: Record<VisitRow['page'], string> = { landing: 'หน้าแรก', learn: 'โหมดเรียนรู้', resources: 'เอกสารและใบความรู้', app: 'เข้าใช้งานระบบ' }
const pageColors: Record<VisitRow['page'], string> = { landing: '#c9972f', learn: '#2f8f83', resources: '#8a5a2b', app: '#4f6fb5' }
const DAYS = 30

function lastDays(count: number) {
  const bangkokToday = new Date(Date.now() + 7 * 3600_000)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(bangkokToday.getTime() - (count - 1 - index) * 86_400_000)
    return date.toISOString().slice(0, 10)
  })
}

export function VisitStats() {
  const visits = useQuery({
    queryKey: ['visit-stats', DAYS],
    staleTime: 5 * 60_000,
    queryFn: async () => { const { data, error } = await supabase.rpc('get_visit_stats', { p_days: DAYS }); if (error) throw error; return (data ?? []) as VisitRow[] },
  })
  const activity = useQuery({
    queryKey: ['user-activity'],
    staleTime: 5 * 60_000,
    queryFn: async () => { const { data, error } = await supabase.rpc('get_user_activity'); if (error) throw error; return data as unknown as Activity | null },
  })

  const { chart, totals } = useMemo(() => {
    const days = lastDays(DAYS)
    const byDay = new Map(days.map((day) => [day, { day, landing: 0, learn: 0, resources: 0, app: 0 }]))
    let today = 0, week = 0, month = 0, newWeek = 0
    for (const row of visits.data ?? []) {
      const entry = byDay.get(row.day)
      if (!entry) continue
      entry[row.page] += row.visits
      const age = days.length - 1 - days.indexOf(row.day)
      month += row.visits
      if (age < 7) { week += row.visits; newWeek += row.new_visitors }
      if (age === 0) today += row.visits
    }
    return { chart: [...byDay.values()].map((entry) => ({ ...entry, label: entry.day.slice(8) + '/' + entry.day.slice(5, 7) })), totals: { today, week, month, newWeek } }
  }, [visits.data])

  const data = activity.data
  return <section className="panel visit-stats">
    <header className="panel__header"><div><p className="eyebrow">สำหรับผู้ดูแลระบบ</p><h2>ยอดเข้าชมและผู้ใช้งาน</h2></div></header>
    <div className="visit-stats__tiles">
      <div><Eye /><span>เข้าชมวันนี้</span><strong>{totals.today.toLocaleString('th-TH')}</strong><small>{totals.week.toLocaleString('th-TH')} ใน 7 วัน · {totals.month.toLocaleString('th-TH')} ใน 30 วัน</small></div>
      <div><Users /><span>ผู้เข้าชมใหม่ (7 วัน)</span><strong>{totals.newWeek.toLocaleString('th-TH')}</strong><small>นับต่อเบราว์เซอร์ต่อวัน</small></div>
      <div><Activity /><span>ผู้ใช้ที่ล็อกอิน</span><strong>{data ? data.active_7d.toLocaleString('th-TH') : '–'}</strong><small>{data ? `วันนี้ ${data.active_today} · 30 วัน ${data.active_30d}` : 'กำลังโหลด'}</small></div>
      <div><UserCheck /><span>บัญชีทั้งหมด</span><strong>{data ? data.total.toLocaleString('th-TH') : '–'}</strong><small>{data ? `ครู ${data.teachers} · นิเทศก์ ${data.supervisors} · แอดมิน ${data.admins}${data.pending ? ` · รออนุมัติ ${data.pending}` : ''}` : ''}</small></div>
    </div>
    <div className="visit-stats__chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#dce7eb" />
          <XAxis dataKey="label" tick={{ fontFamily: 'Sarabun', fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
          <YAxis allowDecimals={false} tick={{ fontFamily: 'Sarabun', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontFamily: 'Sarabun', borderRadius: 12, border: '1px solid #dce7eb' }} />
          <Legend wrapperStyle={{ fontFamily: 'Sarabun', fontSize: 12 }} />
          {(Object.keys(pageLabels) as VisitRow['page'][]).map((page) => <Bar key={page} dataKey={page} name={pageLabels[page]} stackId="visits" fill={pageColors[page]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
    <p className="visit-stats__note">นับ 1 ครั้งต่อเบราว์เซอร์ต่อรอบการเปิดใช้งาน ไม่เก็บข้อมูลรายบุคคลและไม่เก็บ IP จึงเป็นตัวเลขโดยประมาณเพื่อดูแนวโน้ม</p>
  </section>
}

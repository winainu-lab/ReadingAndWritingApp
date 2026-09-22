import { useQuery } from '@tanstack/react-query'
import { BarChart3, Download, Filter } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, EmptyState, LoadingState, PageHeader } from '../components/ui'
import { supabase } from '../lib/supabase'
import type { NetworkCenter } from '../types/app'

interface ReportRow { network_id: string; network_name: string; district_name: string; school_count: number; classroom_count: number; student_count: number; session_count: number; accuracy: number }

export function ReportsPage() {
  const [networkId, setNetworkId] = useState('all')
  const networks = useQuery({ queryKey: ['network-centers'], queryFn: async () => { const { data, error } = await supabase.from('network_centers').select('*').order('sort_order'); if (error) throw error; return data as NetworkCenter[] } })
  const report = useQuery({ queryKey: ['network-report'], queryFn: async () => { const { data, error } = await supabase.rpc('get_network_report'); if (error) throw error; return (data ?? []) as ReportRow[] } })
  const rows = useMemo(() => (report.data ?? []).filter((row) => networkId === 'all' || row.network_id === networkId), [report.data, networkId])

  const exportCsv = () => {
    const csv = ['ศูนย์เครือข่าย,อำเภอ,โรงเรียน,ห้อง,นักเรียนสมมติ,ครั้งที่ประเมิน,ความถูกต้อง', ...rows.map((row) => `${row.network_name},${row.district_name},${row.school_count},${row.classroom_count},${row.student_count},${row.session_count},${row.accuracy.toFixed(2)}`)].join('\n')
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = 'reading-report-by-network.csv'; link.click(); URL.revokeObjectURL(url)
  }

  return <>
    <PageHeader eyebrow="รายงานเพื่อการนิเทศ" title="ภาพรวมตามศูนย์เครือข่าย" description="เปรียบเทียบการดำเนินงานโดยไม่เปิดเผยตัวตนนักเรียน" action={<Button variant="secondary" onClick={exportCsv}><Download size={18} /> ส่งออก CSV</Button>} />
    <section className="toolbar"><label className="filter-label"><Filter size={18} /><select value={networkId} onChange={(event) => setNetworkId(event.target.value)}><option value="all">ทุกศูนย์เครือข่าย</option>{networks.data?.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><span className="result-count">อัปเดตจากผลการประเมินล่าสุด</span></section>
    {report.isLoading ? <LoadingState /> : rows.length ? <>
      <section className="panel report-chart"><header className="panel__header"><div><p className="eyebrow">เปรียบเทียบผล</p><h2>ความถูกต้องเฉลี่ยตามศูนย์เครือข่าย</h2></div></header><div className="report-chart-scroll"><div style={{ height: Math.max(390, rows.length * 36), minWidth: 520 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#dce7eb" /><XAxis type="number" domain={[0, 100]} tick={{ fontFamily: 'Sarabun', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" /><YAxis type="category" dataKey="network_name" width={122} tick={{ fontFamily: 'Sarabun', fontSize: 12 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ fontFamily: 'Sarabun', borderRadius: 12 }} /><Bar dataKey="accuracy" name="ความถูกต้อง (%)" fill="#166e8f" radius={[0,7,7,0]} /></BarChart></ResponsiveContainer></div></div></section>
      <section className="table-card"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>ศูนย์เครือข่าย</th><th>อำเภอ</th><th>โรงเรียน</th><th>ห้อง</th><th>นักเรียนสมมติ</th><th>ประเมิน</th><th>ความถูกต้อง</th></tr></thead><tbody>{rows.map((row) => <tr key={row.network_id}><td><strong>{row.network_name}</strong></td><td>{row.district_name}</td><td>{row.school_count}</td><td>{row.classroom_count}</td><td>{row.student_count}</td><td>{row.session_count}</td><td><span className="accuracy-pill">{row.accuracy.toFixed(1)}%</span></td></tr>)}</tbody></table></div></section>
    </> : <EmptyState icon={<BarChart3 />} title="ยังไม่มีข้อมูลรายงาน" description="เมื่อมีการประเมิน ระบบจะสรุปผลแยกตามศูนย์เครือข่ายอัตโนมัติ" />}
  </>
}

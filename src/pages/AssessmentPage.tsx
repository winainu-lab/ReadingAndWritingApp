import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Play, RotateCcw, SkipForward, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Button, Notice, PageHeader } from '../components/ui'
import { calculateAssessmentResult, type AssessmentOutcome } from '../lib/assessment'
import { supabase } from '../lib/supabase'
import type { Classroom, Student, TestItem, TestTemplate } from '../types/app'

export function AssessmentPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [classroomId, setClassroomId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [testId, setTestId] = useState('')
  const [running, setRunning] = useState(false)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AssessmentOutcome>>({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [completed, setCompleted] = useState<{ score: number; total: number; accuracy: number } | null>(null)

  const classrooms = useQuery({ queryKey: ['classrooms-for-assessment'], queryFn: async () => { const { data, error } = await supabase.from('classrooms').select('*, school:schools(name)').is('archived_at', null).order('created_at', { ascending: false }); if (error) throw error; return data as Classroom[] } })
  const students = useQuery({ queryKey: ['students-for-assessment', classroomId], queryFn: async () => { const { data, error } = await supabase.from('students').select('*').eq('classroom_id', classroomId).order('student_no'); if (error) throw error; return data as Student[] }, enabled: Boolean(classroomId) })
  const tests = useQuery({ queryKey: ['published-tests'], queryFn: async () => { const { data, error } = await supabase.from('test_templates').select('*, skill:skills(name)').eq('is_published', true).is('archived_at', null).order('title'); if (error) throw error; return data as TestTemplate[] } })
  const items = useQuery({ queryKey: ['test-items', testId], queryFn: async () => { const { data, error } = await supabase.from('test_template_items').select('id,position,prompt,item_type,word_id').eq('test_template_id', testId).order('position'); if (error) throw error; return data as TestItem[] }, enabled: Boolean(testId) })

  const selectedClass = classrooms.data?.find((entry) => entry.id === classroomId)
  const selectedStudent = students.data?.find((entry) => entry.id === studentId)
  const selectedTest = tests.data?.find((entry) => entry.id === testId)
  const testItems = items.data ?? []

  const finish = useMutation({
    mutationFn: async () => {
      if (!selectedClass || !selectedStudent || !selectedTest || !startedAt || !user) throw new Error('ข้อมูลการทดสอบไม่ครบ')
      const result = calculateAssessmentResult(Object.values(answers), testItems.length)
      const { data: session, error } = await supabase.from('assessment_sessions').insert({
        assessor_id: user.id, school_id: selectedClass.school_id, classroom_id: selectedClass.id, student_id: selectedStudent.id,
        test_template_id: selectedTest.id, started_at: startedAt.toISOString(), completed_at: new Date().toISOString(),
        duration_seconds: Math.max(0, selectedTest.duration_seconds - secondsLeft), score: result.score, total_items: result.total, accuracy: result.accuracy,
      }).select('id').single()
      if (error) throw error
      const responses = testItems.map((item) => ({ assessment_session_id: session.id, test_template_item_id: item.id, outcome: answers[item.id] ?? 'skipped', response_time_ms: null }))
      const { error: responseError } = await supabase.from('assessment_responses').insert(responses)
      if (responseError) throw responseError
      return result
    },
    onSuccess: async (result) => { setRunning(false); setCompleted(result); await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }) },
  })

  useEffect(() => {
    if (!running || secondsLeft <= 0) return
    const timer = window.setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [running, secondsLeft])

  const formattedTime = useMemo(() => `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`, [secondsLeft])
  const begin = () => { if (!selectedTest || !testItems.length) return; setAnswers({}); setCurrent(0); setSecondsLeft(selectedTest.duration_seconds); setStartedAt(new Date()); setCompleted(null); setRunning(true) }
  const mark = (outcome: AssessmentOutcome) => { const item = testItems[current]; if (!item) return; setAnswers((value) => ({ ...value, [item.id]: outcome })); if (current < testItems.length - 1) setCurrent((value) => value + 1) }

  if (running) {
    const item = testItems[current]
    const answered = Object.keys(answers).length
    return <section className="runner">
      <header className="runner__header"><div><p>{selectedTest?.title}</p><strong>{selectedStudent?.display_name} · {selectedClass?.grade_level}/{selectedClass?.room_label}</strong></div><div className={`runner__timer ${secondsLeft < 30 ? 'runner__timer--urgent' : ''}`}><Clock3 /> {formattedTime}</div></header>
      <div className="runner__progress"><span style={{ width: `${((current + 1) / testItems.length) * 100}%` }} /></div>
      <main className="runner__stage"><p className="eyebrow">ข้อ {current + 1} จาก {testItems.length}</p><div className="reading-prompt" lang="th">{item?.prompt}</div><p>ให้นักเรียนอ่านออกเสียง แล้วผู้ทดสอบบันทึกผล</p></main>
      <footer className="runner__controls">
        <button className="score-button score-button--wrong" onClick={() => mark('incorrect')}><X /> อ่านผิด</button>
        <button className="score-button score-button--retry" onClick={() => mark('self_corrected')}><RotateCcw /> แก้ไขเอง</button>
        <button className="score-button score-button--skip" onClick={() => mark('skipped')}><SkipForward /> ข้าม</button>
        <button className="score-button score-button--correct" onClick={() => mark('correct')}><Check /> อ่านถูก</button>
      </footer>
      <div className="runner__bottom"><button disabled={current === 0} onClick={() => setCurrent((value) => Math.max(0, value - 1))}><ChevronLeft /> ก่อนหน้า</button><span>บันทึกแล้ว {answered}/{testItems.length}</span>{current === testItems.length - 1 ? <Button disabled={finish.isPending} onClick={() => finish.mutate()}>จบการทดสอบ</Button> : <button onClick={() => setCurrent((value) => Math.min(testItems.length - 1, value + 1))}>ถัดไป <ChevronRight /></button>}</div>
    </section>
  }

  return <>
    <PageHeader eyebrow="การประเมินรายบุคคล" title="เริ่มทดสอบการอ่าน" description="เลือกห้อง นักเรียนสมมติ และแบบทดสอบ ระบบจะจับเวลาตามที่ผู้ดูแลกำหนด" />
    {finish.error && <Notice tone="error">{finish.error.message}</Notice>}
    {completed && <section className="result-banner"><CheckCircle2 /><div><p>บันทึกผลเรียบร้อย</p><strong>{completed.score}/{completed.total} คำ · ความถูกต้อง {completed.accuracy.toFixed(0)}%</strong></div><Button variant="secondary" onClick={() => setCompleted(null)}>ทดสอบคนถัดไป</Button></section>}
    <section className="assessment-setup">
      <div className="assessment-step"><span>1</span><div><h2>เลือกห้องเรียน</h2><select value={classroomId} onChange={(event) => { setClassroomId(event.target.value); setStudentId('') }}><option value="">เลือกห้อง</option>{classrooms.data?.map((entry) => <option key={entry.id} value={entry.id}>{entry.school?.name} · {entry.grade_level}/{entry.room_label}</option>)}</select></div></div>
      <div className={`assessment-step ${!classroomId ? 'assessment-step--disabled' : ''}`}><span>2</span><div><h2>เลือกนักเรียน</h2><select value={studentId} onChange={(event) => setStudentId(event.target.value)} disabled={!classroomId}><option value="">เลือกนักเรียน</option>{students.data?.map((entry) => <option key={entry.id} value={entry.id}>เลขที่ {entry.student_no} · {entry.display_name}</option>)}</select></div></div>
      <div className={`assessment-step ${!studentId ? 'assessment-step--disabled' : ''}`}><span>3</span><div><h2>เลือกแบบทดสอบ</h2><select value={testId} onChange={(event) => setTestId(event.target.value)} disabled={!studentId}><option value="">เลือกแบบทดสอบ</option>{tests.data?.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} · {Math.round(entry.duration_seconds / 60)} นาที</option>)}</select></div></div>
      <div className="assessment-summary"><div><small>พร้อมทดสอบ</small><strong>{selectedStudent?.display_name ?? '–'}</strong><span>{selectedTest ? `${selectedTest.title} · ${selectedTest.item_count} ข้อ` : 'เลือกข้อมูลให้ครบ'}</span></div><Button disabled={!studentId || !testId || items.isLoading || !testItems.length} onClick={begin}><Play size={20} /> เริ่มจับเวลา</Button></div>
    </section>
  </>
}

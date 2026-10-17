import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpenCheck, CalendarClock, Clock3, Pencil, Play, Plus, School, Sparkles, Trash2, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { Button, EmptyState, LoadingState, Modal, Notice, PageHeader } from '../components/ui'
import { formatWindow, fromLocalInput, getTestStatus, testStatusLabels, toLocalInput } from '../lib/testAvailability'
import { supabase } from '../lib/supabase'
import type { Skill, TestTemplate } from '../types/app'

interface SkillPick { skillId: string; count: number }

interface TestPayload {
  title: string
  description: string
  duration: number
  skills: SkillPick[] | null
  isPublished: boolean
  availableFrom: string | null
  availableUntil: string | null
}

type Tab = 'own' | 'central'

export function TestsPage() {
  const { profile, user } = useAuth()
  const queryClient = useQueryClient()
  const isManager = profile?.role === 'admin' || profile?.role === 'supervisor'
  // Managers write the district tests; teachers write tests for their own school.
  const [chosenTab, setTab] = useState<Tab | null>(null)
  const tab: Tab = chosenTab ?? (isManager ? 'central' : 'own')
  const [showCreate, setShowCreate] = useState(false)
  const [editingTest, setEditingTest] = useState<TestTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TestTemplate | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const skills = useQuery({ queryKey: ['skills'], queryFn: async () => { const { data, error } = await supabase.from('skills').select('*').order('sort_order'); if (error) throw error; return data as Skill[] } })
  const tests = useQuery({ queryKey: ['test-templates'], queryFn: async () => { const { data, error } = await supabase.from('test_templates').select('*, skill:skills(name), school:schools(name)').is('archived_at', null).order('created_at', { ascending: false }); if (error) throw error; return data as unknown as TestTemplate[] } })

  const visibleTests = useMemo(() => (tests.data ?? []).filter((test) => {
    if (isManager) return tab === 'central' ? test.scope === 'central' : test.scope === 'school'
    return tab === 'central' ? test.scope === 'central' : test.scope === 'school' && test.created_by === user?.id
  }), [tests.data, tab, isManager, user?.id])

  const canWriteCentral = isManager
  const canCreate = isManager ? tab === 'central' : tab === 'own'
  const canManage = (test: TestTemplate) => isManager || (test.scope === 'school' && test.created_by === user?.id)

  const invalidateTests = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ['test-templates'] }), queryClient.invalidateQueries({ queryKey: ['published-tests'] })])
  }
  const skillsJson = (picks: SkillPick[] | null) => picks ? picks.map((pick) => ({ skill_id: pick.skillId, count: pick.count })) : null

  const createTest = useMutation({
    mutationFn: async (payload: TestPayload) => { const { error } = await supabase.rpc('create_test_template_mixed', { p_title: payload.title, p_description: payload.description, p_duration_seconds: payload.duration, p_skills: skillsJson(payload.skills) as never, p_is_published: payload.isPublished, p_available_from: payload.availableFrom as string, p_available_until: payload.availableUntil as string }); if (error) throw error },
    onSuccess: async () => { await invalidateTests(); setShowCreate(false); setMessage('สร้างแบบทดสอบและสุ่มรายการคำเรียบร้อย') },
  })
  const updateTest = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: TestPayload }) => { const { error } = await supabase.rpc('update_test_template_mixed', { p_test_id: id, p_title: payload.title, p_description: payload.description, p_duration_seconds: payload.duration, p_skills: skillsJson(payload.skills) as never, p_is_published: payload.isPublished, p_available_from: payload.availableFrom as string, p_available_until: payload.availableUntil as string }); if (error) throw error },
    onSuccess: async () => { await invalidateTests(); setEditingTest(null); setMessage('บันทึกการแก้ไขแบบทดสอบแล้ว') },
  })
  const archiveTest = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc('archive_test_template', { p_test_id: id }); if (error) throw error },
    onSuccess: async () => { await invalidateTests(); setDeleteTarget(null); setMessage('ลบแบบทดสอบออกจากรายการแล้ว โดยยังเก็บผลประเมินย้อนหลังไว้') },
  })

  const header = isManager
    ? { title: 'แบบทดสอบการอ่าน', description: 'สร้างแบบทดสอบส่วนกลางของเขต เลือกว่าให้ครูเห็นหรือไม่ และกำหนดช่วงเวลาที่ให้ทดสอบ ผสมหลายทักษะได้' }
    : { title: 'แบบทดสอบการอ่าน', description: 'สร้างแบบอ่านของโรงเรียนตนเอง หรือเลือกใช้แบบทดสอบส่วนกลางที่เขตกำหนด' }
  const emptyDescription = tab === 'central'
    ? isManager ? 'สร้างแบบทดสอบกลางเพื่อให้ทุกโรงเรียนทดสอบพร้อมกัน' : 'เขตยังไม่ได้เปิดแบบทดสอบส่วนกลางให้ท่านในขณะนี้'
    : isManager ? 'ครูยังไม่ได้สร้างแบบอ่านของโรงเรียน' : 'สร้างแบบอ่านของโรงเรียนโดยผสมทักษะและเลือกจำนวนคำได้'

  return <>
    <PageHeader eyebrow="คลังการประเมิน" title={header.title} description={header.description} action={canCreate ? <Button onClick={() => { createTest.reset(); setShowCreate(true) }}><Plus size={18} /> สร้างแบบทดสอบ</Button> : undefined} />
    {message && <Notice tone="success">{message}</Notice>}
    <div className="learn-segment tests-tabs" role="tablist" aria-label="ประเภทแบบทดสอบ">
      {isManager ? <>
        <button role="tab" aria-selected={tab === 'central'} className={tab === 'central' ? 'active' : ''} onClick={() => setTab('central')}>ส่วนกลางของเขต</button>
        <button role="tab" aria-selected={tab === 'own'} className={tab === 'own' ? 'active' : ''} onClick={() => setTab('own')}>ที่ครูสร้างในโรงเรียน</button>
      </> : <>
        <button role="tab" aria-selected={tab === 'own'} className={tab === 'own' ? 'active' : ''} onClick={() => setTab('own')}>แบบอ่านที่สร้างเอง</button>
        <button role="tab" aria-selected={tab === 'central'} className={tab === 'central' ? 'active' : ''} onClick={() => setTab('central')}>ส่วนกลางจากเขต</button>
      </>}
    </div>
    {tests.isLoading ? <LoadingState /> : visibleTests.length ? <section className="test-grid">{visibleTests.map((test) => {
      const status = getTestStatus(test)
      return <article className="test-card" key={test.id}>
        <div className="test-card__top"><span className="test-card__icon"><BookOpenCheck /></span><span className={`status ${status === 'open' ? 'status--active' : 'status--inactive'}`}>{testStatusLabels[status]}</span></div>
        <p className="eyebrow">{test.skill?.name ?? 'ผสมหลายทักษะ'}{test.scope === 'school' && test.school?.name ? ` · ${test.school.name}` : ''}</p><h2>{test.title}</h2><p>{test.description || 'แบบทดสอบสำหรับประเมินรายบุคคล'}</p>
        <div className="test-card__meta"><span><Sparkles size={17} /> {test.item_count} ข้อ</span><span><Clock3 size={17} /> {Math.round(test.duration_seconds / 60)} นาที</span></div>
        {test.scope === 'central' && <p className="test-card__window"><CalendarClock size={16} /> {formatWindow(test)}</p>}
        {test.scope === 'school' && !isManager && <p className="test-card__window"><School size={16} /> ใช้ได้เฉพาะโรงเรียนของท่าน</p>}
        <div className="test-card__actions">
          {!isManager && status === 'open' && <Link className="button button--primary" to="/assessment"><Play size={16} /> เริ่มทดสอบ</Link>}
          {canManage(test) && <><Button variant="secondary" onClick={() => { updateTest.reset(); setEditingTest(test) }}><Pencil size={16} /> แก้ไข</Button><button className="icon-danger" aria-label={`ลบ ${test.title}`} title="ลบแบบทดสอบ" onClick={() => { archiveTest.reset(); setDeleteTarget(test) }}><Trash2 size={18} /></button></>}
        </div>
      </article>
    })}</section> : <EmptyState icon={<BookOpenCheck />} title="ยังไม่มีแบบทดสอบ" description={emptyDescription} />}

    {showCreate && <Modal title={canWriteCentral ? 'สร้างแบบทดสอบส่วนกลาง' : 'สร้างแบบอ่านของโรงเรียน'} onClose={() => setShowCreate(false)}><TestForm skills={skills.data ?? []} central={canWriteCentral} busy={createTest.isPending} error={createTest.error?.message} onSubmit={(payload) => createTest.mutate(payload)} onCancel={() => setShowCreate(false)} /></Modal>}
    {editingTest && <Modal title="แก้ไขแบบทดสอบ" onClose={() => setEditingTest(null)}><TestForm skills={skills.data ?? []} central={editingTest.scope === 'central'} test={editingTest} busy={updateTest.isPending} error={updateTest.error?.message} onSubmit={(payload) => updateTest.mutate({ id: editingTest.id, payload })} onCancel={() => setEditingTest(null)} /></Modal>}
    {deleteTarget && <Modal title="ยืนยันลบแบบทดสอบ" onClose={() => setDeleteTarget(null)}><div className="confirm-dialog">
      {archiveTest.error && <Notice tone="error">{archiveTest.error.message}</Notice>}
      <div className="confirm-dialog__icon"><Trash2 /></div><p>ต้องการลบ <strong>{deleteTarget.title}</strong> ออกจากรายการหรือไม่?</p><small>แบบทดสอบจะไม่ถูกนำไปใช้ใหม่ แต่รายงานและผลประเมินเดิมจะไม่สูญหาย</small>
      <div className="form-actions"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button><Button variant="danger" disabled={archiveTest.isPending} onClick={() => archiveTest.mutate(deleteTarget.id)}>ลบแบบทดสอบ</Button></div>
    </div></Modal>}
  </>
}

function TestForm({ skills, central, test, busy, error, onSubmit, onCancel }: { skills: Skill[]; central: boolean; test?: TestTemplate; busy: boolean; error?: string; onSubmit: (payload: TestPayload) => void; onCancel: () => void }) {
  const [picks, setPicks] = useState<SkillPick[]>([{ skillId: test?.skill_id ?? '', count: test?.skill_id ? test.item_count : 10 }])
  const [replaceWords, setReplaceWords] = useState(!test)
  const [localError, setLocalError] = useState<string | null>(null)
  const total = picks.reduce((sum, pick) => sum + (pick.skillId ? pick.count : 0), 0)
  const levels = useMemo(() => [...new Set(skills.map((skill) => skill.level_code))], [skills])
  const updatePick = (index: number, change: Partial<SkillPick>) => setPicks((value) => value.map((pick, position) => position === index ? { ...pick, ...change } : pick))

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const chosen = picks.filter((pick) => pick.skillId)
    if (replaceWords) {
      if (!chosen.length) return setLocalError('กรุณาเลือกอย่างน้อย 1 ทักษะ')
      if (new Set(chosen.map((pick) => pick.skillId)).size !== chosen.length) return setLocalError('เลือกทักษะซ้ำกัน กรุณาเลือกทักษะละหนึ่งแถว')
      if (total < 3 || total > 100) return setLocalError('จำนวนคำรวมต้องอยู่ระหว่าง 3 ถึง 100')
    }
    const from = fromLocalInput(String(form.get('availableFrom') ?? ''))
    const until = fromLocalInput(String(form.get('availableUntil') ?? ''))
    if (from && until && new Date(until) <= new Date(from)) return setLocalError('เวลาสิ้นสุดต้องหลังเวลาเริ่ม')
    setLocalError(null)
    onSubmit({
      title: String(form.get('title')), description: String(form.get('description')), duration: Number(form.get('minutes')) * 60,
      skills: replaceWords ? chosen : null, isPublished: central ? form.get('published') === 'on' : true, availableFrom: central ? from : null, availableUntil: central ? until : null,
    })
  }

  return <form className="form-grid" onSubmit={submit}>
    {(localError || error) && <div className="form-grid__full"><Notice tone="error">{localError ?? error}</Notice></div>}
    <label className="form-grid__full">ชื่อแบบทดสอบ<input name="title" required defaultValue={test?.title ?? ''} placeholder={central ? 'เช่น ทดสอบการอ่านกลางภาค 1/2569' : 'เช่น อ่านคำพื้นฐาน ป.1 ชุดที่ 1'} /></label>
    <label className="form-grid__full">คำอธิบาย<textarea name="description" rows={2} defaultValue={test?.description ?? ''} placeholder="จุดประสงค์หรือคำแนะนำสำหรับผู้ทดสอบ" /></label>

    <div className="form-grid__full skill-mixer">
      <div className="skill-mixer__head"><strong>ชุดคำที่ใช้ทดสอบ</strong>{test && <label className="learn-toggle"><input type="checkbox" checked={replaceWords} onChange={(event) => setReplaceWords(event.target.checked)} /> สุ่มชุดคำใหม่</label>}</div>
      {!replaceWords ? <p className="learn-hint">คงชุดคำเดิมไว้ ({test?.item_count} ข้อ) แก้ได้เฉพาะชื่อ เวลา และการตั้งค่าอื่น หากมีผลประเมินแล้วจะเปลี่ยนชุดคำไม่ได้</p> : <>
        {picks.map((pick, index) => <div className="skill-mixer__row" key={index}>
          <select value={pick.skillId} onChange={(event) => updatePick(index, { skillId: event.target.value })} aria-label={`ทักษะที่ ${index + 1}`}><option value="">เลือกทักษะ</option>{levels.map((level) => <optgroup key={level} label={level}>{skills.filter((skill) => skill.level_code === level).map((skill) => <option key={skill.id} value={skill.id}>{skill.code} · {skill.name}</option>)}</optgroup>)}</select>
          <input type="number" min={1} max={50} value={pick.count} onChange={(event) => updatePick(index, { count: Math.max(1, Math.min(50, Number(event.target.value) || 1)) })} aria-label={`จำนวนคำทักษะที่ ${index + 1}`} />
          <span>คำ</span>
          {picks.length > 1 && <button type="button" className="icon-button" onClick={() => setPicks((value) => value.filter((_, position) => position !== index))} aria-label="ลบทักษะนี้"><X size={17} /></button>}
        </div>)}
        <div className="skill-mixer__foot"><Button type="button" variant="ghost" onClick={() => setPicks((value) => [...value, { skillId: '', count: 5 }])}><Plus size={16} /> เพิ่มทักษะ</Button><span>รวม <strong>{total}</strong> คำ (3–100)</span></div>
      </>}
    </div>

    <label>เวลา (นาที)<input name="minutes" type="number" min="1" max="60" defaultValue={test ? Math.round(test.duration_seconds / 60) : 5} required /></label>
    {central && <>
      <label className="checkbox-field"><input name="published" type="checkbox" defaultChecked={test?.is_published ?? true} /><span><strong>ให้ครูเห็นและใช้ได้</strong><small>ปิดไว้ = ฉบับร่าง ครูมองไม่เห็น</small></span></label>
      <label>เริ่มให้ทดสอบ (ไม่บังคับ)<input name="availableFrom" type="datetime-local" defaultValue={toLocalInput(test?.available_from ?? null)} /></label>
      <label>สิ้นสุดการทดสอบ (ไม่บังคับ)<input name="availableUntil" type="datetime-local" defaultValue={toLocalInput(test?.available_until ?? null)} /></label>
      <div className="form-grid__full info-callout"><CalendarClock size={20} /><span>ถ้ากำหนดช่วงเวลา ครูจะเริ่มทดสอบได้เฉพาะในช่วงนั้น ระบบตรวจฝั่งเซิร์ฟเวอร์ด้วย ไม่เว้นว่างเท่ากับเปิดตลอดเวลา</span></div>
    </>}
    {!central && <div className="form-grid__full info-callout"><School size={20} /><span>แบบอ่านนี้ใช้ได้เฉพาะโรงเรียนของท่าน และผลประเมินจะนับรวมในภาพรวมของโรงเรียนท่านเท่านั้น</span></div>}
    <div className="form-actions form-grid__full"><Button type="button" variant="ghost" onClick={onCancel}>ยกเลิก</Button><Button type="submit" disabled={busy}>{test ? 'บันทึกการแก้ไข' : 'สร้างแบบทดสอบ'}</Button></div>
  </form>
}

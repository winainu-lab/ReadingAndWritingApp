import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpenCheck, Clock3, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Button, EmptyState, LoadingState, Modal, Notice, PageHeader } from '../components/ui'
import { supabase } from '../lib/supabase'
import type { Skill, TestTemplate } from '../types/app'

interface TestPayload {
  title: string
  description: string
  skillId: string
  duration: number
  count: number
  isPublished: boolean
}

export function TestsPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingTest, setEditingTest] = useState<TestTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TestTemplate | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const skills = useQuery({ queryKey: ['skills'], queryFn: async () => { const { data, error } = await supabase.from('skills').select('*').order('sort_order'); if (error) throw error; return data as Skill[] } })
  const tests = useQuery({ queryKey: ['test-templates'], queryFn: async () => { const { data, error } = await supabase.from('test_templates').select('*, skill:skills(name)').is('archived_at', null).order('created_at', { ascending: false }); if (error) throw error; return data as TestTemplate[] } })

  const invalidateTests = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey: ['test-templates'] }), queryClient.invalidateQueries({ queryKey: ['published-tests'] })])
  }

  const createTest = useMutation({
    mutationFn: async (payload: TestPayload) => { const { error } = await supabase.rpc('create_test_template_from_skill', { p_title: payload.title, p_description: payload.description, p_skill_id: payload.skillId, p_duration_seconds: payload.duration, p_item_count: payload.count }); if (error) throw error },
    onSuccess: async () => { await invalidateTests(); setShowCreate(false); setMessage('สร้างแบบทดสอบและสุ่มรายการคำเรียบร้อย') },
  })
  const updateTest = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: TestPayload }) => { const { error } = await supabase.rpc('update_test_template_from_skill', { p_test_id: id, p_title: payload.title, p_description: payload.description, p_skill_id: payload.skillId, p_duration_seconds: payload.duration, p_item_count: payload.count, p_is_published: payload.isPublished }); if (error) throw error },
    onSuccess: async () => { await invalidateTests(); setEditingTest(null); setMessage('บันทึกการแก้ไขแบบทดสอบแล้ว') },
  })
  const archiveTest = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.rpc('archive_test_template', { p_test_id: id }); if (error) throw error },
    onSuccess: async () => { await invalidateTests(); setDeleteTarget(null); setMessage('ลบแบบทดสอบออกจากรายการแล้ว โดยยังเก็บผลประเมินย้อนหลังไว้') },
  })

  const payloadFromForm = (formElement: HTMLFormElement): TestPayload => {
    const form = new FormData(formElement)
    return { title: String(form.get('title')), description: String(form.get('description')), skillId: String(form.get('skill')), duration: Number(form.get('minutes')) * 60, count: Number(form.get('count')), isPublished: form.get('published') === 'on' }
  }
  const handleCreate = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); createTest.mutate(payloadFromForm(event.currentTarget)) }
  const handleUpdate = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (editingTest) updateTest.mutate({ id: editingTest.id, payload: payloadFromForm(event.currentTarget) }) }
  const canManage = profile?.role === 'admin' || profile?.role === 'supervisor'

  return <>
    <PageHeader eyebrow="คลังการประเมิน" title="แบบทดสอบการอ่าน" description="กำหนดเรื่อง จำนวนข้อ และระยะเวลา จากทักษะตามลำดับแบบเรียนเร็วใหม่" action={canManage ? <Button onClick={() => setShowCreate(true)}><Plus size={18} /> สร้างแบบทดสอบ</Button> : undefined} />
    {message && <Notice tone="success">{message}</Notice>}
    {tests.isLoading ? <LoadingState /> : tests.data?.length ? <section className="test-grid">{tests.data.map((test) => <article className="test-card" key={test.id}>
      <div className="test-card__top"><span className="test-card__icon"><BookOpenCheck /></span><span className={`status ${test.is_published ? 'status--active' : 'status--inactive'}`}>{test.is_published ? 'พร้อมใช้' : 'ฉบับร่าง'}</span></div>
      <p className="eyebrow">{test.skill?.name ?? 'หลายทักษะ'}</p><h2>{test.title}</h2><p>{test.description || 'แบบทดสอบสำหรับประเมินรายบุคคล'}</p>
      <div className="test-card__meta"><span><Sparkles size={17} /> {test.item_count} ข้อ</span><span><Clock3 size={17} /> {Math.round(test.duration_seconds / 60)} นาที</span></div>
      {canManage && <div className="test-card__actions"><Button variant="secondary" onClick={() => setEditingTest(test)}><Pencil size={16} /> แก้ไข</Button><button className="icon-danger" aria-label={`ลบ ${test.title}`} title="ลบแบบทดสอบ" onClick={() => setDeleteTarget(test)}><Trash2 size={18} /></button></div>}
    </article>)}</section> : <EmptyState icon={<BookOpenCheck />} title="ยังไม่มีแบบทดสอบ" description="สร้างแบบทดสอบโดยเลือกทักษะ จำนวนข้อ และระยะเวลาที่ต้องการ" />}

    {showCreate && <Modal title="สร้างแบบทดสอบ" onClose={() => setShowCreate(false)}><TestForm skills={skills.data ?? []} busy={createTest.isPending} error={createTest.error?.message} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} /></Modal>}
    {editingTest && <Modal title="แก้ไขแบบทดสอบ" onClose={() => setEditingTest(null)}><TestForm skills={skills.data ?? []} test={editingTest} busy={updateTest.isPending} error={updateTest.error?.message} onSubmit={handleUpdate} onCancel={() => setEditingTest(null)} /></Modal>}
    {deleteTarget && <Modal title="ยืนยันลบแบบทดสอบ" onClose={() => setDeleteTarget(null)}><div className="confirm-dialog">
      {archiveTest.error && <Notice tone="error">{archiveTest.error.message}</Notice>}
      <div className="confirm-dialog__icon"><Trash2 /></div><p>ต้องการลบ <strong>{deleteTarget.title}</strong> ออกจากรายการหรือไม่?</p><small>แบบทดสอบจะไม่ถูกนำไปใช้ใหม่ แต่รายงานและผลประเมินเดิมจะไม่สูญหาย</small>
      <div className="form-actions"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button><Button variant="danger" disabled={archiveTest.isPending} onClick={() => archiveTest.mutate(deleteTarget.id)}>ลบแบบทดสอบ</Button></div>
    </div></Modal>}
  </>
}

function TestForm({ skills, test, busy, error, onSubmit, onCancel }: { skills: Skill[]; test?: TestTemplate; busy: boolean; error?: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  return <form className="form-grid" onSubmit={onSubmit}>
    {error && <div className="form-grid__full"><Notice tone="error">{error}</Notice></div>}
    <label className="form-grid__full">ชื่อแบบทดสอบ<input name="title" required defaultValue={test?.title ?? ''} placeholder="เช่น อ่านคำพื้นฐาน ป.1 ชุดที่ 1" /></label>
    <label className="form-grid__full">คำอธิบาย<textarea name="description" rows={3} defaultValue={test?.description ?? ''} placeholder="จุดประสงค์หรือคำแนะนำสำหรับผู้ทดสอบ" /></label>
    <label className="form-grid__full">เรื่องที่ต้องการทดสอบ<select name="skill" required defaultValue={test?.skill_id ?? ''}><option value="" disabled>เลือกทักษะ</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.level_code} · {skill.name}</option>)}</select></label>
    <label>จำนวนคำ<input name="count" type="number" min="3" max="50" defaultValue={test?.item_count ?? 10} required /></label>
    <label>เวลา (นาที)<input name="minutes" type="number" min="1" max="60" defaultValue={test ? Math.round(test.duration_seconds / 60) : 5} required /></label>
    <label className="checkbox-field form-grid__full"><input name="published" type="checkbox" defaultChecked={test?.is_published ?? true} /><span><strong>เปิดให้ใช้งาน</strong><small>ครูจะเห็นแบบทดสอบนี้ในหน้าเริ่มทดสอบ</small></span></label>
    <div className="form-grid__full info-callout"><Sparkles size={20} /><span>เมื่อแก้ทักษะหรือจำนวน ระบบจะสุ่มคำใหม่ หากมีผลประเมินแล้วจะล็อกสองส่วนนี้เพื่อรักษาความถูกต้องของรายงาน</span></div>
    <div className="form-actions form-grid__full"><Button type="button" variant="ghost" onClick={onCancel}>ยกเลิก</Button><Button type="submit" disabled={busy}>{test ? 'บันทึกการแก้ไข' : 'สร้างแบบทดสอบ'}</Button></div>
  </form>
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Eye, EyeOff, LockKeyhole, Pencil, Plus, Trash2, UnlockKeyhole } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Button, EmptyState, LoadingState, Modal, Notice, PageHeader } from '../components/ui'
import { applyResourceThumbnailFallback, getGoogleDriveThumbnailUrl, resolveResourceThumbnail } from '../lib/googleDrive'
import { supabase } from '../lib/supabase'
import type { LearningResource } from '../types/app'

interface ResourcePayload {
  title: string
  description: string | null
  category: string
  google_drive_url: string
  thumbnail_url: string | null
  is_locked: boolean
  is_published: boolean
  sort_order: number
}

export function ResourcesAdminPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<LearningResource | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LearningResource | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const resources = useQuery({ queryKey: ['learning-resources-admin'], queryFn: async () => { const { data, error } = await supabase.from('learning_resources').select('*').order('sort_order').order('created_at', { ascending: false }); if (error) throw error; return data as LearningResource[] } })

  const refresh = async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['learning-resources-admin'] }), queryClient.invalidateQueries({ queryKey: ['public-learning-resources'] })]) }
  const createResource = useMutation({ mutationFn: async (payload: ResourcePayload) => { const { error } = await supabase.from('learning_resources').insert({ ...payload, created_by: profile!.id }); if (error) throw error }, onSuccess: async () => { await refresh(); setShowCreate(false); setMessage('เพิ่มเอกสารในคลังเรียบร้อย') } })
  const updateResource = useMutation({ mutationFn: async ({ id, payload }: { id: string; payload: Partial<ResourcePayload> }) => { const { error } = await supabase.from('learning_resources').update(payload).eq('id', id); if (error) throw error }, onSuccess: async () => { await refresh(); setEditing(null); setMessage('บันทึกการแก้ไขเอกสารแล้ว') } })
  const deleteResource = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from('learning_resources').delete().eq('id', id); if (error) throw error }, onSuccess: async () => { await refresh(); setDeleteTarget(null); setMessage('ลบเอกสารออกจากคลังแล้ว') } })

  const readForm = (element: HTMLFormElement): ResourcePayload => {
    const form = new FormData(element)
    const googleDriveUrl = String(form.get('url')).trim()
    return {
      title: String(form.get('title')).trim(),
      description: String(form.get('description')).trim() || null,
      category: String(form.get('category')).trim() || 'ใบความรู้',
      google_drive_url: googleDriveUrl,
      thumbnail_url: String(form.get('thumbnail')).trim() || getGoogleDriveThumbnailUrl(googleDriveUrl),
      is_locked: form.get('locked') === 'on',
      is_published: form.get('published') === 'on',
      sort_order: Number(form.get('sortOrder')) || 0,
    }
  }
  const handleCreate = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); createResource.mutate(readForm(event.currentTarget)) }
  const handleUpdate = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (editing) updateResource.mutate({ id: editing.id, payload: readForm(event.currentTarget) }) }

  return <>
    <PageHeader eyebrow="สำหรับผู้ดูแลระบบ" title="เอกสารและใบความรู้" description="เพิ่มเอกสารจาก Google Drive ระบบสร้างภาพตัวอย่างหน้าแรกอัตโนมัติ และกำหนดการมองเห็นหรือการล็อกได้" action={<Button onClick={() => setShowCreate(true)}><Plus size={18} /> เพิ่มเอกสาร</Button>} />
    {message && <Notice tone="success">{message}</Notice>}
    <div className="resource-admin-tip"><BookOpen /><div><strong>ก่อนเพิ่มเอกสาร</strong><span>ตั้งค่าการแชร์ใน Google Drive เป็น “ทุกคนที่มีลิงก์ดูได้” เพื่อให้ภาพตัวอย่างและปุ่มเปิดเอกสารทำงาน</span></div></div>
    {resources.isLoading ? <LoadingState /> : resources.data?.length ? <section className="resource-admin-list">{resources.data.map((resource) => <article key={resource.id} className="resource-admin-row">
      <img src={resolveResourceThumbnail(resource.google_drive_url ?? '', resource.thumbnail_url)} alt="" referrerPolicy="no-referrer" onError={(event) => applyResourceThumbnailFallback(event.currentTarget, resource.google_drive_url ?? '')} />
      <div className="resource-admin-row__content"><div><span className="tag">{resource.category}</span>{!resource.is_published && <span className="status status--inactive">ซ่อนจากหน้าเว็บ</span>}{resource.is_locked && <span className="resource-lock-tag"><LockKeyhole size={13} /> ล็อก</span>}</div><h2>{resource.title}</h2><p>{resource.description || 'ไม่มีคำอธิบาย'}</p></div>
      <div className="resource-admin-row__actions"><button title={resource.is_locked ? 'ปลดล็อก' : 'ล็อกเอกสาร'} onClick={() => updateResource.mutate({ id: resource.id, payload: { is_locked: !resource.is_locked } })}>{resource.is_locked ? <UnlockKeyhole /> : <LockKeyhole />}</button><button title={resource.is_published ? 'ซ่อนจากหน้าเว็บ' : 'แสดงบนหน้าเว็บ'} onClick={() => updateResource.mutate({ id: resource.id, payload: { is_published: !resource.is_published } })}>{resource.is_published ? <Eye /> : <EyeOff />}</button><button title="แก้ไข" onClick={() => setEditing(resource)}><Pencil /></button><button className="danger" title="ลบ" onClick={() => setDeleteTarget(resource)}><Trash2 /></button></div>
    </article>)}</section> : <EmptyState icon={<BookOpen />} title="ยังไม่มีเอกสาร" description="กด “เพิ่มเอกสาร” แล้ววางลิงก์ Google Drive แบบสาธารณะ" />}

    {showCreate && <Modal title="เพิ่มเอกสารและใบความรู้" onClose={() => { if (!createResource.isPending) setShowCreate(false) }}><ResourceForm busy={createResource.isPending} error={createResource.error?.message} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} /></Modal>}
    {editing && <Modal title="แก้ไขเอกสาร" onClose={() => setEditing(null)}><ResourceForm resource={editing} busy={updateResource.isPending} error={updateResource.error?.message} onSubmit={handleUpdate} onCancel={() => setEditing(null)} /></Modal>}
    {deleteTarget && <Modal title="ยืนยันลบเอกสาร" onClose={() => setDeleteTarget(null)}><div className="confirm-dialog">{deleteResource.error && <Notice tone="error">{deleteResource.error.message}</Notice>}<div className="confirm-dialog__icon"><Trash2 /></div><p>ต้องการลบ <strong>{deleteTarget.title}</strong> หรือไม่?</p><small>การลบรายการนี้ไม่ลบไฟล์ต้นฉบับใน Google Drive</small><div className="form-actions"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button><Button variant="danger" disabled={deleteResource.isPending} onClick={() => deleteResource.mutate(deleteTarget.id)}>ลบรายการ</Button></div></div></Modal>}
  </>
}

function ResourceForm({ resource, busy, error, onSubmit, onCancel }: { resource?: LearningResource; busy: boolean; error?: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void }) {
  const [url, setUrl] = useState(resource?.google_drive_url ?? '')
  const [thumbnail, setThumbnail] = useState(resource?.thumbnail_url ?? '')
  const preview = resolveResourceThumbnail(url, thumbnail)
  return <form className="form-grid resource-form" onSubmit={onSubmit}>
    {error && <div className="form-grid__full"><Notice tone="error">{error}</Notice></div>}
    <label className="form-grid__full">ชื่อเอกสาร<input name="title" required defaultValue={resource?.title ?? ''} placeholder="เช่น แบบฝึกอ่านคำพื้นฐาน บทที่ 1" /></label>
    <label className="form-grid__full">คำอธิบาย<textarea name="description" rows={3} defaultValue={resource?.description ?? ''} placeholder="สรุปเนื้อหาแบบสั้น ๆ" /></label>
    <label>ประเภท<input name="category" required defaultValue={resource?.category ?? 'ใบความรู้'} list="resource-categories" /><datalist id="resource-categories"><option value="ใบความรู้" /><option value="บทเรียน" /><option value="แบบฝึก" /><option value="คู่มือครู" /><option value="รูปภาพ" /></datalist></label>
    <label>ลำดับการแสดง<input name="sortOrder" type="number" defaultValue={resource?.sort_order ?? 0} /></label>
    <label className="form-grid__full">ลิงก์ Google Drive แบบสาธารณะ<input name="url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://drive.google.com/file/d/.../view" /></label>
    <label className="form-grid__full">ลิงก์ภาพปก (ไม่บังคับ)<input name="thumbnail" type="url" value={thumbnail} onChange={(event) => setThumbnail(event.target.value)} placeholder="เว้นว่างเพื่อใช้หน้าแรกจาก Google Drive อัตโนมัติ" /></label>
    <div className="resource-form__preview form-grid__full"><img src={preview} alt="ตัวอย่างปกเอกสาร" referrerPolicy="no-referrer" onError={(event) => applyResourceThumbnailFallback(event.currentTarget, url)} /><div><strong>ตัวอย่างการ์ดสัดส่วน A4</strong><span>หากภาพไม่ขึ้น ให้ตรวจว่าลิงก์แชร์เป็นสาธารณะ หรือนำ URL ภาพปกมาใส่เอง</span></div></div>
    <label className="checkbox-field"><input name="published" type="checkbox" defaultChecked={resource?.is_published ?? true} /><span><strong>แสดงบนหน้าเว็บ</strong><small>ปิดเพื่อเก็บเป็นฉบับร่าง</small></span></label>
    <label className="checkbox-field"><input name="locked" type="checkbox" defaultChecked={resource?.is_locked ?? false} /><span><strong>ล็อกการเปิดดู</strong><small>แสดงปกได้ แต่กดเปิดเอกสารไม่ได้</small></span></label>
    <div className="resource-form__save-note form-grid__full">หน้าต่างจะปิดหลังจากระบบบันทึกสำเร็จเท่านั้น</div>
    <div className="form-actions form-grid__full"><Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>ยกเลิก</Button><Button type="submit" disabled={busy}>{busy ? 'กำลังบันทึก…' : resource ? 'บันทึกการแก้ไข' : 'บันทึกและเพิ่มเอกสาร'}</Button></div>
  </form>
}

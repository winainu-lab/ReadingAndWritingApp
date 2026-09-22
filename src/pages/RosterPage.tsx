import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, Plus, School, Trash2, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Button, EmptyState, LoadingState, Modal, Notice, PageHeader } from '../components/ui'
import { SchoolOptions } from '../components/SchoolOptions'
import { supabase } from '../lib/supabase'
import type { Classroom, Student } from '../types/app'
import type { SchoolChoice } from '../lib/schoolSorting'

export function RosterPage() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Classroom | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Classroom | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const schools = useQuery({
    queryKey: ['active-schools'],
    queryFn: async () => {
      const { data, error } = await supabase.from('schools').select('id,name,district,network_center_id,network_center:network_centers(name,sort_order)').eq('is_active', true)
      if (error) throw error
      return data as unknown as SchoolChoice[]
    },
  })
  const classrooms = useQuery({
    queryKey: ['classrooms'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classrooms').select('*, school:schools(name)').is('archived_at', null).order('created_at', { ascending: false })
      if (error) throw error
      return data as Classroom[]
    },
  })
  const students = useQuery({
    queryKey: ['students', selectedClass?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').eq('classroom_id', selectedClass!.id).order('student_no')
      if (error) throw error
      return data as Student[]
    },
    enabled: Boolean(selectedClass),
  })

  const createClassroom = useMutation({
    mutationFn: async (payload: { schoolId: string; grade: string; room: string; count: number; year: number }) => {
      const { error } = await supabase.rpc('create_classroom_with_students', {
        p_school_id: payload.schoolId,
        p_grade_level: payload.grade,
        p_room_label: payload.room,
        p_student_count: payload.count,
        p_academic_year: payload.year,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['classrooms'] })
      setShowCreate(false)
      setMessage('สร้างห้องและรายชื่อนักเรียนสมมติเรียบร้อย')
    },
  })

  const archiveClassroom = useMutation({
    mutationFn: async (classroomId: string) => {
      const { error } = await supabase.rpc('archive_own_classroom', { p_classroom_id: classroomId })
      if (error) throw error
    },
    onSuccess: async (_, classroomId) => {
      if (selectedClass?.id === classroomId) setSelectedClass(null)
      setDeleteTarget(null)
      setMessage('นำห้องออกจากรายการแล้ว โดยยังเก็บผลประเมินย้อนหลังไว้อย่างปลอดภัย')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['classrooms'] }),
        queryClient.invalidateQueries({ queryKey: ['classrooms-for-assessment'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ])
    },
  })

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    createClassroom.mutate({ schoolId: String(form.get('school')), grade: String(form.get('grade')), room: String(form.get('room')), count: Number(form.get('count')), year: Number(form.get('year')) })
  }

  return (
    <>
      <PageHeader eyebrow="ผู้เรียนแบบไม่ระบุตัวตน" title="ห้องและนักเรียน" description="กำหนดระดับ ห้อง และจำนวน ระบบจะสร้างนักเรียนคนที่ 1, 2, 3… ให้โดยอัตโนมัติ" action={<Button onClick={() => setShowCreate(true)}><Plus size={18} /> สร้างห้องทดสอบ</Button>} />
      {message && <Notice tone="success">{message}</Notice>}
      <div className="roster-layout">
        <section className="class-grid">
          {classrooms.isLoading ? <LoadingState /> : classrooms.data?.length ? classrooms.data.map((classroom) => (
            <article key={classroom.id} className={`class-card ${selectedClass?.id === classroom.id ? 'class-card--selected' : ''}`}>
              <button className="class-card__main" onClick={() => setSelectedClass(classroom)}>
                <span className="class-card__icon"><GraduationCap /></span>
                <div><small>{classroom.school?.name}</small><strong>{classroom.grade_level} / {classroom.room_label}</strong><span><Users size={16} /> {classroom.student_count} คน · ปี {classroom.academic_year}</span></div>
              </button>
              {(classroom.created_by === profile?.id || profile?.role === 'admin') && <button className="class-card__delete" aria-label={`ลบ ${classroom.grade_level} ${classroom.room_label}`} title="ลบห้อง" onClick={() => setDeleteTarget(classroom)}><Trash2 size={18} /></button>}
            </article>
          )) : <EmptyState icon={<School />} title="ยังไม่มีห้องทดสอบ" description="สร้างห้องแรกโดยกำหนดระดับ ห้อง และจำนวนผู้เรียน" />}
        </section>
        <aside className="roster-panel">
          {selectedClass ? <><header><div><p className="eyebrow">รายชื่อนักเรียนสมมติ</p><h2>{selectedClass.grade_level} / {selectedClass.room_label}</h2></div><span>{selectedClass.student_count} คน</span></header>{students.isLoading ? <LoadingState /> : <ol className="student-list">{students.data?.map((student) => <li key={student.id}><span>{student.student_no}</span><strong>{student.display_name}</strong><small>สัมพันธ์กับเลขที่ {student.student_no}</small></li>)}</ol>}</> : <div className="roster-panel__empty"><Users size={36} /><h3>เลือกห้องเพื่อดูรายชื่อ</h3><p>รายชื่อใช้หมายเลขสมมติและไม่เก็บประวัตินักเรียนจริง</p></div>}
        </aside>
      </div>

      {showCreate && <Modal title="สร้างห้องทดสอบ" onClose={() => setShowCreate(false)}><form className="form-grid" onSubmit={handleCreate}>
        {createClassroom.error && <div className="form-grid__full"><Notice tone="error">{createClassroom.error.message}</Notice></div>}
        <label className="form-grid__full">โรงเรียน<select name="school" required defaultValue={profile?.role === 'teacher' ? profile.school_id ?? '' : ''}><option value="" disabled>เลือกโรงเรียน</option><SchoolOptions schools={(schools.data ?? []).filter((school) => profile?.role !== 'teacher' || school.id === profile.school_id)} /></select></label>
        <label>ระดับชั้น<select name="grade" required defaultValue="ป.1">{['อ.2','อ.3','ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3'].map((grade) => <option key={grade}>{grade}</option>)}</select></label>
        <label>ห้อง<input name="room" required defaultValue="ห้อง 1" /></label>
        <label>จำนวนนักเรียน<input name="count" type="number" required min="1" max="60" defaultValue="20" /></label>
        <label>ปีการศึกษา<input name="year" type="number" required min="2560" max="2600" defaultValue="2569" /></label>
        <div className="form-grid__full privacy-callout"><strong>หลักการข้อมูล</strong><span>ระบบจะสร้าง “นักเรียนคนที่ 1–{`{จำนวน}`}” และใช้หมายเลขเดียวกับเลขที่ที่ครูกำหนด ไม่มีชื่อ วันเกิด หรือเลขประจำตัวประชาชน</span></div>
        <div className="form-actions form-grid__full"><Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>ยกเลิก</Button><Button type="submit" disabled={createClassroom.isPending}>สร้างห้องและรายชื่อ</Button></div>
      </form></Modal>}

      {deleteTarget && <Modal title="ยืนยันลบห้อง" onClose={() => setDeleteTarget(null)}>
        <div className="confirm-dialog">
          {archiveClassroom.error && <Notice tone="error">{archiveClassroom.error.message}</Notice>}
          <div className="confirm-dialog__icon"><Trash2 /></div>
          <p>ต้องการนำ <strong>{deleteTarget.grade_level} / {deleteTarget.room_label}</strong> ออกจากรายการใช้งานหรือไม่?</p>
          <small>รายชื่อนักเรียนจะไม่แสดงในงานใหม่ แต่ผลประเมินย้อนหลังจะยังอยู่ครบ</small>
          <div className="form-actions"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button><Button variant="danger" disabled={archiveClassroom.isPending} onClick={() => archiveClassroom.mutate(deleteTarget.id)}>ลบห้อง</Button></div>
        </div>
      </Modal>}
    </>
  )
}

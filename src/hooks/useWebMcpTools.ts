import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/app'

interface RosterInput {
  schoolId: string
  gradeLevel: string
  roomLabel: string
  studentCount: number
  academicYear: number
}

function parseRosterInput(input: unknown): RosterInput {
  if (!input || typeof input !== 'object') throw new Error('กรุณาระบุข้อมูลห้องเรียน')
  const value = input as Record<string, unknown>
  const result: RosterInput = {
    schoolId: String(value.schoolId ?? ''),
    gradeLevel: String(value.gradeLevel ?? ''),
    roomLabel: String(value.roomLabel ?? ''),
    studentCount: Number(value.studentCount),
    academicYear: Number(value.academicYear),
  }
  if (!result.schoolId || !result.gradeLevel || !result.roomLabel) throw new Error('ข้อมูลโรงเรียน ระดับ หรือห้องไม่ครบ')
  if (!Number.isInteger(result.studentCount) || result.studentCount < 1 || result.studentCount > 60) throw new Error('จำนวนนักเรียนต้องอยู่ระหว่าง 1 ถึง 60')
  if (!Number.isInteger(result.academicYear) || result.academicYear < 2560 || result.academicYear > 2600) throw new Error('ปีการศึกษาไม่ถูกต้อง')
  return result
}

export function useWebMcpTools(profile: Profile | null) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    const context = document.modelContext
    if (!context?.registerTool || !profile || profile.status !== 'approved') return
    const lifecycle = new AbortController()

    const register = (tool: ModelContextTool) => {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined)
      } catch {
        // Browsers without a complete WebMCP implementation can continue normally.
      }
    }

    register({
      name: 'open_reading_assessment',
      title: 'เปิดหน้าทดสอบการอ่าน',
      description: 'เปิดขั้นตอนเลือกห้อง นักเรียนสมมติ และแบบทดสอบ โดยยังไม่เริ่มจับเวลา',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => {
        navigate('/assessment')
        return { page: 'assessment', started: false }
      },
    })

    register({
      name: 'create_anonymous_roster',
      title: 'สร้างห้องและนักเรียนสมมติ',
      description: 'สร้างห้องทดสอบและนักเรียนคนที่ 1 ถึงจำนวนที่กำหนดในโรงเรียนที่ผู้ใช้มีสิทธิ์',
      inputSchema: {
        type: 'object',
        properties: {
          schoolId: { type: 'string', format: 'uuid' },
          gradeLevel: { type: 'string' },
          roomLabel: { type: 'string' },
          studentCount: { type: 'integer', minimum: 1, maximum: 60 },
          academicYear: { type: 'integer', minimum: 2560, maximum: 2600 },
        },
        required: ['schoolId', 'gradeLevel', 'roomLabel', 'studentCount', 'academicYear'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input) => {
        const values = parseRosterInput(input)
        const { data, error } = await supabase.rpc('create_classroom_with_students', {
          p_school_id: values.schoolId,
          p_grade_level: values.gradeLevel,
          p_room_label: values.roomLabel,
          p_student_count: values.studentCount,
          p_academic_year: values.academicYear,
        })
        if (error) throw new Error(error.message)
        await queryClient.invalidateQueries({ queryKey: ['classrooms'] })
        navigate('/rosters')
        return { classroomId: data, studentCount: values.studentCount, names: `นักเรียนคนที่ 1–${values.studentCount}` }
      },
    })

    return () => lifecycle.abort()
  }, [navigate, profile, queryClient])
}

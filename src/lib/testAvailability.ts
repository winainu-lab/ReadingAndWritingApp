import type { TestTemplate } from '../types/app'

export type TestStatus = 'draft' | 'upcoming' | 'open' | 'closed'

type TestWindow = Pick<TestTemplate, 'scope' | 'is_published' | 'available_from' | 'available_until'>

export function getTestStatus(test: TestWindow, now = new Date()): TestStatus {
  if (!test.is_published) return 'draft'
  if (test.scope === 'school') return 'open'
  if (test.available_from && now < new Date(test.available_from)) return 'upcoming'
  if (test.available_until && now > new Date(test.available_until)) return 'closed'
  return 'open'
}

export const testStatusLabels: Record<TestStatus, string> = {
  draft: 'ซ่อนจากครู',
  upcoming: 'ยังไม่ถึงเวลา',
  open: 'เปิดให้ทดสอบ',
  closed: 'หมดเวลาแล้ว',
}

export function formatWindow(test: Pick<TestTemplate, 'available_from' | 'available_until'>) {
  const format = (value: string) => new Date(value).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
  if (test.available_from && test.available_until) return `${format(test.available_from)} – ${format(test.available_until)}`
  if (test.available_from) return `เริ่ม ${format(test.available_from)}`
  if (test.available_until) return `ถึง ${format(test.available_until)}`
  return 'ไม่กำหนดช่วงเวลา'
}

export function toLocalInput(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null
}

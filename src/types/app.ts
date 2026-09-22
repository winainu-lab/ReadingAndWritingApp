export type AppRole = 'admin' | 'supervisor' | 'teacher'
export type ProfileStatus = 'pending' | 'approved' | 'suspended'

export interface Profile {
  id: string
  email: string | null
  full_name: string
  role: AppRole
  status: ProfileStatus
  school_id: string | null
  school?: { name: string } | null
}

export interface NetworkCenter {
  id: string
  code: string
  name: string
  district_name: string
  sort_order: number
}

export interface School {
  id: string
  dmc_code: string
  moe_code: string | null
  name: string
  subdistrict: string | null
  district: string
  network_center_id: string
  is_active: boolean
  network_center?: NetworkCenter | null
}

export interface Classroom {
  id: string
  school_id: string
  grade_level: string
  room_label: string
  academic_year: number
  student_count: number
  created_by: string
  archived_at: string | null
  school?: { name: string } | null
}

export interface Student {
  id: string
  classroom_id: string
  student_no: number
  display_name: string
}

export interface Skill {
  id: string
  code: string
  name: string
  level_code: string
  sort_order: number
  description?: string | null
}

export interface TestTemplate {
  id: string
  title: string
  description: string | null
  duration_seconds: number
  item_count: number
  is_published: boolean
  skill_id: string | null
  created_by: string | null
  archived_at: string | null
  skill?: { name: string } | null
}

export interface VocabularyWord {
  id: string
  display_text: string
  normalized_text: string
  pronunciation: string | null
  syllable_count: number
  difficulty: number
  source_note: string | null
  is_active: boolean
}

export interface LearningResource {
  id: string
  title: string
  description: string | null
  category: string
  google_drive_url?: string
  public_url?: string | null
  thumbnail_url: string | null
  is_locked: boolean
  is_published?: boolean
  sort_order: number
  created_at: string
}

export interface TestItem {
  id: string
  position: number
  prompt: string
  item_type: string
  word_id: string | null
}

export interface AppSettings {
  id: 'default'
  system_name: string
  affiliation: string
  footer_text: string
  landing_kicker: string
  welcome_headline: string
  welcome_description: string
  logo_path: string | null
  updated_at: string
  updated_by: string | null
}

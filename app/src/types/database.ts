export type UserRole = 'admin' | 'trainer' | 'staff' | 'designer'
export type AttendanceValue = 'true' | 'false' | 'late' | null
export type TrainingStatus = 'upcoming' | 'active' | 'on-hold' | 'completed'
export type TrainingType = 'Hands-On' | 'Discussion'
export type SkillLevel = 'Intermediate' | 'Advanced' | 'Expert' | 'Completed'

export interface Designer {
  id: string
  name: string
  email: string | null
  team: string | null
  rank: string
  platform: string | null
  auth_user_id: string | null
  created_at: string | null
  updated_at: string | null
  notes: string | null
}

export interface Team {
  id: string
  name: string
  created_at: string | null
}

export interface Training {
  id: string
  name: string
  type: TrainingType
  platform: string | null
  start_date: string | null
  target_date: string | null
  schedule: string[] | null
  status: TrainingStatus
  notes: string | null
  created_at: string | null
  updated_at: string | null
  skill_name: string | null
  skill_level: string | null
  conflict_note: string | null
  topic: string | null
  facilitator: string | null
  resources_url: string | null
  checklist: string[] | null
}

export interface TrainingEnrollment {
  id: string
  training_id: string | null
  designer_id: string | null
  enrolled_at: string | null
  designer_schedule: string[] | null
  output_url: string | null
  checklist_results: boolean[] | null
  output_score: number | null
  attendance_score: number | null
  final_score: number | null
}

export interface TrainingSession {
  id: string
  training_id: string | null
  session_date: string
  day_of_week: string | null
  notes: string | null
  created_at: string | null
  proof_url: string | null
}

export interface Attendance {
  id: string
  session_id: string | null
  designer_id: string | null
  is_present: AttendanceValue
  notes: string | null
  marked_at: string | null
}

export interface DesignerSkill {
  id: string
  designer_id: string | null
  platform: string
  level: SkillLevel
  source: string | null
  updated_at: string | null
}

export interface MakeupSession {
  id: string
  original_session_id: string | null
  designer_id: string | null
  training_id: string | null
  makeup_date: string
  day_of_week: string | null
  is_attended: boolean | null
  notes: string | null
  proof_url: string | null
  created_at: string | null
}

export interface MakeupRequest {
  id: string
  designer_id: string | null
  session_id: string | null
  training_id: string | null
  proposed_date: string
  proposed_day: string | null
  reason: string | null
  status: string | null
  trainer_note: string | null
  created_at: string | null
}

export interface UserRoleRecord {
  id: string
  auth_user_id: string
  role: UserRole
  designer_id: string | null
  created_at: string | null
  permissions: Record<string, boolean> | null
}

export interface SkillGap {
  id: string
  designer_id: string | null
  training_type: string
  skill_name: string
  is_completed: boolean | null
  updated_at: string | null
}

export type HubCategory = 'learn' | 'assets' | 'inspiration' | 'code'

export interface HubResource {
  id: string
  category: HubCategory
  title: string
  description: string | null
  icon_name: string | null
  thumbnail_url: string | null
  content: string | null
  language: string | null
  external_url: string | null
  tags: string[] | null
  order_index: number
  created_by: string | null
  created_at: string | null
}

export interface AppState {
  user: import('@supabase/supabase-js').User | null
  role: UserRole | null
  designer: Designer | null
  perms: Record<string, boolean>
  designers: Designer[]
  teams: Team[]
  trainings: Training[]
  enrollments: TrainingEnrollment[]
  sessions: TrainingSession[]
  attendance: Attendance[]
  designerSkills: DesignerSkill[]
  makeups: MakeupSession[]
  makeupRequests: MakeupRequest[]
  users: UserRoleRecord[]
  hubResources: HubResource[]
  page: string
  loading: boolean
}

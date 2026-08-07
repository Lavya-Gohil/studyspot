export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'
export type SessionStatus = 'active' | 'full' | 'ongoing' | 'completed' | 'cancelled'
export type SessionMode = 'in_person' | 'online'
export type SessionVibe = 'silent' | 'pomodoro' | 'discussion' | 'coding' | 'exam_prep' | 'casual'
export type RequestStatus = 'pending' | 'approved' | 'declined' | 'withdrawn'
export type MessageType = 'text' | 'system' | 'checkin'
/**
 * Mirrors `year_of_study_enum` in supabase/migrations/001_schema.sql.
 *
 * Declared as a const tuple, not a bare union, so validation schemas can be
 * built from it (`z.enum(YEARS_OF_STUDY)`) instead of restating the values.
 * They had already drifted apart: profileUpdateSchema listed high_school,
 * masters and other, which Postgres rejects, while omitting year_5,
 * postgraduate and self_studying, which it accepts. Picking "Year 5" failed
 * with a bare "Invalid input." Deriving both the type and the schema from one
 * array makes that divergence a compile error rather than a runtime surprise.
 */
export const YEARS_OF_STUDY = [
  'year_1',
  'year_2',
  'year_3',
  'year_4',
  'year_5',
  'postgraduate',
  'phd',
  'self_studying',
] as const

export type YearOfStudy = (typeof YEARS_OF_STUDY)[number]
export type ReportReason = 'harassment' | 'spam' | 'inappropriate' | 'fake_profile' | 'other'

export interface Profile {
  id: string
  email: string
  onboarding_step: number
  full_name: string | null
  username: string | null
  age: number | null
  is_minor: boolean
  country: string | null
  country_name: string | null
  state_region: string | null
  city: string | null
  verification_status: VerificationStatus
  verification_rejected_reason: string | null
  avatar_url: string | null
  college: string | null
  course: string | null
  year_of_study: YearOfStudy | null
  subjects: string[]
  bio: string | null
  study_streak: number
  total_sessions_hosted: number
  total_sessions_attended: number
  last_checkin_date: string | null
  expo_push_token: string | null
  is_admin: boolean
  is_banned: boolean
  ban_reason: string | null
  banned_at: string | null
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  host_id: string
  subject: string
  subject_tags: string[]
  description: string | null
  vibe: SessionVibe
  mode: SessionMode
  location_name: string | null
  location_address: string | null
  location_country: string | null
  location_state: string | null
  location_city: string | null
  google_place_id: string | null
  start_time: string
  end_time: string
  spots_total: number
  spots_filled: number
  status: SessionStatus
  view_count: number
  interest_count: number
  created_at: string
  updated_at: string
  // Joined fields from session_feed view
  host_name?: string
  host_avatar?: string | null
  host_college?: string | null
  host_verification_status?: VerificationStatus
  host_is_minor?: boolean
  spots_remaining?: number
}

export interface SessionRequest {
  id: string
  session_id: string
  requester_id: string
  message: string | null
  status: RequestStatus
  checked_in_at: string | null
  created_at: string
  updated_at: string
  requester?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'college' | 'year_of_study' | 'verification_status' | 'is_minor' | 'subjects'>
}

export interface Message {
  id: string
  session_id: string
  sender_id: string | null
  content: string
  type: MessageType
  is_deleted: boolean
  created_at: string
  sender?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'verification_status'>
}

export interface Report {
  id: string
  reporter_id: string
  reported_id: string
  session_id: string | null
  reason: ReportReason
  details: string | null
  resolved: boolean
  admin_notes: string | null
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
}

export interface Block {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}

export interface SavedSession {
  id: string
  user_id: string
  session_id: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'new_request' | 'request_approved' | 'request_declined' | 'session_reminder' | 'new_message' | 'verification_approved' | 'verification_rejected' | 'session_cancelled'
  title: string
  body: string
  data: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface StudyStats {
  user_id: string
  verified_hours: number
  verified_sessions: number
  on_time_count: number
  approved_count: number
  showed_count: number
  avg_rating: number | null
  rating_count: number
}

export interface SessionRating {
  id: string
  session_id: string
  rater_id: string
  ratee_id: string
  rating: number
  created_at: string
}

export type ReputationLevel = 'new' | 'building' | 'reliable' | 'trusted' | 'exemplary'

export interface ReputationComponent {
  label: string
  /** 0–100 sub-score, or null when there's no data for it yet */
  value: number | null
  detail: string
}

export interface Reputation {
  /** 0–100, or null for brand-new users with no track record */
  score: number | null
  level: ReputationLevel
  label: string
  components: ReputationComponent[]
}

export type CircleRole = 'owner' | 'admin' | 'member'

export interface Circle {
  id: string
  owner_id: string
  name: string
  description: string | null
  topic: string | null
  emoji: string | null
  is_private: boolean
  join_code: string
  member_count: number
  created_at: string
  updated_at: string
  // joined / computed
  is_member?: boolean
  my_role?: CircleRole
}

export interface CircleMember {
  id: string
  circle_id: string
  user_id: string
  role: CircleRole
  created_at: string
  member?: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'college' | 'verification_status'>
}

export interface CirclePost {
  id: string
  circle_id: string
  author_id: string | null
  content: string
  created_at: string
  author?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export type GoalType = 'hours' | 'sessions' | 'custom'
export type GoalStatus = 'active' | 'completed' | 'failed' | 'archived'

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  type: GoalType
  target: number
  baseline: number
  manual_progress: number
  unit: string | null
  deadline: string | null
  status: GoalStatus
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface FeedFilters {
  vibe?: SessionVibe[]
  subjects?: string[]
  date?: 'today' | 'this_week' | string
  minSpots?: number
  maxSpots?: number
  radius?: number
  verifiedHostOnly?: boolean
}

export const VIBE_LABELS: Record<SessionVibe, string> = {
  silent: 'Silent Study',
  pomodoro: 'Pomodoro',
  discussion: 'Group Discussion',
  coding: 'Coding Session',
  exam_prep: 'Exam Prep',
  casual: 'Casual Study',
}

export const YEAR_LABELS: Record<YearOfStudy, string> = {
  year_1: 'Year 1',
  year_2: 'Year 2',
  year_3: 'Year 3',
  year_4: 'Year 4',
  year_5: 'Year 5',
  postgraduate: 'Postgraduate',
  phd: 'PhD / Doctoral',
  self_studying: 'Not enrolled (Self-studying)',
}

export const SUBJECT_CATEGORIES = [
  { category: 'Sciences', subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics'] },
  { category: 'Engineering', subjects: ['Computer Science', 'Electronics', 'Mechanical', 'Civil Engineering'] },
  { category: 'Commerce', subjects: ['Accounting', 'Economics', 'Finance', 'Business Studies'] },
  { category: 'Law', subjects: ['Constitutional Law', 'Criminal Law', 'Corporate Law', 'International Law'] },
  { category: 'Medicine', subjects: ['Anatomy', 'Physiology', 'Pharmacology', 'Pathology'] },
  { category: 'Arts & Humanities', subjects: ['History', 'Philosophy', 'Literature', 'Psychology'] },
  { category: 'Languages', subjects: ['English', 'French', 'Spanish', 'German', 'Japanese', 'Mandarin'] },
  { category: 'Competitive Exams', subjects: ['JEE', 'NEET', 'UPSC', 'GMAT', 'GRE', 'IELTS', 'Bar Exam', 'CA'] },
]

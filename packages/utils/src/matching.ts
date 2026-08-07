import type { StudyStats, Reputation } from '@studyspot/types'
import { computeReputation } from './reputation'

export interface MatchProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  college: string | null
  course: string | null
  year_of_study: string | null
  subjects: string[]
  city: string | null
  country: string | null
  study_streak: number
  total_sessions_attended: number
  verification_status: string
}

export interface MatchResult {
  profile: MatchProfile
  score: number
  reasons: string[]
}

function sharedSubjects(a: string[], b: string[]): string[] {
  const setB = new Set((b || []).map((s) => s.toLowerCase()))
  return (a || []).filter((s) => setB.has(s.toLowerCase()))
}

/**
 * Compatibility (Matchmaker): how good a study partner this person would be.
 * Rewards shared subjects, same course/year/college/location, plus a small
 * reliability bonus from reputation. Returns a 0–100 score and reasons.
 */
export function scoreCompatibility(
  me: MatchProfile,
  c: MatchProfile,
  stats?: StudyStats
): MatchResult {
  let pts = 0
  const reasons: string[] = []

  const shared = sharedSubjects(me.subjects, c.subjects)
  if (shared.length > 0) {
    pts += Math.min(shared.length, 4) * 16
    reasons.push(
      `${shared.length} shared subject${shared.length > 1 ? 's' : ''}: ${shared.slice(0, 3).join(', ')}`
    )
  }
  if (me.course && c.course && me.course === c.course) {
    pts += 12
    reasons.push(`Both studying ${c.course}`)
  }
  if (me.year_of_study && c.year_of_study === me.year_of_study) {
    pts += 8
    reasons.push('Same year of study')
  }
  if (me.college && c.college && me.college === c.college) {
    pts += 12
    reasons.push('Same college')
  }
  if (me.city && c.city && me.city === c.city) {
    pts += 8
    reasons.push(`Both in ${c.city}`)
  } else if (me.country && c.country && me.country === c.country) {
    pts += 3
  }

  if (stats) {
    const rep: Reputation = computeReputation(stats)
    if (rep.score != null) {
      pts += Math.round((rep.score / 100) * 10)
      if (rep.level === 'trusted' || rep.level === 'exemplary') {
        reasons.push(`Reliable partner (${rep.label})`)
      }
    }
  }

  if (c.verification_status === 'verified') reasons.push('Verified student')

  return { profile: c, score: Math.min(100, Math.round(pts)), reasons }
}

/**
 * Similarity (Study Twin): how alike two students are in subjects, level, and
 * study habits. Returns a 0–100 similarity and the traits they share.
 */
export function scoreSimilarity(me: MatchProfile, c: MatchProfile): MatchResult {
  let sim = 0
  let max = 0
  const reasons: string[] = []

  // Subjects. Jaccard
  const union = new Set(
    [...(me.subjects || []), ...(c.subjects || [])].map((s) => s.toLowerCase())
  )
  const shared = sharedSubjects(me.subjects, c.subjects)
  if (union.size > 0) {
    max += 40
    sim += 40 * (shared.length / union.size)
    if (shared.length > 0) {
      reasons.push(`${shared.length} shared subject${shared.length > 1 ? 's' : ''}`)
    }
  }

  if (me.year_of_study && c.year_of_study) {
    max += 15
    if (me.year_of_study === c.year_of_study) {
      sim += 15
      reasons.push('Same year')
    }
  }
  if (me.course && c.course) {
    max += 15
    if (me.course === c.course) {
      sim += 15
      reasons.push(`Both study ${c.course}`)
    }
  }
  if (me.city && c.city) {
    max += 10
    if (me.city === c.city) {
      sim += 10
      reasons.push('Same city')
    }
  }

  // Habits, closeness of attendance volume
  max += 20
  const a = me.total_sessions_attended
  const b = c.total_sessions_attended
  const closeness = 1 - Math.abs(a - b) / Math.max(a, b, 1)
  sim += 20 * closeness
  if (closeness > 0.7 && Math.max(a, b) > 0) reasons.push('Similar study activity')

  const percent = max > 0 ? Math.round((sim / max) * 100) : 0
  return { profile: c, score: percent, reasons }
}

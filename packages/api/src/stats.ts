import type { SupabaseClient } from '@supabase/supabase-js'
import type { StudyStats } from '@studyspot/types'

const EMPTY_STATS = (userId: string): StudyStats => ({
  user_id: userId,
  verified_hours: 0,
  verified_sessions: 0,
  on_time_count: 0,
  approved_count: 0,
  showed_count: 0,
  avg_rating: null,
  rating_count: 0,
})

export async function fetchStudyStats(
  client: SupabaseClient,
  userId: string
): Promise<StudyStats> {
  const { data, error } = await client
    .from('user_study_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data as StudyStats | null) ?? EMPTY_STATS(userId)
}

/** Upsert a 1–5 peer rating for a co-attendee of a session. */
export async function rateParticipant(
  client: SupabaseClient,
  sessionId: string,
  rateeId: string,
  rating: number
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await client
    .from('session_ratings')
    .upsert(
      { session_id: sessionId, rater_id: user.id, ratee_id: rateeId, rating },
      { onConflict: 'session_id,rater_id,ratee_id' }
    )
  if (error) throw error
}

/** Ratings the current user has already given for a session, keyed by ratee. */
export async function fetchMyRatingsForSession(
  client: SupabaseClient,
  sessionId: string
): Promise<Record<string, number>> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return {}

  const { data } = await client
    .from('session_ratings')
    .select('ratee_id, rating')
    .eq('session_id', sessionId)
    .eq('rater_id', user.id)

  const map: Record<string, number> = {}
  ;(data || []).forEach((r: { ratee_id: string; rating: number }) => {
    map[r.ratee_id] = r.rating
  })
  return map
}

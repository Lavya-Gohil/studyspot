import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { computeReputation } from '@studyspot/utils'
import { ReputationCard } from '@/components/profile/ReputationCard'
import { friendlyDbError } from '@/lib/db-errors'
import { scoreCompatibility, scoreSimilarity, type MatchProfile } from '@/lib/matching'
import { MatchClient } from './MatchClient'
import type { StudyStats } from '@studyspot/types'

const PROFILE_FIELDS =
  'id, full_name, avatar_url, college, course, year_of_study, subjects, city, country, study_streak, total_sessions_attended, verification_status'

/** Ranked results handed to the client; it pages through them locally. */
const MAX_RESULTS = 24

export default async function MatchPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: meRow, error: meError } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', user.id)
    .single()

  // Scoring reads the viewer's own profile on every comparison, so without it
  // there is nothing to rank against, surface the failure instead of
  // rendering an empty screen that looks like "nobody matched you".
  if (meError || !meRow) {
    return (
      <MatchClient
        compatible={[]}
        similar={[]}
        mySubjects={[]}
        topMatchReputation={null}
        error={friendlyDbError(meError?.message)}
      />
    )
  }

  const me = meRow as unknown as MatchProfile
  const mySubjects: string[] = me.subjects || []

  // Candidate pool: people who share a subject with me (best signal),
  // falling back to same-country students.
  let query = supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .neq('id', user.id)
    .eq('is_banned', false)
    .gte('onboarding_step', 5)
    .limit(60)

  if (mySubjects.length > 0) {
    query = query.overlaps('subjects', mySubjects)
  } else if (me.country) {
    query = query.eq('country', me.country)
  }

  const { data: candRows, error: candError } = await query
  const candidates = (candRows as unknown as MatchProfile[]) || []

  // Reputation/stats for the candidate pool, in one query.
  const statsById = new Map<string, StudyStats>()
  if (candidates.length > 0) {
    const { data: statRows } = await supabase
      .from('user_study_stats')
      .select('*')
      .in(
        'user_id',
        candidates.map((c) => c.id)
      )
    for (const s of (statRows as StudyStats[]) || []) statsById.set(s.user_id, s)
  }

  // Both lists drop results with no reasons: a card that can't say why it's
  // there is exactly the opaque recommendation this screen exists to avoid.
  // (A country-only compatibility hit scores 3 and explains nothing.)
  const compatible = candidates
    .map((c) => scoreCompatibility(me, c, statsById.get(c.id)))
    .filter((r) => r.score > 0 && r.reasons.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)

  const similar = candidates
    .map((c) => scoreSimilarity(me, c))
    .filter((r) => r.score > 0 && r.reasons.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)

  // "Reliable partner (Trusted)" is the one reason the string only gestures
  // at. The reputation it came from is already in hand, so the top match gets
  // the real breakdown rather than a claim the user has to take on faith.
  const topStats = compatible[0] ? statsById.get(compatible[0].profile.id) : undefined
  const topMatchReputation =
    topStats && computeReputation(topStats).score != null ? (
      <ReputationCard stats={topStats} isOwn={false} />
    ) : null

  return (
    <MatchClient
      compatible={compatible}
      similar={similar}
      mySubjects={mySubjects}
      topMatchReputation={topMatchReputation}
      error={candError ? friendlyDbError(candError.message) : null}
    />
  )
}

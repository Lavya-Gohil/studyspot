import type { Goal } from '@studyspot/types'
import { createClient } from '@/lib/supabase/server'
import { countSessionsToday, fetchMyNextSession } from '@studyspot/api/sessions'
import { FeedClient } from './FeedClient'
import { FeedHeader } from './FeedHeader'
import { TodayPanel } from './TodayPanel'

/**
 * The user's own calendar day, as `YYYY-MM-DD`.
 *
 * Must match how migration 011 buckets focus_daily, which uses the timezone on
 * the profile rather than the server's. en-CA is the shortest route to an ISO
 * date from Intl — the alternative is reassembling parts by hand.
 */
function localDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date)
}

type FocusDay = { day: string; total_seconds: number | string | null }
type StudyStats = { verified_hours: number; verified_sessions: number }

/** Run a query, and fall back rather than blanking the page if it fails. */
async function softly<T>(run: () => Promise<T | null>, fallback: T): Promise<T> {
  try {
    return (await run()) ?? fallback
  } catch {
    return fallback
  }
}

export default async function FeedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'country, country_name, state_region, city, full_name, study_streak, level, timezone'
    )
    .eq('id', user!.id)
    .single()

  const country = profile?.country || undefined
  const timezone = profile?.timezone || 'UTC'
  const today = localDay(new Date(), timezone)
  const weekStart = localDay(new Date(Date.now() - 6 * 864e5), timezone)

  // All of this is fetched here rather than in the client so it renders with
  // the page and never ships to the browser. A failure in any one of these is
  // not worth blanking the feed over — the affected panel simply degrades.
  //
  // focus_daily is security_invoker (011/012), so RLS scopes it to this user
  // without a user_id filter, and it is pre-aggregated per local day — a week
  // of rows rather than a week of raw sessions.
  const [todayCount, nextSession, focusDays, activeGoal, studyStats] = await Promise.all([
    countSessionsToday(supabase, country).catch(() => 0),
    fetchMyNextSession(supabase, user!.id).catch(() => null),
    // Each of these is wrapped rather than chained with .catch: a Supabase
    // query builder is only PromiseLike until awaited, so it has .then but no
    // .catch to hang the fallback on.
    softly<FocusDay[]>(
      async () =>
        (await supabase
          .from('focus_daily')
          .select('day, total_seconds')
          .gte('day', weekStart)).data as FocusDay[] | null,
      []
    ),
    softly<Goal | null>(
      async () =>
        (await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user!.id)
          .eq('status', 'active')
          // Nearest deadline first; goals without one fall to the back rather
          // than the front, which is what `nullsFirst: false` buys over a
          // bare order.
          .order('deadline', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()).data as Goal | null,
      null
    ),
    softly<StudyStats | null>(
      async () =>
        (await supabase
          .from('user_study_stats')
          .select('verified_hours, verified_sessions')
          .eq('user_id', user!.id)
          .maybeSingle()).data as StudyStats | null,
      null
    ),
  ])

  const todaySeconds = Number(
    focusDays.find((d) => d.day === today)?.total_seconds ?? 0
  )
  const weekSeconds = focusDays.reduce((sum, d) => sum + Number(d.total_seconds ?? 0), 0)
  const daysActive = focusDays.filter((d) => Number(d.total_seconds ?? 0) > 0).length

  const goalStatValue =
    activeGoal?.type === 'hours'
      ? (studyStats?.verified_hours ?? 0)
      : activeGoal?.type === 'sessions'
        ? (studyStats?.verified_sessions ?? 0)
        : 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <FeedHeader
        userFullName={profile?.full_name || null}
        userCountryName={profile?.country_name || null}
        todayCount={todayCount}
        nextSession={nextSession}
      />
      <TodayPanel
        streak={profile?.study_streak ?? 0}
        todayMinutes={Math.round(todaySeconds / 60)}
        weekMinutes={Math.round(weekSeconds / 60)}
        daysActive={daysActive}
        level={profile?.level ?? 1}
        goal={activeGoal}
        goalStatValue={goalStatValue}
      />
      <FeedClient userCountry={profile?.country || null} />
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { countSessionsToday, fetchMyNextSession } from '@studyspot/api/sessions'
import { FeedClient } from './FeedClient'
import { FeedHeader } from './FeedHeader'

export default async function FeedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('country, country_name, state_region, city, full_name, study_streak')
    .eq('id', user!.id)
    .single()

  const country = profile?.country || undefined

  // Header data is fetched here rather than in the client so it renders with
  // the page and never ships to the browser. A failure in either of these is
  // not worth blanking the feed over — the header simply degrades.
  const [todayCount, nextSession] = await Promise.all([
    countSessionsToday(supabase, country).catch(() => 0),
    fetchMyNextSession(supabase, user!.id).catch(() => null),
  ])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <FeedHeader
        userFullName={profile?.full_name || null}
        userCountryName={profile?.country_name || null}
        studyStreak={profile?.study_streak ?? 0}
        todayCount={todayCount}
        nextSession={nextSession}
      />
      <FeedClient userCountry={profile?.country || null} />
    </div>
  )
}

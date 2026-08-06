import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
// Deep import, not the '@studyspot/api' barrel: the barrel re-exports ./client,
// which calls createClient() at module scope and pulls a second Supabase client
// into the graph that the web app never uses.
import { fetchFeedSessions } from '@studyspot/api/sessions'
import { friendlyDbError } from '@/lib/db-errors'
import { ExploreClient } from './ExploreClient'
import type { Session } from '@studyspot/types'

export default async function ExplorePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Was a bare `user!.id` below, which crashed the route for a signed-out
  // visitor instead of sending them to log in.
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('country, subjects')
    .eq('id', user.id)
    .single()

  // Same fetch the feed uses, rather than a second hand-rolled copy of it:
  // it carries the country guard (in-person sessions stay in the viewer's
  // country, online ones are global) that this page was missing.
  let sessions: Session[] = []
  let error: string | null = null
  try {
    sessions = await fetchFeedSessions(supabase, {
      country: profile?.country || undefined,
      limit: 50,
    })
  } catch (err) {
    error = friendlyDbError(err instanceof Error ? err.message : null)
  }

  return (
    <ExploreClient
      sessions={sessions}
      mySubjects={profile?.subjects || []}
      error={error}
    />
  )
}

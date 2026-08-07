import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LeaderboardClient, type LeaderRow } from './LeaderboardClient'

export const metadata = { title: 'Leaderboard. StudySpot' }

export default async function LeaderboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // The first board is fetched on the server so the page arrives populated
  // rather than flashing a spinner; switching scope refetches client-side.
  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase.rpc('leaderboard', { p_scope: 'global', p_days: 7, p_limit: 25 }),
    supabase.from('profiles').select('college').eq('id', user.id).single(),
  ])

  return (
    <LeaderboardClient
      initialRows={(rows ?? []) as LeaderRow[]}
      currentUserId={user.id}
      hasCollege={!!profile?.college}
    />
  )
}

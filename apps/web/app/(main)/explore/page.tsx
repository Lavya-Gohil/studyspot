import { createClient } from '@/lib/supabase/server'
import { ExploreClient } from './ExploreClient'

export default async function ExplorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('country')
    .eq('id', user!.id)
    .single()

  const { data: sessions } = await supabase
    .from('session_feed')
    .select('*')
    .in('status', ['active', 'full', 'ongoing'])
    .gt('end_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(50)

  return <ExploreClient sessions={sessions || []} userCountry={profile?.country || null} />
}

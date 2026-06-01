import { createClient } from '@/lib/supabase/server'
import { FeedClient } from './FeedClient'

export default async function FeedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('country, country_name, state_region, city, full_name')
    .eq('id', user!.id)
    .single()

  return (
    <FeedClient
      userCountry={profile?.country || null}
      userCountryName={profile?.country_name || null}
      userFullName={profile?.full_name || null}
    />
  )
}

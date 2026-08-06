import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { listCountries } from '@/lib/geo-data'
import { ProfileSettingsClient } from './ProfileSettingsClient'

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, college, course, year_of_study, subjects, bio, verification_status, verification_rejected_reason, country, country_name, state_region, city')
    .eq('id', user.id)
    .single()

  // Resolved on the server so the country dataset never reaches the browser.
  return <ProfileSettingsClient profile={profile} countries={listCountries()} />
}

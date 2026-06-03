import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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

  return <ProfileSettingsClient profile={profile} />
}

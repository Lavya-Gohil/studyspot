import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CirclesClient } from './CirclesClient'
import type { Circle } from '@studyspot/types'

export default async function CirclesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: memberships } = await supabase
    .from('circle_members')
    .select('circle:circles(*)')
    .eq('user_id', user.id)

  const mine: Circle[] = ((memberships as any[]) || [])
    .map((m) => m.circle)
    .filter(Boolean)

  const { data: discover } = await supabase
    .from('circles')
    .select('*')
    .eq('is_private', false)
    .order('member_count', { ascending: false })
    .limit(30)

  return (
    <CirclesClient
      mine={mine}
      discover={(discover as Circle[]) || []}
      userId={user.id}
    />
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GoalsClient } from './GoalsClient'
import type { Goal } from '@studyspot/types'

export default async function GoalsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: statsRow } = await supabase
    .from('user_study_stats')
    .select('verified_hours, verified_sessions')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <GoalsClient
      initialGoals={(goals as Goal[]) || []}
      stats={{
        verified_hours: (statsRow as any)?.verified_hours ?? 0,
        verified_sessions: (statsRow as any)?.verified_sessions ?? 0,
      }}
      userId={user.id}
    />
  )
}

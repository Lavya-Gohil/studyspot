import { createClient } from '@/lib/supabase/server'
import { VerificationsClient } from './VerificationsClient'

export default async function AdminVerificationsPage() {
  const supabase = await createClient()

  const { data: pendingUsers } = await supabase
    .from('profiles')
    .select('id, full_name, email, college, verification_status, created_at')
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-text-primary">Verification Queue</h1>
      <VerificationsClient pendingUsers={pendingUsers || []} />
    </div>
  )
}

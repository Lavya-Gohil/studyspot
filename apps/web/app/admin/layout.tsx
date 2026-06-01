import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/feed')

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="bg-bg-surface border-b border-border-subtle px-6 py-3 flex items-center gap-6">
        <span className="font-semibold text-text-primary">StudySpot Admin</span>
        <a href="/admin/verifications" className="text-text-secondary hover:text-text-primary text-sm">Verifications</a>
        <a href="/admin/reports" className="text-text-secondary hover:text-text-primary text-sm">Reports</a>
        <a href="/feed" className="text-text-tertiary hover:text-text-secondary text-sm ml-auto">← Back to app</a>
      </div>
      <main className="px-6 py-8">{children}</main>
    </div>
  )
}

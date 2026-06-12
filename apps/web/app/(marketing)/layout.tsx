import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/marketing/SiteHeader'
import { SiteFooter } from '@/components/marketing/SiteFooter'

/**
 * Shared chrome for public marketing pages (About, Blog, Legal).
 * The landing page (app/page.tsx) renders the same header/footer itself
 * because its hero sits underneath the floating nav.
 */
export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-bg-base text-text-primary">
      <SiteHeader isAuthed={!!user} />
      <main className="pt-28 sm:pt-32">{children}</main>
      <SiteFooter />
    </div>
  )
}

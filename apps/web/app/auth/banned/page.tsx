import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CONTACT_EMAIL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Account suspended — StudySpot',
}

/**
 * Landing spot for banned accounts (the middleware redirects here).
 * Without this page banned users hit a 404 and never learn why.
 */
export default async function BannedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let reason: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('ban_reason')
      .eq('id', user.id)
      .single()
    reason = profile?.ban_reason ?? null
  }

  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-red/10 text-accent-red">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="m5.6 5.6 12.8 12.8" />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="font-display text-2xl font-bold tracking-tight">Account suspended</h1>
        <p className="text-sm leading-relaxed text-text-secondary">
          Your StudySpot account has been suspended for violating our{' '}
          <Link href="/terms" className="text-text-primary underline underline-offset-2">
            Terms of Service
          </Link>
          .
        </p>
        {reason && (
          <p className="rounded-xl border border-border-default bg-bg-elevated px-4 py-3 text-sm text-text-secondary">
            Reason: {reason}
          </p>
        )}
      </div>

      <p className="text-sm text-text-secondary">
        Think this is a mistake?{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-text-primary underline underline-offset-2">
          Email us
        </a>{' '}
        to appeal.
      </p>

      <Link href="/" className="inline-block text-sm text-text-tertiary transition-colors hover:text-text-primary">
        ← Back to studyspot
      </Link>
    </div>
  )
}

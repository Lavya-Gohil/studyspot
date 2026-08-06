'use client'

import Link from 'next/link'
import { useGlobalPresence } from '@/lib/presence'

/**
 * "N studying right now."
 *
 * Renders nothing until presence has actually synced, and nothing when the
 * only person here is you. An ambient counter that says "1 studying" when you
 * are alone is worse than no counter — it makes an empty room feel emptier.
 */
export function StudyingNow({ className = '' }: { className?: string }) {
  const { count, focusing } = useGlobalPresence('browsing')

  if (count === null || count <= 1) return null

  return (
    <Link
      href="/explore"
      className={`enter inline-flex items-center gap-2 rounded-full border border-brand-primary/25 bg-brand-primary/[0.07] px-3 py-1.5 text-xs font-medium text-brand-text transition-colors duration-fast ease-out hover:bg-brand-primary/[0.12] ${className}`}
    >
      <span className="live-dot" />
      <span className="tnum">{count}</span> online
      {focusing > 0 ? (
        <>
          <span className="text-brand-text/40">·</span>
          <span className="tnum">{focusing}</span> focusing
        </>
      ) : null}
    </Link>
  )
}

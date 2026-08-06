'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/EmptyState'
import { friendlyDbError } from '@/lib/db-errors'

/**
 * Catches the throws page.tsx makes when a read fails. Before this boundary
 * existed those failures were swallowed into notFound(), so a database blip
 * was indistinguishable from a cancelled session — `reset()` re-runs the
 * server component, which is the right move for a transient fault.
 */
export default function SessionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <ErrorState
        title="Couldn't load this session"
        description={friendlyDbError(error.message)}
        onRetry={reset}
      />
      <div className="flex justify-center">
        <Link href="/feed">
          <Button variant="ghost">Back to feed</Button>
        </Link>
      </div>
    </div>
  )
}

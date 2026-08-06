'use client'

import Link from 'next/link'
import { Coffee } from 'lucide-react'
import { VibePill } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import type { MemberStatus, SessionInfo } from './types'

export function RoomHeader({
  session,
  memberCount,
  focusingCount,
  myStatus,
  connected,
  onToggleStatus,
}: {
  session: SessionInfo
  memberCount: number
  focusingCount: number
  myStatus: MemberStatus
  connected: boolean
  onToggleStatus: () => void
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/sessions/${session.id}`}
            className="truncate text-base font-semibold text-text-primary hover:text-accent-primary"
          >
            {session.subject}
          </Link>
          <VibePill vibe={session.vibe} />
        </div>
        <p className="truncate text-xs text-text-secondary">
          {session.room_name || 'Online study room'} · {memberCount} in room · {focusingCount}{' '}
          focusing
          {/* Presence silently going stale is worse than saying so. */}
          {!connected ? <span className="text-accent-amber"> · reconnecting…</span> : null}
        </p>
      </div>

      <button
        onClick={onToggleStatus}
        aria-pressed={myStatus === 'break'}
        className={`h-8 shrink-0 rounded-md border px-3 text-xs font-medium transition-colors ${
          myStatus === 'focusing'
            ? 'border-accent-green/30 bg-accent-green/15 text-accent-green'
            : 'border-accent-amber/30 bg-accent-amber/15 text-accent-amber'
        }`}
      >
        {myStatus === 'focusing' ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="live-dot" />
            Focusing
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Icon as={Coffee} size="xs" />
            On break
          </span>
        )}
      </button>
    </div>
  )
}

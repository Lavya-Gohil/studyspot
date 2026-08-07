'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bookmark, CalendarDays, Check, MapPin, Monitor, Share2 } from 'lucide-react'
import type { Session } from '@studyspot/types'
import { formatSessionTime, truncate } from '@studyspot/utils'
import { Avatar } from '@/components/profile/Avatar'
import { VibePill, SpotsBadge, VerifiedBadge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'

interface SessionCardProps {
  session: Session
  onInterest?: (sessionId: string) => Promise<void>
  requestStatus?: 'pending' | 'approved' | 'declined' | 'withdrawn' | null
  isSaved?: boolean
  onSave?: (sessionId: string, saved: boolean) => void
}

export function SessionCard({
  session,
  onInterest,
  requestStatus,
  isSaved = false,
  onSave,
}: SessionCardProps) {
  const [loadingInterest, setLoadingInterest] = useState(false)

  async function handleInterest() {
    if (!onInterest || requestStatus) return
    setLoadingInterest(true)
    try {
      await onInterest(session.id)
    } finally {
      setLoadingInterest(false)
    }
  }

  const spotsRemaining = session.spots_remaining ?? session.spots_total - session.spots_filled

  const nowMs = Date.now()
  const isLive =
    nowMs >= new Date(session.start_time).getTime() &&
    nowMs < new Date(session.end_time).getTime()

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-lg p-4 space-y-3 hover:-translate-y-0.5 hover:border-border-default transition-all group">
      {/* Host row */}
      <div className="flex items-center gap-3">
        <Link href={`/profile/${session.host_id}`} className="shrink-0">
          <Avatar
            userId={session.host_id}
            name={session.host_name || null}
            avatarUrl={session.host_avatar || null}
            size="md"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/profile/${session.host_id}`}
              className="text-sm font-semibold text-text-primary hover:text-accent-primary transition-colors truncate"
            >
              {session.host_name}
            </Link>
            {session.host_verification_status === 'verified' && <VerifiedBadge />}
          </div>
          {session.host_college && (
            <p className="text-xs text-text-secondary truncate">{session.host_college}</p>
          )}
        </div>
        <button
          onClick={() => onSave?.(session.id, !isSaved)}
          className="p-1.5 rounded-md hover:bg-bg-subtle transition-colors shrink-0"
          aria-label={isSaved ? 'Unsave' : 'Save'}
        >
          <Icon
            as={Bookmark}
            size="sm"
            className={
              isSaved
                ? 'fill-current text-brand-text'
                : 'text-text-tertiary group-hover:text-text-secondary'
            }
          />
        </button>
      </div>

      {/* Subject */}
      <Link href={`/sessions/${session.id}`} className="block">
        <h3 className="text-base font-semibold text-text-primary hover:text-accent-primary transition-colors">
          {session.subject}
        </h3>
      </Link>

      {/* Location + time */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
          {session.mode === 'online' ? (
            <>
              <Icon as={Monitor} size="xs" className="text-brand-text" />
              <span className="truncate">{session.location_name || 'Online study room'}</span>
              <span className="rounded bg-accent-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-primary shrink-0">
                Online
              </span>
            </>
          ) : (
            <>
              <Icon as={MapPin} size="xs" className="text-brand-text" />
              <span className="truncate">{session.location_name}</span>
              {session.location_city && (
                <span className="text-text-tertiary shrink-0">{session.location_city}</span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
          <Icon as={CalendarDays} size="xs" />
          <span>{formatSessionTime(session.start_time, session.end_time)}</span>
        </div>
      </div>

      {/* Pills row */}
      <div className="flex items-center gap-2 flex-wrap">
        {isLive && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-green/15 px-2 py-0.5 text-xs font-medium text-accent-green">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" />
            Session started
          </span>
        )}
        <VibePill vibe={session.vibe} />
        <SpotsBadge remaining={spotsRemaining} />
      </div>

      {/* Optional note */}
      {session.description && (
        <p className="text-sm text-text-secondary italic">
          &quot;{truncate(session.description, 80)}&quot;
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        {requestStatus === 'approved' ? (
          <Link
            href={session.mode === 'online' ? `/room/${session.id}` : `/chat/${session.id}`}
            className="flex-1 h-10 rounded-md bg-accent-green/15 text-accent-green border border-accent-green/30 flex items-center justify-center text-sm font-medium hover:bg-accent-green/25 transition-colors"
          >
            {session.mode === 'online' ? 'Enter room' : 'Open chat'}
          </Link>
        ) : requestStatus === 'pending' ? (
          <div className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-accent-green/30 bg-accent-green/10 text-sm font-medium text-accent-green">
            <Icon as={Check} size="sm" />
            Request sent, awaiting host
          </div>
        ) : requestStatus === 'declined' ? (
          <div className="flex-1 h-10 rounded-md bg-bg-elevated border border-border-default flex items-center justify-center text-sm text-text-tertiary">
            Not approved this time
          </div>
        ) : session.mode === 'online' ? (
          <Link
            href={`/sessions/${session.id}`}
            className="flex-1 h-10 rounded-md bg-accent-primary hover:bg-accent-hover text-accent-fg text-sm font-medium flex items-center justify-center transition-colors"
          >
            View session →
          </Link>
        ) : (
          <button
            onClick={handleInterest}
            disabled={loadingInterest || spotsRemaining === 0}
            className="flex-1 h-10 rounded-md bg-accent-primary hover:bg-accent-hover text-accent-fg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingInterest ? 'Sending...' : spotsRemaining === 0 ? 'Session full' : 'Interested'}
          </button>
        )}

        <button
          onClick={() => {
            navigator.clipboard.writeText(`${window.location.origin}/sessions/${session.id}`)
          }}
          className="h-10 w-10 rounded-md bg-bg-elevated border border-border-default hover:bg-bg-subtle flex items-center justify-center transition-colors shrink-0"
          aria-label="Share"
        >
          <Icon as={Share2} size="xs" className="text-text-secondary" />
        </button>
      </div>
    </div>
  )
}

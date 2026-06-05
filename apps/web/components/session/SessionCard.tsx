'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Session } from '@studyspot/types'
import { formatSessionTime, truncate } from '@studyspot/utils'
import { Avatar } from '@/components/profile/Avatar'
import { VibePill, SpotsBadge, VerifiedBadge } from '@/components/ui/Badge'

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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={isSaved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            className={isSaved ? 'text-accent-primary' : 'text-text-tertiary group-hover:text-text-secondary'}
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-primary">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
              <span className="truncate">{session.location_name || 'Online study room'}</span>
              <span className="rounded bg-accent-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-primary shrink-0">
                Online
              </span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-primary">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="truncate">{session.location_name}</span>
              {session.location_city && (
                <span className="text-text-tertiary shrink-0">{session.location_city}</span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-text-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
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
            {session.mode === 'online' ? 'Enter room ✓' : 'Open chat ✓'}
          </Link>
        ) : requestStatus === 'pending' ? (
          <div className="flex-1 h-10 rounded-md bg-accent-green/10 border border-accent-green/30 flex items-center justify-center text-sm text-accent-green font-medium">
            ✓ Request sent — awaiting host
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-secondary">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

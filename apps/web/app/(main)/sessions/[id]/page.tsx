import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/profile/Avatar'
import { VibePill, SpotsBadge, VerifiedBadge } from '@/components/ui/Badge'
import { formatSessionTime } from '@studyspot/utils'
import { RequestsPanel } from './RequestsPanel'
import { InterestButton } from './InterestButton'
import { RateParticipants } from './RateParticipants'

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: session } = await supabase
    .from('session_feed')
    .select('*')
    .eq('id', id)
    .single()

  if (!session) notFound()

  const { data: userRequest } = user
    ? await supabase
        .from('session_requests')
        .select('*')
        .eq('session_id', id)
        .eq('requester_id', user.id)
        .maybeSingle()
    : { data: null }

  const isHost = user?.id === session.host_id

  const nowMs = Date.now()
  const isLive =
    nowMs >= new Date(session.start_time).getTime() &&
    nowMs < new Date(session.end_time).getTime()
  const hasEnded = nowMs >= new Date(session.end_time).getTime()
  const attended = isHost || userRequest?.status === 'approved'

  // For ended sessions, let attendees rate the people they studied with.
  let rateables: { id: string; full_name: string | null; avatar_url: string | null }[] = []
  const myRatings: Record<string, number> = {}
  if (hasEnded && attended && user) {
    const { data: approved } = await supabase
      .from('session_requests')
      .select('requester:profiles!requester_id(id, full_name, avatar_url)')
      .eq('session_id', id)
      .eq('status', 'approved')

    if (session.host_id !== user.id) {
      rateables.push({
        id: session.host_id,
        full_name: session.host_name,
        avatar_url: session.host_avatar,
      })
    }
    for (const row of (approved as any[]) || []) {
      const p = row.requester
      if (p && p.id !== user.id) {
        rateables.push({ id: p.id, full_name: p.full_name, avatar_url: p.avatar_url })
      }
    }

    const { data: rs } = await supabase
      .from('session_ratings')
      .select('ratee_id, rating')
      .eq('session_id', id)
      .eq('rater_id', user.id)
    for (const r of (rs as any[]) || []) myRatings[r.ratee_id] = r.rating
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Link href="/feed" className="text-text-secondary hover:text-text-primary text-sm flex items-center gap-1">
        ← Back to feed
      </Link>

      {/* Host */}
      <div className="flex items-center gap-3">
        <Link href={`/profile/${session.host_id}`}>
          <Avatar userId={session.host_id} name={session.host_name} avatarUrl={session.host_avatar} size="lg" />
        </Link>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/profile/${session.host_id}`} className="font-semibold text-text-primary hover:text-accent-primary">
              {session.host_name}
            </Link>
            {session.host_verification_status === 'verified' && <VerifiedBadge size="md" />}
          </div>
          {session.host_college && (
            <p className="text-text-secondary text-sm">{session.host_college}</p>
          )}
        </div>
      </div>

      {/* Subject */}
      <h1 className="text-3xl font-semibold text-text-primary">{session.subject}</h1>

      {/* Details */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg p-5 space-y-4">
        <div className="flex items-start gap-2">
          {session.mode === 'online' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" className="shrink-0 mt-0.5">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
              <div>
                <p className="text-text-primary font-medium">
                  {session.location_name || 'Online study room'}
                </p>
                <p className="text-text-secondary text-sm">
                  Live virtual classroom — avatars, chat & focus timer
                </p>
              </div>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" className="shrink-0 mt-0.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <div>
                <p className="text-text-primary font-medium">{session.location_name}</p>
                {session.location_address && (
                  <p className="text-text-secondary text-sm">{session.location_address}</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-text-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>{formatSessionTime(session.start_time, session.end_time)}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-green/15 px-2.5 py-0.5 text-xs font-medium text-accent-green">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" />
              Session started
            </span>
          )}
          <VibePill vibe={session.vibe} />
          <SpotsBadge remaining={session.spots_remaining ?? session.spots_total - session.spots_filled} />
        </div>

        {session.description && (
          <p className="text-text-secondary text-sm italic border-t border-border-subtle pt-4">
            &quot;{session.description}&quot;
          </p>
        )}
      </div>

      {/* CTA */}
      {!isHost && user && (
        <InterestButton
          sessionId={id}
          initialRequest={userRequest}
          spotsRemaining={session.spots_remaining ?? session.spots_total - session.spots_filled}
        />
      )}

      {/* Host: requests panel */}
      {isHost && (
        <RequestsPanel sessionId={id} />
      )}

      {/* Room / chat link for approved members */}
      {(userRequest?.status === 'approved' || isHost) &&
        (session.mode === 'online' ? (
          <div className="space-y-1.5">
            <Link
              href={`/room/${id}`}
              className="w-full h-11 rounded-md bg-accent-primary text-white font-medium text-sm flex items-center justify-center hover:bg-accent-hover transition-colors"
            >
              Enter study room →
            </Link>
            <p className="text-center text-xs text-text-tertiary">
              The group chat is inside the room.
            </p>
          </div>
        ) : (
          <Link
            href={`/chat/${id}`}
            className="w-full h-11 rounded-md bg-accent-green/15 border border-accent-green/30 text-accent-green font-medium text-sm flex items-center justify-center hover:bg-accent-green/25 transition-colors"
          >
            Open group chat →
          </Link>
        ))}

      {/* Rate co-attendees after the session ends */}
      {hasEnded && attended && rateables.length > 0 && (
        <RateParticipants sessionId={id} participants={rateables} initialRatings={myRatings} />
      )}
    </div>
  )
}

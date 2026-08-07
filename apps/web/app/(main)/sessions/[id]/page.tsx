import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, MapPin, Monitor } from 'lucide-react'
import { Avatar } from '@/components/profile/Avatar'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { VibePill, SpotsBadge, VerifiedBadge } from '@/components/ui/Badge'
import { formatSessionTime } from '@studyspot/utils'
import { RequestsPanel } from './RequestsPanel'
import { InterestButton } from './InterestButton'
import { RateParticipants } from './RateParticipants'

interface Rateable {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // maybeSingle so "no such session" and "the query failed" stay distinguishable:
  // .single() reports both as an error, and the old code treated both as a 404;
  // a transient database fault told the user their session had been deleted.
  const { data: session, error: sessionError } = await supabase
    .from('session_feed')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (sessionError) throw new Error(sessionError.message)
  if (!session) notFound()

  const { data: userRequest, error: requestError } = user
    ? await supabase
        .from('session_requests')
        .select('*')
        .eq('session_id', id)
        .eq('requester_id', user.id)
        .maybeSingle()
    : { data: null, error: null }

  // A failure here would render the join button as though no request existed,
  // inviting a duplicate the database would then reject.
  if (requestError) throw new Error(requestError.message)

  const isHost = user?.id === session.host_id

  const nowMs = Date.now()
  const isLive =
    nowMs >= new Date(session.start_time).getTime() && nowMs < new Date(session.end_time).getTime()
  const hasEnded = nowMs >= new Date(session.end_time).getTime()
  const attended = isHost || userRequest?.status === 'approved'
  const spotsRemaining = session.spots_remaining ?? session.spots_total - session.spots_filled

  // For ended sessions, let attendees rate the people they studied with. This
  // block is supplementary, so a failure hides the panel rather than taking the
  // whole page down, but it is never rendered from a partial list, because a
  // missing name reads as "that person wasn't here".
  let rateables: Rateable[] = []
  const myRatings: Record<string, number> = {}
  if (hasEnded && attended && user) {
    const [{ data: approved, error: approvedError }, { data: rs, error: ratingsError }] =
      await Promise.all([
        supabase
          .from('session_requests')
          .select('requester:profiles!requester_id(id, full_name, avatar_url)')
          .eq('session_id', id)
          .eq('status', 'approved'),
        supabase
          .from('session_ratings')
          .select('ratee_id, rating')
          .eq('session_id', id)
          .eq('rater_id', user.id),
      ])

    if (approvedError || ratingsError) {
      rateables = []
    } else {
      if (session.host_id !== user.id) {
        rateables.push({
          id: session.host_id,
          full_name: session.host_name,
          avatar_url: session.host_avatar,
        })
      }
      // PostgREST types an embedded resource as an array even when the foreign
      // key makes it to-one, so accept either shape rather than casting to any.
      type ApprovedRow = { requester: Rateable | Rateable[] | null }
      for (const row of (approved ?? []) as unknown as ApprovedRow[]) {
        const p = Array.isArray(row.requester) ? row.requester[0] : row.requester
        if (p && p.id !== user.id) {
          rateables.push({ id: p.id, full_name: p.full_name, avatar_url: p.avatar_url })
        }
      }
      for (const r of (rs as { ratee_id: string; rating: number }[]) ?? []) {
        myRatings[r.ratee_id] = r.rating
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Link
        href="/feed"
        className="flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        ← Back to feed
      </Link>

      <div className="flex items-center gap-3">
        <Link href={`/profile/${session.host_id}`}>
          <Avatar
            userId={session.host_id}
            name={session.host_name}
            avatarUrl={session.host_avatar}
            size="lg"
          />
        </Link>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/profile/${session.host_id}`}
              className="font-semibold text-text-primary transition-colors hover:text-accent-primary"
            >
              {session.host_name}
            </Link>
            {session.host_verification_status === 'verified' && <VerifiedBadge size="md" />}
          </div>
          {session.host_college && (
            <p className="text-sm text-text-secondary">{session.host_college}</p>
          )}
        </div>
      </div>

      <h1 className="font-display text-3xl font-semibold text-text-primary">{session.subject}</h1>

      <Card pad="lg" className="space-y-4">
        <div className="flex items-start gap-2">
          {session.mode === 'online' ? (
            <>
              <Icon as={Monitor} size="sm" className="mt-0.5 shrink-0 text-brand-text" />
              <div>
                <p className="font-medium text-text-primary">
                  {session.location_name || 'Online study room'}
                </p>
                <p className="text-sm text-text-secondary">
                  Live virtual classroom, avatars, chat &amp; focus timer
                </p>
              </div>
            </>
          ) : (
            <>
              <Icon as={MapPin} size="sm" className="mt-0.5 shrink-0 text-brand-text" />
              <div>
                <p className="font-medium text-text-primary">{session.location_name}</p>
                {session.location_address && (
                  <p className="text-sm text-text-secondary">{session.location_address}</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-text-secondary">
          <Icon as={CalendarDays} size="sm" />
          <span>{formatSessionTime(session.start_time, session.end_time)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLive && (
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-primary/12 px-2.5 py-0.5 text-xs font-medium text-brand-text">
              <span className="live-dot" />
              Session started
            </span>
          )}
          <VibePill vibe={session.vibe} />
          <SpotsBadge remaining={spotsRemaining} />
        </div>

        {session.subject_tags?.length > 0 && (
          <p className="text-xs text-text-tertiary">{session.subject_tags.join(' · ')}</p>
        )}

        {session.description && (
          <p className="border-t border-border-subtle pt-4 text-sm italic text-text-secondary">
            &quot;{session.description}&quot;
          </p>
        )}
      </Card>

      {!isHost && user && (
        <InterestButton sessionId={id} initialRequest={userRequest} spotsRemaining={spotsRemaining} />
      )}

      {isHost && <RequestsPanel sessionId={id} />}

      {(userRequest?.status === 'approved' || isHost) &&
        (session.mode === 'online' ? (
          <div className="space-y-1.5">
            <Link
              href={`/room/${id}`}
              className="flex h-11 w-full items-center justify-center rounded-md bg-accent-primary text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
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
            className="flex h-11 w-full items-center justify-center rounded-md border border-accent-green/30 bg-accent-green/15 text-sm font-medium text-accent-green transition-colors hover:bg-accent-green/25"
          >
            Open group chat →
          </Link>
        ))}

      {hasEnded && attended && rateables.length > 0 && (
        <RateParticipants sessionId={id} participants={rateables} initialRatings={myRatings} />
      )}
    </div>
  )
}

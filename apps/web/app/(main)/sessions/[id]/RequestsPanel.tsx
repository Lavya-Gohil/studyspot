'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/profile/Avatar'
import { Icon } from '@/components/ui/Icon'
import { VerifiedBadge, UnderAgeLabel } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { friendlyDbError } from '@/lib/db-errors'
import type { RequestStatus, SessionRequest } from '@studyspot/types'

const REQUESTER_FIELDS =
  'id, full_name, avatar_url, college, year_of_study, verification_status, is_minor, subjects'

export function RequestsPanel({ sessionId }: { sessionId: string }) {
  const supabase = createClient()
  const toast = useToast()

  const [requests, setRequests] = useState<SessionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  // Retrying while the first load is still in flight can resolve out of order;
  // same guard the feed uses so a stale response can't overwrite a fresh one.
  const requestSeq = useRef(0)

  const load = useCallback(async () => {
    const seq = ++requestSeq.current
    setError(null)

    const { data, error: loadError } = await supabase
      .from('session_requests')
      .select(`*, requester:profiles!requester_id(${REQUESTER_FIELDS})`)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })

    if (seq !== requestSeq.current) return

    // This error used to be dropped, so a failed read rendered "No requests
    // yet" — a host would see that and assume nobody wanted in.
    if (loadError) setError(friendlyDbError(loadError.message))
    else setRequests((data ?? []) as SessionRequest[])

    setLoading(false)
  }, [sessionId, supabase])

  useEffect(() => {
    load()
  }, [load])

  async function updateStatus(requestId: string, status: 'approved' | 'declined') {
    const previous = requests.find((r) => r.id === requestId)
    if (!previous || pendingIds.has(requestId)) return

    // Optimistic: approving should feel immediate. Reverted below if it fails.
    setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status } : r)))
    setPendingIds((prev) => new Set(prev).add(requestId))

    const { data, error: updateError } = await supabase
      .from('session_requests')
      .update({ status })
      .eq('id', requestId)
      .select(`*, requester:profiles!requester_id(${REQUESTER_FIELDS})`)
      .single()

    setPendingIds((prev) => {
      const next = new Set(prev)
      next.delete(requestId)
      return next
    })

    // Previously the failure branch did nothing at all — approving past a full
    // session was rejected by the spots trigger and the button just sat there.
    if (updateError || !data) {
      setRequests((prev) => prev.map((r) => (r.id === requestId ? previous : r)))
      toast.error(friendlyDbError(updateError?.message))
      return
    }

    setRequests((prev) => prev.map((r) => (r.id === requestId ? (data as SessionRequest) : r)))
    toast.success(status === 'approved' ? 'Approved — they can join now.' : 'Request declined.')
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-4 w-40" />
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn't load requests"
        description={error}
        onRetry={() => {
          setLoading(true)
          load()
        }}
      />
    )
  }

  const pending = requests.filter((r) => r.status === 'pending')
  const approved = requests.filter((r) => r.status === 'approved')

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<Icon as={Inbox} size="lg" />}
        title="No requests yet"
        description="Share the session link and it'll start showing up in people's feeds."
      />
    )
  }

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">
            Pending requests ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((req) => (
              <RequestRow
                key={req.id}
                req={req}
                busy={pendingIds.has(req.id)}
                onUpdate={updateStatus}
              />
            ))}
          </div>
        </section>
      )}

      {approved.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-text-secondary">
            Approved ({approved.length})
          </h3>
          <div className="flex flex-wrap gap-3">
            {approved.map((req) => (
              <div key={req.id} className="flex items-center gap-2">
                <Avatar
                  userId={req.requester_id}
                  name={req.requester?.full_name || null}
                  avatarUrl={req.requester?.avatar_url || null}
                  size="sm"
                />
                <span className="text-sm text-text-secondary">{req.requester?.full_name}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && approved.length === 0 && (
        <p className="text-sm text-text-tertiary">
          {requests.length} request{requests.length === 1 ? ' was' : 's were'} declined or withdrawn.
        </p>
      )}
    </div>
  )
}

function RequestRow({
  req,
  busy,
  onUpdate,
}: {
  req: SessionRequest
  busy: boolean
  onUpdate: (id: string, status: Extract<RequestStatus, 'approved' | 'declined'>) => void
}) {
  return (
    <Card variant="elevated" className="flex items-start gap-3">
      <Avatar
        userId={req.requester_id}
        name={req.requester?.full_name || null}
        avatarUrl={req.requester?.avatar_url || null}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{req.requester?.full_name}</span>
          {req.requester?.verification_status === 'verified' && <VerifiedBadge />}
          {req.requester?.is_minor && <UnderAgeLabel />}
        </div>
        {req.requester?.college && (
          <p className="text-xs text-text-secondary">{req.requester.college}</p>
        )}
        {req.message && (
          <p className="mt-1 text-sm italic text-text-secondary">&quot;{req.message}&quot;</p>
        )}
        {req.status === 'pending' && (
          <div className="mt-3 flex gap-2">
            {/* Approve is the primary variant rather than the old green pill:
                two same-weight buttons made declining look equally intended. */}
            <Button size="sm" onClick={() => onUpdate(req.id, 'approved')} disabled={busy}>
              Approve
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onUpdate(req.id, 'declined')} disabled={busy}>
              Decline
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

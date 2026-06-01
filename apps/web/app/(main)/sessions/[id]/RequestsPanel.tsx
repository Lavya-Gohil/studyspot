'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/profile/Avatar'
import { VerifiedBadge, UnderAgeLabel } from '@/components/ui/Badge'
import type { SessionRequest } from '@studyspot/types'

export function RequestsPanel({ sessionId }: { sessionId: string }) {
  const supabase = createClient()
  const [requests, setRequests] = useState<SessionRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('session_requests')
        .select(`*, requester:profiles!requester_id(id, full_name, avatar_url, college, year_of_study, verification_status, is_minor, subjects)`)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
      setRequests((data || []) as SessionRequest[])
      setLoading(false)
    }
    load()
  }, [sessionId])

  async function updateStatus(requestId: string, status: 'approved' | 'declined') {
    const { data } = await supabase
      .from('session_requests')
      .update({ status })
      .eq('id', requestId)
      .select()
      .single()
    if (data) {
      setRequests((prev) => prev.map((r) => (r.id === requestId ? (data as SessionRequest) : r)))
    }
  }

  const pending = requests.filter((r) => r.status === 'pending')
  const approved = requests.filter((r) => r.status === 'approved')

  if (loading) return <div className="text-text-tertiary text-sm">Loading requests...</div>

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-secondary mb-3">
            Pending requests ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map((req) => (
              <RequestRow key={req.id} req={req} onUpdate={updateStatus} />
            ))}
          </div>
        </div>
      )}

      {approved.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-secondary mb-3">
            Approved ({approved.length})
          </h3>
          <div className="flex gap-2 flex-wrap">
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
        </div>
      )}

      {requests.length === 0 && (
        <p className="text-text-tertiary text-sm">No requests yet.</p>
      )}
    </div>
  )
}

function RequestRow({
  req,
  onUpdate,
}: {
  req: SessionRequest
  onUpdate: (id: string, status: 'approved' | 'declined') => void
}) {
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-lg p-4 flex items-start gap-3">
      <Avatar
        userId={req.requester_id}
        name={req.requester?.full_name || null}
        avatarUrl={req.requester?.avatar_url || null}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-text-primary text-sm">{req.requester?.full_name}</span>
          {req.requester?.verification_status === 'verified' && <VerifiedBadge />}
          {req.requester?.is_minor && <UnderAgeLabel />}
        </div>
        {req.requester?.college && (
          <p className="text-text-secondary text-xs">{req.requester.college}</p>
        )}
        {req.message && (
          <p className="text-text-secondary text-sm mt-1 italic">&quot;{req.message}&quot;</p>
        )}
        {req.status === 'pending' && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onUpdate(req.id, 'approved')}
              className="h-8 px-4 rounded-md bg-accent-green/15 border border-accent-green/30 text-accent-green text-xs font-medium hover:bg-accent-green/25 transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onUpdate(req.id, 'declined')}
              className="h-8 px-4 rounded-md bg-bg-subtle border border-border-default text-text-secondary text-xs font-medium hover:bg-bg-subtle transition-colors"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

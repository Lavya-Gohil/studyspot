'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SessionRequest } from '@studyspot/types'
import { friendlyDbError, joinRequestSchema, validate } from '@/lib/validation'

export function InterestButton({
  sessionId,
  initialRequest,
  spotsRemaining,
}: {
  sessionId: string
  initialRequest: SessionRequest | null
  spotsRemaining: number
}) {
  const supabase = createClient()
  const [request, setRequest] = useState<SessionRequest | null>(initialRequest)
  const [showMessage, setShowMessage] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendRequest() {
    // Sanitize + cap the optional host note at 140 chars (mirrors the DB CHECK).
    const v = validate(joinRequestSchema, { message })
    if (!v.ok) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('session_requests')
      .insert({ session_id: sessionId, requester_id: user.id, message: v.data.message ?? null })
      .select()
      .single()

    if (error) {
      alert(friendlyDbError(error.message))
    } else if (data) {
      setRequest(data as SessionRequest)
    }
    setShowMessage(false)
    setLoading(false)
  }

  if (request?.status === 'approved') {
    return (
      <div className="h-11 rounded-md bg-accent-green/15 border border-accent-green/30 text-accent-green font-medium text-sm flex items-center justify-center">
        ✓ You&apos;re in!
      </div>
    )
  }

  if (request?.status === 'pending') {
    return (
      <div className="rounded-md bg-accent-green/10 border border-accent-green/30 p-4 text-center space-y-1">
        <p className="text-accent-green font-semibold text-sm">✓ Request sent!</p>
        <p className="text-text-secondary text-xs">
          The host has been notified and will review your request. You&apos;ll get a
          notification once you&apos;re approved.
        </p>
      </div>
    )
  }

  if (request?.status === 'declined') {
    return (
      <div className="h-11 rounded-md bg-bg-elevated border border-border-default text-text-tertiary font-medium text-sm flex items-center justify-center">
        Not approved this time
      </div>
    )
  }

  if (showMessage) {
    return (
      <div className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={140}
          placeholder="Add a note for the host (optional)"
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary resize-none"
        />
        <div className="flex gap-3">
          <button
            onClick={() => setShowMessage(false)}
            className="h-10 px-4 rounded-md bg-bg-elevated border border-border-default text-text-secondary text-sm"
          >
            Cancel
          </button>
          <button
            onClick={sendRequest}
            disabled={loading}
            className="flex-1 h-10 rounded-md bg-accent-primary hover:bg-accent-hover text-accent-fg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send request'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowMessage(true)}
      disabled={spotsRemaining === 0}
      className="w-full h-11 rounded-md bg-accent-primary hover:bg-accent-hover text-accent-fg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {spotsRemaining === 0 ? 'Session full' : 'Interested'}
    </button>
  )
}

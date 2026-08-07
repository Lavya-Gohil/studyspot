'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { friendlyDbError } from '@/lib/db-errors'
import { joinRequestSchema, validate } from '@/lib/validation'
import type { SessionRequest } from '@studyspot/types'

const MESSAGE_MAX = 140

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
  const toast = useToast()

  const [request, setRequest] = useState<SessionRequest | null>(initialRequest)
  const [composing, setComposing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function sendRequest() {
    // Sanitize + cap the optional host note at 140 chars (mirrors the DB CHECK).
    const v = validate(joinRequestSchema, { message })
    if (!v.ok) {
      setError(v.error)
      return
    }

    setLoading(true)
    setError(null)

    // Every early return below has to clear `loading`; the previous version
    // returned on a missing user without doing so, wedging the button forever.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      toast.error('Sign in again to send a request.')
      setLoading(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('session_requests')
      .insert({ session_id: sessionId, requester_id: user.id, message: v.data.message ?? null })
      .select()
      .single()

    setLoading(false)

    if (insertError || !data) {
      // Was an alert(), which blocks the page and loses the composed note.
      toast.error(friendlyDbError(insertError?.message))
      return
    }

    setRequest(data as SessionRequest)
    setComposing(false)
    toast.success('Request sent; the host will get back to you.')
  }

  if (request?.status === 'approved') {
    return (
      <div className="flex h-11 items-center justify-center gap-2 rounded-md border border-accent-green/30 bg-accent-green/15 text-sm font-medium text-accent-green">
        <Icon as={Check} size="sm" />
        You&apos;re in
      </div>
    )
  }

  if (request?.status === 'pending') {
    return (
      <div className="space-y-1 rounded-md border border-accent-green/30 bg-accent-green/10 p-4 text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-accent-green">
          <Icon as={Check} size="sm" />
          Request sent
        </p>
        <p className="text-xs text-text-secondary">
          The host has been notified. You&apos;ll get a notification once they approve it.
        </p>
      </div>
    )
  }

  if (request?.status === 'declined') {
    return (
      <div className="flex h-11 items-center justify-center rounded-md border border-border-default bg-bg-elevated text-sm font-medium text-text-tertiary">
        Not approved this time
      </div>
    )
  }

  if (composing) {
    return (
      <div className="space-y-3">
        <Textarea
          label="Note for the host"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={MESSAGE_MAX}
          showCount
          rows={2}
          error={error}
          hint="Optional: a line about what you're working on helps."
          placeholder="e.g. Revising thermodynamics, happy to share notes"
        />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setComposing(false)} disabled={loading}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={sendRequest} loading={loading}>
            {loading ? 'Sending' : 'Send request'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button className="w-full" onClick={() => setComposing(true)} disabled={spotsRemaining === 0}>
      {spotsRemaining === 0 ? 'Session full' : 'Interested'}
    </Button>
  )
}

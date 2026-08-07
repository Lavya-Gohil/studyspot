'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const REJECT_REASONS = [
  'Not a valid student document',
  'Image unclear / unreadable',
  'Document appears altered',
  'Wrong document type',
]

export function VerificationsClient({ pendingUsers }: { pendingUsers: any[] }) {
  const supabase = createClient()
  const [users, setUsers] = useState(pendingUsers)
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleAction(userId: string, action: 'approve' | 'reject', reason?: string) {
    setProcessing(userId)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-verify-action`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ targetUserId: userId, action, reason }),
      }
    )

    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    }
    setProcessing(null)
  }

  if (users.length === 0) {
    return <p className="text-text-secondary">No pending verifications.</p>
  }

  return (
    <div className="space-y-4">
      {users.map((u) => (
        <div key={u.id} className="bg-bg-surface border border-border-subtle rounded-lg p-5 space-y-4">
          <div>
            <p className="font-semibold text-text-primary">{u.full_name || 'Unknown'}</p>
            <p className="text-text-secondary text-sm">{u.email}</p>
            {u.college && <p className="text-text-secondary text-sm">{u.college}</p>}
            <p className="text-text-tertiary text-xs mt-1">
              Submitted {new Date(u.created_at).toLocaleDateString()}
            </p>
          </div>

          <p className="text-text-tertiary text-sm italic">
            Document stored securely; access requires admin signed URL via Supabase dashboard.
          </p>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => handleAction(u.id, 'approve')}
              disabled={processing === u.id}
              className="h-9 px-5 rounded-md bg-accent-green/15 border border-accent-green/30 text-accent-green text-sm font-medium hover:bg-accent-green/25 transition-colors disabled:opacity-50"
            >
              Approve
            </button>
            {REJECT_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => handleAction(u.id, 'reject', reason)}
                disabled={processing === u.id}
                className="h-9 px-4 rounded-md bg-bg-elevated border border-border-default text-text-secondary text-xs hover:bg-bg-subtle transition-colors disabled:opacity-50"
              >
                Reject: {reason}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

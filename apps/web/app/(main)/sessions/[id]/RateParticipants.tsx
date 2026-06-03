'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/profile/Avatar'

interface Participant {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export function RateParticipants({
  sessionId,
  participants,
  initialRatings,
}: {
  sessionId: string
  participants: Participant[]
  initialRatings: Record<string, number>
}) {
  const supabase = createClient()
  const [ratings, setRatings] = useState<Record<string, number>>(initialRatings)
  const [saving, setSaving] = useState<string | null>(null)

  if (participants.length === 0) return null

  async function rate(rateeId: string, value: number) {
    setSaving(rateeId)
    setRatings((prev) => ({ ...prev, [rateeId]: value }))
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('session_ratings').upsert(
        { session_id: sessionId, rater_id: user.id, ratee_id: rateeId, rating: value },
        { onConflict: 'session_id,rater_id,ratee_id' }
      )
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5">
      <h2 className="font-display text-base font-semibold">Rate your study partners</h2>
      <p className="mt-1 text-xs text-text-secondary">
        Ratings build everyone&apos;s reputation. Only people you studied with can see them in
        aggregate.
      </p>
      <div className="mt-4 space-y-3">
        {participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar userId={p.id} name={p.full_name} avatarUrl={p.avatar_url} size="sm" />
              <span className="truncate text-sm text-text-primary">
                {p.full_name || 'Student'}
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const active = (ratings[p.id] ?? 0) >= star
                return (
                  <button
                    key={star}
                    onClick={() => rate(p.id, star)}
                    disabled={saving === p.id}
                    aria-label={`Rate ${p.full_name || 'student'} ${star} of 5`}
                    className={`text-lg leading-none transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 ${
                      active ? 'text-accent-amber' : 'text-text-tertiary'
                    }`}
                  >
                    {active ? '★' : '☆'}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

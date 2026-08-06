'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/profile/Avatar'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { useToast } from '@/components/ui/Toast'
import { friendlyDbError } from '@/lib/db-errors'

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
  const toast = useToast()

  const [ratings, setRatings] = useState<Record<string, number>>(initialRatings)
  const [saving, setSaving] = useState<string | null>(null)

  if (participants.length === 0) return null

  async function rate(rateeId: string, value: number) {
    const previous = ratings[rateeId]
    setSaving(rateeId)
    // Optimistic — the star should fill on press. Rolled back below if the
    // write fails, which the old version never checked: the upsert's error was
    // discarded, so a rejected rating stayed lit until the next page load.
    setRatings((prev) => ({ ...prev, [rateeId]: value }))

    const revert = () =>
      setRatings((prev) => {
        const next = { ...prev }
        if (previous === undefined) delete next[rateeId]
        else next[rateeId] = previous
        return next
      })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      revert()
      setSaving(null)
      toast.error('Sign in again to rate.')
      return
    }

    const { error } = await supabase.from('session_ratings').upsert(
      { session_id: sessionId, rater_id: user.id, ratee_id: rateeId, rating: value },
      { onConflict: 'session_id,rater_id,ratee_id' }
    )

    setSaving(null)

    if (error) {
      revert()
      toast.error(friendlyDbError(error.message))
    }
  }

  return (
    <Card pad="lg">
      <h2 className="font-display text-base font-semibold text-text-primary">
        Rate your study partners
      </h2>
      <p className="mt-1 text-xs text-text-secondary">
        Ratings build everyone&apos;s reputation. Only people you studied with can see them in
        aggregate.
      </p>
      <div className="mt-4 space-y-3">
        {participants.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar userId={p.id} name={p.full_name} avatarUrl={p.avatar_url} size="sm" />
              <span className="truncate text-sm text-text-primary">{p.full_name || 'Student'}</span>
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
                    className={`leading-none transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 ${
                      active ? 'text-accent-amber' : 'text-text-tertiary'
                    }`}
                  >
                    <Icon
                      as={Star}
                      size="lg"
                      className={active ? 'fill-current' : undefined}
                    />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

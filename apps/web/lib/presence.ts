'use client'

import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

/**
 * The global "who is studying right now" layer.
 *
 * Realtime Presence, not a table. Presence is held in the Realtime server's
 * memory and reconciled from client heartbeats, so:
 *
 *   - it needs no migration, no rows, and no cleanup job;
 *   - a closed laptop drops out on its own, which a `last_seen` column can
 *     never do accurately;
 *   - it costs no writes, so a thousand people idling costs nothing.
 *
 * That last point is why this isn't a counter column. Every heartbeat would
 * otherwise be an UPDATE on one hot row, which is how a presence feature takes
 * a database down.
 *
 * Tracked state is deliberately minimal: a status, nothing identifying.
 * Presence payloads are broadcast to every subscriber on the channel, so
 * anything put here is public to all signed-in users by construction.
 */

const CHANNEL = 'studyspot:presence'

export type PresenceStatus = 'browsing' | 'focusing'

export function useGlobalPresence(status: PresenceStatus = 'browsing') {
  const [count, setCount] = useState<number | null>(null)
  const [focusing, setFocusing] = useState(0)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const subscribed = useRef(false)

  // Subscribe once. The channel deliberately does NOT depend on `status`:
  // re-subscribing on every status change would tear the channel down and make
  // the count flicker for everyone else on it.
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const channel = supabase.channel(CHANNEL, {
        // Keyed by user id so one person in three tabs counts once, otherwise
        // the number measures browser tabs, not people.
        config: { presence: { key: user.id } },
      })
      channelRef.current = channel

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ status: PresenceStatus }>()
        const entries = Object.values(state)
        setCount(entries.length)
        setFocusing(entries.filter((metas) => metas.some((m) => m.status === 'focusing')).length)
      })

      channel.subscribe((s) => {
        if (s !== 'SUBSCRIBED' || cancelled) return
        subscribed.current = true
        void channel.track({ status })
      })
    })()

    return () => {
      cancelled = true
      subscribed.current = false
      const channel = channelRef.current
      channelRef.current = null
      if (channel) void channel.unsubscribe()
    }
    // Mount only, see the note above. `status` is applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-track in place when the status changes. track() on an already-joined
  // channel replaces this key's payload without a rejoin, so nobody else sees
  // a leave/join pair.
  useEffect(() => {
    if (!subscribed.current || !channelRef.current) return
    void channelRef.current.track({ status })
  }, [status])

  return { count, focusing }
}

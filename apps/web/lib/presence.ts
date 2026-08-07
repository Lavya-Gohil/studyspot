'use client'

import { useEffect, useId, useState } from 'react'
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
 *
 * ONE CHANNEL, SHARED. The hook used to open a channel per caller, which was
 * fine while there was exactly one caller. There are now several on screen at
 * once (the feed header, the context rail, the room), and they all track under
 * the same presence key, so the last one to call track() decided everyone's
 * status: standing in a room marked you 'focusing', and a rail rendering
 * beside it immediately overwrote that with 'browsing'. The channel is now a
 * module-level singleton with a refcount, and the status it publishes is the
 * strongest any subscriber is asking for.
 */

const CHANNEL = 'studyspot:presence'

export type PresenceStatus = 'browsing' | 'focusing'

type Snapshot = { count: number | null; focusing: number }

let channel: RealtimeChannel | null = null
let refCount = 0
/** Status requested per subscriber, so one leaving cannot clear another's. */
const requested = new Map<string, PresenceStatus>()
const listeners = new Set<(s: Snapshot) => void>()
let snapshot: Snapshot = { count: null, focusing: 0 }

/** Focusing wins: it is the more specific claim, and only the room makes it. */
function effectiveStatus(): PresenceStatus {
  // forEach rather than for-of: the tsconfig target predates downlevel
  // iteration, so iterating a Map directly does not compile.
  let focusing = false
  requested.forEach((s) => {
    if (s === 'focusing') focusing = true
  })
  return focusing ? 'focusing' : 'browsing'
}

function publishStatus() {
  if (!channel) return
  void channel.track({ status: effectiveStatus() })
}

function emit(next: Snapshot) {
  snapshot = next
  listeners.forEach((l) => l(next))
}

async function acquire() {
  refCount++
  if (channel) {
    // Already joined: just make sure the merged status is up to date.
    publishStatus()
    return
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Another subscriber may have released while we awaited the user.
  if (!user || refCount === 0) return

  const ch = supabase.channel(CHANNEL, {
    // Keyed by user id so one person in three tabs counts once, otherwise the
    // number measures browser tabs, not people.
    config: { presence: { key: user.id } },
  })
  channel = ch

  ch.on('presence', { event: 'sync' }, () => {
    const state = ch.presenceState<{ status: PresenceStatus }>()
    const entries = Object.values(state)
    emit({
      count: entries.length,
      focusing: entries.filter((metas) => metas.some((m) => m.status === 'focusing')).length,
    })
  })

  ch.subscribe((s) => {
    if (s !== 'SUBSCRIBED') return
    publishStatus()
  })
}

function release() {
  refCount = Math.max(0, refCount - 1)
  if (refCount > 0) {
    // Someone else is still here; re-publish without the leaver's claim.
    publishStatus()
    return
  }
  const ch = channel
  channel = null
  snapshot = { count: null, focusing: 0 }
  if (ch) void ch.unsubscribe()
}

export function useGlobalPresence(status: PresenceStatus = 'browsing') {
  const [state, setState] = useState<Snapshot>(snapshot)
  // Stable per component instance, so two rails or a rail and a room are
  // distinguishable in the requested-status map.
  const id = useId()

  useEffect(() => {
    listeners.add(setState)
    setState(snapshot)
    requested.set(id, status)
    void acquire()

    return () => {
      listeners.delete(setState)
      requested.delete(id)
      release()
    }
    // Mount and unmount only. Status changes are handled by the effect below,
    // so a component switching between focusing and browsing never causes a
    // rejoin, which would make the count flicker for everyone on the channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    requested.set(id, status)
    publishStatus()
  }, [id, status])

  return state
}

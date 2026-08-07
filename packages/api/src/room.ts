import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import type { Message } from '@studyspot/types'
import {
  initialTimer,
  type CurrentUser,
  type Member,
  type MemberStatus,
  type SessionInfo,
  type TimerState,
} from './room-types'

const MESSAGE_SELECT = `*, sender:profiles!sender_id(id, full_name, avatar_url, verification_status)`

/**
 * Everything the room needs from Supabase Realtime: presence (who's here and
 * where they're sitting), the broadcast channel carrying the shared timer, and
 * the message stream.
 *
 * Kept as a hook so the room's three panels stay presentational and the
 * subscription lifecycle lives in exactly one place; previously this was
 * interleaved with layout across a single 17.6KB component.
 */
export function useRoomChannel({
  client: supabase,
  session,
  currentUser,
  seatCount,
}: {
  /**
   * Supplied by the caller rather than constructed here, which is what lets
   * web and mobile run the SAME hook. They share a room, so any drift in the
   * seat-claiming or timer-ordering rules would show up as two people seeing
   * different clocks.
   */
  client: SupabaseClient
  session: SessionInfo
  currentUser: CurrentUser
  seatCount: number
}) {
  const channelRef = useRef<RealtimeChannel | null>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [timer, setTimer] = useState<TimerState>(initialTimer)
  const [mySeat, setMySeat] = useState(-1)
  const [myStatus, setMyStatus] = useState<MemberStatus>('focusing')
  const [connected, setConnected] = useState(false)

  // Presence metadata is re-sent on every change, so it needs a synchronous
  // source of truth that doesn't wait for a React render.
  const metaRef = useRef<{ seat: number; status: MemberStatus }>({
    seat: -1,
    status: 'focusing',
  })
  const timerRef = useRef<TimerState>(initialTimer())

  const track = useCallback(() => {
    channelRef.current?.track({
      user_id: currentUser.id,
      name: currentUser.full_name,
      avatar_url: currentUser.avatar_url,
      verification_status: currentUser.verification_status,
      seat: metaRef.current.seat,
      status: metaRef.current.status,
    })
  }, [currentUser])

  /** Apply locally and tell the room. Bumps updatedAt so receivers can order it. */
  const publishTimer = useCallback((next: Omit<TimerState, 'updatedAt'>) => {
    const stamped: TimerState = { ...next, updatedAt: Date.now() }
    timerRef.current = stamped
    setTimer(stamped)
    channelRef.current?.send({ type: 'broadcast', event: 'timer', payload: stamped })
  }, [])

  useEffect(() => {
    const channel = supabase.channel(`room:${session.id}`, {
      config: { presence: { key: currentUser.id } },
    })
    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<Member>()
      const list = Object.values(state)
        .map((entries) => entries[0])
        .filter(Boolean) as Member[]
      setMembers(list)

      // Claim a seat on first sync if we don't have one yet.
      if (metaRef.current.seat === -1) {
        const taken = new Set(
          list.filter((m) => m.user_id !== currentUser.id).map((m) => m.seat)
        )
        let free = 0
        while (free < seatCount && taken.has(free)) free++
        // Every seat taken; stay unseated rather than claiming an index that
        // falls outside the rendered grid and leaves the user invisible.
        if (free < seatCount) {
          metaRef.current.seat = free
          setMySeat(free)
        }
        track()
      }
    })

    channel.on('broadcast', { event: 'timer' }, ({ payload }) => {
      const incoming = payload as TimerState
      // Ignore anything not newer than what we hold. This is what makes a
      // late sync reply or a simultaneous press from two members converge.
      if (typeof incoming?.updatedAt !== 'number') return
      if (incoming.updatedAt <= timerRef.current.updatedAt) return
      timerRef.current = incoming
      setTimer(incoming)
    })

    // A joiner asks for the current timer. Everyone answers, and the
    // updatedAt comparison above settles it, previously only the host
    // replied, so a room whose host had left never synced its timer at all.
    channel.on('broadcast', { event: 'sync_req' }, () => {
      if (timerRef.current.updatedAt === 0) return // nothing worth sharing yet
      channel.send({ type: 'broadcast', event: 'timer', payload: timerRef.current })
    })

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${session.id}`,
      },
      async (payload) => {
        const { data } = await supabase
          .from('messages')
          .select(MESSAGE_SELECT)
          .eq('id', payload.new.id)
          .single()
        if (!data) return
        setMessages((prev) =>
          // The initial fetch and this stream can overlap on reconnect.
          prev.some((m) => m.id === (data as Message).id) ? prev : [...prev, data as Message]
        )
      }
    )

    channel.subscribe(async (status) => {
      setConnected(status === 'SUBSCRIBED')
      if (status !== 'SUBSCRIBED') return

      const { data } = await supabase
        .from('messages')
        .select(MESSAGE_SELECT)
        .eq('session_id', session.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100)
      setMessages((data || []) as Message[])

      await channel.track({
        user_id: currentUser.id,
        name: currentUser.full_name,
        avatar_url: currentUser.avatar_url,
        verification_status: currentUser.verification_status,
        seat: metaRef.current.seat,
        status: metaRef.current.status,
      })
      channel.send({ type: 'broadcast', event: 'sync_req', payload: {} })
    })

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
      setConnected(false)
    }
  }, [supabase, session.id, currentUser, seatCount, track])

  const claimSeat = useCallback(
    (index: number) => {
      const occupied = members.some((m) => m.user_id !== currentUser.id && m.seat === index)
      if (occupied) return
      metaRef.current.seat = index
      setMySeat(index)
      track()
    },
    [members, currentUser.id, track]
  )

  const toggleStatus = useCallback(() => {
    const next: MemberStatus = metaRef.current.status === 'focusing' ? 'break' : 'focusing'
    metaRef.current.status = next
    setMyStatus(next)
    track()
  }, [track])

  const sendMessage = useCallback(
    async (content: string) => {
      const { error } = await supabase
        .from('messages')
        .insert({ session_id: session.id, sender_id: currentUser.id, content, type: 'text' })
      return error
    },
    [supabase, session.id, currentUser.id]
  )

  return {
    members,
    messages,
    timer,
    timerRef,
    mySeat,
    myStatus,
    connected,
    claimSeat,
    toggleStatus,
    publishTimer,
    sendMessage,
  }
}

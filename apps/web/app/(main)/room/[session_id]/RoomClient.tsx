'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/profile/Avatar'
import { VibePill } from '@/components/ui/Badge'
import { formatRelativeTime } from '@studyspot/utils'
import type { Message, SessionVibe } from '@studyspot/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface SessionInfo {
  id: string
  subject: string
  room_name: string | null
  vibe: SessionVibe
  start_time: string
  end_time: string
  status: string
  host_id: string
  spots_total: number
}

interface CurrentUser {
  id: string
  full_name: string | null
  avatar_url: string | null
  verification_status: string
}

interface Member {
  user_id: string
  name: string | null
  avatar_url: string | null
  verification_status: string
  seat: number
  status: 'focusing' | 'break'
}

interface TimerState {
  running: boolean
  endsAt: number | null
  remaining: number
  duration: number
}

const DEFAULT_DURATION = 25 * 60

export function RoomClient({
  session,
  currentUser,
  isHost,
}: {
  session: SessionInfo
  currentUser: CurrentUser
  isHost: boolean
}) {
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [now, setNow] = useState(Date.now())
  const bottomRef = useRef<HTMLDivElement>(null)

  // My presence meta (source of truth for re-tracks).
  const metaRef = useRef<{ seat: number; status: 'focusing' | 'break' }>({
    seat: -1,
    status: 'focusing',
  })
  const [mySeat, setMySeat] = useState(-1)
  const [myStatus, setMyStatus] = useState<'focusing' | 'break'>('focusing')

  // Shared focus timer.
  const [timer, setTimer] = useState<TimerState>({
    running: false,
    endsAt: null,
    remaining: DEFAULT_DURATION,
    duration: DEFAULT_DURATION,
  })
  const timerRef = useRef(timer)
  useEffect(() => {
    timerRef.current = timer
  }, [timer])

  // Total seats: at least the group size, rounded up to a tidy grid of 4.
  const seatCount = Math.max(8, Math.ceil((session.spots_total + 1) / 4) * 4)

  function trackMeta() {
    channelRef.current?.track({
      user_id: currentUser.id,
      name: currentUser.full_name,
      avatar_url: currentUser.avatar_url,
      verification_status: currentUser.verification_status,
      seat: metaRef.current.seat,
      status: metaRef.current.status,
    })
  }

  function applyTimer(next: TimerState, broadcast = true) {
    timerRef.current = next
    setTimer(next)
    if (broadcast) {
      channelRef.current?.send({ type: 'broadcast', event: 'timer', payload: next })
    }
  }

  useEffect(() => {
    const channel = supabase.channel(`room:${session.id}`, {
      config: { presence: { key: currentUser.id } },
    })
    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<Member>()
      const list: Member[] = Object.values(state)
        .map((entries) => entries[0])
        .filter(Boolean) as Member[]
      setMembers(list)

      // Claim a seat on first sync if I don't have one yet.
      if (metaRef.current.seat === -1) {
        const taken = new Set(
          list.filter((m) => m.user_id !== currentUser.id).map((m) => m.seat)
        )
        let free = 0
        while (taken.has(free) && free < seatCount) free++
        metaRef.current.seat = free
        setMySeat(free)
        trackMeta()
      }
    })

    channel.on('broadcast', { event: 'timer' }, ({ payload }) => {
      applyTimer(payload as TimerState, false)
    })

    // New joiners ask for the current timer; the host answers.
    channel.on('broadcast', { event: 'sync_req' }, () => {
      if (isHost) {
        channel.send({ type: 'broadcast', event: 'timer', payload: timerRef.current })
      }
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
          .select(`*, sender:profiles!sender_id(id, full_name, avatar_url, verification_status)`)
          .eq('id', payload.new.id)
          .single()
        if (data) setMessages((prev) => [...prev, data as Message])
      }
    )

    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return

      const { data } = await supabase
        .from('messages')
        .select(`*, sender:profiles!sender_id(id, full_name, avatar_url, verification_status)`)
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id])

  // 1s tick for the timer display.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function claimSeat(index: number) {
    const occupied = members.some((m) => m.user_id !== currentUser.id && m.seat === index)
    if (occupied) return
    metaRef.current.seat = index
    setMySeat(index)
    trackMeta()
  }

  function toggleStatus() {
    const next = metaRef.current.status === 'focusing' ? 'break' : 'focusing'
    metaRef.current.status = next
    setMyStatus(next)
    trackMeta()
  }

  function secondsLeft() {
    const t = timerRef.current
    if (t.running && t.endsAt) return Math.max(0, Math.round((t.endsAt - now) / 1000))
    return t.remaining
  }

  function startTimer() {
    const t = timerRef.current
    const left = t.running && t.endsAt ? Math.max(0, Math.round((t.endsAt - Date.now()) / 1000)) : t.remaining
    if (left <= 0) return
    applyTimer({ running: true, endsAt: Date.now() + left * 1000, remaining: left, duration: t.duration })
  }

  function pauseTimer() {
    const t = timerRef.current
    const left = t.endsAt ? Math.max(0, Math.round((t.endsAt - Date.now()) / 1000)) : t.remaining
    applyTimer({ running: false, endsAt: null, remaining: left, duration: t.duration })
  }

  function resetTimer(d: number) {
    applyTimer({ running: false, endsAt: null, remaining: d, duration: d })
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    const content = input.trim()
    if (!content) return
    setInput('')
    await supabase
      .from('messages')
      .insert({ session_id: session.id, sender_id: currentUser.id, content, type: 'text' })
  }

  const left = secondsLeft()
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  const focusingCount = members.filter((m) => m.status === 'focusing').length

  const memberBySeat = new Map<number, Member>()
  members.forEach((m) => {
    if (m.seat >= 0) memberBySeat.set(m.seat, m)
  })

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col lg:flex-row">
      {/* Classroom */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/sessions/${session.id}`}
                className="truncate text-base font-semibold text-text-primary hover:text-accent-primary"
              >
                {session.subject}
              </Link>
              <VibePill vibe={session.vibe} />
            </div>
            <p className="truncate text-xs text-text-secondary">
              {session.room_name || 'Online study room'} · {members.length} in room ·{' '}
              {focusingCount} focusing
            </p>
          </div>
          <button
            onClick={toggleStatus}
            className={`h-8 shrink-0 rounded-md border px-3 text-xs font-medium transition-colors ${
              myStatus === 'focusing'
                ? 'border-accent-green/30 bg-accent-green/15 text-accent-green'
                : 'border-amber-400/30 bg-accent-amber/15 text-accent-amber'
            }`}
          >
            {myStatus === 'focusing' ? '● Focusing' : '☕ On break'}
          </button>
        </div>

        {/* Silent study banner */}
        {session.vibe === 'silent' && (
          <div className="shrink-0 border-b border-border-subtle bg-accent-primary/5 px-4 py-2 text-center text-xs text-text-secondary">
            🔇 Silent study — mics off, chat quiet. Just focus together and keep each other
            accountable.
          </div>
        )}

        {/* Seats */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mx-auto grid max-w-2xl grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: seatCount }).map((_, i) => {
              const occupant = memberBySeat.get(i)
              const isMine = occupant?.user_id === currentUser.id
              return (
                <button
                  key={i}
                  onClick={() => claimSeat(i)}
                  disabled={!!occupant}
                  className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border p-2 transition-all ${
                    occupant
                      ? isMine
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-border-default bg-bg-surface'
                      : 'cursor-pointer border-dashed border-border-subtle bg-transparent hover:border-accent-primary/50 hover:bg-bg-surface'
                  }`}
                  title={occupant ? occupant.name || 'Student' : 'Sit here'}
                >
                  {occupant ? (
                    <>
                      <div
                        className={`rounded-full ${
                          occupant.status === 'focusing'
                            ? 'ring-2 ring-accent-green'
                            : 'opacity-60 ring-2 ring-accent-amber'
                        }`}
                      >
                        <Avatar
                          userId={occupant.user_id}
                          name={occupant.name}
                          avatarUrl={occupant.avatar_url}
                          size="md"
                        />
                      </div>
                      <span className="max-w-full truncate text-[11px] text-text-secondary">
                        {isMine ? 'You' : occupant.name?.split(' ')[0] || 'Student'}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-text-tertiary">Sit</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Focus timer */}
        <div className="shrink-0 border-t border-border-subtle px-4 py-3">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className={`font-mono text-3xl font-semibold ${
                  timer.running ? 'text-accent-primary' : 'text-text-primary'
                }`}
              >
                {mm}:{ss}
              </span>
              <div className="hidden gap-1 sm:flex">
                {[
                  { label: '25m', val: 25 * 60 },
                  { label: '50m', val: 50 * 60 },
                  { label: '5m', val: 5 * 60 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => resetTimer(p.val)}
                    className="rounded-md border border-border-default bg-bg-elevated px-2.5 py-1 text-xs text-text-secondary hover:bg-bg-subtle"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => resetTimer(timer.duration)}
                className="h-9 rounded-md border border-border-default bg-bg-elevated px-3 text-sm text-text-secondary hover:bg-bg-subtle"
              >
                Reset
              </button>
              <button
                onClick={timer.running ? pauseTimer : startTimer}
                className="h-9 rounded-md bg-accent-primary px-5 text-sm font-medium text-accent-fg hover:bg-accent-hover"
              >
                {timer.running ? 'Pause' : 'Start'}
              </button>
            </div>
          </div>
          <p className="mx-auto mt-1.5 max-w-2xl text-center text-[11px] text-text-tertiary sm:text-left">
            Shared timer — everyone in the room sees the same countdown.
          </p>
        </div>
      </div>

      {/* Chat */}
      <div className="flex min-h-0 flex-col border-t border-border-subtle lg:w-80 lg:border-l lg:border-t-0">
        <div className="shrink-0 border-b border-border-subtle px-4 py-2.5 text-sm font-medium text-text-primary">
          Room chat
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <p className="py-8 text-center text-xs text-text-tertiary">
              No messages yet. Say hi 👋
            </p>
          )}
          {messages.map((msg) => {
            const isOwn = msg.sender_id === currentUser.id
            if (msg.type === 'system' || msg.type === 'checkin') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="rounded-full bg-bg-subtle px-3 py-1 text-[11px] text-text-tertiary">
                    {msg.content}
                  </span>
                </div>
              )
            }
            return (
              <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                  <span className="mb-0.5 ml-1 text-[11px] text-text-tertiary">
                    {msg.sender?.full_name}
                  </span>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-1.5 text-sm ${
                    isOwn
                      ? 'rounded-br-sm bg-accent-primary text-accent-fg'
                      : 'rounded-bl-sm bg-bg-elevated text-text-primary'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="px-1 text-[10px] text-text-tertiary">
                  {formatRelativeTime(msg.created_at)}
                </span>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
        {session.status !== 'cancelled' && (
          <form
            onSubmit={sendMessage}
            className="flex shrink-0 items-center gap-2 border-t border-border-subtle px-3 py-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message the room..."
              maxLength={1000}
              className="h-9 flex-1 rounded-full border border-border-default bg-bg-elevated px-3.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-primary text-accent-fg hover:bg-accent-hover disabled:opacity-50"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SessionCard } from '@/components/session/SessionCard'
import { SessionCardSkeleton } from '@/components/ui/Skeleton'
import type { Session, FeedFilters, SessionVibe } from '@studyspot/types'
import Link from 'next/link'

interface Props {
  userCountry: string | null
  userCountryName: string | null
  userFullName: string | null
}

const VIBES: { value: SessionVibe; label: string }[] = [
  { value: 'silent', label: 'Silent' },
  { value: 'pomodoro', label: 'Pomodoro' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'coding', label: 'Coding' },
  { value: 'exam_prep', label: 'Exam Prep' },
  { value: 'casual', label: 'Casual' },
]

export function FeedClient({ userCountry, userCountryName, userFullName }: Props) {
  const supabase = createClient()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState<FeedFilters>({})
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [requestStatuses, setRequestStatuses] = useState<Record<string, string>>({})
  const offset = useRef(0)

  async function loadSessions(reset = false) {
    const currentOffset = reset ? 0 : offset.current
    if (reset) { setSessions([]); setHasMore(true) }

    const limit = 20
    let query = supabase
      .from('session_feed')
      .select('*')
      .in('status', ['active', 'full', 'ongoing'])
      // Keep sessions visible until they actually end (not just until they start),
      // so in-progress sessions still show up.
      .gt('end_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .range(currentOffset, currentOffset + limit - 1)

    if (filters.vibe && filters.vibe.length > 0) query = query.in('vibe', filters.vibe)
    if (filters.date === 'today') {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
      query = query.gte('start_time', today.toISOString()).lt('start_time', tomorrow.toISOString())
    }
    // Scope in-person sessions to the user's country, but online sessions
    // are location-independent, so show them globally.
    if (userCountry) {
      query = query.or(`mode.eq.online,location_country.eq.${userCountry}`)
    }

    const { data } = await query
    const results = (data || []) as Session[]

    if (reset) {
      setSessions(results)
      offset.current = results.length
    } else {
      setSessions((prev) => [...prev, ...results])
      offset.current += results.length
    }

    setHasMore(results.length === limit)
    setLoading(false)
    setLoadingMore(false)
  }

  useEffect(() => {
    setLoading(true)
    loadSessions(true)
  }, [filters])

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: saved } = await supabase.from('saved_sessions').select('session_id').eq('user_id', user.id)
      if (saved) setSavedIds(new Set(saved.map((s: any) => s.session_id)))
      const { data: reqs } = await supabase.from('session_requests').select('session_id, status').eq('requester_id', user.id)
      if (reqs) {
        const map: Record<string, string> = {}
        reqs.forEach((r: any) => { map[r.session_id] = r.status })
        setRequestStatuses(map)
      }
    }
    loadUserData()
  }, [])

  async function handleInterest(sessionId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('session_requests').insert({ session_id: sessionId, requester_id: user.id })
    if (!error) setRequestStatuses((prev) => ({ ...prev, [sessionId]: 'pending' }))
  }

  async function handleSave(sessionId: string, saved: boolean) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (saved) {
      await supabase.from('saved_sessions').insert({ user_id: user.id, session_id: sessionId })
      setSavedIds((prev) => new Set(prev).add(sessionId))
    } else {
      await supabase.from('saved_sessions').delete().eq('user_id', user.id).eq('session_id', sessionId)
      setSavedIds((prev) => { const s = new Set(prev); s.delete(sessionId); return s })
    }
  }

  function toggleVibe(v: SessionVibe) {
    setFilters((prev) => {
      const current = prev.vibe || []
      const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v]
      return { ...prev, vibe: next.length > 0 ? next : undefined }
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {userFullName ? `Hey, ${userFullName.split(' ')[0]}` : 'Feed'}
          </h1>
          {userCountryName && (
            <p className="text-text-secondary text-sm">Sessions in {userCountryName}</p>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setFilters((prev) => ({ ...prev, date: prev.date === 'today' ? undefined : 'today' }))}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            filters.date === 'today'
              ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/30'
              : 'bg-bg-elevated border-border-default text-text-secondary hover:border-border-strong'
          }`}
        >
          Today
        </button>
        {VIBES.map((v) => (
          <button
            key={v.value}
            onClick={() => toggleVibe(v.value)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filters.vibe?.includes(v.value)
                ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/30'
                : 'bg-bg-elevated border-border-default text-text-secondary hover:border-border-strong'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Sessions */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <SessionCardSkeleton key={i} />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-4 text-center">
          <div className="text-5xl">📚</div>
          <h3 className="text-lg font-semibold text-text-primary">No sessions near you yet</h3>
          <p className="text-text-secondary text-sm">Be the first to create one.</p>
          <Link
            href="/sessions/create"
            className="inline-flex h-10 items-center justify-center rounded-md bg-accent-primary px-6 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Create a session
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onInterest={handleInterest}
              requestStatus={(requestStatuses[session.id] as any) || null}
              isSaved={savedIds.has(session.id)}
              onSave={handleSave}
            />
          ))}

          {hasMore && (
            <button
              onClick={() => {
                setLoadingMore(true)
                loadSessions(false)
              }}
              disabled={loadingMore}
              className="w-full h-11 rounded-md bg-bg-elevated border border-border-default text-text-secondary hover:text-text-primary text-sm transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

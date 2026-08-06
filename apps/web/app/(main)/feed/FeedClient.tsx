'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
// Deep import, not the '@studyspot/api' barrel: the barrel re-exports
// ./client, which calls createClient() at module scope — pulling a second
// Supabase client into this bundle that the web app never uses (it has its
// own in @/lib/supabase/client).
import { fetchFeedSessions } from '@studyspot/api/sessions'
import { SessionCard } from '@/components/session/SessionCard'
// Deep imports rather than the '@/components/ui' barrel — the barrel also
// re-exports Modal and Toast, which pull framer-motion into any client bundle
// that touches it (+40kB on this route for components the feed never renders).
import { SessionCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { friendlyDbError } from '@/lib/db-errors'
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
  const [error, setError] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [requestStatuses, setRequestStatuses] = useState<Record<string, string>>({})
  const offset = useRef(0)

  const LIMIT = 20

  // The query itself lives in @studyspot/api so web and mobile stay in sync —
  // it also carries the country-code guard around the PostgREST `.or()` filter.
  async function loadSessions(reset = false) {
    const currentOffset = reset ? 0 : offset.current
    if (reset) { setSessions([]); setHasMore(true) }
    setError(null)

    try {
      const results = await fetchFeedSessions(supabase, {
        country: userCountry ?? undefined,
        filters,
        offset: currentOffset,
        limit: LIMIT,
      })

      if (reset) {
        setSessions(results)
        offset.current = results.length
      } else {
        setSessions((prev) => [...prev, ...results])
        offset.current += results.length
      }
      setHasMore(results.length === LIMIT)
    } catch (err) {
      // Previously the error was dropped and the feed just rendered empty,
      // which is indistinguishable from "no sessions near you".
      setError(friendlyDbError(err instanceof Error ? err.message : null))
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {userFullName ? `Hey, ${userFullName.split(' ')[0]}` : 'Feed'}
          </h1>
          {userCountryName && (
            <p className="text-text-secondary text-sm">Sessions in {userCountryName}</p>
          )}
        </div>
        <Link
          href="/sessions/create?mode=online&vibe=silent"
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border-default bg-bg-elevated px-3 text-sm font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
        >
          🔇 Silent study
        </Link>
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
      ) : error ? (
        <ErrorState
          description={error}
          onRetry={() => {
            setLoading(true)
            loadSessions(true)
          }}
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={<span className="text-2xl">📚</span>}
          title="No sessions near you yet"
          description="Be the first to create one — study sessions show up here as soon as someone posts them."
          action={
            <Link href="/sessions/create">
              <Button size="lg">Create a session</Button>
            </Link>
          }
        />
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

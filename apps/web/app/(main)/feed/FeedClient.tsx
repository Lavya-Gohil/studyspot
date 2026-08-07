'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
// Deep import, not the '@studyspot/api' barrel: the barrel re-exports
// ./client, which calls createClient() at module scope, pulling a second
// Supabase client into this bundle that the web app never uses (it has its
// own in @/lib/supabase/client).
import { fetchFeedSessions } from '@studyspot/api/sessions'
import { BookOpen, SearchX } from 'lucide-react'
import { SessionCard } from '@/components/session/SessionCard'
import { Icon } from '@/components/ui/Icon'
// Deep imports rather than the '@/components/ui' barrel: the barrel also
// re-exports Modal and Tooltip, which pull framer-motion into any client
// bundle that touches it for components this route never renders.
import { SessionCardSkeleton } from '@/components/ui/Skeleton'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { friendlyDbError } from '@studyspot/utils/db-errors'
import type { Session, FeedFilters, SessionVibe } from '@studyspot/types'

interface Props {
  userCountry: string | null
}

const VIBES: { value: SessionVibe; label: string }[] = [
  { value: 'silent', label: 'Silent' },
  { value: 'pomodoro', label: 'Pomodoro' },
  { value: 'discussion', label: 'Discussion' },
  { value: 'coding', label: 'Coding' },
  { value: 'exam_prep', label: 'Exam Prep' },
  { value: 'casual', label: 'Casual' },
]

const LIMIT = 20

const chipClasses = (active: boolean) =>
  `shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
    active
      ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/30'
      : 'bg-bg-elevated border-border-default text-text-secondary hover:border-border-strong'
  }`

export function FeedClient({ userCountry }: Props) {
  const supabase = createClient()
  const toast = useToast()

  const [sessions, setSessions] = useState<Session[]>([])
  const [filters, setFilters] = useState<FeedFilters>({})
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  // Three distinct states, because they mean different things to the user:
  // `initial` shows skeletons, `refreshing` dims the existing list rather than
  // blanking it, and `loadingMore` only disables the button at the bottom.
  const [initial, setInitial] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [requestStatuses, setRequestStatuses] = useState<Record<string, string>>({})

  const offset = useRef(0)
  // Toggling filters quickly fires overlapping requests, and they can resolve
  // out of order, without this guard a slow early response overwrites a fast
  // later one and the list stops matching the selected chips.
  const requestSeq = useRef(0)

  const loadSessions = useCallback(
    async (reset: boolean, activeFilters: FeedFilters) => {
      const seq = ++requestSeq.current
      const currentOffset = reset ? 0 : offset.current
      setError(null)

      try {
        const results = await fetchFeedSessions(supabase, {
          country: userCountry ?? undefined,
          filters: activeFilters,
          offset: currentOffset,
          limit: LIMIT,
        })

        if (seq !== requestSeq.current) return // superseded

        if (reset) {
          setSessions(results)
          offset.current = results.length
        } else {
          setSessions((prev) => [...prev, ...results])
          offset.current += results.length
        }
        setHasMore(results.length === LIMIT)
      } catch (err) {
        if (seq !== requestSeq.current) return
        // Previously this error was dropped and the feed rendered empty, which
        // is indistinguishable from genuinely having no sessions nearby.
        setError(friendlyDbError(err instanceof Error ? err.message : null))
      } finally {
        if (seq === requestSeq.current) {
          setInitial(false)
          setRefreshing(false)
          setLoadingMore(false)
        }
      }
    },
    [supabase, userCountry]
  )

  useEffect(() => {
    // Keep the current results on screen while refetching: a filter toggle
    // that blanks the list to skeletons reads as though everything vanished.
    setRefreshing(true)
    loadSessions(true, filters)
  }, [filters, loadSessions])

  useEffect(() => {
    async function loadUserData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: saved }, { data: reqs }] = await Promise.all([
        supabase.from('saved_sessions').select('session_id').eq('user_id', user.id),
        supabase.from('session_requests').select('session_id, status').eq('requester_id', user.id),
      ])

      if (saved) setSavedIds(new Set(saved.map((s: { session_id: string }) => s.session_id)))
      if (reqs) {
        const map: Record<string, string> = {}
        reqs.forEach((r: { session_id: string; status: string }) => {
          map[r.session_id] = r.status
        })
        setRequestStatuses(map)
      }
    }
    loadUserData()
  }, [supabase])

  async function handleInterest(sessionId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('session_requests')
      .insert({ session_id: sessionId, requester_id: user.id })

    // These failures were silent before, so a request blocked by the database
    // rate-limit trigger looked exactly like a button that did nothing.
    if (error) {
      toast.error(friendlyDbError(error.message))
      return
    }
    setRequestStatuses((prev) => ({ ...prev, [sessionId]: 'pending' }))
    toast.success('Request sent; the host will get back to you.')
  }

  async function handleSave(sessionId: string, saved: boolean) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // Optimistic: the toggle should feel instant. Reverted below if it fails.
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (saved) next.add(sessionId)
      else next.delete(sessionId)
      return next
    })

    const { error } = saved
      ? await supabase.from('saved_sessions').insert({ user_id: user.id, session_id: sessionId })
      : await supabase
          .from('saved_sessions')
          .delete()
          .eq('user_id', user.id)
          .eq('session_id', sessionId)

    if (error) {
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (saved) next.delete(sessionId)
        else next.add(sessionId)
        return next
      })
      toast.error(friendlyDbError(error.message))
    }
  }

  function toggleVibe(v: SessionVibe) {
    setFilters((prev) => {
      const current = prev.vibe || []
      const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v]
      return { ...prev, vibe: next.length > 0 ? next : undefined }
    })
  }

  const hasFilters = Boolean(filters.date || filters.vibe?.length)

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() =>
            setFilters((prev) => ({ ...prev, date: prev.date === 'today' ? undefined : 'today' }))
          }
          aria-pressed={filters.date === 'today'}
          className={chipClasses(filters.date === 'today')}
        >
          Today
        </button>
        {VIBES.map((v) => (
          <button
            key={v.value}
            onClick={() => toggleVibe(v.value)}
            aria-pressed={Boolean(filters.vibe?.includes(v.value))}
            className={chipClasses(Boolean(filters.vibe?.includes(v.value)))}
          >
            {v.label}
          </button>
        ))}
      </div>

      {initial ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SessionCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          description={error}
          onRetry={() => {
            setRefreshing(true)
            loadSessions(true, filters)
          }}
        />
      ) : sessions.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon={<Icon as={SearchX} size="lg" />}
            title="Nothing matches those filters"
            description="Try widening your search, or create the session you were looking for."
            action={
              <Button variant="secondary" size="lg" onClick={() => setFilters({})}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Icon as={BookOpen} size="lg" />}
            title="No sessions near you yet"
            description="Be the first to create one; study sessions show up here as soon as someone posts them."
            action={
              <Link href="/sessions/create">
                <Button size="lg">Create a session</Button>
              </Link>
            }
          />
        )
      ) : (
        <div
          // Dim rather than blank while a filter change is in flight.
          className={`space-y-4 transition-opacity ${refreshing ? 'opacity-50' : 'opacity-100'}`}
          aria-busy={refreshing}
        >
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onInterest={handleInterest}
              requestStatus={(requestStatuses[session.id] as never) || null}
              isSaved={savedIds.has(session.id)}
              onSave={handleSave}
            />
          ))}

          {hasMore ? (
            <Button
              variant="secondary"
              className="w-full"
              loading={loadingMore}
              disabled={loadingMore}
              onClick={() => {
                setLoadingMore(true)
                loadSessions(false, filters)
              }}
            >
              {loadingMore ? 'Loading' : 'Load more'}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

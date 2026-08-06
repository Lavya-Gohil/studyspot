'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SessionCard } from '@/components/session/SessionCard'
// Deep imports rather than the '@/components/ui' barrel — the barrel also
// re-exports Modal, which pulls framer-motion into this bundle for a component
// this route never renders.
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import type { Session } from '@studyspot/types'

interface Props {
  sessions: Session[]
  /** The viewer's subjects, offered as one-tap searches. */
  mySubjects: string[]
  error: string | null
}

function matches(session: Session, q: string): boolean {
  const haystack = [
    session.subject,
    session.description,
    session.location_name,
    session.location_city,
    session.host_name,
    session.host_college,
    ...(session.subject_tags || []),
  ]
  return haystack.some((field) => field?.toLowerCase().includes(q))
}

export function ExploreClient({ sessions, mySubjects, error }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const trimmed = query.trim().toLowerCase()
  const filtered = useMemo(
    () => (trimmed ? sessions.filter((s) => matches(s, trimmed)) : sessions),
    [sessions, trimmed]
  )

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Explore</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Search every open session — by subject, place, or who&apos;s hosting.
        </p>
      </div>

      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sessions by subject, location, host…"
        aria-label="Search sessions"
      />

      {/* The viewer's own subjects are the searches they actually want; typing
          them out every visit is friction for no reason. */}
      {!trimmed && mySubjects.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-tertiary">Your subjects:</span>
          {mySubjects.map((s) => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              className="rounded-full border border-border-default bg-bg-elevated px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <ErrorState
          title="Couldn't load sessions"
          description={error}
          onRetry={() => router.refresh()}
        />
      ) : filtered.length === 0 ? (
        trimmed ? (
          <EmptyState
            icon={<span className="text-2xl">🔍</span>}
            title="Nothing matches that"
            description={`No open session mentions "${query.trim()}". Clear the search, or host the one you were looking for.`}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="secondary" size="lg" onClick={() => setQuery('')}>
                  Clear search
                </Button>
                <Link href="/sessions/create">
                  <Button size="lg">Host a session</Button>
                </Link>
              </div>
            }
          />
        ) : (
          <EmptyState
            icon={<span className="text-2xl">📚</span>}
            title="No open sessions right now"
            description="Nothing is scheduled near you yet. Host one, or find people studying your subjects and start from there."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link href="/sessions/create">
                  <Button size="lg">Host a session</Button>
                </Link>
                <Link href="/match">
                  <Button variant="secondary" size="lg">
                    Find study partners
                  </Button>
                </Link>
              </div>
            }
          />
        )
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-text-tertiary" aria-live="polite">
            {filtered.length} session{filtered.length === 1 ? '' : 's'}
            {trimmed ? ` matching “${query.trim()}”` : ''}
          </p>
          {filtered.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}

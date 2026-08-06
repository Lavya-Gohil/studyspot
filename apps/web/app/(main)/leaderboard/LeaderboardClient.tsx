'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/profile/Avatar'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Skeleton } from '@/components/ui/Skeleton'

export interface LeaderRow {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  college: string | null
  level: number
  total_minutes: number
  rank: number
}

type Scope = 'global' | 'college'
type Range = '7' | '30'

const SCOPES = [
  { value: 'global' as const, label: 'Everyone' },
  { value: 'college' as const, label: 'My college' },
]
const RANGES = [
  { value: '7' as const, label: 'This week' },
  { value: '30' as const, label: '30 days' },
]

export function LeaderboardClient({
  initialRows,
  currentUserId,
  hasCollege,
}: {
  initialRows: LeaderRow[]
  currentUserId: string
  hasCollege: boolean
}) {
  const [scope, setScope] = useState<Scope>('global')
  const [range, setRange] = useState<Range>('7')
  const [rows, setRows] = useState<LeaderRow[]>(initialRows)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)

  // The server already rendered global/7, so skip the initial refetch.
  const isInitial = scope === 'global' && range === '7'

  useEffect(() => {
    if (isInitial) {
      setRows(initialRows)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)

    createClient()
      .rpc('leaderboard', { p_scope: scope, p_days: Number(range), p_limit: 25 })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else {
          setError(null)
          startTransition(() => setRows((data ?? []) as LeaderRow[]))
        }
      })
      .then(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
    }
  }, [scope, range, isInitial, initialRows])

  const busy = loading || pending

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Leaderboard</h1>
        <p className="text-sm text-text-secondary">
          Ranked by focused minutes. Only time from a finished timer counts.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          aria-label="Leaderboard scope"
          segments={SCOPES}
          value={scope}
          onChange={setScope}
          size="sm"
        />
        <SegmentedControl
          aria-label="Time range"
          segments={RANGES}
          value={range}
          onChange={setRange}
          size="sm"
        />
      </div>

      {scope === 'college' && !hasCollege ? (
        <EmptyState
          icon={<Icon as={Trophy} size="lg" />}
          title="No college on your profile"
          description="Add your college and you'll be ranked against people studying alongside you."
          action={
            <Link href="/profile/settings" className="btn-brand press">
              Add your college
            </Link>
          }
        />
      ) : error ? (
        <ErrorState description={error} />
      ) : busy ? (
        <Card pad="md" className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Icon as={Trophy} size="lg" />}
          title="Nobody has focused yet"
          description="Run a focus timer in a study room and you'll be the first one here."
          action={
            <Link href="/feed" className="btn-brand press">
              Find a session
            </Link>
          }
        />
      ) : (
        <Card pad="md">
          <ol className="stagger divide-y divide-border-subtle">
            {rows.map((r, i) => {
              const me = r.user_id === currentUserId
              return (
                <li
                  key={r.user_id}
                  style={{ ['--i' as string]: i }}
                  className={`flex items-center gap-3 py-2.5 ${
                    me ? '-mx-2 rounded-lg bg-brand-primary/[0.07] px-2' : ''
                  }`}
                >
                  <span
                    className={`w-7 shrink-0 text-center font-mono text-sm tnum ${
                      r.rank <= 3 ? 'font-bold text-brand-text' : 'text-text-tertiary'
                    }`}
                  >
                    {r.rank}
                  </span>

                  <Avatar
                    userId={r.user_id}
                    name={r.full_name ?? 'Student'}
                    avatarUrl={r.avatar_url}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${r.user_id}`}
                      className="block truncate text-sm font-medium text-text-primary transition-colors duration-fast ease-out hover:text-brand-text"
                    >
                      {r.full_name ?? 'Student'}
                      {me ? <span className="ml-1.5 text-xs text-text-tertiary">you</span> : null}
                    </Link>
                    {r.college ? (
                      <p className="truncate text-xs text-text-tertiary">{r.college}</p>
                    ) : null}
                  </div>

                  <span className="shrink-0 rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                    L{r.level}
                  </span>

                  <span className="w-16 shrink-0 text-right font-mono text-sm font-semibold text-text-primary tnum">
                    {formatMinutes(r.total_minutes)}
                  </span>
                </li>
              )
            })}
          </ol>
        </Card>
      )}
    </div>
  )
}

function formatMinutes(mins: number): string {
  const m = Number(mins) || 0
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h}h ${rem}m` : `${h}h`
}

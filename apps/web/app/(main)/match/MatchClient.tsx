'use client'

import { useId, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GraduationCap, SearchX, Users } from 'lucide-react'
import { Avatar } from '@/components/profile/Avatar'
import { Icon } from '@/components/ui/Icon'
// Deep imports rather than the '@/components/ui' barrel — the barrel also
// re-exports Modal, which pulls framer-motion into any client bundle that
// touches it for a component this route never renders.
import { VerifiedBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/EmptyState'
import { Tabs, TabPanel, type TabItem } from '@/components/ui/Tabs'
import { YEAR_LABELS, type YearOfStudy } from '@studyspot/types'
import type { MatchResult } from '@/lib/matching'

type Mode = 'compatible' | 'twin'
/** Label under the number — also decides whether it reads as a percentage. */
type ScoreUnit = 'match' | 'similar'

const TABS: TabItem[] = [
  { value: 'compatible', label: 'Compatibility' },
  { value: 'twin', label: 'Study Twin' },
]

/** How many results are on screen before "Show more". */
const PAGE = 8

/**
 * Below this, "twin" overstates it — a weak similarity still ranks first in a
 * thin pool, so the hero treatment is reserved for a genuinely close match.
 */
const TWIN_HERO_MIN = 40

interface Props {
  compatible: MatchResult[]
  similar: MatchResult[]
  /** The viewer's own subjects — drives the filter chips and the setup prompt. */
  mySubjects: string[]
  /** Reputation breakdown for the top compatibility match, rendered on the server. */
  topMatchReputation: ReactNode
  error: string | null
}

export function MatchClient({
  compatible,
  similar,
  mySubjects,
  topMatchReputation,
  error,
}: Props) {
  const router = useRouter()
  const tabsId = useId()

  const [mode, setMode] = useState<Mode>('compatible')
  const [subject, setSubject] = useState<string | null>(null)
  const [visible, setVisible] = useState(PAGE)

  const results = mode === 'compatible' ? compatible : similar

  const filtered = useMemo(() => {
    if (!subject) return results
    const needle = subject.toLowerCase()
    return results.filter((r) =>
      (r.profile.subjects || []).some((s) => s.toLowerCase() === needle)
    )
  }, [results, subject])

  // Both tabs rank the same pool differently, so how far the user had scrolled
  // through one says nothing about the other — start the new tab at the top.
  function switchMode(next: string) {
    setMode(next as Mode)
    setVisible(PAGE)
  }

  function toggleSubject(s: string) {
    setSubject((prev) => (prev === s ? null : s))
    setVisible(PAGE)
  }

  const hero =
    filtered[0] && (mode === 'compatible' || filtered[0].score >= TWIN_HERO_MIN)
      ? filtered[0]
      : null
  const rest = filtered.slice(hero ? 1 : 0, visible)
  const remaining = filtered.length - (hero ? 1 : 0) - rest.length

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Find your people</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Every match below lists exactly why it matched you — nothing is hidden behind a score.
        </p>
      </div>

      {mySubjects.length === 0 && (
        <div className="rounded-xl border border-accent-primary/20 bg-accent-primary/[0.06] p-4 text-sm text-text-secondary">
          You haven&apos;t added any subjects, so we&apos;re matching on your college and
          location alone.{' '}
          <Link href="/profile/settings" className="text-accent-primary hover:underline">
            Add your subjects
          </Link>{' '}
          for much sharper matches.
        </div>
      )}

      <Tabs idBase={tabsId} items={TABS} value={mode} onChange={switchMode} />

      {mySubjects.length > 1 && results.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by subject">
          {mySubjects.map((s) => {
            const active = subject === s
            return (
              <button
                key={s}
                onClick={() => toggleSubject(s)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-accent-primary/30 bg-accent-primary/15 text-accent-primary'
                    : 'border-border-default bg-bg-elevated text-text-secondary hover:border-border-strong'
                }`}
              >
                {s}
              </button>
            )
          })}
        </div>
      )}

      <TabPanel id={`${tabsId}-compatible`} active={mode === 'compatible'}>
        <p className="text-sm text-text-secondary">
          Who would make a good study partner — scored on shared subjects, course, year,
          college, city, and how reliably they turn up.
        </p>
        <Results
          error={error}
          onRetry={() => router.refresh()}
          hero={hero}
          rest={rest}
          remaining={remaining}
          onShowMore={() => setVisible((v) => v + PAGE)}
          unit="match"
          heroLabel="Best match"
          empty={
            <NoResults
              hasSubjects={mySubjects.length > 0}
              filteredBy={subject}
              onClearFilter={() => setSubject(null)}
              title="No study partners yet"
              description="Nobody in your subjects has joined yet. Sessions are the fastest way to meet people — jump into one and matches follow."
            />
          }
        >
          {/* Identity check, not just `hero` — the reputation was rendered on
              the server for the top-ranked match, and a subject filter can put
              someone else in the hero slot. */}
          {hero && hero === compatible[0] && topMatchReputation ? (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Why {firstName(hero.profile.full_name)} is a reliable partner
              </h2>
              {topMatchReputation}
            </section>
          ) : null}
        </Results>
      </TabPanel>

      <TabPanel id={`${tabsId}-twin`} active={mode === 'twin'}>
        <p className="text-sm text-text-secondary">
          Who studies like you — the overlap between your subjects, level, and study
          activity, regardless of whether you&apos;d pair up.
        </p>
        <Results
          error={error}
          onRetry={() => router.refresh()}
          hero={hero}
          rest={rest}
          remaining={remaining}
          onShowMore={() => setVisible((v) => v + PAGE)}
          unit="similar"
          heroLabel="Your study twin"
          empty={
            <NoResults
              hasSubjects={mySubjects.length > 0}
              filteredBy={subject}
              onClearFilter={() => setSubject(null)}
              title="No study twin yet"
              description="Nobody close enough to call a twin — this gets sharper as more students in your subjects join."
            />
          }
        />
      </TabPanel>
    </div>
  )
}

function Results({
  error,
  onRetry,
  hero,
  rest,
  remaining,
  onShowMore,
  unit,
  heroLabel,
  empty,
  children,
}: {
  error: string | null
  onRetry: () => void
  hero: MatchResult | null
  rest: MatchResult[]
  remaining: number
  onShowMore: () => void
  unit: ScoreUnit
  heroLabel: string
  empty: ReactNode
  /** Extra detail rendered under the hero — e.g. the reputation breakdown. */
  children?: ReactNode
}) {
  if (error) {
    return (
      <ErrorState
        description={error}
        onRetry={onRetry}
        title="Couldn't load your matches"
      />
    )
  }
  if (!hero && rest.length === 0) return <>{empty}</>

  return (
    <div className="mt-4 space-y-6">
      {hero && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {heroLabel}
          </h2>
          <MatchCard result={hero} unit={unit} featured />
        </section>
      )}

      {children}

      {rest.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {hero ? 'Others worth a look' : 'Worth a look'}
          </h2>
          <div className="space-y-3">
            {rest.map((r) => (
              <MatchCard key={r.profile.id} result={r} unit={unit} />
            ))}
          </div>
        </section>
      )}

      {remaining > 0 && (
        <Button variant="secondary" className="w-full" onClick={onShowMore}>
          Show {Math.min(remaining, PAGE)} more
        </Button>
      )}
    </div>
  )
}

/**
 * One candidate. The reasons come straight from lib/matching — rendered one per
 * chip and never truncated, because "why am I seeing this person" is the whole
 * point of the screen; collapsing them into a single elided line throws away
 * the only thing that makes the score trustworthy.
 */
function MatchCard({
  result,
  unit,
  featured = false,
}: {
  result: MatchResult
  unit: ScoreUnit
  featured?: boolean
}) {
  const { profile, score, reasons } = result
  const year = profile.year_of_study
    ? YEAR_LABELS[profile.year_of_study as YearOfStudy]
    : null
  const subtitle = [profile.course, year].filter(Boolean).join(' · ')

  return (
    <Link
      href={`/profile/${profile.id}`}
      className={`block rounded-lg p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift ${
        featured
          ? 'border border-accent-primary/30 bg-accent-primary/[0.06] hover:border-accent-primary/50'
          : 'border border-border-subtle bg-bg-surface hover:border-border-strong'
      }`}
    >
      <div className="flex items-start gap-4">
        <Avatar
          userId={profile.id}
          name={profile.full_name}
          avatarUrl={profile.avatar_url}
          size={featured ? 'lg' : 'md'}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`truncate font-semibold text-text-primary ${
                featured ? 'font-display text-lg' : 'text-sm'
              }`}
            >
              {profile.full_name || 'Student'}
            </span>
            {profile.verification_status === 'verified' && <VerifiedBadge />}
          </div>
          {profile.college && (
            <p className="truncate text-sm text-text-secondary">{profile.college}</p>
          )}
          {subtitle && <p className="truncate text-xs text-text-tertiary">{subtitle}</p>}
        </div>
        <div className="shrink-0 text-right">
          <div
            className={`font-display font-bold tnum text-accent-primary ${
              featured ? 'text-3xl' : 'text-lg'
            }`}
          >
            {score}
            {unit === 'similar' ? '%' : ''}
          </div>
          <div className="text-[11px] text-text-tertiary">{unit}</div>
        </div>
      </div>

      {featured && (
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-subtle"
          role="img"
          aria-label={`${score}${unit === 'similar' ? '%' : ' out of 100'} ${unit}`}
        >
          <div
            className="h-full rounded-full bg-accent-primary"
            style={{ width: `${Math.max(score, 2)}%` }}
          />
        </div>
      )}

      {reasons.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {reasons.map((reason) => (
            <li
              key={reason}
              className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-subtle px-2.5 py-1 text-xs text-text-secondary"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="shrink-0 text-accent-primary"
              >
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {reason}
            </li>
          ))}
        </ul>
      )}
    </Link>
  )
}

function NoResults({
  hasSubjects,
  filteredBy,
  onClearFilter,
  title,
  description,
}: {
  hasSubjects: boolean
  filteredBy: string | null
  onClearFilter: () => void
  title: string
  description: string
}) {
  if (filteredBy) {
    return (
      <EmptyState
        icon={<Icon as={SearchX} size="lg" />}
        title={`Nobody matched on ${filteredBy}`}
        description="That subject is quiet right now. Clear the filter to see everyone we found."
        action={
          <Button variant="secondary" size="lg" onClick={onClearFilter}>
            Show all matches
          </Button>
        }
      />
    )
  }

  // No subjects means the pool was never built from anything strong — sending
  // the user to the feed here would be a dead end when the real fix is upstream.
  if (!hasSubjects) {
    return (
      <EmptyState
        icon={<Icon as={GraduationCap} size="lg" />}
        title="Tell us what you study"
        description="Matching runs on your subjects, course, and year. Add them and this fills up straight away."
        action={
          <Link href="/profile/settings">
            <Button size="lg">Add your subjects</Button>
          </Link>
        }
      />
    )
  }

  return (
    <EmptyState
      icon={<Icon as={Users} size="lg" />}
      title={title}
      description={description}
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link href="/explore">
            <Button size="lg">Browse sessions</Button>
          </Link>
          <Link href="/sessions/create">
            <Button variant="secondary" size="lg">
              Host one
            </Button>
          </Link>
        </div>
      }
    />
  )
}

function firstName(name: string | null): string {
  return name?.trim().split(/\s+/)[0] || 'this student'
}

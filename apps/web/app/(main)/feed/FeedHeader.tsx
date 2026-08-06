import Link from 'next/link'
import { VolumeX } from 'lucide-react'
import type { Session } from '@studyspot/types'
import { Card } from '@/components/ui/Card'
import { VibePill } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { StudyingNow } from '@/components/layout/StudyingNow'

/**
 * Above-the-fold section of the feed.
 *
 * The feed previously opened with a greeting and nothing else — nothing that
 * changes between visits, so no reason to come back. This surfaces the three
 * things that do change: a session you're committed to, your streak, and how
 * much is happening today.
 *
 * Server component on purpose: all of this is already fetched in page.tsx, so
 * rendering it here keeps it out of the client bundle. The one exception is
 * <StudyingNow>, which is live by nature — it is an isolated client island
 * rather than a reason to make the whole header client-side.
 */

function startsIn(startTime: string): string {
  const diffMs = new Date(startTime).getTime() - Date.now()
  if (diffMs <= 0) return 'Happening now'

  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 60) return `Starts in ${minutes} min`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `Starts in ${hours}h`

  const days = Math.round(hours / 24)
  return days === 1 ? 'Starts tomorrow' : `Starts in ${days} days`
}

function NextSessionCard({ session }: { session: Session }) {
  const live = new Date(session.start_time).getTime() <= Date.now()

  return (
    <Link href={live ? `/room/${session.id}` : `/sessions/${session.id}`} className="block">
      <Card variant="elevated" interactive className="border-accent-primary/30">
        <div className="flex items-center gap-2 mb-2">
          {live ? (
            <span className="flex items-center gap-2 text-xs font-semibold text-brand-text">
              <span className="live-dot" />
              Happening now
            </span>
          ) : (
            <span className="text-xs font-semibold text-accent-primary">
              {startsIn(session.start_time)}
            </span>
          )}
        </div>
        <h2 className="font-display text-base font-semibold text-text-primary truncate">
          {session.subject}
        </h2>
        <div className="mt-2 flex items-center gap-2">
          <VibePill vibe={session.vibe} />
          <span className="text-xs text-text-tertiary truncate">
            {session.mode === 'online' ? 'Online' : session.location_name ?? 'In person'}
          </span>
        </div>
      </Card>
    </Link>
  )
}

export function FeedHeader({
  userFullName,
  userCountryName,
  todayCount,
  nextSession,
}: {
  userFullName: string | null
  userCountryName: string | null
  /** Sessions starting today in the user's scope — 0 hides the line. */
  todayCount: number
  nextSession: Session | null
}) {
  const firstName = userFullName?.split(' ')[0]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold text-text-primary">
            {firstName ? `Hey, ${firstName}` : 'Feed'}
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <p className="text-sm text-text-secondary">
              {todayCount > 0
                ? `${todayCount} session${todayCount === 1 ? '' : 's'} today`
                : userCountryName
                  ? `Sessions in ${userCountryName}`
                  : 'Find your study crew'}
            </p>
            {/* Renders nothing until presence syncs, and nothing when you're
                the only one here — see StudyingNow. */}
            <StudyingNow />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* The streak lives in <TodayPanel> directly below, at the centre of
              the week ring. Repeating it here put the same number on screen
              twice, eight pixels apart. */}
          <Link
            href="/sessions/create?mode=online&vibe=silent"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border-default bg-bg-elevated px-3 text-sm font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
          >
            <Icon as={VolumeX} size="sm" />
            Silent study
          </Link>
        </div>
      </div>

      {nextSession ? <NextSessionCard session={nextSession} /> : null}
    </div>
  )
}

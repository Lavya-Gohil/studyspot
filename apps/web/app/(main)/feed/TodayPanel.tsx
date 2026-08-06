import Link from 'next/link'
import { ArrowUpRight, Target } from 'lucide-react'
import type { Goal } from '@studyspot/types'
import { goalProgress } from '@studyspot/utils'
import { Card } from '@/components/ui/Card'
import { FlameIcon, FocusIcon, Icon } from '@/components/ui/Icon'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'

/**
 * The state-of-you strip, above the feed.
 *
 * The feed answers "what is happening"; this answers "where am I", which is
 * the question that actually brings someone back tomorrow. Everything here is
 * derived from rows the user created — no targets we invented on their behalf,
 * because a fabricated goal is worse than no goal.
 *
 * The ring measures days active this week out of seven rather than progress
 * toward a daily minute target. There is no daily target in the schema, and
 * inventing one would mean showing someone a bar they never agreed to. Days
 * active is real, it is what the streak is built from, and seven is a bound
 * the calendar supplies rather than us.
 *
 * Server component: every figure is already fetched in page.tsx, so none of
 * this costs the client bundle anything.
 */

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function TodayPanel({
  streak,
  todayMinutes,
  weekMinutes,
  daysActive,
  level,
  goal,
  goalStatValue,
}: {
  streak: number
  todayMinutes: number
  weekMinutes: number
  /** Distinct local days with recorded focus in the last seven. 0–7. */
  daysActive: number
  level: number
  /** The one goal worth showing — nearest deadline, else newest. */
  goal: Goal | null
  /** The auto-tracked stat this goal measures; ignored for custom goals. */
  goalStatValue: number
}) {
  const progress = goal ? goalProgress(goal, goalStatValue) : null

  return (
    <Card pad="lg" className="enter">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-5">
        <ProgressRing
          value={daysActive}
          max={7}
          size={84}
          stroke={7}
          label={`${daysActive} of the last 7 days with focus time`}
        >
          <div className="text-center leading-none">
            <div className="flex items-center justify-center gap-1 font-display text-xl font-bold text-text-primary">
              <FlameIcon size="xs" className="text-brand-text" />
              <span className="tnum">{streak}</span>
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-wider text-text-tertiary">
              {streak === 1 ? 'day' : 'days'}
            </div>
          </div>
        </ProgressRing>

        <div className="flex min-w-[10rem] flex-1 flex-wrap gap-x-8 gap-y-4">
          <Figure label="Focused today" value={formatMinutes(todayMinutes)} />
          <Figure label="This week" value={formatMinutes(weekMinutes)} />
          <Figure label="Level" value={String(level)} />
        </div>

        <Link
          href="/stats"
          className="press group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border-default px-3 text-sm text-text-secondary transition-colors duration-fast ease-out hover:border-border-strong hover:text-text-primary"
        >
          <FocusIcon size="sm" />
          Stats
          <Icon
            as={ArrowUpRight}
            size="xs"
            className="transition-transform duration-fast ease-out group-hover:-translate-y-px group-hover:translate-x-px"
          />
        </Link>
      </div>

      <div className="mt-5 border-t border-border-subtle pt-4">
        {goal && progress ? (
          <Link href="/goals" className="press block">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-text-primary">
                <Icon as={Target} size="sm" className="shrink-0 text-text-tertiary" />
                <span className="truncate">{goal.title}</span>
              </span>
              <span className="shrink-0 text-xs text-text-tertiary tnum">
                {progress.current} / {goal.target} {goal.unit}
              </span>
            </div>
            <ProgressBar
              value={progress.current}
              max={goal.target}
              size="sm"
              className="mt-2"
              label={`${goal.title}: ${progress.percent}% complete`}
            />
          </Link>
        ) : (
          <Link
            href="/goals"
            className="press inline-flex items-center gap-2 text-sm text-text-secondary transition-colors duration-fast ease-out hover:text-text-primary"
          >
            <Icon as={Target} size="sm" className="text-text-tertiary" />
            Set a goal to track against
          </Link>
        )}
      </div>
    </Card>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-xl font-bold text-text-primary tnum">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-text-tertiary">{label}</div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Play, Target, Users } from 'lucide-react'
import type { Goal, Session } from '@studyspot/types'
import { goalProgress } from '@studyspot/utils'
import { fetchMyNextSession } from '@studyspot/api/sessions'
import { fetchTopActiveGoal, fetchGoalStats, statValueForGoal } from '@studyspot/api/goals'
import { fetchMyCircles, type Circle } from '@studyspot/api/circles'
import { createClient } from '@/lib/supabase/client'
import { useGlobalPresence } from '@/lib/presence'
import { Icon } from '@/components/ui/Icon'
import { ProgressBar } from '@/components/ui/Progress'

/**
 * The context rail.
 *
 * The feed answers "what is happening". The rail answers "what is mine", and
 * everything in it already existed one or two clicks away: the next session
 * you committed to, how a goal is going, which circles you are in, who is
 * working right now. None of it was glanceable.
 *
 * It is deliberately ambient. Nothing here is the primary action on any page,
 * so it never competes with the column beside it: no headings louder than the
 * content, one accent, and sections that render nothing at all when they have
 * nothing true to say. A rail full of zeroes is worse than a narrower page.
 *
 * Client-side fetching on purpose. This sits in the shell rather than in any
 * one page's data flow, and making every server page fetch rail data would
 * couple every route to it. The queries are small, indexed, and none of them
 * block the content column.
 */

type RailData = {
  nextSession: Session | null
  goal: Goal | null
  goalStat: number
  circles: Circle[]
}

export function ContextRail() {
  const { count, focusing } = useGlobalPresence('browsing')
  const [data, setData] = useState<RailData | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const [nextSession, goal, stats, circles] = await Promise.all([
        fetchMyNextSession(supabase, user.id).catch(() => null),
        fetchTopActiveGoal(supabase, user.id).catch(() => null),
        fetchGoalStats(supabase, user.id).catch(() => ({
          verified_hours: 0,
          verified_sessions: 0,
        })),
        fetchMyCircles(supabase, user.id).catch(() => []),
      ])
      if (cancelled) return

      setData({
        nextSession,
        goal,
        goalStat: goal ? statValueForGoal(goal, stats) : 0,
        circles,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="sticky top-24 space-y-5 pb-8">
      {/* Presence. Hidden until it has synced AND there is more than just you,
          because "1 online" makes an empty room feel emptier. */}
      {count !== null && count > 1 ? (
        <div className="enter flex items-center gap-2 text-xs text-text-secondary">
          <span className="live-dot" />
          <span className="tnum font-medium text-text-primary">{count}</span> online
          {focusing > 0 ? (
            <>
              <span className="text-text-tertiary">·</span>
              <span className="tnum font-medium text-brand-text">{focusing}</span> focusing
            </>
          ) : null}
        </div>
      ) : null}

      {data?.nextSession ? (
        <RailSection title="Next session">
          <Link
            href={
              new Date(data.nextSession.start_time).getTime() <= Date.now()
                ? `/room/${data.nextSession.id}`
                : `/sessions/${data.nextSession.id}`
            }
            className="press block rounded-lg border border-border-subtle bg-bg-surface p-3 transition-colors duration-fast ease-out hover:border-border-default"
          >
            <p className="truncate text-sm font-medium text-text-primary">
              {data.nextSession.subject}
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {startsIn(data.nextSession.start_time)}
            </p>
          </Link>
        </RailSection>
      ) : null}

      {data?.goal ? (
        <RailSection title="Goal">
          <Link href="/goals" className="press block">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-text-primary">{data.goal.title}</span>
              <span className="shrink-0 text-xs text-text-tertiary tnum">
                {goalProgress(data.goal, data.goalStat).percent}%
              </span>
            </div>
            <ProgressBar
              value={goalProgress(data.goal, data.goalStat).current}
              max={data.goal.target}
              size="sm"
              className="mt-2"
              label={data.goal.title}
            />
          </Link>
        </RailSection>
      ) : null}

      {data && data.circles.length > 0 ? (
        <RailSection title="Your circles">
          <ul className="space-y-1">
            {data.circles.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link
                  href={`/circles/${c.id}`}
                  className="press flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-secondary transition-colors duration-fast ease-out hover:bg-bg-subtle hover:text-text-primary"
                >
                  {/* User-chosen data, not decoration. */}
                  <span aria-hidden="true">{c.emoji || '📚'}</span>
                  <span className="truncate">{c.name}</span>
                  <span className="ml-auto shrink-0 text-xs text-text-tertiary tnum">
                    {c.member_count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </RailSection>
      ) : null}

      {/* Always present, unlike everything above it. This is the one thing the
          rail is for on a day when nothing else in it has anything to say. */}
      <Link
        href="/sessions/create?mode=online&vibe=silent"
        className="press group flex items-center gap-2.5 rounded-lg border border-border-default px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors duration-fast ease-out hover:border-brand-primary/40 hover:text-text-primary"
      >
        <Icon as={Play} size="sm" className="text-brand-text" />
        Start a silent session
        <Icon
          as={ArrowRight}
          size="xs"
          className="ml-auto text-text-tertiary transition-transform duration-fast ease-out group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  )
}

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="enter">
      <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
        {title}
      </h2>
      {children}
    </section>
  )
}

function startsIn(startTime: string): string {
  const diffMs = new Date(startTime).getTime() - Date.now()
  if (diffMs <= 0) return 'Happening now'
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 60) return `In ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `In ${hours}h`
  const days = Math.round(hours / 24)
  return days === 1 ? 'Tomorrow' : `In ${days} days`
}

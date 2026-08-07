import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Award, Clock, Timer, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Heatmap } from '@/components/ui/Heatmap'
import { FlameIcon, FocusIcon, Icon } from '@/components/ui/Icon'
import { ProgressBar, ProgressRing } from '@/components/ui/Progress'
import { StatFigure } from './StatFigure'

export const metadata = { title: 'Your stats. StudySpot' }

/** Inverse of level_from_xp in migration 013: level N begins at 100*(N-1)^2. */
const xpForLevel = (level: number) => 100 * Math.pow(Math.max(level - 1, 0), 2)

export default async function StatsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // focus_daily already aggregates per day in the USER'S timezone (011), and
  // is security_invoker, so RLS scopes it to this user without a filter here.
  // Doing the rollup in Postgres keeps a year of raw sessions off the wire.
  const [{ data: profile }, { data: daily }, { data: earned }, { data: recent }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, xp, level, study_streak, longest_streak, streak_freezes, timezone, total_sessions_attended, total_sessions_hosted')
        .eq('id', user.id)
        .single(),
      supabase
        .from('focus_daily')
        .select('day, total_seconds')
        .gte('day', new Date(Date.now() - 183 * 864e5).toISOString().slice(0, 10))
        .order('day', { ascending: true }),
      supabase
        .from('user_badges')
        .select('badge_code, earned_at, badges(name, description, icon, tier)')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false }),
      supabase
        .from('focus_sessions')
        .select('duration_seconds, started_at, subject')
        .order('started_at', { ascending: false })
        .limit(200),
    ])

  const byDay: Record<string, number> = {}
  for (const row of daily ?? []) {
    byDay[row.day as string] = Number(row.total_seconds) / 60
  }

  const sessions = recent ?? []
  const totalSeconds = sessions.reduce((a, s) => a + (s.duration_seconds ?? 0), 0)
  const longest = sessions.reduce((a, s) => Math.max(a, s.duration_seconds ?? 0), 0)

  const weekAgo = Date.now() - 7 * 864e5
  const weekSeconds = sessions
    .filter((s) => new Date(s.started_at).getTime() >= weekAgo)
    .reduce((a, s) => a + (s.duration_seconds ?? 0), 0)

  const xp = profile?.xp ?? 0
  const level = profile?.level ?? 1
  const floorXp = xpForLevel(level)
  const ceilXp = xpForLevel(level + 1)
  const intoLevel = xp - floorXp
  const levelSpan = Math.max(1, ceilXp - floorXp)

  // The user's own today, not the server's, same reasoning as migration 011.
  const localToday = new Date(
    new Date().toLocaleString('en-US', { timeZone: profile?.timezone || 'UTC' })
  )

  const hasData = sessions.length > 0

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">Your stats</h1>
          <p className="text-sm text-text-secondary">
            Every focus timer you finish lands here.
          </p>
        </div>
        <Link
          href="/leaderboard"
          className="press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border-default px-3 text-sm text-text-secondary transition-colors duration-fast ease-out hover:border-border-strong hover:text-text-primary"
        >
          <Icon as={TrendingUp} size="sm" />
          Leaderboard
        </Link>
      </header>

      {/* Level + streak */}
      <Card pad="lg">
        <div className="flex flex-wrap items-center gap-6">
          <ProgressRing
            value={intoLevel}
            max={levelSpan}
            size={92}
            stroke={7}
            label={`Level ${level}, ${intoLevel} of ${levelSpan} XP to the next level`}
          >
            <div className="text-center leading-none">
              <div className="font-display text-2xl font-bold text-text-primary tnum">{level}</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-text-tertiary">
                Level
              </div>
            </div>
          </ProgressRing>

          <div className="min-w-[12rem] flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-text-primary">
                <StatFigure value={intoLevel} /> / {levelSpan} XP
              </span>
              <span className="text-xs text-text-tertiary">
                {Math.max(0, ceilXp - xp)} to level {level + 1}
              </span>
            </div>
            <ProgressBar
              value={intoLevel}
              max={levelSpan}
              className="mt-2"
              label={`Progress to level ${level + 1}`}
            />
            <p className="mt-2 text-xs text-text-tertiary">
              One XP per focused minute.
            </p>
          </div>

          <div className="flex items-center gap-5 border-border-subtle sm:border-l sm:pl-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 font-display text-2xl font-bold text-text-primary">
                <FlameIcon size="sm" className="text-brand-text" />
                <StatFigure value={profile?.study_streak ?? 0} />
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-text-tertiary">
                Day streak
              </div>
            </div>
            <div className="text-center">
              <div className="font-display text-2xl font-bold text-text-primary tnum">
                {profile?.longest_streak ?? 0}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-text-tertiary">
                Best
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Headline figures */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<FocusIcon size="sm" />} label="Total focused" value={Math.round(totalSeconds / 3600)} unit="h" />
        <Stat icon={<Icon as={Clock} size="sm" />} label="This week" value={Math.round(weekSeconds / 60)} unit="min" />
        <Stat icon={<Icon as={Timer} size="sm" />} label="Longest sit" value={Math.round(longest / 60)} unit="min" />
        <Stat icon={<Icon as={Award} size="sm" />} label="Badges" value={earned?.length ?? 0} />
      </div>

      {/* Heatmap */}
      <Card pad="lg">
        <h2 className="font-display text-base font-semibold text-text-primary">Focus calendar</h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          Last six months, in your local days.
        </p>
        <Heatmap data={byDay} weeks={26} endDate={localToday} className="mt-4" />
      </Card>

      {/* Badges */}
      <Card pad="lg">
        <h2 className="font-display text-base font-semibold text-text-primary">Badges</h2>
        {earned && earned.length > 0 ? (
          <ul className="stagger mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {earned.map((b, i) => {
              const meta = b.badges as unknown as
                | { name: string; description: string; tier: number }
                | null
              return (
                <li
                  key={b.badge_code}
                  style={{ ['--i' as string]: i }}
                  className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-subtle p-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/12 text-brand-text">
                    <Icon as={Award} size="sm" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {meta?.name ?? b.badge_code}
                    </p>
                    <p className="truncate text-xs text-text-secondary">{meta?.description}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">
            None yet. Finish a focus timer in a study room and the first one lands.
          </p>
        )}
      </Card>

      {!hasData ? (
        <EmptyState
          icon={<Icon as={Timer} size="lg" />}
          title="No focus time yet"
          description="Join a study room and run the focus timer. Everything on this page fills in from there."
          action={
            <Link href="/feed" className="btn-brand press">
              Find a session
            </Link>
          }
        />
      ) : null}
    </div>
  )
}

/**
 * `icon` is a rendered node, not a component type. The brand glyphs and the
 * lucide glyphs have genuinely different prop shapes, and a union of the two
 * only type-checks behind a cast, which would mean the compiler stops
 * catching a real mistake here. Letting the caller render its own icon costs
 * one extra pair of angle brackets and keeps the types honest.
 */
function Stat({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode
  label: string
  value: number
  unit?: string
}) {
  return (
    <Card pad="md" className="lift">
      <span className="text-text-tertiary">{icon}</span>
      <div className="mt-2 font-display text-xl font-bold text-text-primary">
        <StatFigure value={value} />
        {unit ? <span className="ml-0.5 text-sm font-medium text-text-tertiary">{unit}</span> : null}
      </div>
      <div className="text-xs text-text-tertiary">{label}</div>
    </Card>
  )
}

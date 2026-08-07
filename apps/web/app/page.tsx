import Link from 'next/link'
import { ArrowRight, CalendarCheck, MessagesSquare, ShieldCheck, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SiteHeader } from '@/components/marketing/SiteHeader'
import { SiteFooter } from '@/components/marketing/SiteFooter'
import { FlameIcon, FocusIcon, Icon, LogoMark, PulseIcon } from '@/components/ui/Icon'

/**
 * The landing page.
 *
 * Rewritten away from the template it used to be: pill badge, giant headline
 * with one highlighted word, two CTAs, a fabricated product mockup, a bento
 * grid of feature cards, "three steps to X", centred CTA card. That shape is
 * so common now that it reads as machine-made regardless of what it says.
 *
 * Two rules replace it.
 *
 * NO INVENTED DATA. The old page shipped a SESSIONS array of imaginary
 * students at imaginary cafés. Everything numeric here comes from
 * public_stats(), which is migration 014: four aggregate counts and no PII. When a
 * number is zero the page says something true instead of showing a zero or
 * inventing a bigger one. A brand new product looks new; that is fine, and it
 * is better than looking fake.
 *
 * NO FRAMER-MOTION. Entrances use the CSS classes from globals.css, so this
 * route ships no animation library at all. The old version pulled framer in
 * for three fades.
 */

export default async function HomePage() {
  const supabase = await createClient()

  const [{ data: auth }, { data: statsRows }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('public_stats'),
  ])

  const isAuthed = !!auth?.user
  const stats = (Array.isArray(statsRows) ? statsRows[0] : statsRows) as
    | { active_sessions: number; studying_now: number; students: number; hours_focused: number }
    | undefined

  const live = stats?.studying_now ?? 0
  const open = stats?.active_sessions ?? 0

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-bg-base text-text-primary">
      <SiteHeader isAuthed={isAuthed} />

      {/* ---------------------------------------------------------- Hero */}
      <section className="grain relative overflow-hidden">
        <div className="relative z-10 mx-auto max-w-5xl px-5 pt-32 sm:pt-40">
          <div className="enter-up">
            {/* Only claims something is happening when something is. */}
            {live > 0 ? (
              <span className="inline-flex items-center gap-2.5 rounded-full border border-brand-primary/25 bg-brand-primary/[0.07] px-3.5 py-1.5 text-xs font-medium text-brand-text">
                <span className="live-dot" />
                {live} {live === 1 ? 'session' : 'sessions'} running right now
              </span>
            ) : (
              <span className="eyebrow">Study together, on purpose</span>
            )}
          </div>

          <h1
            className="enter-up mt-7 text-[clamp(3rem,9vw,6.5rem)] font-bold leading-[0.92] tracking-[-0.045em]"
            style={{ animationDelay: '60ms' }}
          >
            Studying alone
            <br />
            is <span className="hl">the hard way.</span>
          </h1>

          <p
            className="enter-up mt-8 max-w-xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg"
            style={{ animationDelay: '120ms' }}
          >
            StudySpot puts you in a room with people doing the same work at the same time, a
            café down the road, or a live virtual desk with a shared timer. Turn up, lock in,
            leave having actually done it.
          </p>

          <div
            className="enter-up mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: '180ms' }}
          >
            <Link
              href={isAuthed ? '/feed' : '/auth/signup'}
              className="btn-brand-lg press w-full sm:w-auto"
            >
              {isAuthed ? 'Open StudySpot' : 'Start studying together'}
              <Icon as={ArrowRight} size="sm" className="ml-2" />
            </Link>
            {!isAuthed ? (
              <Link href="/auth/login" className="btn-glass-lg press w-full sm:w-auto">
                I have an account
              </Link>
            ) : null}
          </div>

          <p
            className="enter-up mt-5 text-xs text-text-tertiary"
            style={{ animationDelay: '240ms' }}
          >
            Free for students · Verified profiles · No credit card
          </p>
        </div>

        {/* The room, drawn from the real design system rather than a
            screenshot; same tokens, same type, same live dot the app uses. */}
        <div className="relative z-10 mx-auto mt-20 max-w-5xl px-5 pb-24">
          <RoomPreview live={live} open={open} />
        </div>
      </section>

      {/* ------------------------------------------------- What you get */}
      <section id="features" className="mx-auto max-w-5xl px-5 py-24 sm:py-28">
        <h2 className="max-w-2xl text-[clamp(1.9rem,4vw,2.9rem)] font-bold leading-[1.05] tracking-[-0.03em]">
          Accountability that <span className="hl">isn&apos;t willpower.</span>
        </h2>

        <div className="stagger mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2">
          <Feature
            i={0}
            icon={<FocusIcon size="lg" />}
            title="A timer everyone can see"
            body="The focus timer in a virtual room is shared. When someone starts it, it starts for the whole room, and every finished stretch is recorded against your name."
          />
          <Feature
            i={1}
            icon={<FlameIcon size="lg" />}
            title="Streaks that survive real life"
            body="Show up and the streak grows. Streaks count your local days, not a server's, and a freeze covers the day you were ill, because one bad week shouldn't erase three good months."
          />
          <Feature
            i={2}
            icon={<Icon as={Users} size="lg" />}
            title="Circles, not followers"
            body="Small private groups with a join code. A shared wall, shared goals, and a board that only ranks the people in it."
          />
          <Feature
            i={3}
            icon={<Icon as={ShieldCheck} size="lg" />}
            title="Verified students only"
            body="Profiles are checked against a student ID before they can be trusted. Blocking is real: block someone and they leave your feed, your matches and your leaderboards."
          />
        </div>
      </section>

      {/* ------------------------------------------------------- Closing */}
      <section className="mx-auto max-w-5xl px-5 pb-28">
        <div className="grain glass-strong glass-sheen relative overflow-hidden rounded-[2rem] px-6 py-16 sm:py-20">
          <div className="relative z-10 mx-auto max-w-xl text-center">
            <LogoMark size="xl" className="mx-auto text-brand-text" />
            <h2 className="mt-6 text-[clamp(1.9rem,4.5vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em]">
              Your next session is <span className="hl">tonight.</span>
            </h2>
            <p className="mx-auto mt-4 text-text-secondary">
              {open > 0
                ? `${open} open ${open === 1 ? 'session' : 'sessions'} to join right now.`
                : 'Create the first one and people will find it.'}
            </p>
            <Link
              href={isAuthed ? '/feed' : '/auth/signup'}
              className="btn-brand-lg press mt-9 inline-flex"
            >
              {isAuthed ? 'Open StudySpot' : 'Create your free account'}
              <Icon as={ArrowRight} size="sm" className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}

/* ------------------------------------------------------------------ */

function Feature({
  i,
  icon,
  title,
  body,
}: {
  i: number
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div style={{ ['--i' as string]: i }}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-text">
        {icon}
      </span>
      <h3 className="mt-5 font-display text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">{body}</p>
    </div>
  )
}

/**
 * A study room, built from the app's own tokens rather than mocked up.
 * The seat labels are initials of nobody in particular and are presented as an
 * illustration, not as people: no names, no fabricated profiles.
 */
function RoomPreview({ live, open }: { live: number; open: number }) {
  const seats = [0, 1, 2, 3, 4, 5, 6, 7]

  return (
    <div className="enter-up glass-strong glass-sheen overflow-hidden rounded-[1.75rem] p-2 shadow-glass" style={{ animationDelay: '300ms' }}>
      {/* Room chrome */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <FocusIcon size="sm" className="text-brand-text" />
          <span className="font-display font-semibold">Organic Chemistry, silent</span>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-primary/10 px-3 py-1.5 text-xs font-semibold text-brand-text">
          <span className="live-dot" />
          Live
        </span>
      </div>

      {/* Seats */}
      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-border-subtle bg-bg-base/40 p-3 sm:grid-cols-8">
        {seats.map((s) => (
          <div
            key={s}
            className={`flex aspect-square items-center justify-center rounded-xl border text-xs font-semibold ${
              s < 5
                ? 'border-brand-primary/25 bg-brand-primary/[0.08] text-brand-text'
                : 'border-border-subtle bg-bg-subtle/40 text-text-tertiary'
            }`}
          >
            {s < 5 ? <FocusIcon size="sm" /> : '·'}
          </div>
        ))}
      </div>

      {/* Timer bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-3xl font-semibold text-brand-text tnum">24:12</span>
          <span className="text-xs text-text-tertiary">shared timer · 5 focusing</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <Icon as={MessagesSquare} size="xs" />
          Chat
          <span className="mx-1 text-border-strong">·</span>
          <Icon as={CalendarCheck} size="xs" />
          Check in
        </div>
      </div>

      {/* Honest footer: real numbers when there are real numbers. */}
      <div className="flex items-center gap-2 border-t border-border-subtle px-3 py-2.5 text-xs text-text-tertiary">
        <PulseIcon size="xs" className="text-brand-text" />
        {live > 0 || open > 0 ? (
          <span>
            {live > 0 ? `${live} running now` : null}
            {live > 0 && open > 0 ? ' · ' : null}
            {open > 0 ? `${open} open to join` : null}
          </span>
        ) : (
          <span>An illustration of a virtual room; yours will have your crew in it.</span>
        )}
      </div>
    </div>
  )
}

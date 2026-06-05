import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { FadeIn, Stagger, StaggerItem } from '@/components/motion/Motion'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthed = !!user

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-bg-base text-text-primary">
      {/* Floating glass pill nav */}
      <header className="fixed inset-x-0 top-3 z-50 px-4 sm:top-5">
        <nav className="glass-strong glass-sheen mx-auto flex h-14 max-w-3xl items-center justify-between rounded-full pl-5 pr-2">
          <Link href="/" className="font-display text-[17px] font-bold tracking-tight">
            Study<span className="text-text-tertiary">Spot</span>
          </Link>
          <div className="hidden items-center gap-1 sm:flex">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#how">How it works</NavLink>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {isAuthed ? (
              <Link href="/feed" className="btn-accent">
                Open app
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="hidden h-9 items-center rounded-full px-3 text-sm text-text-secondary transition-colors hover:text-text-primary sm:inline-flex"
                >
                  Log in
                </Link>
                <Link href="/auth/signup" className="btn-accent">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="ambient grain relative overflow-hidden">
        {/* Aurora backdrop blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="aurora left-1/2 top-[-12%] h-[42rem] w-[42rem] -translate-x-1/2" />
          <div className="aurora right-[-10%] top-[8%] h-[24rem] w-[24rem]" style={{ animationDelay: '-6s' }} />
        </div>

        <FadeIn className="relative z-10 mx-auto max-w-4xl px-5 pb-24 pt-36 text-center sm:pt-44">
          <span className="glass mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
            Study with people who actually show up
          </span>

          <h1 className="text-balance text-[clamp(2.9rem,8vw,5.75rem)] font-bold leading-[0.98] tracking-[-0.04em]">
            Stop studying
            <br />
            <span className="text-royal">alone.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
            StudySpot connects students for real study sessions — find a crew near you,
            pick a vibe, set a goal, and finally get focused. Together.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isAuthed ? (
              <Link href="/feed" className="btn-accent-lg w-full sm:w-auto">
                Open StudySpot
              </Link>
            ) : (
              <>
                <Link href="/auth/signup" className="btn-accent-lg w-full sm:w-auto">
                  Get started, free
                </Link>
                <Link href="/auth/login" className="btn-glass-lg w-full sm:w-auto">
                  I have an account
                </Link>
              </>
            )}
          </div>
          <p className="mt-5 text-xs text-text-tertiary">
            Free for students · Verified profiles · No spam
          </p>
        </FadeIn>

        {/* Stats strip */}
        <div className="relative z-10 mx-auto max-w-3xl px-5 pb-24">
          <div className="glass grid grid-cols-3 divide-x divide-[var(--border-subtle)] overflow-hidden rounded-2xl">
            {[
              { value: 'Six vibes', label: 'Silent, Pomodoro, coding & more' },
              { value: 'Verified', label: 'Real students, every time' },
              { value: 'Accountable', label: 'Goals, circles & streaks' },
            ].map((s) => (
              <div key={s.value} className="px-3 py-7 text-center">
                <div className="font-display text-base font-bold sm:text-xl">{s.value}</div>
                <div className="mt-1.5 text-[11px] leading-snug text-text-secondary sm:text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — bento grid */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
        <FadeIn className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Everything you need
          </span>
          <h2 className="mt-3 text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.03em]">
            Built for studying together.
          </h2>
          <p className="mt-4 max-w-md text-text-secondary">
            Find your people, lock in a vibe, and hold each other to it.
          </p>
        </FadeIn>

        <Stagger className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-6">
          {/* Large feature */}
          <StaggerItem className="sm:col-span-4 sm:row-span-2">
            <article className="glass glass-sheen group relative h-full overflow-hidden rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                <IconPin />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold tracking-tight">Sessions near you</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
                Browse real study sessions at cafés, libraries, and campuses around you — or host
                your own and set the time, place, and vibe.
              </p>
              {/* mini location chips */}
              <div className="mt-7 flex flex-wrap gap-2">
                {['Central Library', 'Bean & Brew', 'CS Building', 'Quad Lawn', 'Co-work Loft'].map((p) => (
                  <span
                    key={p}
                    className="glass rounded-full px-3.5 py-1.5 text-xs text-text-secondary"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </article>
          </StaggerItem>

          <StaggerItem className="sm:col-span-2">
            <FeatureCard icon={<IconSpark />} title="Pick your vibe" body="Silent, Pomodoro, discussion, coding, exam prep, or casual." />
          </StaggerItem>
          <StaggerItem className="sm:col-span-2">
            <FeatureCard icon={<IconTarget />} title="Stay accountable" body="Set goals, join circles, and keep your study streak alive." />
          </StaggerItem>
          <StaggerItem className="sm:col-span-3">
            <FeatureCard icon={<IconShield />} title="Verified students" body="Profiles are verified so you study with real students. Block and report keep it safe." />
          </StaggerItem>
          <StaggerItem className="sm:col-span-3">
            <FeatureCard icon={<IconChat />} title="Built-in chat" body="Coordinate with your group before and during a session in real time." />
          </StaggerItem>
        </Stagger>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-5 py-24 sm:py-32">
        <FadeIn>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            How it works
          </span>
          <h2 className="mt-3 text-[clamp(2rem,4.5vw,3rem)] font-bold tracking-[-0.03em]">
            Three steps to focus.
          </h2>
        </FadeIn>
        <Stagger className="mt-14 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <StaggerItem key={step.title}>
              <div className="glass glass-sheen h-full rounded-2xl p-6">
                <div className="font-mono text-sm text-text-tertiary tnum">0{i + 1}</div>
                <div className="mt-3 h-px w-10 bg-accent-primary/40" />
                <h3 className="mt-5 font-display text-lg font-bold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{step.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-5 pb-28">
        <FadeIn>
          <div className="ambient grain glass-strong glass-sheen relative overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:py-24">
            <div className="relative z-10">
              <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.03em]">
                Ready to find your crew?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-text-secondary">
                Join StudySpot and study with people who actually show up.
              </p>
              <Link
                href={isAuthed ? '/feed' : '/auth/signup'}
                className="btn-accent-lg mt-9 inline-flex"
              >
                {isAuthed ? 'Open StudySpot' : 'Create your free account'}
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-9 text-sm text-text-tertiary sm:flex-row">
          <span className="font-display font-bold">
            Study<span className="text-text-tertiary">Spot</span>
          </span>
          <div className="flex gap-6">
            <Link href="#features" className="transition-colors hover:text-text-secondary">
              Features
            </Link>
            <Link href="/auth/login" className="transition-colors hover:text-text-secondary">
              Log in
            </Link>
            <Link href="/auth/signup" className="transition-colors hover:text-text-secondary">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3.5 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
    >
      {children}
    </Link>
  )
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <article className="glass glass-sheen group h-full rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
        {icon}
      </div>
      <h3 className="mt-5 font-display text-lg font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">{body}</p>
    </article>
  )
}

const ic = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const IconPin = () => (
  <svg {...ic}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IconSpark = () => (
  <svg {...ic}>
    <path d="M12 3v3M12 18v3M5 12H2M22 12h-3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const IconShield = () => (
  <svg {...ic}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)
const IconChat = () => (
  <svg {...ic}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)
const IconTarget = () => (
  <svg {...ic}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </svg>
)

const STEPS = [
  {
    title: 'Create your profile',
    body: 'Sign up, add your subjects and college, and get verified as a real student.',
  },
  {
    title: 'Find or host a session',
    body: 'Browse sessions near you, or start your own and set the vibe, time, and spots.',
  },
  {
    title: 'Show up and study',
    body: 'Meet at the spot, lock in a goal, and get focused together.',
  },
]

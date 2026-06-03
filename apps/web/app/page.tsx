import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { FadeIn } from '@/components/motion/Motion'
import { Avatar } from '@/components/profile/Avatar'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthed = !!user

  return (
    <main className="min-h-[100dvh] bg-bg-base text-text-primary">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg-base/70 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="font-display text-xl font-semibold tracking-tight">
            Study<span className="text-accent-primary">Spot</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="#features"
              className="hidden rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary sm:block"
            >
              Features
            </Link>
            <Link
              href="#how"
              className="hidden rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary sm:block"
            >
              How it works
            </Link>
            <ThemeToggle className="mr-1" />
            {isAuthed ? (
              <Link
                href="/feed"
                className="ml-1 inline-flex h-9 items-center rounded-md bg-accent-primary px-4 text-sm font-medium text-white shadow-soft transition-all hover:bg-accent-hover active:scale-[0.98]"
              >
                Open app
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="ml-1 inline-flex h-9 items-center rounded-md bg-accent-primary px-4 text-sm font-medium text-white shadow-soft transition-all hover:bg-accent-hover active:scale-[0.98]"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="ambient grain relative overflow-hidden">
        <FadeIn className="relative z-10 mx-auto max-w-5xl px-5 pb-28 pt-24 text-center sm:pt-36">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border-default bg-bg-surface/70 px-3.5 py-1.5 text-xs text-text-secondary backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" />
            Now with live online study rooms
          </div>
          <h1 className="text-[clamp(2.75rem,6vw,5.25rem)] font-bold leading-[1.02] tracking-tight">
            Find your study crew.
            <br />
            <span className="text-royal">In person or online.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
            StudySpot connects students for real study sessions — at a café or library near you,
            or in a live virtual room where everyone shows up as an avatar. Pick a vibe, join a
            session, get focused.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isAuthed ? (
              <Link
                href="/feed"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-royal px-7 text-sm font-medium text-white shadow-lift transition-all hover:opacity-90 hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto"
              >
                Open StudySpot
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-royal px-7 text-sm font-medium text-white shadow-lift transition-all hover:opacity-90 hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto"
                >
                  Get started, free
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-border-default bg-bg-surface/50 px-7 text-sm font-medium text-text-primary transition-all hover:border-border-strong hover:bg-bg-subtle active:scale-[0.98] sm:w-auto"
                >
                  I have an account
                </Link>
              </>
            )}
          </div>
          <p className="mt-5 text-xs text-text-tertiary">
            Free for students · Verified profiles · No spam
          </p>
        </FadeIn>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border-subtle bg-bg-surface/40">
        <div className="mx-auto grid max-w-4xl grid-cols-3 divide-x divide-border-subtle px-5">
          {[
            { value: 'Six vibes', label: 'Silent, Pomodoro, Coding and more' },
            { value: 'Two ways', label: 'In person or fully online' },
            { value: 'Verified', label: 'Real students, every time' },
          ].map((s) => (
            <div key={s.value} className="px-3 py-9 text-center">
              <div className="font-display text-lg font-semibold sm:text-2xl">{s.value}</div>
              <div className="mt-1.5 text-xs text-text-secondary">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features — bento grid */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-28 sm:py-36">
        <FadeIn className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-[2.75rem] sm:leading-[1.05]">
            Everything you need to study together
          </h2>
          <p className="mt-4 text-text-secondary">
            Whether you want to meet up or stay home, there is a room for you.
          </p>
        </FadeIn>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-6">
          {/* Large feature — online rooms */}
          <article className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface p-7 transition-all hover:border-border-default sm:col-span-4 sm:row-span-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary/12 text-accent-primary">
              <IconMonitor />
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold">Live online rooms</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
              Join a virtual classroom where everyone sits as an avatar. See who is focused in
              real time, share a chat, and run a group timer together.
            </p>
            {/* mini seat preview — a lively room */}
            <div className="mt-6 grid max-w-sm grid-cols-6 gap-2">
              {['Ana', 'Ben', '', 'Mia', 'Sam', 'Lee', '', 'Kai', 'Ivy', '', 'Noa', ''].map(
                (n, i) => (
                  <div
                    key={i}
                    className={`flex aspect-square items-center justify-center rounded-lg border ${
                      n
                        ? 'border-accent-primary/30 bg-accent-primary/[0.06]'
                        : 'border-dashed border-border-subtle'
                    }`}
                  >
                    {n && <Avatar userId={n} name={n} avatarUrl={null} size="sm" />}
                  </div>
                )
              )}
            </div>
          </article>

          {/* Sessions near you */}
          <FeatureCard
            className="sm:col-span-2"
            icon={<IconPin />}
            title="Sessions near you"
            body="Find real study sessions at cafés, libraries, and campuses around you."
          />

          {/* Vibe */}
          <FeatureCard
            className="sm:col-span-2"
            icon={<IconSpark />}
            title="Pick your vibe"
            body="Silent, Pomodoro, discussion, coding, exam prep, or casual."
          />

          {/* Verified */}
          <FeatureCard
            className="sm:col-span-3"
            icon={<IconShield />}
            title="Verified students"
            body="Profiles are verified so you study with real students. Block and report keep it safe."
          />

          {/* Chat */}
          <FeatureCard
            className="sm:col-span-3"
            icon={<IconChat />}
            title="Built-in chat"
            body="Coordinate with your group before and during a session in real time."
          />
        </div>
      </section>

      {/* Online highlight */}
      <section className="border-y border-border-subtle bg-bg-surface/30">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-28 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-3 py-1 text-xs font-medium text-accent-primary">
              Online rooms
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-[2.5rem] sm:leading-[1.06]">
              Cannot go out? Pull up a seat anyway.
            </h2>
            <p className="mt-4 text-text-secondary">
              Online sessions drop you into a live virtual classroom. Everyone sits as an avatar,
              you see who is focused in real time, share a chat, and run a study timer together —
              no commute required.
            </p>
            <ul className="mt-7 space-y-3.5 text-sm">
              {[
                'See who else is in the room, live',
                'Every member gets a seat and an avatar',
                'Shared chat and a group focus timer',
                'The same vibes as in-person sessions',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-text-secondary">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-green/15 text-[11px] text-accent-green">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Classroom mock */}
          <div className="grain relative overflow-hidden rounded-2xl border border-border-default bg-bg-base p-5 shadow-lift">
            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium">Calculus II · Pomodoro room</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-accent-green">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" />
                  4 focusing
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {SEATS.map((seat, i) => (
                  <div
                    key={i}
                    className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border ${
                      seat
                        ? 'border-accent-primary/40 bg-accent-primary/[0.08]'
                        : 'border-dashed border-border-subtle'
                    }`}
                  >
                    {seat ? (
                      <>
                        <div className="ring-2 ring-accent-green/70 rounded-full">
                          <Avatar userId={seat.name} name={seat.name} avatarUrl={null} size="sm" />
                        </div>
                        <span className="text-[10px] text-text-secondary">{seat.name}</span>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-bg-surface px-4 py-3">
                <span className="text-xs text-text-secondary">Focus timer</span>
                <span className="font-mono text-lg font-semibold text-accent-primary tnum">18:24</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-5 py-28 sm:py-36">
        <h2 className="text-3xl font-bold tracking-tight sm:text-[2.5rem]">How it works</h2>
        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title}>
              <div className="font-mono text-sm text-accent-primary tnum">0{i + 1}</div>
              <div className="mt-3 h-px w-10 bg-accent-primary/40" />
              <h3 className="mt-5 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-5 pb-28">
        <div className="ambient grain relative overflow-hidden rounded-3xl border border-border-default bg-bg-surface px-6 py-16 text-center sm:py-20">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold tracking-tight sm:text-[2.75rem] sm:leading-[1.05]">
              Ready to stop studying alone?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-text-secondary">
              Join StudySpot and find your people, wherever you are.
            </p>
            <Link
              href={isAuthed ? '/feed' : '/auth/signup'}
              className="mt-9 inline-flex h-12 items-center justify-center rounded-lg bg-royal px-8 text-sm font-medium text-white shadow-lift transition-all hover:opacity-90 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              {isAuthed ? 'Open StudySpot' : 'Create your free account'}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-9 text-sm text-text-tertiary sm:flex-row">
          <span className="font-display">
            Study<span className="text-accent-primary">Spot</span>
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

function FeatureCard({
  icon,
  title,
  body,
  className = '',
}: {
  icon: React.ReactNode
  title: string
  body: string
  className?: string
}) {
  return (
    <article
      className={`group rounded-2xl border border-border-subtle bg-bg-surface p-7 transition-all hover:border-border-default ${className}`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary/12 text-accent-primary">
        {icon}
      </div>
      <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
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

const IconMonitor = () => (
  <svg {...ic}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
)
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

const STEPS = [
  {
    title: 'Create your profile',
    body: 'Sign up, add your subjects and college, and get verified as a real student.',
  },
  {
    title: 'Find or host a session',
    body: 'Browse sessions near you or online, or start your own and set the vibe, time, and spots.',
  },
  {
    title: 'Show up and study',
    body: 'Meet at the spot or drop into the online room, and get focused together.',
  },
]

const SEATS: ({ emoji: string; name: string } | null)[] = [
  { emoji: '🧑‍🎓', name: 'Ana' },
  { emoji: '🧑‍💻', name: 'You' },
  null,
  { emoji: '👩‍🔬', name: 'Mia' },
  null,
  { emoji: '🧑‍🏫', name: 'Ben' },
  null,
  null,
]

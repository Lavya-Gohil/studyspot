import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FadeIn, Stagger, StaggerItem } from '@/components/motion/Motion'
import { Avatar } from '@/components/profile/Avatar'
import { SiteHeader } from '@/components/marketing/SiteHeader'
import { SiteFooter } from '@/components/marketing/SiteFooter'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isAuthed = !!user

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-bg-base text-text-primary">
      {/* Floating glass pill nav (shared with all marketing pages) */}
      <SiteHeader isAuthed={isAuthed} />

      {/* Hero */}
      <section className="ambient grain relative overflow-hidden">
        {/* Aurora backdrop blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="aurora left-1/2 top-[-12%] h-[42rem] w-[42rem] -translate-x-1/2" />
          <div className="aurora right-[-10%] top-[8%] h-[24rem] w-[24rem]" style={{ animationDelay: '-6s' }} />
        </div>

        <FadeIn className="relative z-10 mx-auto max-w-4xl px-5 pt-36 text-center sm:pt-44">
          <span className="glass mb-7 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-text-secondary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-primary" />
            Study with people who actually show up
          </span>

          <h1 className="text-balance text-[clamp(2.9rem,8vw,5.75rem)] font-bold leading-[0.95] tracking-[-0.04em]">
            Stop studying
            <br />
            <span className="hl">alone.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
            StudySpot connects students for real study sessions — find a crew near you,
            pick a vibe, set a goal, and finally get focused. Together.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isAuthed ? (
              <Link href="/feed" className="btn-accent-lg w-full sm:w-auto">
                Open StudySpot →
              </Link>
            ) : (
              <>
                <Link href="/auth/signup" className="btn-accent-lg w-full sm:w-auto">
                  Get started, free →
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

        {/* Live map + sessions panel */}
        <FadeIn delay={0.1} className="relative z-10 mx-auto mt-16 max-w-4xl px-5 pb-24">
          <MapPanel />
        </FadeIn>
      </section>

      {/* Features — bento grid */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
        <FadeIn className="max-w-2xl">
          <span className="eyebrow">Everything you need</span>
          <h2 className="mt-4 text-[clamp(2rem,4.5vw,3.25rem)] font-bold leading-[1.0] tracking-[-0.03em]">
            Built for studying <span className="hl">together.</span>
          </h2>
          <p className="mt-4 max-w-md text-text-secondary">
            Find your people, lock in a vibe, and hold each other to it.
          </p>
        </FadeIn>

        <Stagger className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-6">
          {/* Large feature with mini map */}
          <StaggerItem className="sm:col-span-4 sm:row-span-2">
            <article className="glass glass-sheen group relative flex h-full flex-col overflow-hidden rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                <IconPin />
              </div>
              <h3 className="mt-5 font-display text-xl font-bold tracking-tight">Sessions near you</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-text-secondary">
                Browse real study sessions at cafés, libraries, and campuses around you — or host
                your own and set the time, place, and vibe.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Central Library', 'Bean & Brew', 'CS Building', 'Quad Lawn', 'Co-work Loft'].map((p) => (
                  <span key={p} className="glass rounded-full px-3.5 py-1.5 text-xs text-text-secondary">
                    {p}
                  </span>
                ))}
              </div>
              <div className="map-grid relative mt-6 grow overflow-hidden rounded-2xl border border-border-subtle bg-bg-base/40">
                <MapRoads />
                <Pin className="left-[22%] top-[34%]" />
                <Pin className="left-[58%] top-[58%]" dot />
                <Pin className="left-[72%] top-[28%]" />
                <Pin className="left-[42%] top-[70%]" />
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
          <span className="eyebrow">How it works</span>
          <h2 className="mt-4 text-[clamp(2rem,4.5vw,3rem)] font-bold tracking-[-0.03em]">
            Three steps to <span className="hl">focus.</span>
          </h2>
        </FadeIn>
        <Stagger className="mt-14 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <StaggerItem key={step.title}>
              <div className="glass glass-sheen h-full rounded-2xl p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10 font-mono text-sm font-semibold text-accent-primary tnum">
                  {i + 1}
                </div>
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
              <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.0] tracking-[-0.03em]">
                Ready to find your <span className="hl">crew?</span>
              </h2>
              <p className="mx-auto mt-4 max-w-md text-text-secondary">
                Join StudySpot and study with people who actually show up.
              </p>
              <Link
                href={isAuthed ? '/feed' : '/auth/signup'}
                className="btn-accent-lg mt-9 inline-flex"
              >
                {isAuthed ? 'Open StudySpot →' : 'Create your free account →'}
              </Link>
              <p className="mt-6 text-xs text-text-tertiary">
                Free for students · No credit card · Verified profiles
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

      <SiteFooter />
    </main>
  )
}

/* ========================= Map + sessions ======================= */
function MapPanel() {
  return (
    <div className="glass-strong glass-sheen overflow-hidden rounded-[1.75rem] p-2 shadow-glass">
      {/* toolbar */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="glass flex items-center gap-2 rounded-full px-3.5 py-2 text-sm text-text-tertiary">
          <IconSearch />
          <span>Sessions near downtown</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-primary/10 px-3 py-1.5 text-xs font-semibold text-accent-primary">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-primary" />
          Near you
        </span>
      </div>

      {/* map canvas */}
      <div className="map-grid relative h-56 overflow-hidden rounded-2xl border border-border-subtle bg-bg-base/40 sm:h-72">
        <MapRoads />
        <Pin className="left-[28%] top-[38%]" label="Calc II" />
        <Pin className="left-[47%] top-[62%]" dot />
        <Pin className="left-[64%] top-[28%]" label="CS lock-in" />
        <Pin className="left-[55%] top-[72%]" />
      </div>

      {/* session rows */}
      <div className="mt-2 space-y-2 p-1">
        {SESSIONS.map((s) => (
          <SessionRow key={s.title} {...s} />
        ))}
      </div>
    </div>
  )
}

function SessionRow({
  title,
  when,
  place,
  vibe,
  crew,
  status,
  join,
}: (typeof SESSIONS)[number]) {
  return (
    <div className="glass flex items-center justify-between gap-4 rounded-2xl px-4 py-3.5 transition-colors hover:border-[var(--border-strong)]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-display text-[15px] font-bold tracking-tight">{title}</span>
          <span className="shrink-0 rounded-full border border-border-default px-2 py-0.5 text-[11px] text-text-secondary">
            {vibe}
          </span>
        </div>
        <div className="mt-0.5 truncate text-xs text-text-tertiary">
          {when} · {place}
        </div>
        <div className="mt-2">
          <AvatarStack people={crew} size="xs" />
        </div>
      </div>
      <div className="shrink-0 text-right">
        {join ? (
          // Product-preview card, but the CTA is real: it starts signup.
          <Link
            href="/auth/signup"
            className="inline-flex h-8 items-center rounded-full bg-accent-primary px-4 text-xs font-semibold text-accent-fg transition-all hover:bg-accent-hover"
          >
            Join
          </Link>
        ) : (
          <span className="text-xs font-semibold text-text-secondary">{status}</span>
        )}
      </div>
    </div>
  )
}

function MapRoads() {
  return (
    <svg className="absolute inset-0 h-full w-full text-[var(--border-default)]" preserveAspectRatio="none" viewBox="0 0 400 200" fill="none">
      <path d="M-20 70 C 90 50, 150 130, 260 110 S 420 80, 440 95" stroke="currentColor" strokeWidth="2" />
      <path d="M120 -10 C 130 60, 90 120, 140 210" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
      <path d="M300 -10 C 290 70, 330 120, 300 210" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
    </svg>
  )
}

function Pin({ className = '', label, dot }: { className?: string; label?: string; dot?: boolean }) {
  return (
    <div className={`absolute ${className}`}>
      <div className="relative flex flex-col items-center">
        {label && (
          <span className="glass-strong mb-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold">
            {label}
          </span>
        )}
        <span className="relative flex h-3 w-3 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-primary/60" />
          {dot ? (
            <span className="relative h-2.5 w-2.5 rounded-full bg-accent-primary ring-2 ring-bg-base" />
          ) : (
            <span className="relative text-accent-primary">
              <IconMapPin />
            </span>
          )}
        </span>
      </div>
    </div>
  )
}

/* ========================= Avatar stack ========================= */
function AvatarStack({
  people,
  size = 'xs',
  extra,
}: {
  people: { id: string; name: string }[]
  size?: 'xs' | 'sm'
  extra?: string
}) {
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {people.map((p) => (
          <span key={p.id} className="rounded-full ring-2 ring-bg-base">
            <Avatar userId={p.id} name={p.name} avatarUrl={null} size={size} />
          </span>
        ))}
      </div>
      {extra && (
        <span className="-ml-2 flex h-6 items-center rounded-full bg-bg-subtle px-2 text-[11px] font-semibold text-text-secondary ring-2 ring-bg-base">
          {extra}
        </span>
      )}
    </div>
  )
}

/* ============================ Cards ============================= */
function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
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

/* ============================== Data =========================== */
const SESSIONS = [
  {
    title: 'Calc II grind',
    when: 'Today 4:00 PM',
    place: 'Bean & Brew',
    vibe: 'Pomodoro',
    status: '2 spots left',
    join: false,
    crew: [
      { id: 'Mara', name: 'Mara' },
      { id: 'Leo', name: 'Leo' },
      { id: 'Nia', name: 'Nia' },
    ],
  },
  {
    title: 'CS finals lock-in',
    when: 'Today 6:30 PM',
    place: 'CS Building',
    vibe: 'Silent',
    status: 'Join',
    join: true,
    crew: [
      { id: 'Priya', name: 'Priya' },
      { id: 'Sam', name: 'Sam' },
    ],
  },
  {
    title: 'Essay co-write',
    when: 'Tomorrow 10 AM',
    place: 'Central Library',
    vibe: 'Casual',
    status: '4 spots left',
    join: false,
    crew: [
      { id: 'Ivy', name: 'Ivy' },
      { id: 'Kai', name: 'Kai' },
      { id: 'Bo', name: 'Bo' },
    ],
  },
]

/* ============================== Icons ========================== */
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
const IconMapPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
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
const IconSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
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

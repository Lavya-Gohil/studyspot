import type { Metadata } from 'next'
import Link from 'next/link'
import { FadeIn, Stagger, StaggerItem } from '@/components/motion/Motion'

export const metadata: Metadata = {
  title: 'About. StudySpot',
  description:
    'Why StudySpot exists: studying alone is the default, and it shouldn\'t be. Meet the idea behind the study-crew platform.',
}

const VALUES = [
  {
    title: 'Show up, for real',
    body: 'Everything we build pushes toward one moment: people actually sitting down together and doing the work. Accountability beats motivation.',
  },
  {
    title: 'Students first, always',
    body: 'StudySpot is free for students. Profiles are verified so you study with real classmates, not bots, recruiters, or randoms.',
  },
  {
    title: 'Focus is a group sport',
    body: 'Body doubling, shared timers, silent rooms, streaks; the science is clear that focus is easier together. We turn it into a product.',
  },
  {
    title: 'Safety by design',
    body: 'Verification, blocking, reporting, and privacy controls aren\'t afterthoughts. A study network only works if it feels safe to meet.',
  },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 pb-24">
      <FadeIn>
        <span className="eyebrow">About StudySpot</span>
        <h1 className="mt-4 text-[clamp(2.4rem,6vw,4rem)] font-bold leading-[1.0] tracking-[-0.035em]">
          Studying alone is the default.
          <br />
          It <span className="hl">shouldn&apos;t</span> be.
        </h1>
        <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-text-secondary sm:text-lg">
          StudySpot started with a simple observation: every campus is full of students grinding
          through the same material, in the same buildings, completely alone. Group chats fizzle.
          &ldquo;We should study together sometime&rdquo; never happens. So we built the missing
          piece: a way to turn <em className="text-text-primary not-italic">intent</em> into an
          actual session with a time, a place, a vibe, and people who show up.
        </p>
      </FadeIn>

      <FadeIn delay={0.05} className="mt-16">
        <div className="glass glass-sheen rounded-3xl p-7 sm:p-10">
          <h2 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            What StudySpot is
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
            A social productivity platform where students create and join real study sessions,
            at cafés, libraries, campuses, or online rooms. Pick a vibe (silent, Pomodoro,
            discussion, exam prep), set the spots, and let verified students request to join.
            Reputation scores, verified study hours, circles, and accountability goals keep the
            whole thing honest.
          </p>
        </div>
      </FadeIn>

      <section className="mt-16">
        <FadeIn>
          <span className="eyebrow">What we believe</span>
          <h2 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-bold tracking-[-0.03em]">
            Built on four <span className="hl">convictions.</span>
          </h2>
        </FadeIn>
        <Stagger className="mt-10 grid gap-4 sm:grid-cols-2">
          {VALUES.map((v) => (
            <StaggerItem key={v.title}>
              <div className="glass glass-sheen h-full rounded-2xl p-6">
                <h3 className="font-display text-lg font-bold tracking-tight">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{v.body}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <FadeIn className="mt-16">
        <div className="grain glass-strong glass-sheen relative overflow-hidden rounded-[2rem] px-6 py-14 text-center">
          <div className="relative z-10">
            <h2 className="text-[clamp(1.8rem,4.5vw,2.8rem)] font-bold tracking-[-0.03em]">
              Ready to find your <span className="hl">crew?</span>
            </h2>
            <Link href="/auth/signup" className="btn-accent-lg mt-8 inline-flex">
              Create your free account →
            </Link>
          </div>
        </div>
      </FadeIn>
    </div>
  )
}

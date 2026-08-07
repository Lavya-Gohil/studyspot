import type { Metadata } from 'next'
import Link from 'next/link'
import { FadeIn, Stagger, StaggerItem } from '@/components/motion/Motion'
import { POSTS } from './posts'

export const metadata: Metadata = {
  title: 'Blog. StudySpot',
  description: 'Focus science, study playbooks, and notes from the StudySpot team.',
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function BlogIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 pb-24">
      <FadeIn>
        <span className="eyebrow">Blog</span>
        <h1 className="mt-4 text-[clamp(2.4rem,6vw,4rem)] font-bold leading-[1.0] tracking-[-0.035em]">
          Notes on studying <span className="hl">together.</span>
        </h1>
        <p className="mt-5 max-w-xl text-text-secondary">
          Focus science, group-study playbooks, and what we&apos;re learning building StudySpot.
        </p>
      </FadeIn>

      <Stagger className="mt-14 space-y-4">
        {POSTS.map((post) => (
          <StaggerItem key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="glass glass-sheen group block rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                <span className="glass rounded-full px-3 py-1 font-semibold text-text-secondary">
                  {post.tag}
                </span>
                <span>{formatDate(post.date)}</span>
                <span>·</span>
                <span>{post.readMins} min read</span>
              </div>
              <h2 className="mt-4 font-display text-xl font-bold tracking-tight sm:text-2xl">
                {post.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
                {post.excerpt}
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-accent-primary">
                Read post →
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  )
}

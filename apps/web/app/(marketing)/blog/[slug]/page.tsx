import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FadeIn } from '@/components/motion/Motion'
import { POSTS, getPost } from '../posts'

// Static blog: pre-render every post, 404 anything else.
export const dynamicParams = false

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getPost(params.slug)
  if (!post) return { title: 'Blog — StudySpot' }
  return { title: `${post.title} — StudySpot`, description: post.excerpt }
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug)
  if (!post) notFound()

  return (
    <article className="mx-auto max-w-3xl px-5 pb-24">
      <FadeIn>
        <Link
          href="/blog"
          className="text-sm text-text-tertiary transition-colors hover:text-text-primary"
        >
          ← All posts
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
          <span className="glass rounded-full px-3 py-1 font-semibold text-text-secondary">
            {post.tag}
          </span>
          <span>{formatDate(post.date)}</span>
          <span>·</span>
          <span>{post.readMins} min read</span>
        </div>

        <h1 className="mt-5 text-balance text-[clamp(1.9rem,5vw,3rem)] font-bold leading-[1.05] tracking-[-0.03em]">
          {post.title}
        </h1>

        <div className="mt-10 space-y-8">
          {post.sections.map((section, i) => (
            <section key={i}>
              {section.heading && (
                <h2 className="font-display text-xl font-bold tracking-tight">{section.heading}</h2>
              )}
              <div className={section.heading ? 'mt-3 space-y-4' : 'space-y-4'}>
                {section.paragraphs.map((p, j) => (
                  <p key={j} className="text-pretty leading-relaxed text-text-secondary">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="glass glass-sheen mt-14 rounded-3xl p-7 text-center">
          <h2 className="font-display text-lg font-bold tracking-tight">
            Put it into practice
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-text-secondary">
            Find a study session near you — or host one — and stop studying alone.
          </p>
          <Link href="/auth/signup" className="btn-accent mt-5 inline-flex">
            Join StudySpot, free →
          </Link>
        </div>
      </FadeIn>
    </article>
  )
}

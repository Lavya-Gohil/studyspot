import type { MetadataRoute } from 'next'
import { POSTS } from './(marketing)/blog/posts'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://web-livid-two-79.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ['', '/about', '/blog', '/privacy', '/terms', '/safety', '/cookies'].map(
    (path) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: 'monthly' as const,
      priority: path === '' ? 1 : 0.6,
    })
  )

  const posts = POSTS.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(`${p.date}T00:00:00Z`),
    changeFrequency: 'yearly' as const,
    priority: 0.5,
  }))

  return [...staticPages, ...posts]
}

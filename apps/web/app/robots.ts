import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://web-livid-two-79.vercel.app'

// Index the marketing surface; keep auth flows, the app, and admin out of
// search results (they're login-gated anyway, but don't even invite crawls).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/auth/', '/admin/', '/feed', '/explore', '/sessions', '/circles', '/goals', '/match', '/chat', '/room', '/profile', '/notifications'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

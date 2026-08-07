import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { checkRateLimit, clientIp, hashKey } from '@/lib/rate-limit'

/**
 * Per-route rate-limit buckets (requests per window). Auth routes get a
 * tight budget, they're the credential-stuffing / signup-spam surface.
 * General pages stay generous so prefetching and fast browsing never 429.
 */
const LIMITS = {
  auth: { limit: 30, windowMs: 60_000 },
  general: { limit: 200, windowMs: 60_000 },
} as const

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const scope = pathname.startsWith('/auth') ? 'auth' : 'general'
  const { limit, windowMs } = LIMITS[scope]

  // IP-based limit always applies; a per-user limit (hashed auth cookie) is
  // layered on top so one abusive account can't hide behind rotating IPs and
  // a busy shared NAT (campus wifi) isn't punished collectively.
  const ip = clientIp(request.headers)
  const keys = [`ip:${scope}:${ip}`]
  const authCookie = request.cookies
    .getAll()
    .find((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))
  if (authCookie?.value) keys.push(`user:${scope}:${hashKey(authCookie.value)}`)

  for (const key of keys) {
    const result = checkRateLimit(key, limit, windowMs)
    if (!result.ok) {
      return tooManyRequests(request, result.retryAfter)
    }
  }

  return await updateSession(request)
}

/** Graceful 429: JSON for fetch/RSC requests, a small HTML page for navigations. */
function tooManyRequests(request: NextRequest, retryAfter: number) {
  const headers = {
    'Retry-After': String(retryAfter),
    'Cache-Control': 'no-store',
  }
  const wantsHtml = request.headers.get('accept')?.includes('text/html')
  if (!wantsHtml) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Please slow down.', retryAfter },
      { status: 429, headers }
    )
  }
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Slow down</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:system-ui,sans-serif;background:#08080A;color:#F5F5F7;display:grid;place-items:center;min-height:100dvh;margin:0;text-align:center;padding:24px}p{color:#A9A9B2}</style>
</head><body><div><h1>Whoa, slow down</h1><p>Too many requests from your connection.<br>Try again in about ${retryAfter}s.</p></div></body></html>`,
    { status: 429, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export const config = {
  matcher: [
    // Skip static assets and public metadata files (robots/sitemap/manifest
    // must be crawlable without an auth redirect).
    //
    // sw.js is excluded for a different reason: the browser fetches the service
    // worker outside any page navigation, including on update checks that can
    // race an expired cookie. Passing it through updateSession answers with a
    // 302 to /auth/login, and registration then fails on the HTML MIME type;
    // which looks nothing like the auth problem it actually is.
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

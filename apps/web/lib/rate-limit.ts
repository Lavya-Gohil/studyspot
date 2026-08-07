/**
 * Lightweight sliding-window rate limiter for Next.js middleware (Edge runtime).
 *
 * Counters live in module-scope memory, so limits are enforced **per server
 * instance** and reset on deploy. That is the right trade-off here: it needs
 * no external service, adds ~0ms latency, and still stops the abuse that
 * matters (credential stuffing, scraping, endpoint hammering). If StudySpot
 * outgrows a single region/instance, swap `check()` for a Redis-backed store
 * (e.g. Upstash @upstash/ratelimit): the call sites won't change.
 *
 * NOTE: writes to Supabase go browser → Supabase directly and never pass
 * through this middleware. Those paths are rate-limited in the database
 * itself (see supabase/migrations/006_security_hardening.sql).
 */

type Window = { count: number; resetAt: number }

const buckets = new Map<string, Window>()

// Cap the map so a spoofed-IP flood can't grow memory unbounded.
const MAX_BUCKETS = 10_000

function sweep(now: number) {
  // Drop expired windows; if still too big (IP-spoofing flood), clear all;
  // losing counters is safer than an out-of-memory crash.
  buckets.forEach((w, k) => {
    if (w.resetAt <= now) buckets.delete(k)
  })
  if (buckets.size > MAX_BUCKETS) buckets.clear()
}

export type RateLimitResult = {
  ok: boolean
  /** Seconds until the window resets, used for the Retry-After header. */
  retryAfter: number
  limit: number
  remaining: number
}

/**
 * Count one hit against `key` and report whether it stays within
 * `limit` requests per `windowMs`.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  if (buckets.size > MAX_BUCKETS / 2 && Math.random() < 0.01) sweep(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0, limit, remaining: limit - 1 }
  }

  bucket.count++
  const remaining = limit - bucket.count
  if (remaining < 0) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      limit,
      remaining: 0,
    }
  }
  return { ok: true, retryAfter: 0, limit, remaining }
}

/** Best-effort client IP. On Vercel, x-forwarded-for's first hop is trustworthy. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Non-reversible short key for per-user limiting, derived from the Supabase
 * auth cookie. Hashing means raw session tokens never sit in the bucket map.
 * (FNV-1a, tiny and fast; collision resistance is irrelevant for buckets.)
 */
export function hashKey(value: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

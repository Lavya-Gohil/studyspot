/**
 * Shared security helpers for StudySpot Edge Functions.
 *
 * Covers the OWASP API-security basics every function needs:
 *  - CORS with an explicit origin allow-list (no `*` on authed endpoints)
 *  - graceful per-key rate limiting (429 + Retry-After)
 *  - shared-secret verification for DB-webhook / cron callers
 *  - strict, schema-style body validation helpers
 *
 * Required function secrets (set with `supabase secrets set NAME=value`):
 *  - WEBHOOK_SECRET, random 32+ char string; also set it as the
 *    `x-webhook-secret` header on the Database Webhooks that call
 *    on-message-insert / on-request-approved.
 *  - CRON_SECRET, random 32+ char string; send it as `x-cron-secret`
 *    from the scheduler that triggers the cron functions.
 *  - ALLOWED_ORIGINS, optional comma-separated browser origins allowed to
 *    call user-facing functions (defaults below).
 */

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'https://web-livid-two-79.vercel.app',
]

function allowedOrigins(): string[] {
  const env = Deno.env.get('ALLOWED_ORIGINS')
  return env ? env.split(',').map((o) => o.trim()).filter(Boolean) : DEFAULT_ORIGINS
}

/** CORS headers for a request, echoes the origin only if allow-listed. */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allow = allowedOrigins().includes(origin) ? origin : allowedOrigins()[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

/** JSON response with CORS + no-store (these endpoints are never cacheable). */
export function json(req: Request, body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(req),
      ...extra,
    },
  })
}

/* ----------------------------- rate limiting ---------------------------- */

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

/**
 * Per-isolate sliding-window limiter. Edge function isolates are recycled,
 * so this is best-effort, but it still blunts burst abuse (notification
 * spam, signed-URL farming) at zero infra cost. For hard guarantees the data
 * paths are also limited inside Postgres (006_security_hardening.sql).
 *
 * Returns null when allowed, or a ready-to-return 429 Response when not.
 */
export function rateLimit(req: Request, key: string, limit: number, windowMs: number): Response | null {
  const now = Date.now()
  if (buckets.size > 5_000) {
    buckets.forEach((b, k) => { if (b.resetAt <= now) buckets.delete(k) })
  }
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }
  bucket.count++
  if (bucket.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
    return json(
      req,
      { error: 'rate_limited', message: 'Too many requests. Please try again shortly.', retryAfter },
      429,
      { 'Retry-After': String(retryAfter) }
    )
  }
  return null
}

/** Best-effort caller IP for rate-limit keys. */
export function callerIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

/* ----------------------------- shared secrets --------------------------- */

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify a caller-supplied shared secret. Comparison happens on SHA-256
 * digests so it is constant-time with respect to the secret's content.
 * FAILS CLOSED: if the env secret is missing the request is rejected,
 * deploy the secret before (or with) the function.
 */
export async function requireSecret(
  req: Request,
  headerName: string,
  envName: string
): Promise<Response | null> {
  const expected = Deno.env.get(envName)
  const provided = req.headers.get(headerName)
  if (!expected) {
    console.error(`${envName} is not configured; rejecting request (fail closed).`)
    return json(req, { error: 'misconfigured', message: `${envName} not set` }, 503)
  }
  if (!provided || (await sha256Hex(provided)) !== (await sha256Hex(expected))) {
    return json(req, { error: 'unauthorized' }, 401)
  }
  return null
}

/* --------------------------- input validation --------------------------- */

/**
 * Parse a JSON body and reject anything outside `allowedFields`
 * (schema-style strictness: unexpected fields are an error, not ignored).
 */
export async function readJsonBody(
  req: Request,
  allowedFields: string[]
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: Response }> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { ok: false, response: json(req, { error: 'invalid_json' }, 400) }
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, response: json(req, { error: 'invalid_body' }, 400) }
  }
  const body = raw as Record<string, unknown>
  const unexpected = Object.keys(body).filter((k) => !allowedFields.includes(k))
  if (unexpected.length > 0) {
    return {
      ok: false,
      response: json(req, { error: 'unexpected_fields', fields: unexpected }, 400),
    }
  }
  return { ok: true, body }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/** Bounded plain string (control characters stripped). */
export function cleanString(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string') return null
  // deno-lint-ignore no-control-regex
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()
  if (cleaned.length === 0 || cleaned.length > maxLen) return null
  return cleaned
}

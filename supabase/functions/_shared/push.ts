/**
 * Shared push fan-out for StudySpot Edge Functions.
 *
 * Two transports behind one call:
 *  - Expo (`profiles.expo_push_token`) for the native app
 *  - Web Push (`push_subscriptions`, migration 008) for the browser, which is
 *    where every feature ships first and where nothing was being delivered
 *
 * Required function secrets for the web transport (set alongside
 * WEBHOOK_SECRET / CRON_SECRET):
 *  - VAPID_PUBLIC_KEY  — base64url P-256 public key, also handed to the browser
 *    as NEXT_PUBLIC_VAPID_PUBLIC_KEY so both halves agree
 *  - VAPID_PRIVATE_KEY — base64url P-256 private scalar (server-only)
 *  - VAPID_SUBJECT     — `mailto:` or `https:` contact; RFC 8292 requires the
 *    push service be able to reach the sender about misbehaving pushes
 * Generate a pair with `npx web-push generate-vapid-keys`.
 *
 * Missing VAPID config disables the web transport and logs — unlike the shared
 * secrets it must NOT fail closed, because that would take Expo delivery (and
 * the calling webhook) down with it.
 */

// The Supabase client is untyped in these functions; every call site passes
// the same service-role client.
// deno-lint-ignore no-explicit-any
type Db = any

export type PushMessage = {
  title: string
  body: string
  /** In-app destination the service worker opens on click, e.g. `/chat/<id>`. */
  url: string
  /** Mirrors the `type` the mobile app already switches on for navigation. */
  type: string
  sessionId?: string
}

/* --------------------------- recipient resolution ------------------------ */

/**
 * Everyone who belongs to a session: approved requesters PLUS the host.
 *
 * The host lives in `sessions.host_id` and never has a `session_requests` row,
 * so any fan-out that reads session_requests alone silently drops the one
 * person guaranteed to be in the session. Every notification path went through
 * that query, which is why hosts received nothing about their own sessions.
 * Mirrors is_session_member() in 002_rls.sql, which has always counted both.
 */
export async function sessionMemberIds(db: Db, sessionId: string): Promise<string[]> {
  const [{ data: session }, { data: approved }] = await Promise.all([
    db.from('sessions').select('host_id').eq('id', sessionId).single(),
    db
      .from('session_requests')
      .select('requester_id')
      .eq('session_id', sessionId)
      .eq('status', 'approved'),
  ])

  // A Set because a single user must never be pushed twice for one event.
  const ids = new Set<string>()
  if (session?.host_id) ids.add(session.host_id)
  for (const row of (approved ?? []) as { requester_id: string }[]) ids.add(row.requester_id)
  return [...ids]
}

/* ------------------------------- fan-out -------------------------------- */

/**
 * Deliver `msg` to every device the given users have registered, on both
 * transports. Never throws: a dead push service must not fail the webhook and
 * make Supabase retry the whole notification.
 */
export async function notifyUsers(db: Db, userIds: string[], msg: PushMessage): Promise<void> {
  if (userIds.length === 0) return

  const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
    db.from('profiles').select('expo_push_token').in('id', userIds).not('expo_push_token', 'is', null),
    db.from('push_subscriptions').select('endpoint, p256dh, auth').in('user_id', userIds),
  ])

  const expoTokens = ((profiles ?? []) as { expo_push_token: string }[]).map((p) => p.expo_push_token)

  await Promise.all([
    sendExpo(expoTokens, msg),
    sendWebPushAll(db, (subscriptions ?? []) as WebPushSubscription[], msg),
  ])
}

/* --------------------------------- Expo --------------------------------- */

async function sendExpo(tokens: string[], msg: PushMessage): Promise<void> {
  if (tokens.length === 0) return

  // Expo rejects batches over 100 notifications, so a popular session would
  // silently lose everyone past the cap without chunking.
  for (let i = 0; i < tokens.length; i += 100) {
    const chunk = tokens.slice(i, i + 100)
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          chunk.map((token) => ({
            to: token,
            title: msg.title,
            body: msg.body,
            data: { sessionId: msg.sessionId, type: msg.type, url: msg.url },
            sound: 'default',
          }))
        ),
      })
    } catch (err) {
      console.error('expo push failed', err)
    }
  }
}

/* ------------------------------- Web Push -------------------------------- */

type WebPushSubscription = { endpoint: string; p256dh: string; auth: string }

const encoder = new TextEncoder()

function vapidConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT')
  if (!publicKey || !privateKey || !subject) return null
  return { publicKey, privateKey, subject }
}

async function sendWebPushAll(db: Db, subs: WebPushSubscription[], msg: PushMessage): Promise<void> {
  if (subs.length === 0) return

  if (!vapidConfig()) {
    console.warn('VAPID keys not configured — skipping web push for', subs.length, 'subscription(s).')
    return
  }

  const results = await Promise.all(subs.map((sub) => sendWebPush(sub, msg)))

  // 404/410 is the push service telling us the browser revoked or expired this
  // subscription. Nothing else ever clears those rows, so they would otherwise
  // accumulate forever and we'd keep paying for pushes nobody can receive.
  const gone = subs.filter((_, i) => results[i] === 'gone').map((s) => s.endpoint)
  if (gone.length > 0) {
    await db.from('push_subscriptions').delete().in('endpoint', gone)
  }
}

async function sendWebPush(sub: WebPushSubscription, msg: PushMessage): Promise<'ok' | 'gone' | 'failed'> {
  try {
    const endpoint = new URL(sub.endpoint)
    const body = await encryptPayload(encoder.encode(JSON.stringify(msg)), sub.p256dh, sub.auth)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: await vapidAuthHeader(endpoint.origin),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        // Everything we send is time-sensitive ("starts in 30 minutes", a live
        // chat message). A push held for a day would land as pure noise.
        TTL: '3600',
      },
      body,
    })

    if (res.status === 404 || res.status === 410) return 'gone'
    if (!res.ok) {
      console.error('web push rejected', res.status, await res.text().catch(() => ''))
      return 'failed'
    }
    return 'ok'
  } catch (err) {
    console.error('web push failed', err)
    return 'failed'
  }
}

/* ------------------------ VAPID (RFC 8292) signing ----------------------- */

let signingKey: Promise<CryptoKey> | null = null

function vapidSigningKey(privateKey: string, publicKey: string): Promise<CryptoKey> {
  if (!signingKey) {
    // WebCrypto has no "raw private EC key" import, so rebuild the JWK by hand:
    // x/y are the two halves of the uncompressed public point (minus its 0x04
    // prefix byte) and d is the private scalar.
    const point = b64urlToBytes(publicKey)
    signingKey = crypto.subtle.importKey(
      'jwk',
      {
        kty: 'EC',
        crv: 'P-256',
        x: bytesToB64url(point.slice(1, 33)),
        y: bytesToB64url(point.slice(33, 65)),
        d: bytesToB64url(b64urlToBytes(privateKey)), // re-encode: tolerate padded/standard base64
        ext: true,
      },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    )
  }
  return signingKey
}

// One JWT per push service, reused until it nears expiry — a fan-out to 8
// members hits the same origin 8 times and re-signing each is pure waste.
const jwtCache = new Map<string, { header: string; expiresAt: number }>()

async function vapidAuthHeader(audience: string): Promise<string> {
  const vapid = vapidConfig()!
  const now = Math.floor(Date.now() / 1000)

  const cached = jwtCache.get(audience)
  if (cached && cached.expiresAt > now + 300) return cached.header

  // 12h is well inside the 24h ceiling push services enforce on `exp`.
  const exp = now + 12 * 60 * 60
  const signingInput =
    bytesToB64url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))) +
    '.' +
    bytesToB64url(encoder.encode(JSON.stringify({ aud: audience, exp, sub: vapid.subject })))

  const key = await vapidSigningKey(vapid.privateKey, vapid.publicKey)
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    encoder.encode(signingInput)
  )

  const header = `vapid t=${signingInput}.${bytesToB64url(new Uint8Array(signature))}, k=${vapid.publicKey}`
  jwtCache.set(audience, { header, expiresAt: exp })
  return header
}

/* ------------------- payload encryption (RFC 8291 / 8188) ----------------- */

/**
 * aes128gcm-encrypt a Web Push payload for one subscription.
 *
 * The push service is an untrusted relay — Google/Mozilla/Apple hand the bytes
 * to the browser without ever holding a key. The client's p256dh (its public
 * key) and auth (a shared secret) are what make the payload readable only by
 * the subscribing browser, so both come straight from PushManager.subscribe().
 */
async function encryptPayload(
  plaintext: Uint8Array,
  p256dh: string,
  authSecret: string
): Promise<Uint8Array> {
  const uaPublic = b64urlToBytes(p256dh)
  const auth = b64urlToBytes(authSecret)

  // A fresh sender keypair per message: the ECDH secret (and therefore the
  // content key) is never reused across pushes.
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey))
  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256)
  )

  // RFC 8291 §3.4: binding both public keys into the derivation means a
  // captured payload cannot be replayed against a different subscription.
  const ikm = await hkdf(auth, shared, concat(encoder.encode('WebPush: info\0'), uaPublic, asPublic), 32)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, encoder.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, encoder.encode('Content-Encoding: nonce\0'), 12)

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  // 0x02 marks the last record (RFC 8188 §2); our payloads are small enough to
  // always be a single record.
  const padded = concat(plaintext, new Uint8Array([2]))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded)
  )

  // aes128gcm header: salt(16) | record size(4) | key id length(1) | key id.
  // The key id is the sender public key the client needs to derive the CEK.
  const header = new Uint8Array(16 + 4 + 1 + asPublic.length)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, 4096)
  header[20] = asPublic.length
  header.set(asPublic, 21)

  return concat(header, ciphertext)
}

/** HKDF extract+expand in one step — WebCrypto's deriveBits does both. */
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  )
  return new Uint8Array(bits)
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

function b64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function bytesToB64url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

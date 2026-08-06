'use client'

/**
 * Web Push registration (browser half).
 *
 * The mobile app has had push since day one via Expo; the web app had a
 * manifest and icons but no service worker, so browser users received nothing.
 * This is the client side of that: register the worker, ask permission,
 * subscribe with our VAPID key, and hand the subscription to the server, which
 * stores it in `push_subscriptions` (migration 008).
 *
 * Nothing here is a security boundary — the route handlers re-derive the user
 * from their session cookie and the RPC writes the row as auth.uid(), so a
 * tampered payload can only ever register the caller's own device.
 *
 * Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY (the public half of the Edge Function's
 * VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY pair — see .env.example).
 */

export type PushResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'unconfigured' | 'failed'; error: string }

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

/**
 * Whether this browser can receive web push at all. Notably false in iOS
 * Safari unless the site has been added to the Home Screen, so callers should
 * treat "no" as "hide the toggle", not "something broke".
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Current permission without prompting — safe to call on render. */
export function pushPermission(): NotificationPermission | 'unsupported' {
  return isPushSupported() ? Notification.permission : 'unsupported'
}

/** True when this browser already has a subscription registered with us. */
export async function isPushEnabled(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false
  const registration = await navigator.serviceWorker.getRegistration('/')
  if (!registration) return false
  return (await registration.pushManager.getSubscription()) !== null
}

/**
 * Ask for permission and register this device. Safe to call repeatedly: an
 * existing subscription is re-sent rather than replaced, because the endpoint
 * survives sign-out and the server needs to re-point it at the current user.
 */
export async function enablePush(): Promise<PushResult> {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported', error: 'This browser cannot show notifications.' }
  }
  if (!VAPID_PUBLIC_KEY) {
    // Local dev without keys: fail loudly here rather than silently never
    // delivering anything.
    return {
      ok: false,
      reason: 'unconfigured',
      error: 'Push is not configured on this deployment.',
    }
  }

  try {
    // Must ask before subscribing — Chrome rejects subscribe() outright when
    // permission is still 'default'.
    const permission =
      Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission

    if (permission !== 'granted') {
      return {
        ok: false,
        reason: 'denied',
        error:
          permission === 'denied'
            ? 'Notifications are blocked for this site in your browser settings.'
            : 'Notifications were not enabled.',
      }
    }

    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    // subscribe() on a worker that is still installing throws; ready resolves
    // once one is active.
    await navigator.serviceWorker.ready

    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        // Required by every browser: we may only push when a notification is
        // actually shown to the user. Silent pushes are not an option.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBytes(VAPID_PUBLIC_KEY),
      }))

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    })

    if (!response.ok) {
      return { ok: false, reason: 'failed', error: "Couldn't save your notification settings." }
    }
    return { ok: true }
  } catch (err) {
    console.error('push subscribe failed', err)
    return { ok: false, reason: 'failed', error: "Couldn't turn on notifications." }
  }
}

/**
 * Turn notifications off for this device. The server row is dropped first: if
 * the browser-side unsubscribe fails we would rather have a dead endpoint in
 * the browser (harmless) than keep pushing to a user who opted out.
 */
export async function disablePush(): Promise<PushResult> {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported', error: 'This browser cannot show notifications.' }
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration('/')
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return { ok: true }

    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })
    await subscription.unsubscribe()

    return { ok: true }
  } catch (err) {
    console.error('push unsubscribe failed', err)
    return { ok: false, reason: 'failed', error: "Couldn't turn off notifications." }
  }
}

/**
 * applicationServerKey has to be the raw 65-byte P-256 point; the VAPID key is
 * distributed as base64url text, which browsers won't accept directly.
 */
function urlBase64ToBytes(base64url: string): ArrayBuffer {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const binary = atob(base64)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return buffer
}

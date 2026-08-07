/**
 * StudySpot service worker, notifications only.
 *
 * Deliberately does NOT cache or intercept fetches: the app is server-rendered
 * behind auth, and a stale cached page of someone else's session data is a far
 * worse bug than being offline. A push subscription needs a service worker to
 * exist at all, so this file's whole job is receiving pushes and routing the
 * click.
 *
 * Payload shape comes from supabase/functions/_shared/push.ts:
 *   { title, body, url, type, sessionId }
 */

// Take over immediately instead of waiting for every tab to close: a user who
// just granted permission should get the working version of this file now.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  // Never let a malformed payload throw: the browser retries and, on some
  // platforms, shows a generic "site updated in the background" notice instead.
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  const title = data.title || 'StudySpot'
  const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/feed'

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url },
      // Collapse repeats per conversation/session so a busy chat replaces its
      // own notification rather than stacking twenty of them.
      tag: data.sessionId ? `${data.type || 'push'}:${data.sessionId}` : undefined,
      renotify: Boolean(data.sessionId),
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/feed'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Reuse an open StudySpot tab; opening a new window every time would
      // leave a trail of duplicates behind a chatty session.
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue
        return client.focus().then((focused) =>
          'navigate' in focused ? focused.navigate(url) : focused
        )
      }
      return self.clients.openWindow(url)
    })
  )
})

/**
 * Push services rotate subscriptions (key expiry, storage pressure). Without
 * this the endpoint in the database goes quietly dead and the user just stops
 * getting notifications, with nothing to debug.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  const applicationServerKey =
    (event.oldSubscription && event.oldSubscription.options.applicationServerKey) ||
    (event.newSubscription && event.newSubscription.options.applicationServerKey)

  event.waitUntil(
    (async () => {
      const subscription =
        event.newSubscription ||
        (applicationServerKey
          ? await self.registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey,
            })
          : null)
      if (!subscription) return

      await fetch('/api/push/subscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })
    })()
  )
})

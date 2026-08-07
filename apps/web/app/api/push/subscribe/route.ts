import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/**
 * Register this browser for Web Push.
 *
 * The subscription is taken from the request body but the *owner* never is:
 * the row is written as auth.uid() by the upsert_push_subscription RPC
 * (migration 008), so the worst a forged body can do is register a device the
 * caller already controls.
 *
 * That RPC is a SECURITY DEFINER function rather than a plain insert because a
 * push endpoint belongs to the browser, not the account, signing in as a
 * different user hands back the same endpoint, and the row has to transfer.
 */

// Shape of PushSubscription.toJSON(); .strict() so nothing else rides along.
// The key formats mirror the CHECK constraints in 008.
const subscriptionSchema = z
  .object({
    endpoint: z.string().max(900).regex(/^https:\/\/[^\s]+$/, 'Invalid endpoint.'),
    // Browsers include this (almost always null), accepted and ignored.
    expirationTime: z.number().nullable().optional(),
    keys: z
      .object({
        p256dh: z.string().regex(/^[A-Za-z0-9_-]{80,200}$/, 'Invalid key.'),
        auth: z.string().regex(/^[A-Za-z0-9_-]{16,48}$/, 'Invalid key.'),
      })
      .strict(),
  })
  .strict()

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid_subscription' }, 400)

  const { endpoint, keys } = parsed.data
  const { error } = await supabase.rpc('upsert_push_subscription', {
    p_endpoint: endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_platform: 'web',
  })

  if (error) {
    console.error('push subscribe failed', error)
    return json({ error: 'save_failed' }, 500)
  }

  return json({ ok: true })
}

function json(body: unknown, status = 200) {
  // Subscriptions are per-user state; a cached response here would be a leak.
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

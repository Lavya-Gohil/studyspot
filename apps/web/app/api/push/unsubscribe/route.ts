import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/**
 * Drop this browser's Web Push registration.
 *
 * A plain delete is enough; RLS ("push_subscriptions: users can unsubscribe",
 * migration 008) scopes it to the caller's own rows, so passing someone else's
 * endpoint deletes nothing rather than silencing them.
 */

const unsubscribeSchema = z
  .object({ endpoint: z.string().max(900).regex(/^https:\/\/[^\s]+$/, 'Invalid endpoint.') })
  .strict()

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)

  const parsed = unsubscribeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return json({ error: 'invalid_endpoint' }, 400)

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', parsed.data.endpoint)
    .eq('user_id', user.id)

  if (error) {
    console.error('push unsubscribe failed', error)
    return json({ error: 'delete_failed' }, 500)
  }

  return json({ ok: true })
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

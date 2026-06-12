import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callerIp, isUuid, json, rateLimit, requireSecret } from '../_shared/security.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * Database-webhook target: fires when a session request flips to `approved`.
 * Same trust model as on-message-insert: the caller must present the shared
 * WEBHOOK_SECRET header, otherwise anyone could forge "you're in!" pushes
 * and system messages into arbitrary sessions.
 */
serve(async (req) => {
  try {
    const denied = await requireSecret(req, 'x-webhook-secret', 'WEBHOOK_SECRET')
    if (denied) return denied

    const limited = rateLimit(req, `approve-webhook:${callerIp(req)}`, 120, 60 * 1000)
    if (limited) return limited

    const payload = await req.json().catch(() => null)
    const record = payload?.record

    if (
      !record ||
      record.status !== 'approved' ||
      !isUuid(record.requester_id) ||
      !isUuid(record.session_id)
    ) {
      return json(req, { ok: true, skipped: true })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const [{ data: profile }, { data: session }] = await Promise.all([
      supabase
        .from('profiles')
        .select('expo_push_token, full_name')
        .eq('id', record.requester_id)
        .single(),
      supabase
        .from('sessions')
        .select('subject, location_name')
        .eq('id', record.session_id)
        .single(),
    ])

    if (profile?.expo_push_token) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: profile.expo_push_token,
          title: "You're in! 🎉",
          body: `Your request for "${session?.subject}" at ${session?.location_name} was approved.`,
          data: { sessionId: record.session_id, type: 'request_approved' },
          sound: 'default',
        }),
      })
    }

    await supabase.from('messages').insert({
      session_id: record.session_id,
      content: `${profile?.full_name || 'Someone'} joined the session`,
      type: 'system',
    })

    await supabase.from('notifications').insert({
      user_id: record.requester_id,
      type: 'request_approved',
      title: "You're in! 🎉",
      body: `Your request for "${session?.subject}" at ${session?.location_name} was approved.`,
      data: { session_id: record.session_id },
    })

    return json(req, { ok: true })
  } catch (err) {
    console.error(err)
    return json(req, { error: 'internal_error' }, 500)
  }
})

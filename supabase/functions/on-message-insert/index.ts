import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callerIp, isUuid, json, rateLimit, requireSecret } from '../_shared/security.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * Database-webhook target: fires on `messages` INSERT and fans out push
 * notifications. Before this hardening, ANYONE with the function URL could
 * post a fake payload and push-spam every member of any session — so the
 * webhook now has to present the shared WEBHOOK_SECRET header.
 *
 * Supabase setup: Database → Webhooks → this function → add HTTP header
 *   x-webhook-secret: <value of WEBHOOK_SECRET>
 */
serve(async (req) => {
  try {
    const denied = await requireSecret(req, 'x-webhook-secret', 'WEBHOOK_SECRET')
    if (denied) return denied

    // Belt-and-braces: even a leaked secret can't drive unlimited fan-out.
    const limited = rateLimit(req, `msg-webhook:${callerIp(req)}`, 240, 60 * 1000)
    if (limited) return limited

    const payload = await req.json().catch(() => null)
    const message = payload?.record

    // Validate the webhook record shape before using any of it.
    if (
      !message ||
      message.type !== 'text' ||
      !isUuid(message.sender_id) ||
      !isUuid(message.session_id) ||
      typeof message.content !== 'string'
    ) {
      return json(req, { ok: true, skipped: true })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const [{ data: sender }, { data: approvedMembers }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', message.sender_id).single(),
      supabase
        .from('session_requests')
        .select('requester_id, profiles!requester_id(expo_push_token)')
        .eq('session_id', message.session_id)
        .eq('status', 'approved'),
    ])

    if (!approvedMembers) return json(req, { ok: true })

    const tokens = (approvedMembers as any[])
      .filter((m) => m.requester_id !== message.sender_id && m.profiles?.expo_push_token)
      .map((m) => m.profiles.expo_push_token)

    if (tokens.length === 0) return json(req, { ok: true })

    const truncatedContent =
      message.content.length > 80 ? message.content.slice(0, 80) + '...' : message.content

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        tokens.map((token: string) => ({
          to: token,
          title: sender?.full_name || 'New message',
          body: truncatedContent,
          data: { sessionId: message.session_id, type: 'new_message' },
          sound: 'default',
        }))
      ),
    })

    return json(req, { ok: true })
  } catch (err) {
    console.error(err)
    return json(req, { error: 'internal_error' }, 500)
  }
})

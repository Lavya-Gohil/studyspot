import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callerIp, isUuid, json, rateLimit, requireSecret } from '../_shared/security.ts'
import { notifyUsers, sessionMemberIds } from '../_shared/push.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * Database-webhook target: fires on `messages` INSERT and fans out push
 * notifications. Before this hardening, ANYONE with the function URL could
 * post a fake payload and push-spam every member of any session, so the
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

    const [{ data: sender }, members] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', message.sender_id).single(),
      sessionMemberIds(supabase, message.session_id),
    ])

    // Everyone in the session except whoever just typed it.
    const recipients = members.filter((id) => id !== message.sender_id)
    if (recipients.length === 0) return json(req, { ok: true })

    const truncatedContent =
      message.content.length > 80 ? message.content.slice(0, 80) + '...' : message.content

    await notifyUsers(supabase, recipients, {
      title: sender?.full_name || 'New message',
      body: truncatedContent,
      url: `/chat/${message.session_id}`,
      type: 'new_message',
      sessionId: message.session_id,
    })

    return json(req, { ok: true })
  } catch (err) {
    console.error(err)
    return json(req, { error: 'internal_error' }, 500)
  }
})

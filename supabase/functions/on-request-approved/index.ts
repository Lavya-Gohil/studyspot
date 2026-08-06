import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callerIp, isUuid, json, rateLimit, requireSecret } from '../_shared/security.ts'
import { notifyUsers } from '../_shared/push.ts'

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

    // Only the pending → approved transition is an event. The webhook fires on
    // every UPDATE of the row and later ones (check-in, most obviously) leave
    // status='approved', which would re-push "You're in!" and re-post the join
    // message each time. Same guard the DB trigger uses (handle_request_status
    // _change in 001_schema.sql).
    if (payload?.old_record?.status === 'approved') {
      return json(req, { ok: true, skipped: true })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const [{ data: profile }, { data: session }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', record.requester_id).single(),
      supabase
        .from('sessions')
        .select('subject, location_name')
        .eq('id', record.session_id)
        .single(),
    ])

    const approvalBody = `Your request for "${session?.subject}" at ${session?.location_name} was approved.`

    // Only the requester is notified: the host is the one who just pressed
    // approve, and the rest of the session gets the system message below.
    await notifyUsers(supabase, [record.requester_id], {
      title: "You're in! 🎉",
      body: approvalBody,
      url: `/sessions/${record.session_id}`,
      type: 'request_approved',
      sessionId: record.session_id,
    })

    await supabase.from('messages').insert({
      session_id: record.session_id,
      content: `${profile?.full_name || 'Someone'} joined the session`,
      type: 'system',
    })

    await supabase.from('notifications').insert({
      user_id: record.requester_id,
      type: 'request_approved',
      title: "You're in! 🎉",
      body: approvalBody,
      data: { session_id: record.session_id },
    })

    return json(req, { ok: true })
  } catch (err) {
    console.error(err)
    return json(req, { error: 'internal_error' }, 500)
  }
})

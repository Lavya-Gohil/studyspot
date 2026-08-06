import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { cleanString, corsHeaders, isUuid, json, rateLimit, readJsonBody } from '../_shared/security.ts'
import { notifyUsers } from '../_shared/push.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json(req, { error: 'unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
    } = await userClient.auth.getUser()
    if (!user) return json(req, { error: 'unauthorized' }, 401)

    // Admin check stays server-side with the service role — the client's
    // word is never trusted for authorization (OWASP A01).
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!adminProfile?.is_admin) return json(req, { error: 'forbidden' }, 403)

    // Even admins get a budget — a stolen admin token can't mass-drive this.
    const limited = rateLimit(req, `admin-verify:${user.id}`, 30, 60 * 1000)
    if (limited) return limited

    const parsed = await readJsonBody(req, ['targetUserId', 'action', 'reason'])
    if (!parsed.ok) return parsed.response
    const { targetUserId, action } = parsed.body

    if (!isUuid(targetUserId)) return json(req, { error: 'invalid_target' }, 400)
    if (action !== 'approve' && action !== 'reject') {
      return json(req, { error: 'invalid_action' }, 400)
    }
    // Optional rejection note: bounded, control chars stripped.
    const reason = parsed.body.reason === undefined ? null : cleanString(parsed.body.reason, 500)
    if (parsed.body.reason !== undefined && reason === null) {
      return json(req, { error: 'invalid_reason' }, 400)
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected'
    await adminClient
      .from('profiles')
      .update({
        verification_status: newStatus,
        verification_rejected_reason: action === 'reject' ? reason : null,
      })
      .eq('id', targetUserId)

    const notifTitle = action === 'approve' ? '✓ Verified!' : 'Verification update'
    const notifBody =
      action === 'approve'
        ? 'Your student verification was approved. Your Verified Student badge is now live.'
        : `Your verification was not approved: ${reason || 'Please try uploading again.'}`

    await notifyUsers(adminClient, [targetUserId], {
      title: notifTitle,
      body: notifBody,
      // Verification lives on the profile, so that's where the click lands.
      url: '/profile',
      type: action === 'approve' ? 'verification_approved' : 'verification_rejected',
    })

    await adminClient.from('notifications').insert({
      user_id: targetUserId,
      type: action === 'approve' ? 'verification_approved' : 'verification_rejected',
      title: notifTitle,
      body: notifBody,
      data: {},
    })

    return json(req, { success: true })
  } catch (err) {
    console.error(err)
    return json(req, { error: 'internal_error' }, 500)
  }
})

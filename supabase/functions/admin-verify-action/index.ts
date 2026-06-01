import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401 })

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
    } = await userClient.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: adminProfile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    if (!adminProfile?.is_admin) return new Response('Forbidden', { status: 403 })

    const { targetUserId, action, reason } = await req.json()
    if (!targetUserId || !['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected'
    await adminClient
      .from('profiles')
      .update({
        verification_status: newStatus,
        verification_rejected_reason: action === 'reject' ? reason : null,
      })
      .eq('id', targetUserId)

    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('expo_push_token, full_name')
      .eq('id', targetUserId)
      .single()

    const notifTitle = action === 'approve' ? '✓ Verified!' : 'Verification update'
    const notifBody =
      action === 'approve'
        ? 'Your student verification was approved. Your Verified Student badge is now live.'
        : `Your verification was not approved: ${reason || 'Please try uploading again.'}`

    if (targetProfile?.expo_push_token) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetProfile.expo_push_token,
          title: notifTitle,
          body: notifBody,
          data: {
            type: action === 'approve' ? 'verification_approved' : 'verification_rejected',
          },
          sound: 'default',
        }),
      })
    }

    await adminClient.from('notifications').insert({
      user_id: targetUserId,
      type: action === 'approve' ? 'verification_approved' : 'verification_rejected',
      title: notifTitle,
      body: notifBody,
      data: {},
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
})

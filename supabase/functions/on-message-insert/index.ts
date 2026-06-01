import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const payload = await req.json()
    const message = payload.record

    if (!message || message.type !== 'text' || !message.sender_id) {
      return new Response('ok', { status: 200 })
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

    if (!approvedMembers) return new Response('ok', { status: 200 })

    const tokens = (approvedMembers as any[])
      .filter((m) => m.requester_id !== message.sender_id && m.profiles?.expo_push_token)
      .map((m) => m.profiles.expo_push_token)

    if (tokens.length === 0) return new Response('ok', { status: 200 })

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

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('error', { status: 500 })
  }
})

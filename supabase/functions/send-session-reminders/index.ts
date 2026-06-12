import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callerIp, json, rateLimit, requireSecret } from '../_shared/security.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * Cron target (every minute): pushes "starts in 30 minutes" reminders.
 * Locked behind CRON_SECRET — an open trigger would let anyone replay it
 * and spam duplicate reminders to every member of upcoming sessions.
 *
 * Scheduler setup (pg_cron/external): send header `x-cron-secret: <CRON_SECRET>`.
 */
serve(async (req) => {
  try {
    const denied = await requireSecret(req, 'x-cron-secret', 'CRON_SECRET')
    if (denied) return denied

    // The scheduler fires once a minute; anything past that is a replay.
    const limited = rateLimit(req, `reminders:${callerIp(req)}`, 4, 60 * 1000)
    if (limited) return limited

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const now = new Date()
    const thirtyMinsFromNow = new Date(now.getTime() + 30 * 60 * 1000)
    const thirtyOneMinsFromNow = new Date(now.getTime() + 31 * 60 * 1000)

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, subject, location_name')
      .in('status', ['active', 'full'])
      .gte('start_time', thirtyMinsFromNow.toISOString())
      .lt('start_time', thirtyOneMinsFromNow.toISOString())

    if (!sessions || sessions.length === 0) return json(req, { ok: true, sessions: 0 })

    for (const session of sessions) {
      const { data: members } = await supabase
        .from('session_requests')
        .select('requester_id, profiles!requester_id(expo_push_token)')
        .eq('session_id', session.id)
        .eq('status', 'approved')

      const tokens = ((members as any[]) || [])
        .filter((m) => m.profiles?.expo_push_token)
        .map((m) => m.profiles.expo_push_token)

      if (tokens.length > 0) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            tokens.map((token: string) => ({
              to: token,
              title: '📍 Session starting soon',
              body: `"${session.subject}" at ${session.location_name} starts in 30 minutes.`,
              data: { sessionId: session.id, type: 'session_reminder' },
              sound: 'default',
            }))
          ),
        })
      }

      await supabase.from('messages').insert({
        session_id: session.id,
        content: 'Session starts in 30 minutes',
        type: 'system',
      })
    }

    return json(req, { ok: true, sessions: sessions.length })
  } catch (err) {
    console.error(err)
    return json(req, { error: 'internal_error' }, 500)
  }
})

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callerIp, json, rateLimit, requireSecret } from '../_shared/security.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * Cron target: advances session statuses (active/full → ongoing → completed).
 * Status math is idempotent, but the trigger is still locked behind
 * CRON_SECRET so outsiders can't probe or hammer it.
 */
serve(async (req) => {
  try {
    const denied = await requireSecret(req, 'x-cron-secret', 'CRON_SECRET')
    if (denied) return denied

    const limited = rateLimit(req, `lifecycle:${callerIp(req)}`, 4, 60 * 1000)
    if (limited) return limited

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const now = new Date().toISOString()

    // active/full → ongoing when start_time is reached
    await supabase
      .from('sessions')
      .update({ status: 'ongoing' })
      .in('status', ['active', 'full'])
      .lte('start_time', now)
      .gte('end_time', now)

    // ongoing → completed when end_time is reached
    await supabase
      .from('sessions')
      .update({ status: 'completed' })
      .eq('status', 'ongoing')
      .lt('end_time', now)

    return json(req, { ok: true })
  } catch (err) {
    console.error(err)
    return json(req, { error: 'internal_error' }, 500)
  }
})

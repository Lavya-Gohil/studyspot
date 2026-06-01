import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (_req) => {
  try {
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

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('error', { status: 500 })
  }
})

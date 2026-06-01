import type { SupabaseClient } from '@supabase/supabase-js'
import type { Session, FeedFilters } from '@studyspot/types'

export async function fetchFeedSessions(
  client: SupabaseClient,
  params: {
    lat?: number
    lon?: number
    radius?: number
    country?: string
    filters?: FeedFilters
    offset?: number
    limit?: number
  }
): Promise<Session[]> {
  const { country, filters, offset = 0, limit = 20 } = params

  let query = client
    .from('session_feed')
    .select('*')
    .in('status', ['active', 'full', 'ongoing'])
    // Keep sessions visible until they actually end, so in-progress
    // sessions still appear in the feed.
    .gt('end_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .range(offset, offset + limit - 1)

  if (filters?.vibe && filters.vibe.length > 0) {
    query = query.in('vibe', filters.vibe)
  }

  if (filters?.date === 'today') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    query = query
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
  }

  if (filters?.verifiedHostOnly) {
    query = query.eq('host_verification_status', 'verified')
  }

  // In-person sessions are scoped to the user's country; online sessions are
  // location-independent and shown globally.
  if (country) {
    query = query.or(`mode.eq.online,location_country.eq.${country}`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Session[]
}

export async function fetchSessionById(client: SupabaseClient, id: string): Promise<Session> {
  const { data, error } = await client
    .from('session_feed')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Session
}

export async function createSession(
  client: SupabaseClient,
  session: {
    subject: string
    subject_tags?: string[]
    description?: string | null
    vibe: string
    mode?: 'in_person' | 'online'
    location_name?: string | null
    location_address?: string | null
    location_country?: string | null
    location_state?: string | null
    location_city?: string | null
    google_place_id?: string | null
    start_time: string
    end_time: string
    spots_total: number
  }
): Promise<Session> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await client
    .from('sessions')
    .insert({ ...session, host_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data as Session
}

export async function cancelSession(client: SupabaseClient, sessionId: string): Promise<void> {
  const { error } = await client
    .from('sessions')
    .update({ status: 'cancelled' })
    .eq('id', sessionId)
  if (error) throw error
}

export async function toggleSaveSession(
  client: SupabaseClient,
  sessionId: string,
  saved: boolean
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  if (saved) {
    await client
      .from('saved_sessions')
      .insert({ user_id: user.id, session_id: sessionId })
  } else {
    await client
      .from('saved_sessions')
      .delete()
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
  }
}

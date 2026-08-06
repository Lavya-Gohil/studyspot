import type { SupabaseClient } from '@supabase/supabase-js'
import type { Session, FeedFilters } from '@studyspot/types'
import { isCountryCode } from './filters'

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
  //
  // `country` originates from profiles.country, which the browser writes
  // directly — it is untrusted here and must never be interpolated into
  // `.or()` raw. See ./filters.ts for what a crafted value does to the tree.
  if (isCountryCode(country)) {
    query = query.or(`mode.eq.online,location_country.eq.${country}`)
  } else if (country) {
    // Present but malformed: fall back to location-independent sessions rather
    // than trusting the value or silently widening the feed to every country.
    query = query.eq('mode', 'online')
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as Session[]
}

/**
 * How many sessions start today within the user's scope. Drives the "N
 * sessions today" line in the feed header.
 *
 * Reuses the same country guard as fetchFeedSessions — see ./filters.ts for
 * why a raw interpolation into `.or()` is unsafe.
 */
export async function countSessionsToday(
  client: SupabaseClient,
  country?: string
): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  let query = client
    .from('session_feed')
    .select('id', { count: 'exact', head: true })
    .in('status', ['active', 'full', 'ongoing'])
    .gte('start_time', today.toISOString())
    .lt('start_time', tomorrow.toISOString())

  if (isCountryCode(country)) {
    query = query.or(`mode.eq.online,location_country.eq.${country}`)
  } else if (country) {
    query = query.eq('mode', 'online')
  }

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

/**
 * The soonest session the user is actually committed to — one they host, or
 * one their join request was approved for. Drives the "you're in one soon"
 * banner at the top of the feed.
 *
 * Two queries rather than one: the user's relationship to a session lives in
 * two different places (sessions.host_id and session_requests.requester_id),
 * and session_feed carries no per-viewer membership column to filter on.
 */
export async function fetchMyNextSession(
  client: SupabaseClient,
  userId: string
): Promise<Session | null> {
  const now = new Date().toISOString()

  const hosting = client
    .from('session_feed')
    .select('*')
    .eq('host_id', userId)
    .gt('end_time', now)
    .order('start_time', { ascending: true })
    .limit(1)

  const approved = client
    .from('session_requests')
    .select('session_id')
    .eq('requester_id', userId)
    .eq('status', 'approved')

  const [hostingResult, approvedResult] = await Promise.all([hosting, approved])
  if (hostingResult.error) throw hostingResult.error
  if (approvedResult.error) throw approvedResult.error

  const candidates: Session[] = (hostingResult.data as Session[] | null) ?? []

  const joinedIds = (approvedResult.data ?? []).map(
    (r: { session_id: string }) => r.session_id
  )
  if (joinedIds.length > 0) {
    const { data, error } = await client
      .from('session_feed')
      .select('*')
      .in('id', joinedIds)
      .gt('end_time', now)
      .order('start_time', { ascending: true })
      .limit(1)
    if (error) throw error
    candidates.push(...((data as Session[] | null) ?? []))
  }

  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.start_time.localeCompare(b.start_time))
  return candidates[0] ?? null
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

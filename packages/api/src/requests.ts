import type { SupabaseClient } from '@supabase/supabase-js'
import type { SessionRequest } from '@studyspot/types'

export async function sendInterestRequest(
  client: SupabaseClient,
  sessionId: string,
  message?: string
): Promise<SessionRequest> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await client
    .from('session_requests')
    .insert({ session_id: sessionId, requester_id: user.id, message: message || null })
    .select()
    .single()
  if (error) throw error
  return data as SessionRequest
}

export async function fetchSessionRequests(
  client: SupabaseClient,
  sessionId: string
): Promise<SessionRequest[]> {
  const { data, error } = await client
    .from('session_requests')
    .select(
      `*, requester:profiles!requester_id(id, full_name, avatar_url, college, year_of_study, verification_status, is_minor, subjects)`
    )
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as SessionRequest[]
}

export async function updateRequestStatus(
  client: SupabaseClient,
  requestId: string,
  status: 'approved' | 'declined'
): Promise<SessionRequest> {
  const { data, error } = await client
    .from('session_requests')
    .update({ status })
    .eq('id', requestId)
    .select()
    .single()
  if (error) throw error
  return data as SessionRequest
}

export async function withdrawRequest(
  client: SupabaseClient,
  requestId: string
): Promise<SessionRequest> {
  const { data, error } = await client
    .from('session_requests')
    .update({ status: 'withdrawn' })
    .eq('id', requestId)
    .select()
    .single()
  if (error) throw error
  return data as SessionRequest
}

export async function checkIn(
  client: SupabaseClient,
  requestId: string
): Promise<SessionRequest> {
  const { data, error } = await client
    .from('session_requests')
    .update({ checked_in_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single()
  if (error) throw error
  return data as SessionRequest
}

export async function fetchUserRequestForSession(
  client: SupabaseClient,
  sessionId: string
): Promise<SessionRequest | null> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return null

  const { data, error } = await client
    .from('session_requests')
    .select('*')
    .eq('session_id', sessionId)
    .eq('requester_id', user.id)
    .maybeSingle()
  if (error) throw error
  return data as SessionRequest | null
}

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '@studyspot/types'

const PUBLIC_PROFILE_COLUMNS = [
  'id', 'email', 'onboarding_step', 'full_name', 'username', 'age', 'is_minor',
  'country', 'country_name', 'state_region', 'city', 'verification_status',
  'verification_rejected_reason', 'avatar_url', 'college', 'course',
  'year_of_study', 'subjects', 'bio', 'study_streak', 'total_sessions_hosted',
  'total_sessions_attended', 'is_admin', 'created_at', 'updated_at',
].join(', ')

/**
 * supabase-js infers the row shape by parsing the `.select()` argument at the
 * type level. That only works on a string *literal*, because the column list
 * above is assembled with .join() its type is plain `string`, so the inference
 * falls back to GenericStringError and a direct `as Profile` is rejected.
 *
 * The runtime shape is correct (those columns are exactly Profile's), so the
 * cast is sound; TypeScript just can't see it. Going through `unknown` is the
 * documented escape hatch. If the column list is ever inlined as a literal,
 * this helper can go away.
 */
function asProfile(data: unknown): Profile {
  return data as Profile
}

export async function fetchProfile(client: SupabaseClient, userId: string): Promise<Profile> {
  const { data, error } = await client
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('id', userId)
    .single()
  if (error) throw error
  return asProfile(data)
}

export async function fetchCurrentProfile(client: SupabaseClient): Promise<Profile> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return fetchProfile(client, user.id)
}

export async function updateProfile(
  client: SupabaseClient,
  userId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  // Strip fields that must never be client-writable
  const {
    // @ts-ignore
    verification_doc_path,
    is_admin,
    is_banned,
    ban_reason,
    banned_at,
    ...safeUpdates
  } = updates

  const { data, error } = await client
    .from('profiles')
    .update(safeUpdates)
    .eq('id', userId)
    .select(PUBLIC_PROFILE_COLUMNS)
    .single()
  if (error) throw error
  return asProfile(data)
}

export async function blockUser(
  client: SupabaseClient,
  blockedId: string
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await client
    .from('blocks')
    .insert({ blocker_id: user.id, blocked_id: blockedId })
  if (error) throw error
}

export async function unblockUser(
  client: SupabaseClient,
  blockedId: string
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await client
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId)
  if (error) throw error
}

export async function reportUser(
  client: SupabaseClient,
  reportedId: string,
  reason: string,
  details?: string,
  sessionId?: string
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await client.from('reports').insert({
    reporter_id: user.id,
    reported_id: reportedId,
    reason,
    details: details || null,
    session_id: sessionId || null,
  })
  if (error) throw error
}

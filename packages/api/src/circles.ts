import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Circles (migration 005).
 *
 * `member_count` is maintained by trigger, so it is read but never written.
 * Joining by code is a lookup on the unique `join_code` rather than an id,
 * which is what makes a private circle shareable without exposing its id.
 */

export type Circle = {
  id: string
  owner_id: string
  name: string
  description: string | null
  topic: string | null
  emoji: string | null
  is_private: boolean
  member_count: number
  created_at: string
}

export type CircleWithMembership = Circle & { isMember: boolean }

/** Public circles for the discovery list, newest first. */
export async function fetchPublicCircles(
  client: SupabaseClient,
  limit = 30
): Promise<Circle[]> {
  const { data, error } = await client
    .from('circles')
    .select('*')
    .eq('is_private', false)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as Circle[]
}

/** Every circle the user belongs to, private ones included. */
export async function fetchMyCircles(
  client: SupabaseClient,
  userId: string
): Promise<Circle[]> {
  const { data, error } = await client
    .from('circle_members')
    .select('circles(*)')
    .eq('user_id', userId)
  if (error) throw error

  return (data ?? [])
    .map((row: any) => row.circles as Circle | null)
    .filter((c: Circle | null): c is Circle => c !== null)
}

/**
 * Discovery list with membership already resolved.
 *
 * One query for the circles and one for this user's memberships, rather than
 * a join per row. The membership set is small, so intersecting in memory
 * beats asking the database the same question once per card.
 */
export async function fetchCirclesWithMembership(
  client: SupabaseClient,
  userId: string
): Promise<CircleWithMembership[]> {
  const [publicCircles, memberships] = await Promise.all([
    fetchPublicCircles(client),
    client.from('circle_members').select('circle_id').eq('user_id', userId),
  ])
  if (memberships.error) throw memberships.error

  const mine = new Set((memberships.data ?? []).map((m: any) => m.circle_id))
  return publicCircles.map((c) => ({ ...c, isMember: mine.has(c.id) }))
}

export async function joinCircle(
  client: SupabaseClient,
  circleId: string
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await client
    .from('circle_members')
    .insert({ circle_id: circleId, user_id: user.id })
  if (error) throw error
}

export async function leaveCircle(
  client: SupabaseClient,
  circleId: string
): Promise<void> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await client
    .from('circle_members')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', user.id)
  if (error) throw error
}

/**
 * Join by six-character code.
 *
 * Goes through the join_circle_by_code RPC rather than selecting on
 * `join_code` directly, and it has to: the SELECT policy on circles is
 * "public, or owner, or member", so a private circle is invisible to someone
 * who is not in it yet. Reading it client-side would therefore fail for
 * exactly the case codes exist to serve. The RPC is SECURITY DEFINER and
 * upserts the membership itself.
 *
 * Returns null for an unknown code rather than throwing, because a typo is
 * the expected case here rather than an exceptional one.
 */
export async function joinCircleByCode(
  client: SupabaseClient,
  code: string
): Promise<string | null> {
  const { data, error } = await client.rpc('join_circle_by_code', {
    p_code: code.trim().toUpperCase(),
  })

  if (error) {
    if (/circle not found/i.test(error.message)) return null
    throw error
  }
  return (data as string) ?? null
}

export async function createCircle(
  client: SupabaseClient,
  input: {
    name: string
    description?: string | null
    topic?: string | null
    emoji?: string | null
    isPrivate?: boolean
  }
): Promise<Circle> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await client
    .from('circles')
    .insert({
      owner_id: user.id,
      name: input.name,
      description: input.description ?? null,
      topic: input.topic ?? null,
      emoji: input.emoji ?? null,
      is_private: input.isPrivate ?? false,
    })
    .select()
    .single()
  if (error) throw error

  // No joinCircle() call here. The on_circle_created trigger already inserts
  // the owner into circle_members with role 'owner', so adding them again
  // violates the (circle_id, user_id) unique constraint and the create fails
  // after the circle already exists.
  return data as Circle
}

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Goal } from '@studyspot/types'

/**
 * Accountability goals (migration 005).
 *
 * Progress is NOT stored. For 'hours' and 'sessions' goals it is derived as
 * `current stat - baseline`, where the baseline was the user's stat at the
 * moment the goal was created; only 'custom' goals carry a written value.
 * goalProgress() in @studyspot/utils is the single implementation of that
 * rule, and both apps read through it so they cannot disagree about how far
 * along something is.
 */

export type GoalStats = { verified_hours: number; verified_sessions: number }

export async function fetchGoals(
  client: SupabaseClient,
  userId: string
): Promise<Goal[]> {
  const { data, error } = await client
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Goal[]
}

/**
 * The one goal worth showing in a summary: nearest deadline, else newest.
 *
 * `nullsFirst: false` is what keeps goals without a deadline at the back
 * rather than the front, which a bare ascending order would get wrong.
 */
export async function fetchTopActiveGoal(
  client: SupabaseClient,
  userId: string
): Promise<Goal | null> {
  const { data, error } = await client
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as Goal | null) ?? null
}

/** The stat values auto-tracked goals measure against. */
export async function fetchGoalStats(
  client: SupabaseClient,
  userId: string
): Promise<GoalStats> {
  const { data, error } = await client
    .from('user_study_stats')
    .select('verified_hours, verified_sessions')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return {
    verified_hours: (data as GoalStats | null)?.verified_hours ?? 0,
    verified_sessions: (data as GoalStats | null)?.verified_sessions ?? 0,
  }
}

/** Pick the stat a given goal is tracked against. Custom goals track none. */
export function statValueForGoal(goal: Goal, stats: GoalStats): number {
  if (goal.type === 'hours') return stats.verified_hours
  if (goal.type === 'sessions') return stats.verified_sessions
  return 0
}

export async function createGoal(
  client: SupabaseClient,
  input: {
    title: string
    description?: string | null
    type: Goal['type']
    target: number
    unit?: string | null
    deadline?: string | null
    isPublic?: boolean
  },
  stats: GoalStats
): Promise<Goal> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Snapshot the stat now, so progress measures growth from today rather
  // than crediting everything the user did before setting the goal.
  const baseline =
    input.type === 'hours'
      ? stats.verified_hours
      : input.type === 'sessions'
        ? stats.verified_sessions
        : 0

  const { data, error } = await client
    .from('goals')
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description ?? null,
      type: input.type,
      target: input.target,
      baseline,
      unit: input.unit ?? (input.type === 'hours' ? 'hours' : input.type === 'sessions' ? 'sessions' : 'units'),
      deadline: input.deadline ?? null,
      is_public: input.isPublic ?? true,
    })
    .select()
    .single()
  if (error) throw error
  return data as Goal
}

/** Only meaningful for 'custom' goals; the others are derived from stats. */
export async function setManualProgress(
  client: SupabaseClient,
  goalId: string,
  value: number
): Promise<void> {
  const { error } = await client
    .from('goals')
    .update({ manual_progress: Math.max(0, value) })
    .eq('id', goalId)
  if (error) throw error
}

export async function setGoalStatus(
  client: SupabaseClient,
  goalId: string,
  status: Goal['status']
): Promise<void> {
  const { error } = await client.from('goals').update({ status }).eq('id', goalId)
  if (error) throw error
}

export async function deleteGoal(client: SupabaseClient, goalId: string): Promise<void> {
  const { error } = await client.from('goals').delete().eq('id', goalId)
  if (error) throw error
}

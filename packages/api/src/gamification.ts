import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * XP, levels, badges and leaderboards (migration 013).
 *
 * `level` is a generated column, never written from the client, and XP is
 * awarded by trigger on focus_sessions insert. Nothing here writes: the
 * server owns progression, which is the only way a leaderboard means
 * anything.
 */

export type LevelState = {
  xp: number
  level: number
  studyStreak: number
  longestStreak: number
  streakFreezes: number
  /** XP at which the current level began. */
  floorXp: number
  /** XP at which the next level begins. */
  ceilXp: number
}

export type EarnedBadge = {
  code: string
  name: string
  description: string
  /** Lucide glyph name; the UI's icon layer resolves it. */
  icon: string
  /** 1 to 4, display order and rough difficulty. */
  tier: number
  earnedAt: string
}

export type LeaderboardRow = {
  userId: string
  fullName: string | null
  avatarUrl: string | null
  college: string | null
  level: number
  minutes: number
  /**
   * Computed by RANK() in the RPC, not by position in this array. Ties share
   * a rank and the next rank skips, which is what people expect from a board
   * and what enumerating the array would quietly get wrong.
   */
  rank: number
}

/** Matches the CHECK in the RPC. 'college' is the campus board. */
export type LeaderboardScope = 'global' | 'college' | 'circle'

/** Inverse of level_from_xp in migration 013: level N begins at 100*(N-1)^2. */
export function xpForLevel(level: number): number {
  return 100 * Math.pow(Math.max(level - 1, 0), 2)
}

export async function fetchLevelState(
  client: SupabaseClient,
  userId: string
): Promise<LevelState> {
  const { data, error } = await client
    .from('profiles')
    .select('xp, level, study_streak, longest_streak, streak_freezes')
    .eq('id', userId)
    .single()
  if (error) throw error

  const level = data?.level ?? 1
  return {
    xp: data?.xp ?? 0,
    level,
    studyStreak: data?.study_streak ?? 0,
    longestStreak: data?.longest_streak ?? 0,
    streakFreezes: data?.streak_freezes ?? 0,
    floorXp: xpForLevel(level),
    ceilXp: xpForLevel(level + 1),
  }
}

export async function fetchEarnedBadges(
  client: SupabaseClient,
  userId: string
): Promise<EarnedBadge[]> {
  const { data, error } = await client
    .from('user_badges')
    .select('badge_code, earned_at, badges(name, description, icon, tier)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false })
  if (error) throw error

  return (data ?? []).map((row: any) => ({
    code: row.badge_code,
    name: row.badges?.name ?? row.badge_code,
    description: row.badges?.description ?? '',
    icon: row.badges?.icon ?? 'Award',
    tier: row.badges?.tier ?? 1,
    earnedAt: row.earned_at,
  }))
}

/**
 * The leaderboard RPC is SECURITY DEFINER (013) and re-implements the ban,
 * block and circle-membership checks by hand, returning display fields only.
 * That is why this cannot be a view: it has to see rows the caller cannot,
 * in order to decide the caller should not see them either.
 */
export async function fetchLeaderboard(
  client: SupabaseClient,
  opts: {
    scope?: LeaderboardScope
    circleId?: string | null
    days?: number
    limit?: number
  } = {}
): Promise<LeaderboardRow[]> {
  const { data, error } = await client.rpc('leaderboard', {
    p_scope: opts.scope ?? 'global',
    p_circle_id: opts.circleId ?? null,
    p_days: opts.days ?? 7,
    // The RPC clamps to 100 itself; 25 is its own default.
    p_limit: opts.limit ?? 25,
  })
  if (error) throw error

  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    college: row.college,
    level: row.level ?? 1,
    // Already minutes: the RPC divides by 60 in SQL so a year of rows never
    // crosses the wire.
    minutes: Number(row.total_minutes ?? 0),
    rank: Number(row.rank ?? 0),
  }))
}

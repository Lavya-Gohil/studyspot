import type { Goal } from '@studyspot/types'

/**
 * Current progress value for a goal.
 * - 'custom' goals use the manually-tracked value.
 * - 'hours' / 'sessions' goals are auto-tracked: progress is how much the
 *   relevant stat has grown since the goal was created (statValue - baseline).
 */
export function goalCurrentValue(goal: Goal, statValue: number): number {
  if (goal.type === 'custom') return goal.manual_progress
  return Math.max(0, statValue - goal.baseline)
}

export function goalProgress(
  goal: Goal,
  statValue: number
): { current: number; percent: number; complete: boolean; remaining: number } {
  const current = goalCurrentValue(goal, statValue)
  const percent = goal.target > 0 ? Math.min(100, Math.round((current / goal.target) * 100)) : 0
  return {
    current: Math.round(current * 10) / 10,
    percent,
    complete: current >= goal.target,
    remaining: Math.max(0, Math.round((goal.target - current) * 10) / 10),
  }
}

export function goalTypeLabel(type: Goal['type']): string {
  if (type === 'hours') return 'Verified study hours'
  if (type === 'sessions') return 'Sessions attended'
  return 'Custom'
}

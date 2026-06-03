import type { StudyStats, Reputation, ReputationLevel } from '@studyspot/types'

// Weights for the four reputation components (sum = 1).
const W_ATTENDANCE = 0.4
const W_PUNCTUALITY = 0.25
const W_RATING = 0.25
const W_VOLUME = 0.1

// Neutral defaults used when a component has no data yet, so new users
// aren't punished for things they haven't had a chance to do.
const DEFAULT_ATTENDANCE = 0.85
const DEFAULT_PUNCTUALITY = 0.8
const DEFAULT_RATING = 0.8

function levelFor(score: number): { level: ReputationLevel; label: string } {
  if (score >= 90) return { level: 'exemplary', label: 'Exemplary' }
  if (score >= 78) return { level: 'trusted', label: 'Trusted' }
  if (score >= 62) return { level: 'reliable', label: 'Reliable' }
  return { level: 'building', label: 'Building' }
}

/**
 * Computes a 0–100 Study Reputation Score from a user's stats.
 * Heuristic, deterministic, no external calls. Returns score=null and
 * level='new' for users with no track record yet.
 */
export function computeReputation(stats: StudyStats): Reputation {
  const hasHistory =
    stats.verified_sessions > 0 || stats.approved_count > 0 || stats.rating_count > 0

  if (!hasHistory) {
    return {
      score: null,
      level: 'new',
      label: 'New',
      components: [
        { label: 'Attendance', value: null, detail: 'No sessions yet' },
        { label: 'Punctuality', value: null, detail: 'No check-ins yet' },
        { label: 'Peer rating', value: null, detail: 'Not rated yet' },
        { label: 'Experience', value: null, detail: '0 verified sessions' },
      ],
    }
  }

  const attendanceRate =
    stats.approved_count > 0 ? stats.showed_count / stats.approved_count : DEFAULT_ATTENDANCE
  const punctualityRate =
    stats.verified_sessions > 0
      ? stats.on_time_count / stats.verified_sessions
      : DEFAULT_PUNCTUALITY
  const ratingRate =
    stats.avg_rating != null ? (stats.avg_rating - 1) / 4 : DEFAULT_RATING
  // Experience ramps to full credit at 10 verified sessions.
  const volumeRate = Math.min(stats.verified_sessions / 10, 1)

  const score = Math.round(
    100 *
      (W_ATTENDANCE * attendanceRate +
        W_PUNCTUALITY * punctualityRate +
        W_RATING * ratingRate +
        W_VOLUME * volumeRate)
  )

  const { level, label } = levelFor(score)

  return {
    score,
    level,
    label,
    components: [
      {
        label: 'Attendance',
        value: stats.approved_count > 0 ? Math.round(attendanceRate * 100) : null,
        detail:
          stats.approved_count > 0
            ? `Showed up to ${stats.showed_count}/${stats.approved_count} approved sessions`
            : 'No approved sessions yet',
      },
      {
        label: 'Punctuality',
        value: stats.verified_sessions > 0 ? Math.round(punctualityRate * 100) : null,
        detail:
          stats.verified_sessions > 0
            ? `On time for ${stats.on_time_count}/${stats.verified_sessions} sessions`
            : 'No check-ins yet',
      },
      {
        label: 'Peer rating',
        value: stats.avg_rating != null ? Math.round(ratingRate * 100) : null,
        detail:
          stats.avg_rating != null
            ? `${stats.avg_rating.toFixed(1)}★ from ${stats.rating_count} ${
                stats.rating_count === 1 ? 'peer' : 'peers'
              }`
            : 'Not rated yet',
      },
      {
        label: 'Experience',
        value: Math.round(volumeRate * 100),
        detail: `${stats.verified_sessions} verified ${
          stats.verified_sessions === 1 ? 'session' : 'sessions'
        }`,
      },
    ],
  }
}

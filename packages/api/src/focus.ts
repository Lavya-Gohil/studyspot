import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Focus sessions (migration 011).
 *
 * Two rules from the schema that every caller has to respect:
 *
 * 1. `duration_seconds` is recomputed by a BEFORE trigger from the two
 *    timestamps, so it is never sent. A client that sends its own duration is
 *    claiming credit for time rather than reporting it.
 * 2. `focus_sessions_no_overlap` is an EXCLUDE constraint, so "you cannot
 *    focus twice at once" is enforced by Postgres rather than by a rate
 *    limiter, and hitting it is a duplicate submission rather than a failure.
 */

/** Below this, a completed run is not worth a row, it is noise in the calendar. */
const MIN_RECORDED_SECONDS = 60

/** Postgres exclusion_violation, raised by focus_sessions_no_overlap. */
const OVERLAP = '23P01'

export type RecordResult =
  | { ok: true; seconds: number }
  | { ok: false; reason: 'too-short' | 'duplicate' | 'error'; message?: string }

export type FocusDay = { day: string; minutes: number }

/**
 * Persist a completed focus run.
 *
 * A room's timer is SHARED: anyone present can start, pause or reset it, and
 * every client watches the same countdown. So each client records only its own
 * row for the interval IT actually observed running, which is both what RLS
 * allows (own rows only) and what is true, since someone who joined halfway
 * through did not focus for the full 25 minutes.
 *
 * `startedAt` is therefore the client's own run start, not `endsAt` minus the
 * nominal length. Those differ whenever the timer was paused or joined late,
 * and the second would quietly credit time nobody spent.
 */
export async function recordFocusSession(
  client: SupabaseClient,
  opts: {
    /** Epoch milliseconds. */
    startedAt: number
    endedAt: number
    sessionId?: string | null
    subject?: string | null
  }
): Promise<RecordResult> {
  const seconds = Math.floor((opts.endedAt - opts.startedAt) / 1000)
  if (!Number.isFinite(seconds) || seconds < MIN_RECORDED_SECONDS) {
    return { ok: false, reason: 'too-short' }
  }

  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return { ok: false, reason: 'error', message: 'Not signed in' }

  const { error } = await client.from('focus_sessions').insert({
    user_id: user.id,
    session_id: opts.sessionId ?? null,
    started_at: new Date(opts.startedAt).toISOString(),
    ended_at: new Date(opts.endedAt).toISOString(),
    subject: opts.subject ?? null,
    source: opts.sessionId ? 'room' : 'solo',
  })

  if (error) {
    // The overlap constraint firing means this stretch of time is already
    // logged: two tabs in two rooms, or a reconnect replaying a completion.
    // From the user's point of view that is a success, their time is counted
    // exactly once, and surfacing it as a failure would be actively
    // misleading.
    if ((error as { code?: string }).code === OVERLAP) {
      return { ok: false, reason: 'duplicate' }
    }
    return { ok: false, reason: 'error', message: error.message }
  }

  return { ok: true, seconds }
}

/**
 * Daily totals from the focus_daily view, which buckets by the user's own
 * local day (011) rather than the server's, and is security_invoker so RLS
 * scopes it without a user_id filter here.
 */
export async function fetchFocusDays(
  client: SupabaseClient,
  /** Inclusive lower bound as 'YYYY-MM-DD' in the user's own timezone. */
  since: string
): Promise<FocusDay[]> {
  const { data, error } = await client
    .from('focus_daily')
    .select('day, total_seconds')
    .gte('day', since)
    .order('day', { ascending: true })
  if (error) throw error

  return (data ?? []).map((row: any) => ({
    day: row.day as string,
    minutes: Math.round(Number(row.total_seconds ?? 0) / 60),
  }))
}

export type FocusTotals = {
  todayMinutes: number
  weekMinutes: number
  /** Distinct local days with any focus in the window. */
  daysActive: number
}

/** Rolls daily buckets into the three figures a header needs. */
export function summariseFocusDays(days: FocusDay[], today: string): FocusTotals {
  return {
    todayMinutes: days.find((d) => d.day === today)?.minutes ?? 0,
    weekMinutes: days.reduce((sum, d) => sum + d.minutes, 0),
    daysActive: days.filter((d) => d.minutes > 0).length,
  }
}

/**
 * The user's own calendar day as 'YYYY-MM-DD'.
 *
 * Must match how migration 011 buckets focus_daily, which uses the timezone
 * on the profile rather than the server's. en-CA is the shortest route to an
 * ISO date out of Intl; the alternative is reassembling parts by hand.
 */
export function localDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date)
}

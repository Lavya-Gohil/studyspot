import { createClient } from '@/lib/supabase/client'

/** Below this, a completed run isn't worth a row, it's noise in the calendar. */
const MIN_RECORDED_SECONDS = 60

/** Postgres exclusion_violation. Raised by focus_sessions_no_overlap (011). */
const OVERLAP = '23P01'

export type RecordResult =
  | { ok: true; seconds: number }
  | { ok: false; reason: 'too-short' | 'duplicate' | 'error'; message?: string }

/**
 * Persist a completed focus run.
 *
 * The room's timer is SHARED; anyone present can start, pause or reset it,
 * and every client watches the same countdown. So each client records only its
 * own row for the interval IT actually observed running, which is both what
 * RLS allows (own rows only) and what is true: someone who joined halfway
 * through did not focus for the full 25 minutes.
 *
 * `startedAt` is therefore this client's local run start, not `endsAt` minus
 * the nominal duration; those differ whenever the timer was paused or joined
 * late, and the second one would quietly credit time nobody spent.
 *
 * duration_seconds is deliberately not sent: migration 011's BEFORE trigger
 * recomputes it from the timestamps, so a tampered client can't inflate it.
 */
export async function recordFocusSession(opts: {
  startedAt: number
  endedAt: number
  sessionId?: string | null
  subject?: string | null
}): Promise<RecordResult> {
  const seconds = Math.floor((opts.endedAt - opts.startedAt) / 1000)
  if (!Number.isFinite(seconds) || seconds < MIN_RECORDED_SECONDS) {
    return { ok: false, reason: 'too-short' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'error', message: 'Not signed in' }

  const { error } = await supabase.from('focus_sessions').insert({
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
    // That is a success from the user's point of view: their time is counted
    // exactly once. Surfacing it as a failure would be actively misleading.
    if (error.code === OVERLAP) return { ok: false, reason: 'duplicate' }
    return { ok: false, reason: 'error', message: error.message }
  }

  return { ok: true, seconds }
}

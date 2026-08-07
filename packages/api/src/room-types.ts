import type { SessionVibe } from '@studyspot/types'

export interface SessionInfo {
  id: string
  subject: string
  room_name: string | null
  vibe: SessionVibe
  start_time: string
  end_time: string
  status: string
  host_id: string
  spots_total: number
}

export interface CurrentUser {
  id: string
  full_name: string | null
  avatar_url: string | null
  verification_status: string
}

export type MemberStatus = 'focusing' | 'break'

export interface Member {
  user_id: string
  name: string | null
  avatar_url: string | null
  verification_status: string
  seat: number
  status: MemberStatus
}

/**
 * Shared countdown state, broadcast to everyone in the room.
 *
 * `updatedAt` is what makes the sharing correct. Any member can start, pause
 * or reset, so without an ordering key, two near-simultaneous changes (or a
 * late-arriving reply to a sync request) could apply in the wrong order and
 * leave people looking at different clocks. Receivers accept a broadcast only
 * when its `updatedAt` is newer than what they already hold.
 */
export interface TimerState {
  running: boolean
  /** Epoch ms when the countdown ends; null while paused. */
  endsAt: number | null
  /** Seconds left, authoritative only while paused. */
  remaining: number
  /** Seconds the current interval was set to, for Reset. */
  duration: number
  updatedAt: number
}

export const DEFAULT_DURATION = 25 * 60

export const initialTimer = (): TimerState => ({
  running: false,
  endsAt: null,
  remaining: DEFAULT_DURATION,
  duration: DEFAULT_DURATION,
  updatedAt: 0,
})

/** Seconds remaining, resolved against a supplied clock reading. */
export function secondsLeft(timer: TimerState, now: number): number {
  if (timer.running && timer.endsAt) {
    return Math.max(0, Math.round((timer.endsAt - now) / 1000))
  }
  return timer.remaining
}

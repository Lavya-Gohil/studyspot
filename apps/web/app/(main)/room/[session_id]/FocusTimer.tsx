'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { recordFocusSession } from '@/lib/focus'
import { secondsLeft, type TimerState } from './types'

const PRESETS = [
  { label: '25m', value: 25 * 60 },
  { label: '50m', value: 50 * 60 },
  { label: '5m', value: 5 * 60 },
]

/**
 * The shared countdown. Anyone in the room can drive it — the ordering key on
 * TimerState (see ./types) is what keeps everyone's clock agreeing rather than
 * making one person the owner.
 */
export function FocusTimer({
  timer,
  onPublish,
  sessionId,
  subject,
}: {
  timer: TimerState
  onPublish: (next: Omit<TimerState, 'updatedAt'>) => void
  /** Attributes the recorded run to this study session. */
  sessionId?: string
  subject?: string | null
}) {
  const toast = useToast()
  const [now, setNow] = useState(() => Date.now())
  const announced = useRef<number | null>(null)

  // When THIS client last saw the timer start running. The timer is shared, so
  // this is not the same as `endsAt - duration`: someone who joined halfway
  // through, or who was here across a pause, focused for less than the nominal
  // duration and should be credited for what they actually sat through.
  const runStart = useRef<number | null>(timer.running ? Date.now() : null)

  useEffect(() => {
    if (timer.running && runStart.current === null) {
      runStart.current = Date.now()
    } else if (!timer.running) {
      runStart.current = null
    }
  }, [timer.running])

  // One shared tick drives the display; the countdown itself is derived from
  // endsAt, so a backgrounded tab catches up instead of drifting.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const left = secondsLeft(timer, now)

  // Reaching zero used to do nothing at all — the number just sat at 00:00.
  // Now it also banks the time, which is what makes /stats, streaks, XP and
  // the leaderboards real rather than decorative.
  useEffect(() => {
    if (!timer.running || left > 0) return
    if (announced.current === timer.updatedAt) return
    announced.current = timer.updatedAt

    const startedAt = runStart.current
    runStart.current = null
    onPublish({ running: false, endsAt: null, remaining: 0, duration: timer.duration })

    if (startedAt === null) {
      toast.success("Time's up — take a break.")
      return
    }

    void recordFocusSession({ startedAt, endedAt: Date.now(), sessionId, subject }).then((r) => {
      if (r.ok) {
        const mins = Math.round(r.seconds / 60)
        toast.success(`Time's up — ${mins} min banked.`)
      } else if (r.reason === 'error') {
        // Never lose the completion itself over a failed write.
        toast.success("Time's up — take a break.")
      } else {
        toast.success("Time's up — take a break.")
      }
    })
  }, [timer, left, toast, onPublish, sessionId, subject])

  function start() {
    const remaining = left > 0 ? left : timer.duration
    onPublish({
      running: true,
      endsAt: Date.now() + remaining * 1000,
      remaining,
      duration: timer.duration,
    })
  }

  function pause() {
    onPublish({ running: false, endsAt: null, remaining: left, duration: timer.duration })
  }

  function reset(duration: number) {
    onPublish({ running: false, endsAt: null, remaining: duration, duration })
  }

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className="shrink-0 border-t border-border-subtle px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            role="timer"
            aria-live="off"
            className={`font-mono text-3xl font-semibold tnum ${
              timer.running ? 'text-accent-primary' : 'text-text-primary'
            }`}
          >
            {mm}:{ss}
          </span>
          <div className="hidden gap-1 sm:flex">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => reset(p.value)}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  timer.duration === p.value && !timer.running
                    ? 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary'
                    : 'border-border-default bg-bg-elevated text-text-secondary hover:bg-bg-subtle'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => reset(timer.duration)}>
            Reset
          </Button>
          <Button size="sm" className="px-5" onClick={timer.running ? pause : start}>
            {timer.running ? 'Pause' : 'Start'}
          </Button>
        </div>
      </div>
      <p className="mx-auto mt-1.5 max-w-2xl text-center text-[11px] text-text-tertiary sm:text-left">
        Shared timer — everyone in the room sees the same countdown.
      </p>
    </div>
  )
}

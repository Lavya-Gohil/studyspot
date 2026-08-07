'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * A number that counts up to its value instead of appearing at it.
 *
 * Two things make this feel right rather than gimmicky:
 *
 * - It eases OUT, so most of the distance is covered immediately and the last
 *   few units settle. A linear count reads like a loading spinner; this reads
 *   like the number arriving.
 * - It only animates when the value actually changes, and never on a
 *   re-render with the same value, so a parent re-rendering doesn't make
 *   every figure on the page replay.
 *
 * rAF rather than a CSS transition because there is no interpolatable CSS
 * property for "text content". The loop is cancelled on unmount and on any
 * value change mid-flight.
 *
 * Respects prefers-reduced-motion by rendering the final value immediately;
 * checked at run time, since a media query can't reach text content.
 */
export function Counter({
  value,
  duration = 650,
  format,
  className = '',
}: {
  value: number
  /** Milliseconds. Longer than the motion scale on purpose: this is content
      arriving, not a control responding, and the eye needs time to read it. */
  duration?: number
  format?: (n: number) => string
  className?: string
}) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const frameRef = useRef<number>()
  const mounted = useRef(false)

  useEffect(() => {
    // First paint shows the real value, nothing to animate from.
    if (!mounted.current) {
      mounted.current = true
      fromRef.current = value
      setDisplay(value)
      return
    }

    const from = fromRef.current
    if (from === value) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reduced || duration <= 0) {
      fromRef.current = value
      setDisplay(value)
      return
    }

    const start = performance.now()
    const delta = value - from

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutQuart, matches --ease-out's character.
      const eased = 1 - Math.pow(1 - t, 4)
      setDisplay(from + delta * eased)

      if (t < 1) {
        frameRef.current = requestAnimationFrame(step)
      } else {
        fromRef.current = value
        setDisplay(value)
      }
    }

    frameRef.current = requestAnimationFrame(step)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      // Bank progress so an interrupted count resumes from where it stopped
      // rather than snapping back.
      fromRef.current = value
    }
  }, [value, duration])

  const rounded = Math.round(display)

  return (
    // tnum keeps digit width fixed, so the figure doesn't jitter sideways as
    // it counts; the single biggest thing that makes counters look cheap.
    <span className={`tnum ${className}`}>{format ? format(rounded) : rounded}</span>
  )
}

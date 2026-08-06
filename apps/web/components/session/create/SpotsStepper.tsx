'use client'

import { MAX_SPOTS } from './useSessionDraft'

/**
 * Spot count as a stepper rather than a number input: the range is 1–9, so
 * typing is never faster than tapping, and it can't be put into an invalid
 * state. The live region below announces the resulting group size, which is
 * the number people actually care about.
 */
export function SpotsStepper({
  value,
  onChange,
}: {
  value: number
  onChange: (next: number) => void
}) {
  const buttonClasses =
    'w-10 h-10 rounded-md bg-bg-elevated border border-border-default text-text-primary flex items-center justify-center transition-colors hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div>
      <span className="block text-sm font-medium text-text-primary mb-1.5" id="spots-label">
        Extra spots (not counting you)
        <span className="text-accent-red ml-0.5" aria-hidden="true">
          *
        </span>
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, value - 1))}
          disabled={value <= 1}
          aria-label="One fewer spot"
          className={buttonClasses}
        >
          −
        </button>
        <span
          aria-labelledby="spots-label"
          role="status"
          className="w-8 text-center text-xl font-semibold tnum text-text-primary"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(MAX_SPOTS, value + 1))}
          disabled={value >= MAX_SPOTS}
          aria-label="One more spot"
          className={buttonClasses}
        >
          +
        </button>
        <span className="text-sm text-text-tertiary">Total group: {value + 1} people</span>
      </div>
    </div>
  )
}

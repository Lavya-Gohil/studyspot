'use client'

import { useId } from 'react'

export interface Segment<T extends string> {
  value: T
  label: string
}

/**
 * A compact exclusive choice; leaderboard scope, stats range, feed filter.
 *
 * The moving indicator is one absolutely-positioned element translated into
 * place, not a background colour swapped between buttons. That is what makes
 * it read as a single object sliding rather than two things blinking, and it
 * costs one composited transform instead of a repaint per segment.
 *
 * Keyboard: this is a radiogroup, so arrow keys move between options and
 * roving tabindex keeps it a single tab stop. Native radios would give that
 * for free but can't carry the indicator; the behaviour is reimplemented
 * rather than dropped.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = 'md',
  'aria-label': ariaLabel,
  className = '',
}: {
  segments: readonly Segment<T>[]
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
  'aria-label': string
  className?: string
}) {
  const id = useId()
  const index = Math.max(0, segments.findIndex((s) => s.value === value))
  const count = segments.length || 1

  function move(dir: 1 | -1) {
    const next = (index + dir + count) % count
    onChange(segments[next].value)
    document.getElementById(`${id}-${next}`)?.focus()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      move(-1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      onChange(segments[0].value)
      document.getElementById(`${id}-0`)?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      onChange(segments[count - 1].value)
      document.getElementById(`${id}-${count - 1}`)?.focus()
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={`relative inline-flex rounded-full border border-border-subtle bg-bg-subtle p-1 ${className}`}
    >
      {/* The indicator. Width is a fixed fraction and only translate changes,
          so the browser never re-lays-out the row while it moves. */}
      <div
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-full bg-bg-elevated shadow-soft transition-transform duration-medium ease-move"
        style={{
          width: `calc((100% - 0.5rem) / ${count})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />

      {segments.map((s, i) => {
        const selected = s.value === value
        return (
          <button
            key={s.value}
            id={`${id}-${i}`}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(s.value)}
            className={`relative z-10 flex-1 whitespace-nowrap rounded-full text-center font-medium transition-colors duration-fast ease-out ${
              size === 'sm' ? 'h-7 px-3 text-xs' : 'h-8 px-4 text-sm'
            } ${selected ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

'use client'

import { forwardRef, useId, type ReactNode } from 'react'

/**
 * An on/off toggle for settings that apply immediately, push notifications,
 * profile visibility. Use <Checkbox> instead when the value only takes effect
 * on submit; a switch that needs a Save button is a lie about immediacy.
 *
 * Built on a real <input type="checkbox">, so focus, keyboard, form
 * participation and screen-reader semantics come from the platform. Only the
 * visuals are ours, driven off peer-checked.
 *
 * The thumb translates; the track changes colour. Both are composited, and at
 * --dur-1 the whole thing lands in 120ms; a switch that takes longer feels
 * like it's asking the server for permission.
 */
export const Switch = forwardRef<
  HTMLInputElement,
  {
    checked: boolean
    onChange: (checked: boolean) => void
    label: ReactNode
    hint?: ReactNode
    disabled?: boolean
    /** Shown in place of the hint while a change is in flight. */
    pending?: boolean
    className?: string
  }
>(function Switch({ checked, onChange, label, hint, disabled, pending, className = '' }, ref) {
  const id = useId()
  const hintId = hint || pending ? `${id}-hint` : undefined

  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <label
          htmlFor={id}
          className={`block text-sm font-medium ${
            disabled ? 'text-text-tertiary' : 'cursor-pointer text-text-primary'
          }`}
        >
          {label}
        </label>
        {hintId ? (
          <p id={hintId} className="mt-0.5 text-xs text-text-secondary">
            {pending ? 'Saving…' : hint}
          </p>
        ) : null}
      </div>

      <label
        className={`relative inline-flex shrink-0 ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        }`}
      >
        <input
          ref={ref}
          id={id}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          aria-describedby={hintId}
          onChange={(e) => onChange(e.target.checked)}
        />

        {/* Track */}
        <span
          aria-hidden="true"
          className="block h-6 w-10 rounded-full bg-bg-subtle ring-1 ring-inset ring-border-default transition-colors duration-fast ease-out peer-checked:bg-brand-primary peer-checked:ring-transparent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-primary"
        />

        {/* Thumb. translate-x only: no left/width animation. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-text-primary shadow-soft transition-transform duration-fast ease-out peer-checked:translate-x-4 peer-checked:bg-brand-fg"
        />
      </label>
    </div>
  )
})

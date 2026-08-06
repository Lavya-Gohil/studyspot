import type { ReactNode } from 'react'

/**
 * Shared label / hint / error scaffolding for form controls.
 *
 * Input, Textarea, Select and Checkbox all render through this so a validation
 * message looks the same wherever it comes from — including the strings
 * `friendlyDbError()` (lib/validation.ts) produces for Postgres errors.
 *
 * The control owns its own id and wires `aria-describedby` itself; this
 * component only renders the surrounding text.
 */
export interface FieldProps {
  label?: ReactNode
  /** Helper text shown under the control. Hidden while an error is showing. */
  hint?: ReactNode
  error?: string | null
  required?: boolean
  className?: string
}

export function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-text-primary mb-1.5">
      {children}
      {required ? (
        <span className="text-accent-red ml-0.5" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  )
}

export function FieldMessage({
  id,
  hint,
  error,
}: {
  id: string
  hint?: ReactNode
  error?: string | null
}) {
  if (error) {
    return (
      <p id={id} role="alert" className="mt-1.5 text-xs text-accent-red">
        {error}
      </p>
    )
  }
  if (hint) {
    return (
      <p id={id} className="mt-1.5 text-xs text-text-tertiary">
        {hint}
      </p>
    )
  }
  return null
}

/** Border + ring treatment shared by every text-like control. */
export function controlClasses(error?: string | null) {
  return [
    'w-full bg-bg-surface text-text-primary placeholder:text-text-tertiary',
    'border rounded-md transition-colors',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    error
      ? 'border-accent-red/60 hover:border-accent-red'
      : 'border-border-default hover:border-border-strong',
  ].join(' ')
}

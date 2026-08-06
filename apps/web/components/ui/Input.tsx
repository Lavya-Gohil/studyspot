import {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
  useId,
  type ReactNode,
} from 'react'
import { FieldLabel, FieldMessage, controlClasses, type FieldProps } from './Field'

const sizes = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-11 px-3 text-sm',
  lg: 'h-12 px-4 text-sm',
}

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    FieldProps {
  size?: keyof typeof sizes
  /** Rendered inside the control on the trailing edge — a unit, counter, or icon. */
  suffix?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, hint, error, required, size = 'md', suffix, className = '', id, ...props },
    ref
  ) => {
    const autoId = useId()
    const inputId = id ?? autoId
    const messageId = `${inputId}-msg`
    const describedBy = error || hint ? messageId : undefined

    return (
      <div className={className}>
        {label ? (
          <FieldLabel htmlFor={inputId} required={required}>
            {label}
          </FieldLabel>
        ) : null}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`${controlClasses(error)} ${sizes[size]} ${suffix ? 'pr-12' : ''}`}
            {...props}
          />
          {suffix ? (
            <span className="absolute inset-y-0 right-3 flex items-center text-xs text-text-tertiary pointer-events-none">
              {suffix}
            </span>
          ) : null}
        </div>
        <FieldMessage id={messageId} hint={hint} error={error} />
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    FieldProps {
  /** Shows a live "n/max" counter. Pair with maxLength for the hard stop. */
  showCount?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, hint, error, required, showCount, className = '', id, maxLength, value, rows = 4, ...props },
    ref
  ) => {
    const autoId = useId()
    const inputId = id ?? autoId
    const messageId = `${inputId}-msg`
    const describedBy = error || hint ? messageId : undefined
    const length = typeof value === 'string' ? value.length : 0

    return (
      <div className={className}>
        {label ? (
          <FieldLabel htmlFor={inputId} required={required}>
            {label}
          </FieldLabel>
        ) : null}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          maxLength={maxLength}
          value={value}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${controlClasses(error)} px-3 py-2.5 text-sm resize-y`}
          {...props}
        />
        <div className="flex items-start justify-between gap-3">
          <FieldMessage id={messageId} hint={hint} error={error} />
          {showCount && maxLength ? (
            <span
              className={`mt-1.5 shrink-0 text-xs tnum ${
                length > maxLength * 0.9 ? 'text-accent-amber' : 'text-text-tertiary'
              }`}
            >
              {length}/{maxLength}
            </span>
          ) : null}
        </div>
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

import { InputHTMLAttributes, forwardRef, useId, type ReactNode, type Ref } from 'react'
import { Check } from 'lucide-react'
import { FieldMessage } from './Field'
import { Icon } from './Icon'

interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
}

/**
 * Checkbox and Radio share everything but the input type and the indicator
 * shape, so they're one implementation. The native input stays in the DOM
 * (visually hidden via peer + sr-only), and that keeps keyboard, form submission,
 * and screen-reader semantics intact while letting us draw the box ourselves.
 */
function Toggle(
  type: 'checkbox' | 'radio',
  { label, hint, error, className = '', id, ...props }: ToggleProps,
  ref: Ref<HTMLInputElement>
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const messageId = `${inputId}-msg`
  const round = type === 'radio'

  return (
    <div className={className}>
      <div className="flex items-start gap-2.5">
        <span className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            ref={ref}
            id={inputId}
            type={type}
            aria-invalid={error ? true : undefined}
            aria-describedby={error || hint ? messageId : undefined}
            className="peer sr-only"
            {...props}
          />
          <span
            aria-hidden="true"
            className={[
              'h-4 w-4 border transition-all',
              round ? 'rounded-full' : 'rounded-sm',
              error ? 'border-accent-red/60' : 'border-border-strong',
              'peer-checked:bg-accent-primary peer-checked:border-accent-primary',
              'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-primary',
              'peer-disabled:opacity-50',
            ].join(' ')}
          />
          {round ? (
            <span
              aria-hidden="true"
              className="absolute h-1.5 w-1.5 rounded-full bg-accent-fg scale-0 peer-checked:scale-100 transition-transform"
            />
          ) : (
            <Icon
              as={Check}
              size="xs"
              strokeWidth={3}
              className="pointer-events-none absolute h-3 w-3 scale-0 text-accent-fg transition-transform peer-checked:scale-100"
            />
          )}
        </span>
        <label htmlFor={inputId} className="text-sm text-text-primary cursor-pointer select-none">
          {label}
        </label>
      </div>
      <div className="pl-[26px]">
        <FieldMessage id={messageId} hint={hint} error={error} />
      </div>
    </div>
  )
}

export const Checkbox = forwardRef<HTMLInputElement, ToggleProps>((props, ref) =>
  Toggle('checkbox', props, ref)
)
Checkbox.displayName = 'Checkbox'

export const Radio = forwardRef<HTMLInputElement, ToggleProps>((props, ref) =>
  Toggle('radio', props, ref)
)
Radio.displayName = 'Radio'

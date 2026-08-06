import { SelectHTMLAttributes, forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { FieldLabel, FieldMessage, controlClasses, type FieldProps } from './Field'
import { Icon } from './Icon'

const sizes = {
  sm: 'h-8 pl-2.5 text-xs',
  md: 'h-11 pl-3 text-sm',
  lg: 'h-12 pl-4 text-sm',
}

interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    FieldProps {
  size?: keyof typeof sizes
  /** Convenience over passing <option> children. */
  options?: { value: string; label: string; disabled?: boolean }[]
  /** Shown as a disabled first option when the value is empty. */
  placeholder?: string
}

/**
 * Native <select> styled to match Input. Native is deliberate: it gets mobile
 * platform pickers, keyboard behaviour, and form semantics for free. Reach for
 * a custom listbox only when options need rich content.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, hint, error, required, size = 'md', options, placeholder, className = '', id, children, ...props },
    ref
  ) => {
    const autoId = useId()
    const selectId = id ?? autoId
    const messageId = `${selectId}-msg`
    const describedBy = error || hint ? messageId : undefined

    return (
      <div className={className}>
        {label ? (
          <FieldLabel htmlFor={selectId} required={required}>
            {label}
          </FieldLabel>
        ) : null}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`${controlClasses(error)} ${sizes[size]} pr-9 appearance-none cursor-pointer`}
            {...props}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options?.map((o) => (
              <option key={o.value} value={o.value} disabled={o.disabled}>
                {o.label}
              </option>
            ))}
            {children}
          </select>
          <Icon
            as={ChevronDown}
            size="xs"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
        </div>
        <FieldMessage id={messageId} hint={hint} error={error} />
      </div>
    )
  }
)
Select.displayName = 'Select'

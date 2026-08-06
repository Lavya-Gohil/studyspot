import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `brand` is the signature-coloured fill and is reserved for the single most
   * important action on a screen — if two are visible at once, one is wrong.
   * `primary` remains the neutral emphasis fill and is unchanged, so existing
   * call sites render exactly as before.
   */
  variant?: 'primary' | 'brand' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-accent-primary hover:bg-accent-hover text-accent-fg',
      brand: 'bg-brand-primary hover:bg-brand-hover text-brand-fg',
      secondary: 'bg-transparent border border-border-default hover:bg-bg-subtle text-text-primary',
      ghost: 'bg-transparent text-text-secondary hover:text-text-primary',
      danger: 'bg-accent-red/10 border border-accent-red/30 text-accent-red hover:bg-accent-red/20',
    }

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-11 px-4 text-sm',
      lg: 'h-12 px-6 text-sm',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            {/* Was a byte-identical copy of Spinner's arc. One spinner.
                label='' because the button's own text already names the wait. */}
            <Spinner size="sm" label="" />
            {children}
          </span>
        ) : children}
      </button>
    )
  }
)
Button.displayName = 'Button'

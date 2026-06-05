import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-accent-primary hover:bg-accent-hover text-accent-fg',
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
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {children}
          </span>
        ) : children}
      </button>
    )
  }
)
Button.displayName = 'Button'

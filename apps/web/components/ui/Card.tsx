import type { ReactNode } from 'react'

const variants = {
  /** Default panel — flat surface with a hairline border. */
  surface: 'bg-bg-surface border border-border-subtle',
  /** Lifted above the page; use for anything overlapping other content. */
  elevated: 'bg-bg-elevated border border-border-default shadow-soft',
  /** Frosted. Only over imagery or a gradient — over flat bg it reads as noise. */
  glass: 'glass glass-sheen',
}

const padding = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({
  variant = 'surface',
  pad = 'md',
  interactive,
  className = '',
  children,
}: {
  variant?: keyof typeof variants
  pad?: keyof typeof padding
  /** Adds hover lift. Only for cards that are themselves a link or button. */
  interactive?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={[
        'rounded-lg',
        variants[variant],
        padding[pad],
        interactive
          ? 'transition-all hover:border-border-strong hover:shadow-lift hover:-translate-y-0.5'
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  description,
  action,
  className = '',
}: {
  title: ReactNode
  description?: ReactNode
  /** Trailing control — a button, menu, or badge. */
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h3 className="font-display text-base font-semibold text-text-primary">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

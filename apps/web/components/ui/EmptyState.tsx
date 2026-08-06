import type { ReactNode } from 'react'

/**
 * The screen shown when a list has nothing in it. Every empty list should use
 * one — a blank region reads as a bug. `action` matters most: an empty state
 * without a way out is a dead end, which is exactly what the feed and circles
 * screens currently show.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center px-6 py-14 ${className}`}>
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-subtle text-text-tertiary">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-lg font-semibold text-text-primary">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-text-secondary text-balance">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

/**
 * Empty state's sibling for the failure case. Keeps the retry affordance
 * consistent — pair the message with `friendlyDbError()` from lib/validation.
 */
export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
  className = '',
}: {
  title?: ReactNode
  description?: ReactNode
  onRetry?: () => void
  className?: string
}) {
  return (
    <EmptyState
      className={className}
      icon={
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      }
      title={title}
      description={description}
      action={
        onRetry ? (
          <button
            onClick={onRetry}
            className="h-11 px-4 text-sm font-medium rounded-md bg-transparent border border-border-default hover:bg-bg-subtle text-text-primary transition-all active:scale-[0.98]"
          >
            Try again
          </button>
        ) : null
      }
    />
  )
}

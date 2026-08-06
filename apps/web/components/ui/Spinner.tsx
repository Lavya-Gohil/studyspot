const sizes = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
}

/**
 * Indeterminate loading spinner — the one mark every surface spins with,
 * Button included.
 *
 * The arc is hand-drawn rather than lucide's Loader2 on purpose: this is a
 * purpose-built rotating shape (a quarter-arc over a faint track), not an icon
 * standing in for a noun. Swapping it for a stock glyph would be uniformity
 * for its own sake.
 *
 * Prefer <Skeleton> when the shape of the incoming content is known — a
 * spinner is for waits with no known layout.
 */
export function Spinner({
  size = 'md',
  className = '',
  label = 'Loading',
}: {
  size?: keyof typeof sizes
  className?: string
  /** Screen-reader text. Pass '' when a visible label already describes the wait. */
  label?: string
}) {
  return (
    <span role="status" className={`inline-flex items-center ${className}`}>
      <svg className={`animate-spin ${sizes[size]}`} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}

/**
 * Progress — a bar and a ring.
 *
 * Both animate with stroke/transform rather than width, because width is a
 * layout property: animating it forces a reflow of everything after it on
 * every frame. `transform: scaleX()` and `stroke-dashoffset` are composited,
 * which is what keeps these smooth on a laptop that also has a lecture
 * recording open.
 *
 * Server-safe: no state, no effects, no 'use client'. The animation is
 * declarative — the browser tweens to whatever value the server rendered.
 */

const clamp = (v: number) => Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0))

export function ProgressBar({
  value,
  max = 100,
  size = 'md',
  tone = 'brand',
  label,
  className = '',
}: {
  value: number
  max?: number
  size?: 'sm' | 'md'
  tone?: 'brand' | 'neutral'
  /** Screen-reader description. The visible number, if any, is the caller's. */
  label?: string
  className?: string
}) {
  const pct = clamp((value / (max || 1)) * 100)

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`w-full overflow-hidden rounded-full bg-bg-subtle ${
        size === 'sm' ? 'h-1' : 'h-2'
      } ${className}`}
    >
      {/* scaleX from a left origin: composited, no reflow. */}
      <div
        style={{ transform: `scaleX(${pct / 100})` }}
        className={`h-full w-full origin-left rounded-full transition-transform duration-medium ease-out ${
          tone === 'brand' ? 'bg-brand-primary' : 'bg-accent-primary'
        }`}
      />
    </div>
  )
}

export function ProgressRing({
  value,
  max = 100,
  size = 64,
  stroke = 6,
  tone = 'brand',
  label,
  children,
  className = '',
}: {
  value: number
  max?: number
  /** Outer diameter in px. */
  size?: number
  stroke?: number
  tone?: 'brand' | 'neutral'
  label?: string
  /** Centred content — usually the figure the ring is describing. */
  children?: React.ReactNode
  className?: string
}) {
  const pct = clamp((value / (max || 1)) * 100)
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct / 100)

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* -90deg so the arc starts at twelve o'clock rather than three. */}
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-bg-subtle"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`transition-[stroke-dashoffset] duration-slow ease-out ${
            tone === 'brand' ? 'stroke-brand-primary' : 'stroke-accent-primary'
          }`}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      ) : null}
    </div>
  )
}

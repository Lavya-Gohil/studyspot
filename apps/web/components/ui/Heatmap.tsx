/**
 * A contribution-style calendar of focused time.
 *
 * Server-safe by design: it takes an already-aggregated map of ISO date →
 * minutes and renders static cells. The aggregation belongs in Postgres (the
 * focus_daily view in migration 011 does it in the user's own timezone), not
 * in a client component looping over raw sessions.
 *
 * The grid is columns-of-weeks, like every calendar heatmap, because that is
 * the layout people already know how to read. Weeks start Monday.
 */

/** Buckets rather than a continuous scale: five steps are distinguishable at
 *  11px, a gradient is not, and buckets make "a good day" legible at a glance. */
const LEVELS = [
  { min: 0, className: 'bg-bg-subtle' },
  { min: 1, className: 'bg-brand-primary/25' },
  { min: 30, className: 'bg-brand-primary/45' },
  { min: 90, className: 'bg-brand-primary/70' },
  { min: 180, className: 'bg-brand-primary' },
] as const

function levelFor(minutes: number): number {
  let level = 0
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (minutes >= LEVELS[i].min && LEVELS[i].min > 0) return i
  }
  return level
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function Heatmap({
  data,
  weeks = 26,
  endDate,
  className = '',
}: {
  /** ISO `YYYY-MM-DD` → minutes focused that day. */
  data: Record<string, number>
  weeks?: number
  /** Defaults to today. Pass the user's local date for correctness across
      timezones — the server's day is not the user's day (see migration 011). */
  endDate?: Date
  className?: string
}) {
  const end = endDate ? new Date(endDate) : new Date()
  end.setHours(12, 0, 0, 0)

  // Walk back to the Monday that starts the final week, so every column is a
  // full Mon–Sun and the rows line up with the weekday labels.
  const dayIdx = (end.getDay() + 6) % 7 // Mon = 0
  const lastMonday = new Date(end)
  lastMonday.setDate(end.getDate() - dayIdx)

  const columns: { date: Date; minutes: number; future: boolean }[][] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const col: { date: Date; minutes: number; future: boolean }[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(lastMonday)
      date.setDate(lastMonday.getDate() - w * 7 + d)
      col.push({
        date,
        minutes: data[iso(date)] ?? 0,
        future: date.getTime() > end.getTime(),
      })
    }
    columns.push(col)
  }

  const total = Object.values(data).reduce((a, b) => a + b, 0)
  const activeDays = Object.values(data).filter((m) => m > 0).length

  return (
    <div className={className}>
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex min-w-full flex-col gap-1.5">
          {/* Month labels, printed once per month at its first column. */}
          <div className="flex gap-[3px] pl-7 text-[10px] text-text-tertiary">
            {columns.map((col, i) => {
              const first = col[0].date
              const prev = i > 0 ? columns[i - 1][0].date : null
              const isNew = !prev || prev.getMonth() !== first.getMonth()
              return (
                <span key={i} className="w-[11px] shrink-0">
                  {isNew ? MONTHS[first.getMonth()] : ''}
                </span>
              )
            })}
          </div>

          <div className="flex gap-[3px]">
            {/* Weekday gutter — only alternate rows, or it's noise at 11px. */}
            <div className="mr-1 flex w-6 shrink-0 flex-col gap-[3px] text-[10px] leading-[11px] text-text-tertiary">
              {['Mon', '', 'Wed', '', 'Fri', '', ''].map((d, i) => (
                <span key={i} className="h-[11px]">
                  {d}
                </span>
              ))}
            </div>

            {columns.map((col, i) => (
              <div key={i} className="flex shrink-0 flex-col gap-[3px]">
                {col.map(({ date, minutes, future }, j) => {
                  if (future) {
                    return <span key={j} className="h-[11px] w-[11px]" />
                  }
                  const lvl = levelFor(minutes)
                  return (
                    <span
                      key={j}
                      // A native title is the right call here: 180 cells with
                      // JS tooltips would mean 180 listeners for a hint that
                      // is one line of text.
                      title={`${date.toDateString()} — ${
                        minutes > 0 ? `${Math.round(minutes)} min focused` : 'nothing logged'
                      }`}
                      className={`h-[11px] w-[11px] rounded-[2px] transition-colors duration-fast ease-out ${LEVELS[lvl].className}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-text-tertiary">
        <span>
          {activeDays > 0
            ? `${Math.round(total / 60)}h across ${activeDays} day${activeDays === 1 ? '' : 's'}`
            : 'No focus time logged yet'}
        </span>
        <span className="flex items-center gap-1.5">
          Less
          {LEVELS.map((l, i) => (
            <span key={i} className={`h-[11px] w-[11px] rounded-[2px] ${l.className}`} />
          ))}
          More
        </span>
      </div>
    </div>
  )
}

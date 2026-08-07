'use client'

import { Counter } from '@/components/ui/Counter'

/**
 * The one client component on the stats page.
 *
 * Everything else (the heatmap's 180 cells, the rings, the badge list) is
 * server-rendered and ships no JavaScript. Only the figures animate, so only
 * the figures cross the boundary, and this wrapper is what keeps that line
 * from creeping: a page component can't accidentally pull the whole stats
 * tree client-side by reaching for <Counter> directly.
 */
export function StatFigure({ value }: { value: number }) {
  return <Counter value={value} />
}

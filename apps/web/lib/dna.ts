import { VIBE_LABELS } from '@studyspot/types'
import type { SessionVibe } from '@studyspot/types'

export interface DnaSession {
  start_time: string
  vibe: SessionVibe
  mode: 'in_person' | 'online'
  spots_total: number
}

export interface ProductivityDNA {
  enoughData: boolean
  sessionCount: number
  traits: { label: string; value: string }[]
  recommendations: string[]
}

const TIME_BUCKETS: { label: string; from: number; to: number }[] = [
  { label: 'Early morning', from: 5, to: 9 },
  { label: 'Morning', from: 9, to: 12 },
  { label: 'Afternoon', from: 12, to: 17 },
  { label: 'Evening', from: 17, to: 21 },
  { label: 'Night', from: 21, to: 29 }, // 21:00–05:00 (wraps)
]

function bucketFor(hour: number): string {
  for (const b of TIME_BUCKETS) {
    const h = hour < 5 ? hour + 24 : hour
    if (h >= b.from && h < b.to) return b.label
  }
  return 'Night'
}

function topOf<T extends string>(counts: Record<T, number>): T | null {
  let best: T | null = null
  let n = -1
  for (const k in counts) {
    if (counts[k] > n) {
      n = counts[k]
      best = k
    }
  }
  return best
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function computeProductivityDNA(sessions: DnaSession[]): ProductivityDNA {
  const count = sessions.length
  if (count < 3) {
    return {
      enoughData: false,
      sessionCount: count,
      traits: [],
      recommendations: [],
    }
  }

  const timeBuckets: Record<string, number> = {}
  const dayCounts: Record<string, number> = {}
  const vibeCounts: Record<string, number> = {}
  let online = 0
  let groupSum = 0

  for (const s of sessions) {
    const d = new Date(s.start_time)
    timeBuckets[bucketFor(d.getHours())] = (timeBuckets[bucketFor(d.getHours())] || 0) + 1
    dayCounts[DAYS[d.getDay()]] = (dayCounts[DAYS[d.getDay()]] || 0) + 1
    vibeCounts[s.vibe] = (vibeCounts[s.vibe] || 0) + 1
    if (s.mode === 'online') online += 1
    groupSum += s.spots_total + 1
  }

  const bestTime = topOf(timeBuckets) || 'Evening'
  const bestDay = topOf(dayCounts) || 'weekends'
  const topVibe = (topOf(vibeCounts) as SessionVibe) || 'silent'
  const avgGroup = Math.max(2, Math.round(groupSum / count))
  const onlineShare = online / count
  const prefersOnline = onlineShare >= 0.5

  const traits = [
    { label: 'Peak focus time', value: bestTime },
    { label: 'Most active day', value: bestDay },
    { label: 'Go-to vibe', value: VIBE_LABELS[topVibe] },
    { label: 'Ideal group size', value: `~${avgGroup} people` },
    {
      label: 'Setting',
      value: prefersOnline
        ? `Online (${Math.round(onlineShare * 100)}%)`
        : `In person (${Math.round((1 - onlineShare) * 100)}%)`,
    },
  ]

  const recommendations = [
    `Schedule your hardest work in the ${bestTime.toLowerCase()} — that's when you show up most.`,
    `Aim for groups of around ${avgGroup}; that's your sweet spot.`,
    prefersOnline
      ? 'Lean into online rooms — they fit how you actually study.'
      : 'In-person sessions suit you — keep meeting up.',
    `Your go-to vibe is ${VIBE_LABELS[topVibe]}; try mixing in one other vibe to stay fresh.`,
  ]

  return { enoughData: true, sessionCount: count, traits, recommendations }
}

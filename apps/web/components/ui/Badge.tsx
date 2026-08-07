import type { SessionVibe } from '@studyspot/types'

export function VibePill({ vibe }: { vibe: SessionVibe }) {
  const labels: Record<SessionVibe, string> = {
    silent: 'Silent Study',
    pomodoro: 'Pomodoro',
    discussion: 'Group Discussion',
    coding: 'Coding Session',
    exam_prep: 'Exam Prep',
    casual: 'Casual Study',
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-primary/15 text-accent-primary border border-accent-primary/20">
      {labels[vibe]}
    </span>
  )
}

export function SpotsBadge({ remaining }: { remaining: number }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      remaining === 0
        ? 'bg-accent-red/10 text-accent-red border border-accent-red/20'
        : 'bg-accent-green/10 text-accent-green border border-accent-green/20'
    }`}>
      {remaining === 0 ? 'Full' : `${remaining} spot${remaining === 1 ? '' : 's'} left`}
    </span>
  )
}

export function VerifiedBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-accent-green font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
      {/* Hand-drawn rather than lucide's BadgeCheck: the two-tone treatment
          (filled disc at 20% under a solid tick) can't be expressed by a
          single-stroke glyph, and verification is a core product concept that
          earns its own mark, same reasoning as the brand glyphs in Icon.tsx. */}
      <svg width={size === 'sm' ? 12 : 16} height={size === 'sm' ? 12 : 16} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Verified
    </span>
  )
}

export function UnderAgeLabel() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-amber/10 text-accent-amber border border-accent-amber/20">
      Under 18
    </span>
  )
}

import type { StudyStats, ReputationLevel, Reputation } from '@studyspot/types'
import { computeReputation } from '@studyspot/utils'

const LEVEL_STYLES: Record<ReputationLevel, { text: string; bg: string; ring: string }> = {
  new: { text: 'text-text-secondary', bg: 'bg-bg-subtle', ring: 'border-border-default' },
  building: { text: 'text-accent-amber', bg: 'bg-accent-amber/15', ring: 'border-accent-amber/40' },
  reliable: { text: 'text-accent-primary', bg: 'bg-accent-primary/15', ring: 'border-accent-primary/40' },
  trusted: { text: 'text-accent-primary', bg: 'bg-accent-primary/15', ring: 'border-accent-primary/50' },
  exemplary: { text: 'text-accent-green', bg: 'bg-accent-green/15', ring: 'border-accent-green/50' },
}

export function ReputationCard({ stats, isOwn }: { stats: StudyStats; isOwn: boolean }) {
  const rep: Reputation = computeReputation(stats)
  const s = LEVEL_STYLES[rep.level]

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Score badge */}
          <div
            className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border ${s.ring} ${s.bg}`}
          >
            <span className={`font-display text-2xl font-bold tnum ${s.text}`}>
              {rep.score ?? ', '}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold">Reputation</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
                {rep.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text-secondary">
              {rep.score == null
                ? isOwn
                  ? 'Attend and host sessions to build your score'
                  : 'No track record yet'
                : 'Based on attendance, punctuality & peer ratings'}
            </p>
          </div>
        </div>
        {/* Verified hours */}
        <div className="text-right">
          <div className="font-display text-2xl font-bold tnum text-text-primary">
            {stats.verified_hours}
          </div>
          <div className="text-xs text-text-tertiary">verified hrs</div>
        </div>
      </div>

      {/* Component breakdown */}
      <div className="mt-5 space-y-3 border-t border-border-subtle pt-5">
        {rep.components.map((c) => (
          <div key={c.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-secondary">{c.label}</span>
              <span className="text-text-tertiary">{c.detail}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
              <div
                className={`h-full rounded-full ${
                  c.value == null ? 'bg-border-default' : 'bg-accent-primary'
                }`}
                style={{ width: `${c.value ?? 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

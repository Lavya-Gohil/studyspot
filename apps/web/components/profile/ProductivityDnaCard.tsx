import { Dna } from 'lucide-react'
import type { ProductivityDNA } from '@studyspot/utils'
import { Icon } from '@/components/ui/Icon'

export function ProductivityDnaCard({ dna }: { dna: ProductivityDNA }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface p-6">
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <Icon as={Dna} size="lg" className="text-brand-text" />
          <h2 className="font-display text-lg font-semibold">Productivity DNA</h2>
        </div>

        {!dna.enoughData ? (
          <p className="mt-2 text-sm text-text-secondary">
            Attend {Math.max(1, 3 - dna.sessionCount)} more{' '}
            {3 - dna.sessionCount === 1 ? 'session' : 'sessions'} to unlock your personalised
            study insights.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs text-text-secondary">
              Learned from your {dna.sessionCount} sessions.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {dna.traits.map((t) => (
                <div key={t.label} className="rounded-xl border border-border-subtle bg-bg-base p-3">
                  <div className="text-[11px] text-text-tertiary">{t.label}</div>
                  <div className="mt-0.5 text-sm font-semibold text-text-primary">{t.value}</div>
                </div>
              ))}
            </div>

            <ul className="mt-4 space-y-2 border-t border-border-subtle pt-4">
              {dna.recommendations.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span className="mt-0.5 text-accent-primary">→</span>
                  {r}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

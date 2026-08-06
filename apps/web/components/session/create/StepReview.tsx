'use client'

import { Card } from '@/components/ui/Card'
import { SpotsBadge, VibePill } from '@/components/ui/Badge'
import { formatSessionTime } from '@studyspot/utils'
import type { SessionDraft } from './useSessionDraft'

/** Step 3 — read it back before it goes public. */
export function StepReview({ draft }: { draft: SessionDraft }) {
  const start = new Date(`${draft.date}T${draft.startTime}`)
  const end = new Date(`${draft.date}T${draft.endTime}`)

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-text-primary">Looks good?</h2>

      <Card pad="lg" className="space-y-3">
        <h3 className="font-display text-base font-semibold text-text-primary">{draft.subject}</h3>

        <p className="text-sm text-text-secondary">
          {draft.mode === 'online'
            ? `💻 Online room${draft.locationName.trim() ? ` · ${draft.locationName.trim()}` : ''}`
            : `📍 ${draft.locationName}${
                draft.locationAddress.trim() ? ` · ${draft.locationAddress.trim()}` : ''
              }`}
        </p>

        {/* Same formatter the feed and detail page use, so the preview reads
            exactly like the card it will become. */}
        <p className="text-sm text-text-secondary">
          📅 {formatSessionTime(start.toISOString(), end.toISOString())}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {draft.vibe && <VibePill vibe={draft.vibe} />}
          <SpotsBadge remaining={draft.spotsTotal} />
        </div>

        {draft.subjectTags.length > 0 && (
          <p className="text-xs text-text-tertiary">{draft.subjectTags.join(' · ')}</p>
        )}

        {draft.description.trim() && (
          <p className="border-t border-border-subtle pt-3 text-sm italic text-text-secondary">
            &quot;{draft.description.trim()}&quot;
          </p>
        )}
      </Card>

      <p className="text-xs text-text-tertiary">
        Posting makes this visible to students near you. You can cancel it any time from the
        session page.
      </p>
    </div>
  )
}

'use client'

import { Input, Textarea } from '@/components/ui/Input'
import { FieldMessage } from '@/components/ui/Field'
import { VibeSelector } from '../VibeSelector'
import { SpotsStepper } from './SpotsStepper'
import { SubjectTagPicker } from './SubjectTagPicker'
import { DESCRIPTION_MAX, type SessionDraft } from './useSessionDraft'

/** Step 2 — what's being studied, when, and with how many people. */
export function StepDetails({
  draft,
  errors,
  minDate,
  maxDate,
  onChange,
}: {
  draft: SessionDraft
  errors: Partial<Record<keyof SessionDraft, string>>
  minDate: string
  maxDate: string
  onChange: (patch: Partial<SessionDraft>) => void
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-text-primary">Session details</h2>

      <Input
        label="Subject / Topic"
        required
        value={draft.subject}
        onChange={(e) => onChange({ subject: e.target.value })}
        maxLength={120}
        error={errors.subject}
        placeholder="e.g. Physics – Thermodynamics"
      />

      <SubjectTagPicker
        value={draft.subjectTags}
        onChange={(subjectTags) => onChange({ subjectTags })}
      />

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Date"
          required
          type="date"
          value={draft.date}
          min={minDate}
          max={maxDate}
          error={errors.date}
          onChange={(e) => onChange({ date: e.target.value })}
        />
        <Input
          label="Start"
          required
          type="time"
          value={draft.startTime}
          error={errors.startTime}
          onChange={(e) => onChange({ startTime: e.target.value })}
        />
        <Input
          label="End"
          required
          type="time"
          value={draft.endTime}
          error={errors.endTime}
          onChange={(e) => onChange({ endTime: e.target.value })}
        />
      </div>

      <SpotsStepper value={draft.spotsTotal} onChange={(spotsTotal) => onChange({ spotsTotal })} />

      <div>
        <span className="block text-sm font-medium text-text-primary mb-1.5" id="vibe-label">
          Study vibe
          <span className="text-accent-red ml-0.5" aria-hidden="true">
            *
          </span>
        </span>
        <div role="group" aria-labelledby="vibe-label">
          <VibeSelector value={draft.vibe} onChange={(vibe) => onChange({ vibe })} />
        </div>
        <FieldMessage id="vibe-msg" error={errors.vibe} />
      </div>

      <Textarea
        label="Note for the group"
        value={draft.description}
        onChange={(e) => onChange({ description: e.target.value })}
        maxLength={DESCRIPTION_MAX}
        showCount
        rows={2}
        placeholder="Anything you'd like people to know..."
      />
    </div>
  )
}

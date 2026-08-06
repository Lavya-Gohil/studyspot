'use client'

import { Button } from '@/components/ui/Button'
import { OnboardingProgress } from '@/components/ui/OnboardingProgress'
import { StepDetails } from './create/StepDetails'
import { StepFormat } from './create/StepFormat'
import { StepReview } from './create/StepReview'
import { CREATE_STEPS, useSessionDraft } from './create/useSessionDraft'
import type { SessionMode, SessionVibe } from '@studyspot/types'

/**
 * Create-a-session wizard. Composition only — the draft, its validation and the
 * insert all live in useSessionDraft; each step renders controls and nothing
 * else:
 *
 *   StepFormat   in person vs online, and where
 *   StepDetails  subject, tags, when, group size, vibe
 *   StepReview   read it back, then post
 */
export function CreateSessionForm({
  initialMode,
  initialVibe,
}: {
  initialMode?: SessionMode
  initialVibe?: SessionVibe
} = {}) {
  const { draft, update, step, next, back, errors, formError, submitting, submit, minDate, maxDate } =
    useSessionDraft({ initialMode, initialVibe })

  return (
    <div className="space-y-6">
      <OnboardingProgress currentStep={step} steps={CREATE_STEPS} className="mb-0" />

      {step === 1 && <StepFormat draft={draft} errors={errors} onChange={update} />}

      {step === 2 && (
        <StepDetails
          draft={draft}
          errors={errors}
          minDate={minDate}
          maxDate={maxDate}
          onChange={update}
        />
      )}

      {step === 3 && <StepReview draft={draft} />}

      {/* Submit-time failures only — per-field problems render on their control.
          role="alert" so it's announced even though focus never moves here. */}
      {formError && (
        <p role="alert" className="text-sm text-accent-red">
          {formError}
        </p>
      )}

      <div className="flex gap-3">
        {step > 1 && (
          <Button variant="secondary" onClick={back} disabled={submitting}>
            {step === 3 ? '← Edit' : '← Back'}
          </Button>
        )}
        {step < 3 ? (
          // Deliberately not disabled while invalid: pressing it is what reveals
          // which field is missing, and a dead button explains nothing.
          <Button className="flex-1" onClick={next}>
            {step === 1 ? 'Next →' : 'Preview →'}
          </Button>
        ) : (
          <Button className="flex-1" onClick={submit} loading={submitting}>
            {submitting ? 'Posting' : 'Post session →'}
          </Button>
        )}
      </div>
    </div>
  )
}

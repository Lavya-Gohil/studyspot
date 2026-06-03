import { CreateSessionForm } from '@/components/session/CreateSessionForm'
import type { SessionMode, SessionVibe } from '@studyspot/types'
import { VIBE_LABELS } from '@studyspot/types'

export default function CreateSessionPage({
  searchParams,
}: {
  searchParams: { mode?: string; vibe?: string }
}) {
  const initialMode: SessionMode | undefined =
    searchParams.mode === 'online'
      ? 'online'
      : searchParams.mode === 'in_person'
        ? 'in_person'
        : undefined

  const initialVibe =
    searchParams.vibe && searchParams.vibe in VIBE_LABELS
      ? (searchParams.vibe as SessionVibe)
      : undefined

  const isSilent = initialVibe === 'silent'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-text-primary mb-1">
        {isSilent ? 'Start a silent study session' : 'Create a study session'}
      </h1>
      {isSilent && (
        <p className="mb-6 text-sm text-text-secondary">
          Pure focus — no chat, just everyone studying side by side and holding each other
          accountable.
        </p>
      )}
      {!isSilent && <div className="mb-6" />}
      <CreateSessionForm initialMode={initialMode} initialVibe={initialVibe} />
    </div>
  )
}

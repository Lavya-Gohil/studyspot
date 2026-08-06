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
    <div className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-text-primary">
          {isSilent ? 'Start a silent study session' : 'Create a study session'}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {isSilent
            ? 'Pure focus — no chat, just everyone studying side by side and holding each other accountable.'
            : 'Three steps: pick a format, fill in the details, then check it over.'}
        </p>
      </header>
      <CreateSessionForm initialMode={initialMode} initialVibe={initialVibe} />
    </div>
  )
}

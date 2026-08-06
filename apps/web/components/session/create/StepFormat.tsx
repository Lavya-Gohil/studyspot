'use client'

import { Laptop, MapPin } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/ui/Icon'
import type { SessionDraft } from './useSessionDraft'
import type { SessionMode } from '@studyspot/types'

const MODES: { value: SessionMode; icon: LucideIcon; title: string; blurb: string }[] = [
  { value: 'in_person', icon: MapPin, title: 'In person', blurb: 'Meet at a café, library, or campus' },
  { value: 'online', icon: Laptop, title: 'Online room', blurb: 'Live virtual classroom with avatars' },
]

/** Step 1 — how the session happens, and where. */
export function StepFormat({
  draft,
  errors,
  onChange,
}: {
  draft: SessionDraft
  errors: Partial<Record<keyof SessionDraft, string>>
  onChange: (patch: Partial<SessionDraft>) => void
}) {
  const online = draft.mode === 'online'

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-text-primary">
        How are you studying?
      </h2>

      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Session format">
        {MODES.map((m) => {
          const selected = draft.mode === m.value
          return (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ mode: m.value })}
              className={`rounded-lg border p-4 text-left transition-colors ${
                selected
                  ? 'border-brand-primary bg-brand-primary/10'
                  : 'border-border-default bg-bg-elevated hover:bg-bg-subtle'
              }`}
            >
              <Icon
                as={m.icon}
                size="lg"
                className={selected ? 'text-brand-text' : 'text-text-tertiary'}
              />
              <div className="mt-1 text-sm font-semibold text-text-primary">{m.title}</div>
              <div className="text-xs text-text-secondary">{m.blurb}</div>
            </button>
          )
        })}
      </div>

      {online ? (
        <Input
          label="Room name"
          value={draft.locationName}
          onChange={(e) => onChange({ locationName: e.target.value })}
          maxLength={160}
          placeholder="e.g. Late-night JEE grind"
          hint="Optional. Members join a live virtual classroom — everyone gets an avatar seat, a shared chat, and a group focus timer."
        />
      ) : (
        <>
          <Input
            label="Venue name"
            required
            value={draft.locationName}
            onChange={(e) => onChange({ locationName: e.target.value })}
            maxLength={160}
            error={errors.locationName}
            placeholder="e.g. Blue Tokai Coffee, NMIMS Library"
            hint="Public venues only — cafés, libraries, campuses, coworking spaces."
          />
          <Input
            label="Address"
            value={draft.locationAddress}
            onChange={(e) => onChange({ locationAddress: e.target.value })}
            maxLength={240}
            placeholder="Street address or area"
            hint="Optional, but it saves people a search."
          />
        </>
      )}
    </div>
  )
}

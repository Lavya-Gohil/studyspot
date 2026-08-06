import { Clipboard, Code2, Coffee, MessagesSquare, Timer, VolumeX } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { SessionVibe } from '@studyspot/types'
import { Icon } from '@/components/ui/Icon'

const VIBES: { value: SessionVibe; label: string; icon: LucideIcon }[] = [
  { value: 'silent', label: 'Silent study', icon: VolumeX },
  { value: 'pomodoro', label: 'Pomodoro', icon: Timer },
  { value: 'discussion', label: 'Group discussion', icon: MessagesSquare },
  { value: 'coding', label: 'Coding session', icon: Code2 },
  { value: 'exam_prep', label: 'Exam prep', icon: Clipboard },
  { value: 'casual', label: 'Casual study', icon: Coffee },
]

export function VibeSelector({
  value,
  onChange,
}: {
  value: SessionVibe | null
  onChange: (v: SessionVibe) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {VIBES.map((v) => {
        const selected = value === v.value
        return (
          <button
            key={v.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(v.value)}
            className={`flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm font-medium transition-all ${
              selected
                ? 'border-brand-primary bg-brand-primary/10 text-text-primary'
                : 'border-border-default bg-transparent text-text-secondary hover:border-border-strong hover:text-text-primary'
            }`}
          >
            <Icon
              as={v.icon}
              size="sm"
              className={selected ? 'text-brand-text' : 'text-text-tertiary'}
            />
            {v.label}
          </button>
        )
      })}
    </div>
  )
}

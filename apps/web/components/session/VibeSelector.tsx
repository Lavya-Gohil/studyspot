import type { SessionVibe } from '@studyspot/types'

const VIBES: { value: SessionVibe; label: string; icon: string }[] = [
  { value: 'silent', label: 'Silent Study', icon: '🔇' },
  { value: 'pomodoro', label: 'Pomodoro', icon: '⏱' },
  { value: 'discussion', label: 'Group Discussion', icon: '💬' },
  { value: 'coding', label: 'Coding Session', icon: '💻' },
  { value: 'exam_prep', label: 'Exam Prep', icon: '📝' },
  { value: 'casual', label: 'Casual Study', icon: '☕' },
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
      {VIBES.map((v) => (
        <button
          key={v.value}
          type="button"
          onClick={() => onChange(v.value)}
          className={`flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition-all ${
            value === v.value
              ? 'bg-accent-primary/15 border-accent-primary text-accent-primary scale-[1.02]'
              : 'bg-transparent border-border-default text-text-secondary hover:border-border-strong'
          }`}
        >
          <span>{v.icon}</span>
          {v.label}
        </button>
      ))}
    </div>
  )
}

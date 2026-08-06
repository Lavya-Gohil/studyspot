'use client'

import { useMemo, useState } from 'react'
import { SUBJECT_CATEGORIES } from '@studyspot/types'
import { Input } from '@/components/ui/Input'

const ALL_SUBJECTS = SUBJECT_CATEGORIES.flatMap((c) => c.subjects)

function Chip({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string
  selected: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        selected
          ? 'border border-accent-primary/50 bg-accent-primary/20 text-accent-primary'
          : 'border border-border-subtle bg-bg-subtle text-text-secondary hover:border-border-default'
      }`}
    >
      {label}
    </button>
  )
}

/**
 * Subject multi-select: search narrows the list, otherwise the full catalogue
 * browses by category. The cap is enforced here rather than only at submit —
 * profileUpdateSchema rejects a 13th subject with a message that gave no hint
 * which of the chips was the problem.
 */
export function SubjectPicker({
  selected,
  onChange,
  max,
  disabled,
}: {
  selected: string[]
  onChange: (subjects: string[]) => void
  max: number
  disabled?: boolean
}) {
  const [search, setSearch] = useState('')

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    return ALL_SUBJECTS.filter((s) => s.toLowerCase().includes(q))
  }, [search])

  const atCap = selected.length >= max

  function toggle(subject: string) {
    onChange(
      selected.includes(subject)
        ? selected.filter((s) => s !== subject)
        : [...selected, subject]
    )
  }

  return (
    <div className="space-y-2">
      <Input
        label="Subjects / Interests"
        hint={
          atCap
            ? `That's the maximum — remove one to swap it out.`
            : `Pick up to ${max}. ${selected.length} selected.`
        }
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search subjects…"
        disabled={disabled}
      />

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selected.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1.5 rounded-full border border-accent-primary/30 bg-accent-primary/15 px-3 py-1 text-xs font-medium text-accent-primary"
            >
              {s}
              <button
                type="button"
                onClick={() => toggle(s)}
                disabled={disabled}
                aria-label={`Remove ${s}`}
                className="opacity-60 transition-opacity hover:opacity-100"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {search ? (
        matches.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {matches.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={selected.includes(s)}
                disabled={disabled || (atCap && !selected.includes(s))}
                onClick={() => toggle(s)}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-tertiary">
            No subjects match “{search.trim()}”.
          </p>
        )
      ) : (
        <div className="space-y-2">
          {SUBJECT_CATEGORIES.map((cat) => (
            <div key={cat.category}>
              <p className="mb-1.5 text-xs text-text-tertiary">{cat.category}</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.subjects.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    selected={selected.includes(s)}
                    disabled={disabled || (atCap && !selected.includes(s))}
                    onClick={() => toggle(s)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

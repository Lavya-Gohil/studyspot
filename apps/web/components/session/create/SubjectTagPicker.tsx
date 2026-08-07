'use client'

import { SUBJECT_CATEGORIES } from '@studyspot/types'
import { Select } from '@/components/ui/Select'

/** Mirrors the cap in createSessionSchema.subject_tags. */
const MAX_TAGS = 12

/**
 * Tags drive matching and feed filtering, but nothing in the form ever set
 * them; `subject_tags` was posted as an empty array on every session. This is
 * the missing control: a grouped picker over SUBJECT_CATEGORIES, so the values
 * stored stay a closed vocabulary rather than free text.
 */
export function SubjectTagPicker({
  value,
  onChange,
}: {
  value: string[]
  onChange: (next: string[]) => void
}) {
  const full = value.length >= MAX_TAGS

  return (
    <div>
      <Select
        label="Topic tags"
        value=""
        disabled={full}
        placeholder={full ? `Maximum ${MAX_TAGS} tags` : 'Add a tag…'}
        hint="Optional. Helps the right people find this session."
        onChange={(e) => {
          const tag = e.target.value
          if (tag && !value.includes(tag)) onChange([...value, tag])
        }}
      >
        {SUBJECT_CATEGORIES.map((c) => (
          <optgroup key={c.category} label={c.category}>
            {c.subjects.map((s) => (
              <option key={s} value={s} disabled={value.includes(s)}>
                {s}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>

      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                aria-label={`Remove ${tag}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent-primary/30 bg-accent-primary/15 px-2.5 py-0.5 text-xs font-medium text-accent-primary transition-colors hover:bg-accent-primary/25"
              >
                {tag}
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

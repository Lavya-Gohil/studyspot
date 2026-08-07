'use client'

import { useEffect, useRef, useState } from 'react'
import { AVATAR_MAX_BYTES, AVATAR_TYPES } from '@/lib/validation'

/**
 * Photo picker with a live preview. The preview URL is created in an effect
 * and revoked on cleanup; building it inline during render (as this screen
 * used to) mints a fresh blob on every keystroke elsewhere in the form and
 * never frees any of them.
 */
export function AvatarPicker({
  file,
  onChange,
  disabled,
}: {
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null
    // Clearing the input means re-picking the same file still fires a change;
    // otherwise a rejected photo can't be retried without choosing another one.
    e.target.value = ''
    // Type + size checked before upload (5MB JPEG/PNG only): the storage
    // bucket rejects the rest, but not until after the round trip.
    if (picked && (!AVATAR_TYPES.includes(picked.type) || picked.size > AVATAR_MAX_BYTES)) {
      setError('Photo must be a JPEG or PNG under 5MB.')
      return
    }
    setError('')
    onChange(picked)
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-default bg-bg-elevated">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob: URL, nothing for next/image to optimise
            <img src={previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-text-tertiary">Photo</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="text-sm text-accent-primary transition-opacity hover:underline disabled:opacity-50"
          >
            {file ? 'Change photo' : 'Upload photo'}
          </button>
          {file ? (
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              className="text-sm text-text-tertiary transition-colors hover:text-text-secondary disabled:opacity-50"
            >
              Remove
            </button>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_TYPES.join(',')}
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-accent-red">
          {error}
        </p>
      ) : null}
    </div>
  )
}

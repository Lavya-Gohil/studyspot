'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { friendlyDbError } from '@/lib/db-errors'

// Mirrors ALLOWED_TYPES / MAX_FILE_SIZE in supabase/functions/verify-upload-url.
// The `accept` attribute is a filter, not a check — a drag-drop or a renamed
// file walks straight past it, and the edge function's rejection reads as a
// machine code, so the limits are restated here to fail early and legibly.
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_BYTES = 10 * 1024 * 1024

/** The edge function returns machine codes; none of them are user-facing copy. */
function uploadErrorMessage(code: unknown): string {
  switch (code) {
    case 'invalid_file_type':
      return 'That file type isn’t supported — use a JPG, PNG, or PDF.'
    case 'file_too_large':
    case 'invalid_file_size':
      return 'That file is too large. Keep it under 10MB.'
    case 'rate_limited':
      return 'Too many upload attempts — wait a few minutes and try again.'
    case 'unauthorized':
      return 'Your session expired. Log in again to upload.'
    default:
      return 'We couldn’t upload that. Please try again.'
  }
}

export function VerifyForm() {
  const router = useRouter()
  const toast = useToast()
  const [supabase] = useState(() => createClient())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [skipping, setSkipping] = useState(false)

  const busy = uploading || skipping

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    // Clearing the input means re-picking the same file still fires a change —
    // otherwise a rejected file can't be retried without choosing another one.
    e.target.value = ''
    if (!f) return
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setFileError('Use a JPG, PNG, or PDF.')
      return
    }
    if (f.size > MAX_BYTES) {
      setFileError('File must be under 10MB.')
      return
    }
    setFileError('')
    setFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setFileError('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-upload-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ fileType: file.type, fileSize: file.size }),
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(uploadErrorMessage(body.error))
      }

      const { uploadUrl } = await res.json()
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      // The signed URL can still reject the body (expiry, size). Advancing the
      // step on an unchecked PUT left reviewers with an empty document to open.
      if (!put.ok) throw new Error('The upload didn’t complete. Please try again.')

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ onboarding_step: 4 }).eq('id', user.id)
      }

      router.push('/auth/onboarding/profile')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
      setUploading(false)
    }
  }

  async function handleSkip() {
    setSkipping(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({ verification_status: 'unverified', onboarding_step: 4 })
      .eq('id', user.id)

    // Navigating on a failed write sent the user to the profile step with
    // onboarding_step still at 3, so the middleware bounced them right back
    // here with no explanation. Stay put and say what happened instead.
    if (error) {
      toast.error(friendlyDbError(error.message))
      setSkipping(false)
      return
    }

    router.push('/auth/onboarding/profile')
  }

  return (
    <div className="space-y-6">
      {!file ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="flex min-h-[140px] w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border-default bg-accent-primary/[0.02] px-6 py-10 transition-colors hover:border-border-strong hover:bg-accent-primary/[0.06] disabled:opacity-50"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-text-tertiary"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className="text-center">
            <span className="block text-sm text-text-secondary">
              Tap to upload college ID, timetable, or fee receipt
            </span>
            <span className="mt-1 block text-xs text-text-tertiary">JPG · PNG · PDF · Max 10MB</span>
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border-2 border-dashed border-accent-primary bg-accent-primary/5 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-accent-primary/15">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-accent-primary"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
            <p className="text-xs text-text-tertiary">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            disabled={busy}
            aria-label={`Remove ${file.name}`}
            className="shrink-0 rounded p-1 text-text-tertiary transition-colors hover:text-text-secondary disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />

      {fileError ? (
        <p role="alert" className="text-xs text-accent-red">
          {fileError}
        </p>
      ) : null}

      <div className="space-y-3">
        {file ? (
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={handleUpload}
            disabled={skipping}
            loading={uploading}
          >
            {uploading ? 'Uploading' : 'Upload & Continue'}
          </Button>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={uploading}
            loading={skipping}
            className="underline underline-offset-2"
          >
            {skipping ? 'Skipping' : 'Skip for now →'}
          </Button>
        </div>
      </div>
    </div>
  )
}

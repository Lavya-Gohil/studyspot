'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OnboardingProgress } from '@/components/ui/OnboardingProgress'

export default function VerifyPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [error, setError] = useState('')

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB.')
      return
    }
    setError('')
    setFile(f)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ fileType: file.type, fileSize: file.size }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Upload failed')
      }

      const { uploadUrl } = await res.json()
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ onboarding_step: 4 }).eq('id', user.id)
      }

      router.push('/auth/onboarding/profile')
    } catch (err: any) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSkip() {
    setSkipping(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ verification_status: 'unverified', onboarding_step: 4 })
        .eq('id', user.id)
    }
    router.push('/auth/onboarding/profile')
  }

  return (
    <div className="space-y-6">
      <OnboardingProgress currentStep={3} />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-text-primary">Verify your student status</h1>
        <p className="text-text-secondary text-sm">
          Upload your college ID, timetable, or fee receipt to get a{' '}
          <span className="text-accent-green font-medium">✓ Verified Student</span> badge.
          Verified users get more approved requests. You can skip this and do it later.
        </p>
      </div>

      {/* Upload area */}
      <div
        onClick={() => !file && fileInputRef.current?.click()}
        className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
          file
            ? 'border-accent-primary bg-accent-primary/5'
            : 'border-border-default bg-accent-primary/[0.02] hover:bg-accent-primary/[0.06] hover:border-border-strong'
        }`}
        style={{ minHeight: 140 }}
      >
        {!file ? (
          <div className="flex flex-col items-center justify-center h-full py-10 px-6 gap-3">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-text-tertiary"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <div className="text-center">
              <p className="text-text-secondary text-sm">
                Tap to upload college ID, timetable, or fee receipt
              </p>
              <p className="text-text-tertiary text-xs mt-1">JPG · PNG · PDF · Max 10MB</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4">
            <div className="w-12 h-12 rounded-md bg-accent-primary/15 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-primary">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-medium truncate">{file.name}</p>
              <p className="text-text-tertiary text-xs">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
              className="text-text-tertiary hover:text-text-secondary p-1"
            >
              ✕
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && <p className="text-accent-red text-sm">{error}</p>}

      <div className="space-y-3">
        {file && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="w-full h-11 rounded-md bg-accent-primary hover:bg-accent-hover text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload & Continue'}
          </button>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSkip}
            disabled={skipping}
            className="text-text-secondary hover:text-text-primary text-sm underline underline-offset-2"
          >
            {skipping ? 'Skipping...' : 'Skip for now →'}
          </button>
        </div>
      </div>
    </div>
  )
}

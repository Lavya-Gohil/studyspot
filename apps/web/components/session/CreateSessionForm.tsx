'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { VibeSelector } from './VibeSelector'
import type { SessionVibe, SessionMode } from '@studyspot/types'
import { SUBJECT_CATEGORIES } from '@studyspot/types'

export function CreateSessionForm() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [mode, setMode] = useState<SessionMode>('in_person')
  const [locationName, setLocationName] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [vibe, setVibe] = useState<SessionVibe | null>(null)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [spotsTotal, setSpotsTotal] = useState(2)
  const [subjectTags, setSubjectTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const allSubjects = SUBJECT_CATEGORIES.flatMap((c) => c.subjects)

  const minDate = new Date().toISOString().split('T')[0]
  const maxDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

  const step1Valid = mode === 'online' || locationName.trim().length >= 2
  const step2Valid = subject.trim().length >= 2 && vibe && date && startTime && endTime

  async function handleSubmit() {
    if (!step2Valid) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('country, state_region')
      .eq('id', user.id)
      .single()

    const startDt = new Date(`${date}T${startTime}`)
    const endDt = new Date(`${date}T${endTime}`)

    if (endDt <= startDt) {
      setError('End time must be after start time.')
      setLoading(false)
      return
    }
    if ((endDt.getTime() - startDt.getTime()) > 8 * 3600000) {
      setError('Sessions cannot be longer than 8 hours.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        host_id: user.id,
        subject: subject.trim(),
        subject_tags: subjectTags,
        description: description.trim() || null,
        vibe,
        mode,
        location_name:
          mode === 'online' ? (locationName.trim() || null) : locationName.trim(),
        location_address: mode === 'online' ? null : locationAddress.trim() || null,
        location_country: profile?.country || null,
        location_state: profile?.state_region || null,
        start_time: startDt.toISOString(),
        end_time: endDt.toISOString(),
        spots_total: spotsTotal,
      })
      .select()
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(`/sessions/${data.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex gap-1">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-accent-primary' : 'bg-bg-subtle'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">How are you studying?</h2>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode('in_person')}
              className={`rounded-lg border p-4 text-left transition-colors ${
                mode === 'in_person'
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-border-default bg-bg-elevated hover:bg-bg-subtle'
              }`}
            >
              <div className="text-lg">📍</div>
              <div className="mt-1 text-sm font-semibold text-text-primary">In person</div>
              <div className="text-xs text-text-secondary">Meet at a café, library, or campus</div>
            </button>
            <button
              type="button"
              onClick={() => setMode('online')}
              className={`rounded-lg border p-4 text-left transition-colors ${
                mode === 'online'
                  ? 'border-accent-primary bg-accent-primary/10'
                  : 'border-border-default bg-bg-elevated hover:bg-bg-subtle'
              }`}
            >
              <div className="text-lg">💻</div>
              <div className="mt-1 text-sm font-semibold text-text-primary">Online room</div>
              <div className="text-xs text-text-secondary">Live virtual classroom with avatars</div>
            </button>
          </div>

          {mode === 'in_person' ? (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Venue name <span className="text-accent-red">*</span>
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Blue Tokai Coffee, NMIMS Library"
                  className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Address (optional)
                </label>
                <input
                  type="text"
                  value={locationAddress}
                  onChange={(e) => setLocationAddress(e.target.value)}
                  placeholder="Street address or area"
                  className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
                />
              </div>

              <p className="text-text-tertiary text-xs">
                Only use public venues — cafés, libraries, campuses, coworking spaces.
              </p>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Room name (optional)
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Late-night JEE grind"
                  className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
                />
              </div>

              <p className="text-text-tertiary text-xs">
                Members join a live virtual classroom — everyone gets an avatar seat, a shared
                chat, and a group focus timer. No physical location needed.
              </p>
            </>
          )}

          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!step1Valid}
            className="w-full h-11 rounded-md bg-accent-primary hover:bg-accent-hover text-white font-medium text-sm transition-colors disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Session details</h2>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Subject / Topic <span className="text-accent-red">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Physics – Thermodynamics"
              className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Date</label>
              <input
                type="date"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-11 px-3 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-11 px-3 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Extra spots (not counting you) <span className="text-accent-red">*</span>
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSpotsTotal(Math.max(1, spotsTotal - 1))}
                className="w-10 h-10 rounded-md bg-bg-elevated border border-border-default text-text-primary flex items-center justify-center hover:bg-bg-subtle"
              >
                −
              </button>
              <span className="text-xl font-semibold text-text-primary w-8 text-center font-mono">
                {spotsTotal}
              </span>
              <button
                type="button"
                onClick={() => setSpotsTotal(Math.min(9, spotsTotal + 1))}
                className="w-10 h-10 rounded-md bg-bg-elevated border border-border-default text-text-primary flex items-center justify-center hover:bg-bg-subtle"
              >
                +
              </button>
              <span className="text-text-tertiary text-sm">
                Total group: {spotsTotal + 1} people
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Study vibe <span className="text-accent-red">*</span>
            </label>
            <VibeSelector value={vibe} onChange={setVibe} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              Optional note
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={280}
              placeholder="Anything you'd like people to know..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary resize-none"
            />
            <p className="text-text-tertiary text-xs text-right">{280 - description.length} chars</p>
          </div>

          {error && <p className="text-accent-red text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-11 px-4 rounded-md bg-bg-elevated border border-border-default text-text-secondary text-sm"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!step2Valid}
              className="flex-1 h-11 rounded-md bg-accent-primary hover:bg-accent-hover text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              Preview →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Looks good?</h2>

          <div className="bg-bg-surface border border-border-subtle rounded-lg p-4 space-y-2">
            <p className="font-semibold text-text-primary">{subject}</p>
            <p className="text-sm text-text-secondary">
              {mode === 'online'
                ? `💻 Online room${locationName.trim() ? ` · ${locationName.trim()}` : ''}`
                : `📍 ${locationName}`}
            </p>
            <p className="text-sm text-text-secondary">
              📅 {new Date(`${date}T${startTime}`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {startTime} – {endTime}
            </p>
            <p className="text-sm text-text-secondary">
              {vibe && <span className="capitalize">{vibe.replace('_', ' ')}</span>} · {spotsTotal} spots
            </p>
            {description && <p className="text-sm text-text-secondary italic">&quot;{description}&quot;</p>}
          </div>

          {error && <p className="text-accent-red text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="h-11 px-4 rounded-md bg-bg-elevated border border-border-default text-text-secondary text-sm"
            >
              ← Edit
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 h-11 rounded-md bg-accent-primary hover:bg-accent-hover text-white font-medium text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post session →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

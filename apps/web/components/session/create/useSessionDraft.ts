'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { friendlyDbError } from '@/lib/db-errors'
import { createSessionSchema, validate } from '@/lib/validation'
import type { SessionMode, SessionVibe } from '@studyspot/types'

export const CREATE_STEPS = ['Format', 'Details', 'Review'] as const
export type CreateStep = 1 | 2 | 3

export interface SessionDraft {
  mode: SessionMode
  locationName: string
  locationAddress: string
  subject: string
  subjectTags: string[]
  description: string
  vibe: SessionVibe | null
  date: string
  startTime: string
  endTime: string
  spotsTotal: number
}

/** Blank-able fields keyed by draft field, populated only once a step is submitted. */
type DraftErrors = Partial<Record<keyof SessionDraft, string>>

export const DESCRIPTION_MAX = 280
export const MAX_SPOTS = 9

/**
 * Everything the create-session flow knows: the draft, which step is showing,
 * what's wrong with it, and how it gets written.
 *
 * Split out of the form so the three step components stay presentational — they
 * take a draft and a setter and render controls, nothing else.
 */
export function useSessionDraft({
  initialMode,
  initialVibe,
}: {
  initialMode?: SessionMode
  initialVibe?: SessionVibe
}) {
  const router = useRouter()
  const supabase = createClient()
  const toast = useToast()

  const [step, setStep] = useState<CreateStep>(1)
  const [draft, setDraft] = useState<SessionDraft>({
    mode: initialMode ?? 'in_person',
    locationName: '',
    locationAddress: '',
    subject: '',
    subjectTags: [],
    description: '',
    vibe: initialVibe ?? null,
    date: '',
    startTime: '',
    endTime: '',
    spotsTotal: 2,
  })

  // Validation messages stay hidden until the user tries to move on — flagging
  // a field red before it has ever been filled in reads as an accusation.
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const update = useCallback((patch: Partial<SessionDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
    setFormError(null)
  }, [])

  const { minDate, maxDate } = useMemo(() => {
    const now = Date.now()
    return {
      minDate: new Date(now).toISOString().split('T')[0],
      // Two weeks out: far enough to plan around, near enough that the feed
      // isn't full of sessions nobody remembers signing up for.
      maxDate: new Date(now + 14 * 86400000).toISOString().split('T')[0],
    }
  }, [])

  const errors = useMemo<DraftErrors>(() => {
    const e: DraftErrors = {}
    if (draft.mode === 'in_person' && draft.locationName.trim().length < 2) {
      e.locationName = 'Name the venue so people know where to show up.'
    }
    if (step >= 2) {
      if (draft.subject.trim().length < 2) e.subject = 'What are you studying?'
      if (!draft.date) e.date = 'Pick a day.'
      if (!draft.startTime) e.startTime = 'Pick a start time.'
      if (!draft.endTime) e.endTime = 'Pick an end time.'
      if (!draft.vibe) e.vibe = 'Pick a vibe so people know what to expect.'
    }
    return e
  }, [draft, step])

  // Only the fields this step is responsible for gate it — and the first of
  // them is what Review reports, since Review shows none of these controls.
  const blocker = useMemo(() => {
    const relevant: (keyof SessionDraft)[] =
      step === 1 ? ['locationName'] : ['subject', 'date', 'startTime', 'endTime', 'vibe']
    return relevant.map((k) => errors[k]).find(Boolean) ?? null
  }, [errors, step])
  const stepValid = blocker === null

  /** Errors to actually render — empty until the step has been submitted once. */
  const visibleErrors = submitted ? errors : {}

  const goTo = useCallback((next: CreateStep) => {
    setStep(next)
    setSubmitted(false)
    setFormError(null)
  }, [])

  const back = useCallback(() => {
    goTo(step === 3 ? 2 : 1)
  }, [goTo, step])

  const next = useCallback(() => {
    setSubmitted(true)
    if (!stepValid) return
    goTo(step === 1 ? 2 : 3)
  }, [goTo, step, stepValid])

  async function submit() {
    if (submitting) return
    setSubmitted(true)
    if (blocker) {
      setFormError(blocker)
      return
    }

    setSubmitting(true)
    setFormError(null)

    // Surfacing a failure always re-arms the button; the success path
    // deliberately leaves it disabled, because router.push is async and a
    // second click in that window posts the session twice.
    const fail = (message: string) => {
      setFormError(message)
      setSubmitting(false)
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      router.push('/auth/login')
      return
    }

    // The country/state/city on a session are the host's, and the feed filters
    // on them — if this read fails the session would post outside everyone's
    // local feed, so it's fatal rather than a shrug.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('country, state_region, city')
      .eq('id', user.id)
      .single()

    if (profileError) {
      fail(friendlyDbError(profileError.message))
      return
    }

    // One validated payload, profile-derived location included — appending
    // those after the fact meant they reached Postgres unchecked.
    const v = validate(createSessionSchema, {
      subject: draft.subject,
      description: draft.description,
      vibe: draft.vibe,
      mode: draft.mode,
      location_name: draft.locationName,
      location_address: draft.mode === 'online' ? '' : draft.locationAddress,
      location_country: profile?.country ?? undefined,
      location_state: profile?.state_region ?? undefined,
      location_city: profile?.city ?? undefined,
      start_time: new Date(`${draft.date}T${draft.startTime}`),
      end_time: new Date(`${draft.date}T${draft.endTime}`),
      spots_total: draft.spotsTotal,
      subject_tags: draft.subjectTags,
    })
    if (!v.ok) {
      fail(v.error)
      return
    }

    const s = v.data
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        host_id: user.id,
        subject: s.subject,
        subject_tags: s.subject_tags ?? [],
        description: s.description ?? null,
        vibe: s.vibe,
        mode: s.mode,
        location_name: s.location_name ?? null,
        location_address: s.mode === 'online' ? null : s.location_address ?? null,
        location_country: s.location_country ?? null,
        location_state: s.location_state ?? null,
        location_city: s.location_city ?? null,
        start_time: s.start_time.toISOString(),
        end_time: s.end_time.toISOString(),
        spots_total: s.spots_total,
      })
      .select('id')
      .single()

    if (error || !data) {
      fail(friendlyDbError(error?.message))
      toast.error('Could not post your session.')
      return
    }

    toast.success('Session posted.')
    router.push(`/sessions/${data.id}`)
  }

  return {
    draft,
    update,
    step,
    next,
    back,
    stepValid,
    errors: visibleErrors,
    formError,
    submitting,
    submit,
    minDate,
    maxDate,
  }
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { YEAR_LABELS, type YearOfStudy } from '@studyspot/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { friendlyDbError } from '@/lib/db-errors'
import { profileUpdateSchema, validate } from '@/lib/validation'
import { AvatarPicker } from './AvatarPicker'
import { SubjectPicker } from './SubjectPicker'

/** Mirrors `subjects: z.array(...).max(12)` in profileUpdateSchema. */
const MAX_SUBJECTS = 12

const YEAR_OPTIONS = (Object.keys(YEAR_LABELS) as YearOfStudy[]).map((value) => ({
  value,
  label: YEAR_LABELS[value],
}))

type FieldErrors = { college?: string; course?: string }

export function ProfileForm() {
  const router = useRouter()
  const toast = useToast()
  const [supabase] = useState(() => createClient())

  const [college, setCollege] = useState('')
  const [course, setCourse] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState<YearOfStudy | ''>('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  function checkField(field: keyof FieldErrors, value: string) {
    const result = validate(profileUpdateSchema.shape[field], value)
    setErrors((prev) => ({ ...prev, [field]: result.ok ? undefined : result.error }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const v = validate(profileUpdateSchema, {
      college,
      course,
      subjects,
      ...(yearOfStudy ? { year_of_study: yearOfStudy } : {}),
    })
    if (!v.ok) {
      checkField('college', college)
      checkField('course', course)
      // Nothing above is a field the user typed into if both come back clean;
      // the subject cap is the only other rule, and it has no control to own.
      toast.error(v.error)
      return
    }
    setLoading(true)
    setErrors({})

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    let avatar_url: string | null = null
    if (avatarFile) {
      const ext = avatarFile.type === 'image/png' ? 'png' : 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })
      if (uploadError) {
        // A failed photo shouldn't cost them the rest of the form, but it used
        // to fail completely silently, they'd land on the feed with no avatar
        // and no idea why.
        toast.error('We couldn’t save your photo; add it later from Settings.')
      } else {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatar_url = data.publicUrl
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        college: v.data.college ?? null,
        course: v.data.course ?? null,
        year_of_study: yearOfStudy || null,
        subjects: v.data.subjects ?? [],
        ...(avatar_url ? { avatar_url } : {}),
        onboarding_step: 5,
      })
      .eq('id', user.id)

    if (error) {
      toast.error(friendlyDbError(error.message))
      setLoading(false)
      return
    }

    router.push('/feed')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AvatarPicker file={avatarFile} onChange={setAvatarFile} disabled={loading} />

      <Input
        label="College / University"
        value={college}
        onChange={(e) => {
          setCollege(e.target.value)
          if (errors.college) setErrors((prev) => ({ ...prev, college: undefined }))
        }}
        onBlur={(e) => e.target.value && checkField('college', e.target.value)}
        error={errors.college}
        placeholder="Your university name"
        autoComplete="organization"
        disabled={loading}
      />

      <Input
        label="Course / Major"
        value={course}
        onChange={(e) => {
          setCourse(e.target.value)
          if (errors.course) setErrors((prev) => ({ ...prev, course: undefined }))
        }}
        onBlur={(e) => e.target.value && checkField('course', e.target.value)}
        error={errors.course}
        placeholder="e.g. Computer Science"
        disabled={loading}
      />

      <Select
        label="Year of study"
        value={yearOfStudy}
        onChange={(e) => setYearOfStudy(e.target.value as YearOfStudy)}
        placeholder="Select year"
        options={YEAR_OPTIONS}
        disabled={loading}
      />

      <SubjectPicker
        selected={subjects}
        onChange={setSubjects}
        max={MAX_SUBJECTS}
        disabled={loading}
      />

      <Button type="submit" size="lg" className="w-full" loading={loading}>
        {loading ? 'Finishing setup' : 'Finish setup →'}
      </Button>
    </form>
  )
}

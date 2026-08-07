'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { friendlyDbError } from '@studyspot/utils/db-errors'
import { basicInfoSchema, validate } from '@studyspot/utils/validation'

type FieldErrors = { full_name?: string; age?: string }

export function BasicInfoForm() {
  const router = useRouter()
  const toast = useToast()
  const [supabase] = useState(() => createClient())

  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [loading, setLoading] = useState(false)

  const ageNum = parseInt(age, 10)
  const isValid = fullName.trim().length >= 2 && ageNum >= 16 && ageNum <= 100
  const isMinor = ageNum >= 16 && ageNum < 18

  /**
   * Validating a single field off the schema's shape keeps the messages
   * identical to the ones the whole-object parse produces on submit, the
   * alternative, hand-written copy per field, drifts from lib/validation.ts
   * the moment a limit changes.
   */
  function checkField(field: keyof FieldErrors, value: string) {
    const result = validate(basicInfoSchema.shape[field], value)
    setErrors((prev) => ({ ...prev, [field]: result.ok ? undefined : result.error }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Schema validation + sanitization (lib/validation.ts).
    const v = validate(basicInfoSchema, { full_name: fullName, age })
    if (!v.ok) {
      checkField('full_name', fullName)
      checkField('age', age)
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

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: v.data.full_name,
        age: v.data.age,
        is_minor: v.data.age < 18,
        onboarding_step: 2,
      })
      .eq('id', user.id)

    if (error) {
      toast.error(friendlyDbError(error.message))
      setLoading(false)
      return
    }

    router.push('/auth/onboarding/location')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Full name"
        required
        value={fullName}
        onChange={(e) => {
          setFullName(e.target.value)
          if (errors.full_name) setErrors((prev) => ({ ...prev, full_name: undefined }))
        }}
        onBlur={(e) => e.target.value && checkField('full_name', e.target.value)}
        error={errors.full_name}
        placeholder="Your full name"
        autoComplete="name"
        disabled={loading}
      />

      <div>
        <Input
          label="Age"
          required
          type="number"
          inputMode="numeric"
          min={16}
          max={100}
          value={age}
          onChange={(e) => {
            setAge(e.target.value)
            if (errors.age) setErrors((prev) => ({ ...prev, age: undefined }))
          }}
          onBlur={(e) => e.target.value && checkField('age', e.target.value)}
          error={errors.age}
          placeholder="Your age"
          disabled={loading}
        />
        {/* Consequence, not a validation failure, say it before they commit. */}
        {isMinor && !errors.age ? (
          <p className="mt-1.5 text-xs text-accent-amber">
            Your profile will show an &quot;Under 18&quot; label to session hosts.
          </p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={!isValid} loading={loading}>
        {loading ? 'Saving' : 'Continue →'}
      </Button>
    </form>
  )
}

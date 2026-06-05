'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OnboardingProgress } from '@/components/ui/OnboardingProgress'

export default function BasicInfoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ageNum = parseInt(age)
  const isValid = fullName.trim().length >= 2 && ageNum >= 16 && ageNum <= 100

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        age: ageNum,
        is_minor: ageNum < 18,
        onboarding_step: 2,
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/auth/onboarding/location')
  }

  return (
    <div className="space-y-6">
      <OnboardingProgress currentStep={1} />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-text-primary">Tell us about yourself</h1>
        <p className="text-text-secondary text-sm">Just a couple of things to get started.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Full name <span className="text-accent-red">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Age <span className="text-accent-red">*</span>
          </label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Your age"
            min={16}
            max={100}
            className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
          />
          {age && ageNum < 16 && (
            <p className="text-accent-red text-xs">You must be at least 16 to use StudySpot.</p>
          )}
          {age && ageNum >= 16 && ageNum < 18 && (
            <p className="text-accent-amber text-xs">
              Your profile will show an &quot;Under 18&quot; label to session hosts.
            </p>
          )}
        </div>

        {error && <p className="text-accent-red text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!isValid || loading}
          className="w-full h-11 rounded-md bg-accent-primary hover:bg-accent-hover text-accent-fg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Continue →'}
        </button>
      </form>
    </div>
  )
}

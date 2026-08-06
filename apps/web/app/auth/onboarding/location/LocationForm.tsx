'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/ui/Icon'
import { OnboardingProgress } from '@/components/ui/OnboardingProgress'
import { LocationFields } from '@/components/profile/LocationFields'
import { Button } from '@/components/ui/Button'
import { friendlyDbError } from '@/lib/db-errors'
import type { CountryOption } from '@/lib/geo-data'

export function LocationForm({ countries }: { countries: CountryOption[] }) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const [countryCode, setCountryCode] = useState('')
  const [countryName, setCountryName] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [stateName, setStateName] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Pre-select from the browser locale so most users don't have to scroll a
  // 250-entry list. Runs once; the user can always change it.
  useEffect(() => {
    try {
      const region = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[1]
      if (!region) return
      const found = countries.find((c) => c.code === region)
      if (found) {
        setCountryCode(found.code)
        setCountryName(found.name)
      }
    } catch {
      // Locale detection is best-effort; the picker still works without it.
    }
  }, [countries])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!countryCode) return
    setLoading(true)
    setError('')

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        country: countryCode,
        country_name: countryName,
        state_region: stateName || stateCode || null,
        city: city.trim() || null,
        onboarding_step: 3,
      })
      .eq('id', user.id)

    if (updateError) {
      setError(friendlyDbError(updateError.message))
      setLoading(false)
      return
    }

    router.push('/auth/onboarding/verify')
  }

  return (
    <div className="space-y-6">
      <OnboardingProgress currentStep={2} />

      <div className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-text-primary">
          Where are you based?
        </h1>
        <p className="text-sm text-text-secondary">
          This helps us show you nearby study sessions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <LocationFields
          countries={countries}
          countryCode={countryCode}
          stateCode={stateCode}
          city={city}
          disabled={loading}
          onCountryChange={(code, name) => {
            setCountryCode(code)
            setCountryName(name)
          }}
          onStateChange={(code, name) => {
            setStateCode(code)
            setStateName(name)
          }}
          onCityChange={setCity}
        />

        <p className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <Icon as={MapPin} size="xs" className="h-3 w-3 shrink-0" />
          Your exact location is never shared publicly.
        </p>

        {error ? (
          <p role="alert" className="text-sm text-accent-red">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={!countryCode} loading={loading}>
          {loading ? 'Saving' : 'Continue →'}
        </Button>
      </form>
    </div>
  )
}

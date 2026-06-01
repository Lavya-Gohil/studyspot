'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Country, State } from 'country-state-city'
import { createClient } from '@/lib/supabase/client'
import { OnboardingProgress } from '@/components/ui/OnboardingProgress'

export default function LocationPage() {
  const router = useRouter()
  const supabase = createClient()

  const [countryCode, setCountryCode] = useState('')
  const [countryName, setCountryName] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const allCountries = Country.getAllCountries()
  const states = countryCode ? State.getStatesOfCountry(countryCode) : []

  useEffect(() => {
    // Try to detect user's locale for default country
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale
      const region = locale.split('-')[1]
      if (region) {
        const found = allCountries.find((c) => c.isoCode === region)
        if (found) {
          setCountryCode(found.isoCode)
          setCountryName(found.name)
        }
      }
    } catch {}
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!countryCode) return
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const selectedState = states.find((s) => s.isoCode === stateCode)

    const { error } = await supabase
      .from('profiles')
      .update({
        country: countryCode,
        country_name: countryName,
        state_region: selectedState?.name || stateCode || null,
        city: city.trim() || null,
        onboarding_step: 3,
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/auth/onboarding/verify')
  }

  return (
    <div className="space-y-6">
      <OnboardingProgress currentStep={2} />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-text-primary">Where are you based?</h1>
        <p className="text-text-secondary text-sm">
          This helps us show you nearby study sessions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Country <span className="text-accent-red">*</span>
          </label>
          <select
            value={countryCode}
            onChange={(e) => {
              const code = e.target.value
              const name = allCountries.find((c) => c.isoCode === code)?.name || ''
              setCountryCode(code)
              setCountryName(name)
              setStateCode('')
            }}
            className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent-primary appearance-none"
          >
            <option value="">Select your country</option>
            {allCountries.map((c) => (
              <option key={c.isoCode} value={c.isoCode}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>

        {states.length > 0 && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              State / Region
            </label>
            <select
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent-primary appearance-none"
            >
              <option value="">Select your state / region</option>
              {states.map((s) => (
                <option key={s.isoCode} value={s.isoCode}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            City (optional)
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Your city"
            className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
          />
        </div>

        <p className="text-text-tertiary text-xs flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          Your exact location is never shared publicly.
        </p>

        {error && <p className="text-accent-red text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!countryCode || loading}
          className="w-full h-11 rounded-md bg-accent-primary hover:bg-accent-hover text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Continue →'}
        </button>
      </form>
    </div>
  )
}

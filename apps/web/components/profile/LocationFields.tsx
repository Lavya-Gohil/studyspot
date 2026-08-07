'use client'

import { useEffect, useRef, useState } from 'react'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import type { CountryOption, StateOption } from '@/lib/geo-data'

/**
 * Country / state / city picker, shared by onboarding and profile settings:
 * the two screens previously carried identical copies of this markup.
 *
 * Countries arrive as props from the server. States are fetched per-country
 * from /api/geo/states so the 554KB state.json stays off the client; see
 * lib/geo-data.ts for why that matters.
 */
export function LocationFields({
  countries,
  countryCode,
  stateCode,
  stateName,
  city,
  onCountryChange,
  onStateChange,
  onCityChange,
  disabled,
}: {
  countries: CountryOption[]
  countryCode: string
  stateCode: string
  /**
   * Existing saved region. profiles.state_region stores the display name, not
   * the code, so an already-populated profile has a name and no code, this
   * lets the select resolve one back to the other and pre-select correctly.
   */
  stateName?: string
  city: string
  /** Receives both code and display name, callers persist the name too. */
  onCountryChange: (code: string, name: string) => void
  onStateChange: (code: string, name: string) => void
  onCityChange: (city: string) => void
  disabled?: boolean
}) {
  const [states, setStates] = useState<StateOption[]>([])
  const [loadingStates, setLoadingStates] = useState(false)

  // Read inside the fetch effect but deliberately not dependencies of it;
  // including them would refetch the region list on every keystroke, so the
  // latest values are mirrored into a ref instead.
  const resolveRef = useRef({ stateCode, stateName, onStateChange })
  resolveRef.current = { stateCode, stateName, onStateChange }

  useEffect(() => {
    if (!countryCode) {
      setStates([])
      return
    }

    // A fast country change can outrun a slow response; ignore stale replies.
    let active = true
    setLoadingStates(true)

    fetch(`/api/geo/states?country=${encodeURIComponent(countryCode)}`)
      .then((res) => (res.ok ? res.json() : { states: [] }))
      .then((data: { states?: StateOption[] }) => {
        if (!active) return
        const next = data.states ?? []
        setStates(next)

        // Recover the code for a region we only know by name (saved profile).
        const { stateCode: code, stateName: name, onStateChange: notify } = resolveRef.current
        if (!code && name) {
          const match = next.find((s) => s.name === name)
          if (match) notify(match.code, match.name)
        }
      })
      // A missing region list shouldn't block the form; country and city are
      // enough to save a profile.
      .catch(() => {
        if (active) setStates([])
      })
      .finally(() => {
        if (active) setLoadingStates(false)
      })

    return () => {
      active = false
    }
  }, [countryCode])

  return (
    <>
      <Select
        label="Country"
        required
        disabled={disabled}
        value={countryCode}
        placeholder="Select your country"
        onChange={(e) => {
          const code = e.target.value
          onCountryChange(code, countries.find((c) => c.code === code)?.name ?? '')
          onStateChange('', '')
        }}
        options={countries.map((c) => ({ value: c.code, label: `${c.flag} ${c.name}` }))}
      />

      {loadingStates || states.length > 0 ? (
        <Select
          label="State / Region"
          disabled={disabled || loadingStates}
          value={stateCode}
          placeholder={loadingStates ? 'Loading…' : 'Select your state / region'}
          onChange={(e) => {
            const code = e.target.value
            onStateChange(code, states.find((s) => s.code === code)?.name ?? '')
          }}
          options={states.map((s) => ({ value: s.code, label: s.name }))}
        />
      ) : null}

      <Input
        label="City"
        hint="Optional"
        disabled={disabled}
        value={city}
        onChange={(e) => onCityChange(e.target.value)}
        placeholder="Your city"
      />
    </>
  )
}

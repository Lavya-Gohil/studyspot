import { Country, State } from 'country-state-city'

/**
 * Server-side access to the country/state dataset.
 *
 * IMPORTANT: import this only from server components and route handlers.
 * `country-state-city` unpacks to 16.7MB; country.json is 95KB and
 * state.json 554KB, and importing it from a `'use client'` module ships all
 * of that to the browser. It was doing exactly that on two screens, which is
 * why /profile/settings was 317kB and /auth/onboarding/location 282kB, against
 * ~100kB for comparable routes.
 *
 * Nothing needs the full records. The trimmed shapes below are what the UI
 * actually renders, and they're two orders of magnitude smaller.
 */

export interface CountryOption {
  code: string
  name: string
  flag: string
}

export interface StateOption {
  code: string
  name: string
}

/** ~250 entries, roughly 8KB as JSON, safe to send with the page. */
export function listCountries(): CountryOption[] {
  return Country.getAllCountries().map((c) => ({
    code: c.isoCode,
    name: c.name,
    flag: c.flag,
  }))
}

/** Fetched on demand once a country is chosen, see app/api/geo/states. */
export function listStates(countryCode: string): StateOption[] {
  return State.getStatesOfCountry(countryCode).map((s) => ({
    code: s.isoCode,
    name: s.name,
  }))
}

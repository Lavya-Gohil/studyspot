/**
 * Safety helpers for PostgREST filter strings.
 *
 * Most supabase-js builder methods (`.eq`, `.in`, `.gt`) send their arguments
 * as *data*; those are safe with any value. `.or()` and `.and()` are the
 * exception: they take a raw filter **expression**, and PostgREST parses the
 * whole string as syntax. Interpolating user-controlled text into one lets the
 * caller restructure the filter tree, because `,` separates conditions and
 * `(` / `)` group them:
 *
 *   .or(`mode.eq.online,location_country.eq.${country}`)
 *
 * with `country = "XX,status.eq.cancelled"` becomes three OR'd conditions
 * instead of two. RLS still applies, so this is a scoping bypass rather than a
 * data breach, but the filter no longer means what it reads as.
 *
 * The rule: never interpolate into `.or()`. Validate against a strict pattern
 * first and drop the clause if it doesn't match.
 */

/** ISO 3166-1 alpha-2, the only shape `profiles.country` should ever hold. */
const COUNTRY_CODE = /^[A-Z]{2}$/

export function isCountryCode(value: unknown): value is string {
  return typeof value === 'string' && COUNTRY_CODE.test(value)
}

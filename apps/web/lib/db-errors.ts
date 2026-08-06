/**
 * Postgres/Supabase error → user-readable message.
 *
 * Deliberately kept in its own module with **no imports**. It used to live in
 * lib/validation.ts, but that file imports zod at module scope — so any client
 * component that only wanted this one function pulled the whole zod runtime
 * into its bundle (~60kB on the feed route alone). Error formatting is needed
 * far more widely than schema validation, so it gets its own home.
 *
 * Keep this file dependency-free.
 */
export function friendlyDbError(message: string | undefined | null): string {
  if (!message) return 'Something went wrong. Please try again.'
  // The rate-limit triggers in 006_security_hardening.sql raise this — surface
  // it gracefully instead of dumping a database error at the user.
  if (message.includes('rate_limit_exceeded')) {
    return "You're doing that too fast — take a short break and try again."
  }
  if (message.includes('duplicate key')) return 'That already exists.'
  if (message.includes('violates check constraint')) return 'One of the fields is invalid.'
  return message
}

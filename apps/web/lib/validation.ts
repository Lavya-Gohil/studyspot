/**
 * Central input validation & sanitization (OWASP C5: Validate All Inputs).
 *
 * Every user-supplied value that leaves the browser goes through one of these
 * zod schemas first. Rules of the file:
 *  - Schemas are .strict(): unexpected fields are rejected, not silently dropped.
 *  - String fields are trimmed, control characters stripped, and length-capped.
 *  - Length limits MIRROR the Postgres CHECK constraints (001/005/006 migrations)
 *    so the client and the database always agree.
 *
 * Client-side validation is UX + first line of defense only — the database
 * RLS policies, CHECK constraints, and rate-limit triggers (006) are the
 * authoritative enforcement layer, since the browser talks to Supabase directly.
 */
import { z } from 'zod'

/* ----------------------------- sanitizers ----------------------------- */

// Strip ASCII control chars (keep \n and \t) and zero-width/bidi-override
// characters that enable spoofing; collapse 3+ blank lines.
export function sanitizeText(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Reusable building block: sanitized, length-bounded text.
const text = (max: number, min = 1) =>
  z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().min(min, 'Too short.').max(max, `Keep it under ${max} characters.`))

const optionalText = (max: number) =>
  z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(max, `Keep it under ${max} characters.`))
    .optional()
    .or(z.literal('').transform(() => undefined))

export const uuidSchema = z.string().uuid('Invalid id.')

/* ------------------------------- auth --------------------------------- */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Enter your email.')
  .max(254, 'Email is too long.') // RFC 5321 upper bound
  .email('Enter a valid email address.')

// Min 8 chars per NIST 800-63B; cap at 72 (bcrypt input limit) to avoid
// silent truncation server-side.
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')

export const loginSchema = z.object({ email: emailSchema, password: passwordSchema }).strict()
export const signupSchema = loginSchema

/* ------------------------------ profile ------------------------------- */

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username needs at least 3 characters.')
  .max(30, 'Username must be at most 30 characters.')
  .regex(/^[a-z0-9_]+$/, 'Only letters, numbers and underscores.')

export const profileUpdateSchema = z
  .object({
    full_name: text(80, 2),
    username: usernameSchema,
    bio: optionalText(280), // mirrors profiles.bio CHECK (<= 280)
    college: optionalText(120),
    course: optionalText(120),
    year_of_study: z
      .enum(['high_school', 'year_1', 'year_2', 'year_3', 'year_4', 'masters', 'phd', 'other'])
      .optional(),
    subjects: z
      .array(text(40))
      .max(12, 'Pick at most 12 subjects.')
      .optional(),
    avatar_url: z.string().url().max(500).optional().or(z.literal('').transform(() => undefined)),
    country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Invalid country.').optional(),
    country_name: optionalText(80),
    state_region: optionalText(80),
    city: optionalText(80),
  })
  .partial()
  .strict()

/** Avatar uploads: small images only. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024
export const AVATAR_TYPES = ['image/jpeg', 'image/png']

export const basicInfoSchema = z
  .object({
    full_name: text(80, 2),
    age: z.coerce
      .number()
      .int('Age must be a whole number.')
      .min(16, 'You must be at least 16.') // mirrors profiles.age CHECK
      .max(100, 'Enter a valid age.'),
  })
  .strict()

/* ------------------------------ sessions ------------------------------ */

export const SESSION_VIBES = ['silent', 'pomodoro', 'discussion', 'coding', 'exam_prep', 'casual'] as const

export const createSessionSchema = z
  .object({
    subject: text(120, 2),
    description: optionalText(280), // mirrors sessions.description CHECK
    vibe: z.enum(SESSION_VIBES),
    mode: z.enum(['in_person', 'online']),
    location_name: optionalText(160),
    location_address: optionalText(240),
    start_time: z.coerce.date().refine(
      // Small grace window so "now" sessions aren't rejected by clock skew.
      (d) => d.getTime() > Date.now() - 5 * 60 * 1000,
      'Start time must be in the future.'
    ),
    end_time: z.coerce.date(),
    spots_total: z.coerce.number().int().min(1, 'At least 1 spot.').max(9, 'Max 9 spots.'),
    subject_tags: z.array(text(40)).max(12, 'Pick at most 12 tags.').optional(),
  })
  .strict()
  .refine((s) => s.end_time > s.start_time, {
    message: 'End time must be after the start time.',
    path: ['end_time'],
  })
  .refine((s) => s.end_time.getTime() - s.start_time.getTime() <= 8 * 60 * 60 * 1000, {
    message: 'Sessions can be at most 8 hours.',
    path: ['end_time'],
  })
  .refine((s) => s.mode === 'online' || (s.location_name && s.location_name.length > 0), {
    message: 'In-person sessions need a location.',
    path: ['location_name'],
  })

export const joinRequestSchema = z
  .object({ message: optionalText(140) }) // mirrors session_requests.message CHECK
  .strict()

export const ratingSchema = z
  .object({ ratee_id: uuidSchema, rating: z.coerce.number().int().min(1).max(5) })
  .strict()

/* ------------------------------ messages ------------------------------ */

export const messageSchema = z
  .object({ content: text(1000) }) // mirrors messages.content CHECK
  .strict()

/* ------------------------------- circles ------------------------------ */

export const createCircleSchema = z
  .object({
    name: text(60, 2), // mirrors circles.name CHECK (2..60)
    description: optionalText(280),
    topic: optionalText(40),
    emoji: optionalText(8),
    is_private: z.boolean(),
  })
  .strict()

export const joinCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, 'Codes are 6 letters/numbers.')

export const circlePostSchema = z
  .object({ content: text(1000) }) // mirrors circle_posts.content CHECK
  .strict()

/* -------------------------------- goals ------------------------------- */

export const createGoalSchema = z
  .object({
    title: text(120, 2), // mirrors goals.title CHECK (2..120)
    description: optionalText(280),
    type: z.enum(['hours', 'sessions', 'custom']),
    target: z.coerce.number().positive('Target must be above zero.').max(100000),
    unit: optionalText(20),
    deadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date.')
      .optional()
      .or(z.literal('').transform(() => undefined)),
    is_public: z.boolean().optional(),
  })
  .strict()

/* ------------------------------- reports ------------------------------ */

export const reportSchema = z
  .object({
    reported_id: uuidSchema,
    session_id: uuidSchema.optional(),
    reason: z.enum(['no_show', 'harassment', 'fake_profile', 'inappropriate', 'spam', 'other']),
    details: optionalText(280),
  })
  .strict()

/* ------------------------------ helper -------------------------------- */

/**
 * Re-exported for existing call sites. The implementation moved to
 * lib/db-errors.ts so components needing error formatting but not schema
 * validation don't pull zod into their bundle — client components should
 * import it from there directly.
 */
export { friendlyDbError } from './db-errors'

export type Validated<T> = { ok: true; data: T } | { ok: false; error: string }

// Uniform wrapper so forms can do: const v = validate(schema, raw); if (!v.ok) setError(v.error)
export function validate<S extends z.ZodTypeAny>(schema: S, raw: unknown): Validated<z.infer<S>> {
  const result = schema.safeParse(raw)
  if (result.success) return { ok: true, data: result.data }
  const first = result.error.issues[0]
  return { ok: false, error: first?.message ?? 'Invalid input.' }
}

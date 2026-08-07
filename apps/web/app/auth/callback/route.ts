import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Only allow same-site relative paths for the post-login redirect.
 * Without this, `?next=` is an open redirect (OWASP A01): values like
 * `//evil.com`, `/\evil.com` or `https://evil.com` would bounce a freshly
 * authenticated user to an attacker page that can mimic StudySpot.
 */
function safeNextPath(next: string | null): string {
  if (!next) return '/feed'
  if (!next.startsWith('/')) return '/feed' // absolute URLs, `@host`, etc.
  if (next.startsWith('//') || next.includes('\\')) return '/feed' // protocol-relative tricks
  return next
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  // PKCE codes are opaque but bounded, reject obviously bogus values early.
  if (code && code.length < 2048) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/auth/login`)
}

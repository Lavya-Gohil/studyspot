import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes accessible without authentication (marketing / landing / legal).
const PUBLIC_ROUTES = ['/', '/about', '/privacy', '/terms', '/safety', '/cookies']
const PUBLIC_PREFIXES = ['/blog']

function isPublicRoute(pathname: string) {
  return (
    PUBLIC_ROUTES.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  )
}

const ONBOARDING_ROUTES = [
  '/auth/onboarding/basic-info',
  '/auth/onboarding/location',
  '/auth/onboarding/verify',
  '/auth/onboarding/profile',
]

const STEP_TO_ROUTE: Record<number, string> = {
  0: '/auth/onboarding/basic-info',
  1: '/auth/onboarding/basic-info',
  2: '/auth/onboarding/location',
  3: '/auth/onboarding/verify',
  4: '/auth/onboarding/profile',
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Unauthenticated: redirect to login unless on a public or auth page
  if (!user && !pathname.startsWith('/auth') && !isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Authenticated: redirect away from login/signup
  if (user && (pathname === '/auth/login' || pathname === '/auth/signup')) {
    return NextResponse.redirect(new URL('/feed', request.url))
  }

  // Check onboarding progress (public marketing/legal pages stay reachable
  // mid-onboarding; users must be able to read Privacy/Terms at any time)
  if (user && !pathname.startsWith('/auth') && !pathname.startsWith('/admin') && !isPublicRoute(pathname)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_step, is_banned')
      .eq('id', user.id)
      .single()

    if (profile?.is_banned) {
      return NextResponse.redirect(new URL('/auth/banned', request.url))
    }

    if (profile && profile.onboarding_step < 5) {
      const redirectTo = STEP_TO_ROUTE[profile.onboarding_step] || '/auth/onboarding/basic-info'
      if (!ONBOARDING_ROUTES.includes(pathname)) {
        return NextResponse.redirect(new URL(redirectTo, request.url))
      }
    }
  }

  return supabaseResponse
}

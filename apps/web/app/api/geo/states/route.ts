import { NextResponse, type NextRequest } from 'next/server'
import { isCountryCode } from '@studyspot/api/filters'
import { listStates } from '@/lib/geo-data'

/**
 * States/regions for a country, resolved server-side.
 *
 * Exists so the 554KB state.json never reaches the browser. The client asks
 * for one country's states at the moment the user picks a country, and gets
 * back a few KB.
 *
 * The dataset is static and public, so responses are cached aggressively and
 * the route needs no auth.
 */
export function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('country')?.toUpperCase() ?? ''

  // Same ISO 3166-1 alpha-2 guard used on the query path (packages/api/filters).
  if (!isCountryCode(code)) {
    return NextResponse.json({ error: 'invalid_country' }, { status: 400 })
  }

  return NextResponse.json(
    { states: listStates(code) },
    {
      headers: {
        // Immutable for practical purposes — this data changes on the order of
        // years, and a stale region list is harmless.
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    }
  )
}

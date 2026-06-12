const isDev = process.env.NODE_ENV === 'development'

/**
 * Content-Security-Policy (OWASP A05 hardening).
 *  - script-src keeps 'unsafe-inline' for Next's hydration payload and the
 *    anti-FOUC theme script in app/layout.tsx; 'unsafe-eval' is dev-only (HMR).
 *  - connect-src allows Supabase REST + Realtime websockets.
 *  - style/font allow the Google Fonts @import in globals.css.
 *  - frame-ancestors 'none' blocks clickjacking (with X-Frame-Options below).
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? ' ws:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Only the geolocation API is used (session/location features) — everything
  // else is denied so injected scripts can't reach sensors.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace packages ship raw TS (no build step) — Next must transpile them.
  transpilePackages: ['@studyspot/types', '@studyspot/api', '@studyspot/utils'],
  poweredByHeader: false, // don't advertise the framework (OWASP: fingerprinting)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/ssr'],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

module.exports = nextConfig

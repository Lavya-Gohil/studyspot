/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace packages ship raw TS (no build step) — Next must transpile them.
  transpilePackages: ['@studyspot/types', '@studyspot/api', '@studyspot/utils'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/ssr'],
  },
}

module.exports = nextConfig

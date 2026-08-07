import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/Toast'
import './globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://web-livid-two-79.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'StudySpot. Find your study crew',
    template: '%s',
  },
  description: 'Create and join real-world study sessions at cafés, libraries, and campuses.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
  openGraph: {
    type: 'website',
    siteName: 'StudySpot',
    title: 'StudySpot. Find your study crew',
    description: 'Create and join real-world study sessions at cafés, libraries, and campuses.',
    url: '/',
  },
  twitter: {
    card: 'summary',
    title: 'StudySpot. Find your study crew',
    description: 'Create and join real-world study sessions at cafés, libraries, and campuses.',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#08080A' },
    { media: '(prefers-color-scheme: light)', color: '#FAFAFA' },
  ],
}

const themeScript = `
  try {
    var t = localStorage.getItem('theme');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-bg-base text-text-primary">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}

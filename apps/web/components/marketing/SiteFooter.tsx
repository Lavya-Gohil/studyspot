import Link from 'next/link'
import { CONTACT_EMAIL, INSTAGRAM_URL } from '@/lib/site'

const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'How it works', href: '/#how' },
      { label: 'Sign up', href: '/auth/signup' },
      { label: 'Log in', href: '/auth/login' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Safety', href: '/safety' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <span className="font-display text-lg font-bold tracking-tight">
              Study<span className="text-text-tertiary">Spot</span>
            </span>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-secondary">
              The place students find their crew, pick a vibe, and finally get focused — together.
            </p>
            <div className="mt-5 flex gap-2">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="StudySpot on Instagram"
                className="glass flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:text-text-primary"
              >
                <IconInstagram />
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                aria-label="Email StudySpot"
                className="glass flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:text-text-primary"
              >
                <IconMail />
              </a>
            </div>
          </div>
          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-text-tertiary">
                {col.title}
              </div>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-text-secondary transition-colors hover:text-text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border-subtle pt-6 text-xs text-text-tertiary sm:flex-row">
          <span>© {new Date().getFullYear()} StudySpot. Made for students.</span>
          <span>Free for students · Verified profiles · No spam</span>
        </div>
      </div>
    </footer>
  )
}

const IconInstagram = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </svg>
)

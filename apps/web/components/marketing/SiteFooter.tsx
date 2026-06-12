import Link from 'next/link'

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

/** Shared marketing footer. Social icons return once the accounts exist. */
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

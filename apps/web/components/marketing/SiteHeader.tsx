'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#how', label: 'How it works' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
]

/**
 * Floating glass pill nav shared by every public/marketing page.
 * Client component because the mobile menu needs toggle state.
 */
export function SiteHeader({ isAuthed }: { isAuthed: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close the mobile sheet whenever the route changes
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-4 sm:top-5">
      <nav className="glass-strong glass-sheen mx-auto flex h-14 max-w-3xl items-center justify-between rounded-full pl-5 pr-2">
        <Link href="/" className="font-display text-[17px] font-bold tracking-tight">
          Study<span className="text-text-tertiary">Spot</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {isAuthed ? (
            <Link href="/feed" className="btn-accent">
              Open app
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="hidden h-9 items-center rounded-full px-3 text-sm text-text-secondary transition-colors hover:text-text-primary sm:inline-flex"
              >
                Log in
              </Link>
              <Link href="/auth/signup" className="btn-accent">
                Sign up
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary md:hidden"
          >
            {open ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu sheet */}
      {open && (
        <div className="glass-strong glass-sheen mx-auto mt-2 max-w-3xl overflow-hidden rounded-3xl p-2 md:hidden">
          <div className="grid gap-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
              >
                {l.label}
              </Link>
            ))}
            {!isAuthed && (
              <Link
                href="/auth/login"
                onClick={() => setOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary sm:hidden"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

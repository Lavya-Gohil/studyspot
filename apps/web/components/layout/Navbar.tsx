'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Icon } from '@/components/ui/Icon'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const navLinks = [
    { href: '/feed', label: 'Feed' },
    { href: '/explore', label: 'Explore' },
    { href: '/match', label: 'Match' },
    { href: '/circles', label: 'Circles' },
    { href: '/goals', label: 'Goals' },
    { href: '/notifications', label: 'Alerts' },
    { href: '/profile/settings', label: 'Profile' },
  ]

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4">
      <nav className="glass-strong glass-sheen mx-auto flex h-14 max-w-6xl items-center rounded-full pl-5 pr-2">
        <Link href="/feed" className="mr-6 shrink-0 font-display text-[17px] font-bold tracking-tight">
          Study<span className="text-text-tertiary">Spot</span>
        </Link>

        <div className="hidden flex-1 items-center gap-0.5 md:flex">
          {navLinks.map((link) => {
            const active = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? 'bg-accent-primary/10 font-semibold text-accent-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Link
            href="/sessions/create"
            className="inline-flex h-9 items-center rounded-full bg-accent-primary px-4 text-sm font-semibold text-accent-fg transition-all hover:bg-accent-hover active:scale-[0.98]"
          >
            <span className="sm:hidden">+</span>
            <span className="hidden sm:inline">+ Create</span>
          </Link>
          <button
            onClick={handleLogout}
            className="hidden h-9 items-center rounded-full px-3 text-sm text-text-secondary transition-colors hover:text-text-primary md:inline-flex"
          >
            Sign out
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary md:hidden"
          >
            <Icon as={open ? X : Menu} size="md" />
          </button>
        </div>
      </nav>

      {/* Mobile menu sheet */}
      {open && (
        <div className="glass-strong glass-sheen mx-auto mt-2 max-w-6xl overflow-hidden rounded-3xl p-2 md:hidden">
          <div className="grid grid-cols-2 gap-1">
            {navLinks.map((link) => {
              const active = pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-2xl px-4 py-3 text-sm transition-colors ${
                    active
                      ? 'bg-accent-primary/10 font-semibold text-accent-primary'
                      : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 w-full rounded-2xl px-4 py-3 text-left text-sm text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
          >
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}

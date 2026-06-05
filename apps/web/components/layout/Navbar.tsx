'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()

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
            + Create
          </Link>
          <button
            onClick={handleLogout}
            className="hidden h-9 items-center rounded-full px-3 text-sm text-text-secondary transition-colors hover:text-text-primary sm:inline-flex"
          >
            Sign out
          </button>
        </div>
      </nav>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
    { href: '/notifications', label: 'Notifications' },
    { href: '/profile/settings', label: 'Profile' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-bg-base/80 backdrop-blur border-b border-border-subtle flex items-center px-4 md:px-8">
      <Link href="/feed" className="text-lg font-bold text-accent-primary mr-8 shrink-0">
        StudySpot
      </Link>

      <div className="hidden md:flex items-center gap-1 flex-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              pathname.startsWith(link.href)
                ? 'bg-accent-primary/10 text-accent-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-subtle'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/sessions/create"
          className="h-8 px-4 rounded-md bg-accent-primary hover:bg-accent-hover text-white text-sm font-medium transition-colors flex items-center"
        >
          + Create
        </Link>
        <button
          onClick={handleLogout}
          className="h-8 px-3 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-subtle text-sm transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}

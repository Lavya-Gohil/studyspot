'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  Compass,
  Flame,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Icon, LogoMark } from '@/components/ui/Icon'
import { Kbd } from '@/components/ui/Kbd'
import { openCommandPalette } from '@/components/ui/CommandPalette'

/**
 * The persistent shell.
 *
 * Previously seven flat links of equal weight, which meant nothing had
 * priority and the bar grew every time a route was added. Now: four primary
 * destinations inline, everything else behind an account menu, and the two
 * things that change on their own — unread notifications and your streak —
 * given permanent, glanceable positions.
 */

const PRIMARY: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/feed', label: 'Feed', icon: LayoutGrid },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/match', label: 'Match', icon: Sparkles },
  { href: '/circles', label: 'Circles', icon: Users },
]

const MENU: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/stats', label: 'Your stats', icon: TrendingUp },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/profile/settings', label: 'Settings', icon: Settings },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [streak, setStreak] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)
  // Resolved after mount, never during render: the server has no idea what
  // platform it is rendering for, and guessing produces a hydration mismatch
  // on exactly the users whose modifier key we got wrong.
  const [modKey, setModKey] = useState('Ctrl ')

  useEffect(() => {
    if (/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)) setModKey('⌘')
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
  }, [pathname])

  // Close the account menu on outside click or Escape. Both, because a menu
  // that only closes one way is a menu people get stuck in.
  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Unread count and streak, kept live. The notifications table was added to
  // the realtime publication in migration 010 — before that this subscription
  // would have opened successfully and never fired.
  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    ;(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const [{ count }, { data: profile }] = await Promise.all([
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
        supabase.from('profiles').select('study_streak').eq('id', user.id).single(),
      ])

      if (cancelled) return
      setUnread(count ?? 0)
      setStreak(profile?.study_streak ?? 0)

      channel = supabase
        .channel(`notif:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setUnread((n) => n + 1)
            } else if (payload.eventType === 'UPDATE') {
              // REPLICA IDENTITY FULL (010) is what makes `old` complete here,
              // so an unread→read transition is distinguishable from any other
              // update rather than being guessed at.
              const was = (payload.old as { is_read?: boolean } | null)?.is_read
              const now = (payload.new as { is_read?: boolean } | null)?.is_read
              if (was === false && now === true) setUnread((n) => Math.max(0, n - 1))
            }
          }
        )
        .subscribe()
    })()

    return () => {
      cancelled = true
      if (channel) void channel.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    await createClient().auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4">
      <nav className="glass-strong glass-sheen mx-auto flex h-14 max-w-6xl items-center rounded-full pl-4 pr-2">
        <Link
          href="/feed"
          className="press mr-5 flex shrink-0 items-center gap-2 font-display text-[17px] font-bold tracking-tight"
        >
          <LogoMark size="lg" className="text-brand-text" />
          <span className="hidden sm:inline">
            Study<span className="text-text-tertiary">Spot</span>
          </span>
        </Link>

        <div className="hidden flex-1 items-center gap-0.5 md:flex">
          {PRIMARY.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors duration-fast ease-out ${
                  active
                    ? 'font-semibold text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon as={link.icon} size="sm" />
                {link.label}
                {active ? (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand-primary" />
                ) : null}
              </Link>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-1">
          {/* The palette is keyboard-first, but a shortcut with no visible
              affordance is a feature only its author knows about. This is the
              affordance, and it teaches the shortcut at the same time. */}
          <button
            onClick={openCommandPalette}
            aria-label="Search and jump to"
            className="press mr-1 hidden h-9 items-center gap-2 rounded-full border border-border-default pl-3 pr-2 text-sm text-text-tertiary transition-colors duration-fast ease-out hover:border-border-strong hover:text-text-secondary lg:inline-flex"
          >
            <Icon as={Search} size="sm" />
            <span>Search</span>
            <Kbd>{modKey}K</Kbd>
          </button>

          {streak > 0 ? (
            <Link
              href="/stats"
              title={`${streak}-day study streak`}
              className="press hidden h-9 items-center gap-1 rounded-full px-2.5 text-sm font-semibold text-brand-text transition-colors duration-fast ease-out hover:bg-brand-primary/10 sm:inline-flex"
            >
              <Icon as={Flame} size="sm" />
              <span className="tnum">{streak}</span>
            </Link>
          ) : null}

          <Link
            href="/notifications"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
            className="press relative flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast ease-out hover:bg-bg-subtle hover:text-text-primary"
          >
            <Icon as={Bell} size="md" />
            {unread > 0 ? (
              <span className="enter-pop absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-brand-fg tnum">
                {unread > 9 ? '9+' : unread}
              </span>
            ) : null}
          </Link>

          <ThemeToggle className="hidden sm:flex" />

          <Link
            href="/sessions/create"
            className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-primary px-3 text-sm font-semibold text-brand-fg transition-colors duration-fast ease-out hover:bg-brand-hover sm:px-4"
          >
            <Icon as={Plus} size="sm" />
            <span className="hidden sm:inline">Create</span>
          </Link>

          {/* Account menu */}
          <div ref={menuRef} className="relative hidden md:block">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              className="press flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast ease-out hover:bg-bg-subtle hover:text-text-primary"
            >
              <Icon as={User} size="md" />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="glass-strong enter-pop absolute right-0 top-11 w-52 overflow-hidden rounded-2xl p-1.5"
              >
                {MENU.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-text-secondary transition-colors duration-fast ease-out hover:bg-bg-subtle hover:text-text-primary"
                  >
                    <Icon as={item.icon} size="sm" />
                    {item.label}
                  </Link>
                ))}
                <div className="my-1 h-px bg-border-subtle" />
                <button
                  onClick={handleLogout}
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-text-secondary transition-colors duration-fast ease-out hover:bg-bg-subtle hover:text-text-primary"
                >
                  <Icon as={LogOut} size="sm" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="press flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors duration-fast ease-out hover:bg-bg-subtle hover:text-text-primary md:hidden"
          >
            <Icon as={mobileOpen ? X : Menu} size="md" />
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div className="glass-strong glass-sheen enter-up mx-auto mt-2 max-w-6xl overflow-hidden rounded-3xl p-2 md:hidden">
          <div className="stagger grid grid-cols-2 gap-1">
            {[...PRIMARY, ...MENU].map((link, i) => {
              const active = isActive(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ ['--i' as string]: i }}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm transition-colors duration-fast ease-out ${
                    active
                      ? 'bg-brand-primary/10 font-semibold text-text-primary'
                      : 'text-text-secondary hover:bg-bg-subtle hover:text-text-primary'
                  }`}
                >
                  <Icon as={link.icon} size="sm" />
                  {link.label}
                </Link>
              )
            })}
          </div>
          <div className="mt-1 flex items-center justify-between rounded-2xl px-4 py-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-text-secondary transition-colors duration-fast ease-out hover:text-text-primary"
            >
              <Icon as={LogOut} size="sm" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </header>
  )
}

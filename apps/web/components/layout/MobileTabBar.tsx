'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, LayoutGrid, Sparkles, TrendingUp, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'

/**
 * The floating tab bar, phone widths only.
 *
 * At mobile width every destination used to sit behind a hamburger, which
 * put the whole product two taps and one memory test away, at the top of the
 * screen, furthest from the thumb. This is the same five destinations, always
 * visible, within reach.
 *
 * It floats rather than sitting flush against the bottom edge, and carries
 * the identical .glass-strong treatment as the top bar, so the two read as
 * one piece of chrome bracketing the content rather than two unrelated
 * surfaces.
 *
 * The bar is `fixed`, so it does not reserve layout space. The bottom padding
 * that keeps content clear of it lives on <main> in the layout; changing the
 * height here means changing that too.
 */

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/feed', label: 'Feed', icon: LayoutGrid },
  { href: '/explore', label: 'Explore', icon: Compass },
  { href: '/match', label: 'Match', icon: Sparkles },
  { href: '/circles', label: 'Circles', icon: Users },
  // "Stats" rather than "You": the fifth slot is the personal progression
  // page, and labelling a shortcut to it "You" would be a guess about what
  // the tap means. Account and settings stay in the top bar's menu.
  { href: '/stats', label: 'Stats', icon: TrendingUp },
]

export function MobileTabBar() {
  const pathname = usePathname()
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav
      aria-label="Primary"
      // The wrapper carries the safe-area inset so the bar clears a home
      // indicator without the glass surface itself growing a dead strip.
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <div className="glass-strong glass-sheen mx-auto flex max-w-md items-stretch gap-0.5 rounded-full p-1.5">
        {TABS.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              // Inactive is text-secondary, not text-tertiary. Tertiary is
              // 4.38:1 against the glass, which fails AA for 10px text; the
              // labels are small enough that the usual "it is only a hint"
              // argument does not apply. Secondary is 8.21:1.
              className={`press relative flex flex-1 flex-col items-center gap-1 rounded-full py-2 text-[10px] font-medium transition-colors duration-fast ease-out ${
                active ? 'text-brand-text' : 'text-text-secondary'
              }`}
            >
              {/* The active pill sits behind the content rather than around
                  it, so the icon does not shift by a pixel when it lights. */}
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-brand-primary/12"
                />
              ) : null}
              <Icon as={tab.icon} size="md" className="relative" />
              <span className="relative">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

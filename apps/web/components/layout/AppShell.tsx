'use client'

import { usePathname } from 'next/navigation'
import { ContextRail } from './ContextRail'

/**
 * The three shapes a page can take.
 *
 * The gutters were never a spacing problem: every content route was
 * max-w-2xl (672px) while the navbar is max-w-6xl (1152px), so the chrome
 * drew a frame across the top that the content filled barely half of. On a
 * 1440px screen that left about 53% of the width dead.
 *
 * Widening everything would have been the wrong fix. A feed of session cards
 * at 1152px is harder to scan, not easier, and prose past ~75 characters is
 * harder to read. So the width a page gets depends on what is in it:
 *
 *   BARE    surfaces that own their own full-height layout. The room and a
 *           chat thread are not documents in a column; wrapping them would
 *           break them, and a rail beside a focus timer is a distraction
 *           next to the one screen meant to hold attention.
 *
 *   WIDE    content that genuinely uses width: a map beside a list, a
 *           dashboard grid, a ranked table. These take the full width and get
 *           no rail, because they are already using the space.
 *
 *   RAILED  everything else. The reading column stays at its own width and
 *           the space to its right carries live context that was previously
 *           one or two clicks deep.
 *
 * This is a client component only so it can read the pathname. `children`
 * arrives as a prop and stays server-rendered, so nothing on the page is
 * pulled across the boundary by this decision.
 *
 * Note what this does NOT do: it sets no horizontal padding on the content
 * column. Pages already carry their own `max-w-* mx-auto px-4`, and adding
 * padding here would double it on every route.
 */

/** Prefix matched. Surfaces that lay themselves out. */
const BARE = ['/room', '/chat']

/** Prefix matched. Content that earns the full width. */
const WIDE = ['/explore', '/stats', '/leaderboard']

const matches = (pathname: string, routes: string[]) =>
  routes.some((r) => pathname === r || pathname.startsWith(`${r}/`))

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (matches(pathname, BARE)) return <>{children}</>
  if (matches(pathname, WIDE)) return <>{children}</>

  return (
    // 672 + gap + 320 needs about 1030px, so the rail appears at xl rather
    // than lg. Below that the reading column simply centres, as before.
    <div className="mx-auto flex w-full max-w-6xl justify-center gap-6">
      <div className="w-full min-w-0 max-w-2xl">{children}</div>
      <aside className="hidden w-80 shrink-0 pr-4 pt-6 xl:block">
        <ContextRail />
      </aside>
    </div>
  )
}

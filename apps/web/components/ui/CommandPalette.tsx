'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Compass,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  VolumeX,
} from 'lucide-react'
import { FocusIcon, Icon, LogoMark } from './Icon'
import { Kbd } from './Kbd'

/**
 * ⌘K.
 *
 * Mounted on every authenticated page, so the cost of existing has to be near
 * zero: the overlay renders nothing at all until it is opened, there is no
 * framer-motion (the entrance is two CSS keyframes), and the command list is a
 * module constant rather than state.
 *
 * Matching is subsequence-based, not substring, "crsn" finds "Create
 * session". That is the behaviour people have learned from editors, and it is
 * the difference between a palette worth reaching for and a search box.
 */

/**
 * Open the palette from anywhere: the navbar's search affordance uses this.
 *
 * A custom event rather than lifted state or a context provider: the palette
 * is mounted once in the layout and the only thing any caller ever wants to
 * say to it is "open". Threading a provider through the tree to carry a single
 * boolean would cost more than it explains.
 */
export const PALETTE_OPEN_EVENT = 'studyspot:palette-open'

export function openCommandPalette() {
  window.dispatchEvent(new Event(PALETTE_OPEN_EVENT))
}

type Command = {
  id: string
  label: string
  href: string
  group: 'Go to' | 'Do'
  icon: React.ReactNode
  /** Extra words that should match this item without being displayed. */
  keywords?: string
}

const COMMANDS: Command[] = [
  { id: 'feed', label: 'Feed', href: '/feed', group: 'Go to', icon: <LogoMark size="sm" />, keywords: 'home sessions today' },
  { id: 'explore', label: 'Explore', href: '/explore', group: 'Go to', icon: <Icon as={Compass} size="sm" />, keywords: 'browse find nearby map' },
  { id: 'match', label: 'Match', href: '/match', group: 'Go to', icon: <Icon as={Sparkles} size="sm" />, keywords: 'partner buddy people' },
  { id: 'circles', label: 'Circles', href: '/circles', group: 'Go to', icon: <Icon as={Users} size="sm" />, keywords: 'groups friends' },
  { id: 'goals', label: 'Goals', href: '/goals', group: 'Go to', icon: <Icon as={Target} size="sm" />, keywords: 'targets progress' },
  { id: 'stats', label: 'Your stats', href: '/stats', group: 'Go to', icon: <FocusIcon size="sm" />, keywords: 'focus streak calendar badges xp level' },
  { id: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', group: 'Go to', icon: <Icon as={TrendingUp} size="sm" />, keywords: 'ranking top' },
  { id: 'notifications', label: 'Notifications', href: '/notifications', group: 'Go to', icon: <Icon as={Bell} size="sm" />, keywords: 'alerts requests' },
  { id: 'settings', label: 'Profile settings', href: '/profile/settings', group: 'Go to', icon: <Icon as={Settings} size="sm" />, keywords: 'account push privacy' },

  { id: 'create', label: 'Create a session', href: '/sessions/create', group: 'Do', icon: <Icon as={Plus} size="sm" />, keywords: 'new host start' },
  {
    id: 'silent',
    label: 'Start a silent study session',
    href: '/sessions/create?mode=online&vibe=silent',
    group: 'Do',
    icon: <Icon as={VolumeX} size="sm" />,
    keywords: 'quiet focus solo now',
  },
]

/**
 * Subsequence match with a light score: earlier matches and matches that start
 * a word rank higher, so typing "st" puts "Your stats" above "Profile
 * settings" instead of leaving the order to chance. Returns -1 for no match.
 */
function score(haystack: string, needle: string): number {
  if (!needle) return 0
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()

  let hi = 0
  let total = 0
  for (let ni = 0; ni < n.length; ni++) {
    const found = h.indexOf(n[ni], hi)
    if (found === -1) return -1
    // A character that begins a word is worth more than one mid-word.
    const startsWord = found === 0 || h[found - 1] === ' '
    total += (startsWord ? 12 : 4) - Math.min(found - hi, 6)
    hi = found + 1
  }
  return total
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActive(0)
    // Send focus back where it came from. Without this, closing the palette
    // drops the caret at the top of the document and a keyboard user has to
    // tab all the way back to where they were.
    restoreRef.current?.focus?.()
    restoreRef.current = null
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((wasOpen) => {
          if (wasOpen) return false
          restoreRef.current = document.activeElement as HTMLElement | null
          return true
        })
      }
    }
    function onRequest() {
      restoreRef.current = document.activeElement as HTMLElement | null
      setOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener(PALETTE_OPEN_EVENT, onRequest)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener(PALETTE_OPEN_EVENT, onRequest)
    }
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const results = useMemo(() => {
    if (!query.trim()) return COMMANDS
    return COMMANDS.map((c) => ({ c, s: score(`${c.label} ${c.keywords ?? ''}`, query.trim()) }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s)
      .map((r) => r.c)
  }, [query])

  // Clamp rather than reset: as results narrow, the highlight should stay on
  // something real without jumping back to the top on every keystroke.
  const activeIndex = Math.min(active, Math.max(0, results.length - 1))

  function run(command: Command) {
    close()
    router.push(command.href)
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (results.length ? (Math.min(i, results.length - 1) + 1) % results.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) =>
        results.length ? (Math.min(i, results.length - 1) - 1 + results.length) % results.length : 0
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const command = results[activeIndex]
      if (command) run(command)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  // Nothing in the DOM until it is asked for.
  if (!open) return null

  let lastGroup: string | null = null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="palette-scrim absolute inset-0 bg-black/55 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="palette-panel relative w-full max-w-lg overflow-hidden rounded-xl border border-border-default bg-bg-elevated shadow-lift"
      >
        <div className="flex items-center gap-2.5 border-b border-border-subtle px-4">
          <Icon as={Search} size="sm" className="shrink-0 text-text-tertiary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search or jump to…"
            aria-label="Search commands"
            aria-activedescendant={results[activeIndex] ? `cmd-${results[activeIndex].id}` : undefined}
            aria-controls="command-results"
            className="h-12 w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <Kbd className="shrink-0">esc</Kbd>
        </div>

        <ul id="command-results" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-text-tertiary">
              Nothing matches “{query}”
            </li>
          ) : (
            results.map((command, i) => {
              const newGroup = command.group !== lastGroup
              lastGroup = command.group
              const selected = i === activeIndex

              return (
                <li key={command.id}>
                  {newGroup ? (
                    <div className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-text-tertiary first:pt-1">
                      {command.group}
                    </div>
                  ) : null}
                  <button
                    id={`cmd-${command.id}`}
                    role="option"
                    aria-selected={selected}
                    // Pointer-down rather than click: the input keeps focus,
                    // and the action fires before a blur can close anything.
                    onMouseDown={(e) => {
                      e.preventDefault()
                      run(command)
                    }}
                    onMouseMove={() => setActive(i)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors duration-fast ease-out ${
                      selected
                        ? 'bg-brand-primary/12 text-text-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className={selected ? 'text-brand-text' : 'text-text-tertiary'}>
                      {command.icon}
                    </span>
                    <span className="truncate">{command.label}</span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}

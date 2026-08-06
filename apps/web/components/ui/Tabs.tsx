'use client'

import { useId, useRef, type ReactNode } from 'react'

export interface TabItem {
  value: string
  label: ReactNode
  /** Trailing count — e.g. number of pending requests. */
  count?: number
}

/**
 * Controlled tab bar implementing the WAI-ARIA tabs pattern: arrow keys move
 * between tabs, Home/End jump to the ends, and only the active tab is in the
 * tab order.
 *
 * Panels are rendered by the caller. To link them, generate one id and give it
 * to both — otherwise `aria-controls` here and the panel's own id can never
 * agree, since a `useId()` internal to this component isn't reachable outside:
 *
 *   const base = useId()
 *   <Tabs idBase={base} items={items} value={tab} onChange={setTab} />
 *   <TabPanel id={`${base}-${tab}`} active>…</TabPanel>
 *
 * `idBase` is optional only so a tab bar with no associated panels stays a
 * one-liner; pass it whenever panels exist.
 */
export function Tabs({
  items,
  value,
  onChange,
  idBase,
  className = '',
}: {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  /** Shared id root linking each tab to its panel. See the example above. */
  idBase?: string
  className?: string
}) {
  const fallbackId = useId()
  const baseId = idBase ?? fallbackId
  const refs = useRef(new Map<string, HTMLButtonElement>())

  function onKeyDown(e: React.KeyboardEvent) {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(e.key)) return
    e.preventDefault()

    const index = items.findIndex((i) => i.value === value)
    let next = index
    if (e.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length
    if (e.key === 'ArrowRight') next = (index + 1) % items.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = items.length - 1

    const target = items[next]
    if (!target) return
    onChange(target.value)
    refs.current.get(target.value)?.focus()
  }

  return (
    <div
      role="tablist"
      onKeyDown={onKeyDown}
      className={`flex items-center gap-1 border-b border-border-subtle ${className}`}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            ref={(el) => {
              if (el) refs.current.set(item.value, el)
              else refs.current.delete(item.value)
            }}
            id={`${baseId}-${item.value}`}
            role="tab"
            aria-selected={active}
            aria-controls={`${baseId}-${item.value}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'border-accent-primary text-text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {item.label}
            {typeof item.count === 'number' && item.count > 0 ? (
              <span
                className={`tnum rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  active ? 'bg-accent-primary text-accent-fg' : 'bg-bg-subtle text-text-secondary'
                }`}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/** Panel matching a <Tabs> item. `tabsId` must be the same useId base. */
export function TabPanel({
  id,
  active,
  children,
}: {
  id: string
  active: boolean
  children: ReactNode
}) {
  if (!active) return null
  return (
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={id} tabIndex={0}>
      {children}
    </div>
  )
}

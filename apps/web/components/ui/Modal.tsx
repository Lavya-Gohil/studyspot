'use client'

import { AnimatePresence, motion, useReducedMotion, type MotionProps } from 'framer-motion'
import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Icon } from './Icon'

const EASE = [0.16, 1, 0.3, 1] as const

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

const widths = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

// Sheet is full-width on mobile and constrained from `sm` up. These must be
// written out in full — Tailwind scans source text, so a class assembled at
// runtime (`sm:${widths[size]}`) would never make it into the stylesheet.
const sheetWidths = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
}

interface OverlayProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  /** Rendered in a bottom bar, right-aligned — put the confirm button last. */
  footer?: ReactNode
  size?: keyof typeof widths
  /** Set false for destructive confirmations that need a deliberate choice. */
  dismissable?: boolean
  className?: string
}

/**
 * Modal dialog and Sheet share all their behaviour — portal, scroll lock,
 * Escape, focus trap, restore focus on close — and differ only in where they
 * enter from. `useOverlay` holds that behaviour; the two exports style it.
 *
 * Both render into document.body so a parent's `overflow-hidden` or stacking
 * context can't clip them.
 */
function useOverlay(open: boolean, onClose: () => void, dismissable: boolean) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return

      // Focus trap: wrap Tab / Shift+Tab at the panel's edges.
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      )
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]!
      const last = items[items.length - 1]!
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose, dismissable]
  )

  useEffect(() => {
    if (!open) return

    restoreTo.current = document.activeElement as HTMLElement | null

    // Lock scroll without layout shift when a scrollbar is present.
    const { overflow, paddingRight } = document.body.style
    const gap = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (gap > 0) document.body.style.paddingRight = `${gap}px`

    document.addEventListener('keydown', onKeyDown, true)

    // Move focus in after the panel has mounted.
    const raf = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      ;(target ?? panelRef.current)?.focus()
    })

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = overflow
      document.body.style.paddingRight = paddingRight
      restoreTo.current?.focus?.()
    }
  }, [open, onKeyDown])

  return panelRef
}

function OverlayShell({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissable = true,
  panelClassName,
  initial,
  animate,
  exit,
  containerClassName,
}: OverlayProps & {
  panelClassName: string
  containerClassName: string
  initial: MotionProps['initial']
  animate: MotionProps['animate']
  exit: MotionProps['exit']
}) {
  const panelRef = useOverlay(open, onClose, dismissable)
  const reduce = useReducedMotion()
  const labelId = useId()
  const descId = useId()

  // document is unavailable during SSR; portal only once mounted client-side.
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className={containerClassName}>
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismissable ? onClose : undefined}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? labelId : undefined}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={panelClassName}
            initial={reduce ? { opacity: 0 } : initial}
            animate={reduce ? { opacity: 1 } : animate}
            exit={reduce ? { opacity: 0 } : exit}
            transition={{ duration: 0.28, ease: EASE }}
          >
            {title || dismissable ? (
              <div className="flex items-start justify-between gap-4 p-5 pb-0">
                <div className="min-w-0">
                  {title ? (
                    <h2 id={labelId} className="font-display text-lg font-semibold text-text-primary">
                      {title}
                    </h2>
                  ) : null}
                  {description ? (
                    <p id={descId} className="mt-1 text-sm text-text-secondary">
                      {description}
                    </p>
                  ) : null}
                </div>
                {dismissable ? (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="shrink-0 -mr-1 -mt-1 rounded-md p-1.5 text-text-tertiary hover:text-text-primary hover:bg-bg-subtle transition-colors"
                  >
                    <Icon as={X} size="md" />
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="p-5 overflow-y-auto">{children}</div>

            {footer ? (
              <div className="flex items-center justify-end gap-2 border-t border-border-subtle p-4">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}

/** Centred dialog. Default for confirmations and short forms. */
export function Modal({ size = 'md', className = '', ...props }: OverlayProps) {
  return (
    <OverlayShell
      {...props}
      size={size}
      containerClassName="fixed inset-0 z-50 flex items-center justify-center p-4"
      panelClassName={`relative z-10 w-full ${widths[size]} max-h-[85vh] flex flex-col rounded-xl bg-bg-elevated border border-border-default shadow-lift ${className}`}
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 8 }}
    />
  )
}

/**
 * Edge-anchored panel. Prefer over Modal on mobile and for longer content —
 * it's reachable by thumb and doesn't fight the on-screen keyboard.
 */
export function Sheet({ size = 'md', className = '', ...props }: OverlayProps) {
  return (
    <OverlayShell
      {...props}
      size={size}
      containerClassName="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      panelClassName={`relative z-10 w-full ${sheetWidths[size]} max-h-[88vh] flex flex-col rounded-t-xl sm:rounded-xl bg-bg-elevated border border-border-default shadow-lift ${className}`}
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
    />
  )
}

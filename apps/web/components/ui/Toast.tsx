'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AlertTriangle, Check, Info, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Icon } from './Icon'
import { createPortal } from 'react-dom'

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: ReactNode
  variant: ToastVariant
  /** Set while the exit transition plays, just before removal. */
  leaving?: boolean
}

interface ToastContextValue {
  toast: (message: ReactNode, opts?: { variant?: ToastVariant; duration?: number }) => void
  /** Shorthand for the error case, pass friendlyDbError(err.message). */
  error: (message: ReactNode) => void
  success: (message: ReactNode) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/** Matches the transition duration applied below; keep the two in sync. */
const EXIT_MS = 200

/**
 * Transient feedback for actions that succeed or fail without navigating.
 *
 * Mount <ToastProvider> once, high in the tree (app/layout.tsx), then call
 * useToast() anywhere below. Errors default to a longer duration because they
 * usually carry something the user needs to read.
 *
 * Animated with CSS rather than framer-motion, deliberately: this provider is
 * mounted in the root layout and useToast() is called from most screens, so a
 * motion-library dependency here would be paid on nearly every route, it
 * measured ~39kB on /feed alone. The enter uses the `slide-up` keyframe
 * already defined in tailwind.config.ts; the exit is a plain transition.
 * Both are disabled by the prefers-reduced-motion rule in globals.css.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const pending = timers.current
    const auto = pending.get(`auto:${id}`)
    if (auto) {
      clearTimeout(auto)
      pending.delete(`auto:${id}`)
    }
    if (pending.has(`exit:${id}`)) return // already leaving

    // Mark as leaving so the exit transition can play, then drop it.
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    pending.set(
      `exit:${id}`,
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        pending.delete(`exit:${id}`)
      }, EXIT_MS)
    )
  }, [])

  const toast = useCallback<ToastContextValue['toast']>(
    (message, opts) => {
      const variant = opts?.variant ?? 'info'
      const duration = opts?.duration ?? (variant === 'error' ? 6000 : 4000)
      const id = nextId.current++

      setToasts((prev) => [...prev, { id, message, variant }])
      timers.current.set(
        `auto:${id}`,
        setTimeout(() => dismiss(id), duration)
      )
    },
    [dismiss]
  )

  // Clear pending timers if the provider unmounts mid-flight.
  useEffect(() => {
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      dismiss,
      error: (message) => toast(message, { variant: 'error' }),
      success: (message) => toast(message, { variant: 'success' }),
    }),
    [toast, dismiss]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside a <ToastProvider>')
  return ctx
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-accent-green/30',
  error: 'border-accent-red/30',
  info: 'border-border-default',
}

const iconColors: Record<ToastVariant, string> = {
  success: 'text-accent-green',
  error: 'text-accent-red',
  info: 'text-text-tertiary',
}

const icons: Record<ToastVariant, LucideIcon> = {
  success: Check,
  error: AlertTriangle,
  info: Info,
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  const [mounted, setMounted] = useState(false)

  // Portal target only exists client-side.
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <div
      // aria-live so screen readers announce toasts without stealing focus.
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{ transitionDuration: `${EXIT_MS}ms` }}
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border bg-bg-elevated p-3 shadow-lift transition-all ease-out ${
            t.leaving ? 'translate-y-2 opacity-0' : 'animate-slide-up'
          } ${variantStyles[t.variant]}`}
        >
          <span className={`mt-0.5 shrink-0 ${iconColors[t.variant]}`}>
            <Icon as={icons[t.variant]} size="sm" />
          </span>
          <p className="min-w-0 flex-1 text-sm text-text-primary">{t.message}</p>
          <button
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss"
            className="shrink-0 rounded p-0.5 text-text-tertiary transition-colors hover:text-text-primary"
          >
            <Icon as={X} size="xs" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}

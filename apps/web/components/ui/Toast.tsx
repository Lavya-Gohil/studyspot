'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
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
import { createPortal } from 'react-dom'

const EASE = [0.16, 1, 0.3, 1] as const

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: ReactNode
  variant: ToastVariant
  duration: number
}

interface ToastContextValue {
  toast: (message: ReactNode, opts?: { variant?: ToastVariant; duration?: number }) => void
  /** Shorthand for the error case — pass friendlyDbError(err.message). */
  error: (message: ReactNode) => void
  success: (message: ReactNode) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Transient feedback for actions that succeed or fail without navigating.
 *
 * Mount <ToastProvider> once, high in the tree (app/layout.tsx), then call
 * useToast() anywhere below. Errors default to a longer duration because they
 * usually carry something the user needs to read.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback<ToastContextValue['toast']>(
    (message, opts) => {
      const variant = opts?.variant ?? 'info'
      const duration = opts?.duration ?? (variant === 'error' ? 6000 : 4000)
      const id = nextId.current++

      setToasts((prev) => [...prev, { id, message, variant, duration }])
      timers.current.set(
        id,
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
  success: 'border-accent-green/30 text-accent-green',
  error: 'border-accent-red/30 text-accent-red',
  info: 'border-border-default text-text-primary',
}

const icons: Record<ToastVariant, ReactNode> = {
  success: <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  error: <path d="M12 8v5m0 3.5h.01M12 3l9 16H3l9-16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  info: <path d="M12 16v-4m0-4h.01M12 21a9 9 0 100-18 9 9 0 000 18z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  const reduce = useReducedMotion()
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
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.25, ease: EASE }}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border bg-bg-elevated p-3 shadow-lift ${variantStyles[t.variant]}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
              {icons[t.variant]}
            </svg>
            <p className="min-w-0 flex-1 text-sm text-text-primary">{t.message}</p>
            <button
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
              className="shrink-0 rounded p-0.5 text-text-tertiary transition-colors hover:text-text-primary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  )
}

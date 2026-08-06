'use client'

import { useEffect, useState } from 'react'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import { disablePush, enablePush, isPushEnabled, isPushSupported, pushPermission } from '@/lib/push'

/**
 * The only caller of enablePush().
 *
 * Everything else for web push has existed for a while — the service worker,
 * the VAPID pair, migration 008's push_subscriptions table with its RLS, the
 * Edge Function fan-out — but nothing ever called it, so no browser user could
 * turn notifications on. This is that switch.
 *
 * Three states worth distinguishing, because collapsing them produces a
 * control that lies:
 *
 *   unsupported  the browser can't do push at all (notably iOS Safari unless
 *                installed to the Home Screen). Explain, don't offer a toggle
 *                that cannot work.
 *   blocked      permission was denied at the browser level. We cannot
 *                re-prompt — only the user can undo this in site settings — so
 *                say that instead of failing silently on every tap.
 *   ready        show the switch.
 */
export function NotificationToggle() {
  const toast = useToast()
  const [state, setState] = useState<'loading' | 'unsupported' | 'blocked' | 'ready'>('loading')
  const [enabled, setEnabled] = useState(false)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!isPushSupported()) {
      setState('unsupported')
      return
    }
    if (pushPermission() === 'denied') {
      setState('blocked')
      return
    }

    isPushEnabled().then((on) => {
      if (cancelled) return
      setEnabled(on)
      setState('ready')
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function toggle(next: boolean) {
    setPending(true)
    // Optimistic: the switch should respond to the tap, not to the network.
    setEnabled(next)

    const result = next ? await enablePush() : await disablePush()
    setPending(false)

    if (result.ok) {
      toast.success(next ? 'Notifications on for this device.' : 'Notifications off.')
      return
    }

    setEnabled(!next)
    if (result.reason === 'denied') {
      // The prompt can only be answered once; reflect the new reality.
      setState('blocked')
    }
    toast.error(result.error)
  }

  if (state === 'loading') {
    return <div className="h-10 animate-pulse rounded-md bg-bg-subtle" />
  }

  if (state === 'unsupported') {
    return (
      <p className="text-sm text-text-secondary">
        This browser can&apos;t show notifications. On iPhone, add StudySpot to your Home Screen
        first.
      </p>
    )
  }

  if (state === 'blocked') {
    return (
      <div>
        <p className="text-sm font-medium text-text-primary">Notifications are blocked</p>
        <p className="mt-0.5 text-xs text-text-secondary">
          Your browser is blocking notifications for StudySpot. Allow them in your site settings
          and this will switch back on.
        </p>
      </div>
    )
  }

  return (
    <Switch
      checked={enabled}
      onChange={toggle}
      pending={pending}
      label="Push notifications"
      hint="Session reminders, join requests, and messages — on this device."
    />
  )
}

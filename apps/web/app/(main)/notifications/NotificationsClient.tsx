'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BadgeCheck,
  Bell,
  CalendarX,
  Check,
  MapPin,
  MessageSquare,
  ShieldAlert,
  UserPlus,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@studyspot/utils'
import type { Notification } from '@studyspot/types'
import { Icon } from '@/components/ui/Icon'

/**
 * Notification type → glyph + tone.
 *
 * A local map is the right shape here even though a global icon registry would
 * be wrong: the type arrives as data at runtime, every entry below is reachable
 * from this one component, and there are eight of them. What must never exist
 * is a shared map that makes every icon reachable from every importer.
 *
 * Tone carries the outcome so the row is readable before the text is.
 */
const NOTIF_ICONS: Record<string, { icon: LucideIcon; tone: string }> = {
  new_request: { icon: UserPlus, tone: 'text-text-secondary' },
  request_approved: { icon: Check, tone: 'text-accent-green' },
  request_declined: { icon: X, tone: 'text-text-tertiary' },
  session_reminder: { icon: MapPin, tone: 'text-brand-text' },
  new_message: { icon: MessageSquare, tone: 'text-text-secondary' },
  verification_approved: { icon: BadgeCheck, tone: 'text-accent-green' },
  verification_rejected: { icon: ShieldAlert, tone: 'text-accent-red' },
  session_cancelled: { icon: CalendarX, tone: 'text-accent-red' },
}

const FALLBACK = { icon: Bell, tone: 'text-text-tertiary' }

export function NotificationsClient({
  initialNotifications,
  userId,
}: {
  initialNotifications: Notification[]
  userId: string
}) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState(initialNotifications)

  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  function getHref(notif: Notification): string {
    const data = notif.data as any
    if (data?.session_id) return `/sessions/${data.session_id}`
    return '#'
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-text-secondary hover:text-text-primary">
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Icon as={Bell} size="xl" className="text-text-tertiary" />
          <p className="text-sm text-text-secondary">You&apos;re all caught up.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const { icon, tone } = NOTIF_ICONS[notif.type] ?? FALLBACK
            return (
              <Link
                key={notif.id}
                href={getHref(notif)}
                onClick={() => !notif.is_read && markRead(notif.id)}
                className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                  notif.is_read
                    ? 'border-border-subtle bg-bg-surface'
                    : 'border-brand-primary/25 bg-brand-primary/[0.06]'
                }`}
              >
                <span className={`mt-0.5 shrink-0 ${tone}`}>
                  <Icon as={icon} size="lg" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">{notif.title}</p>
                  <p className="text-sm text-text-secondary">{notif.body}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{formatRelativeTime(notif.created_at)}</p>
                </div>
                {!notif.is_read && (
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-primary" />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

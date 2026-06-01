'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@studyspot/utils'
import type { Notification } from '@studyspot/types'
import Link from 'next/link'

const NOTIF_ICONS: Record<string, string> = {
  new_request: '👤',
  request_approved: '✓',
  request_declined: '✗',
  session_reminder: '📍',
  new_message: '💬',
  verification_approved: '✓',
  verification_rejected: '✗',
  session_cancelled: '❌',
}

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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-text-secondary hover:text-text-primary text-sm">
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <div className="text-4xl">🔔</div>
          <p className="text-text-secondary text-sm">You&apos;re all caught up! No new notifications.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <Link
              key={notif.id}
              href={getHref(notif)}
              onClick={() => !notif.is_read && markRead(notif.id)}
              className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                notif.is_read
                  ? 'bg-bg-surface border-border-subtle'
                  : 'bg-accent-primary/[0.04] border-accent-primary/20'
              }`}
            >
              <span className="text-xl shrink-0">{NOTIF_ICONS[notif.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary text-sm font-medium">{notif.title}</p>
                <p className="text-text-secondary text-sm">{notif.body}</p>
                <p className="text-text-tertiary text-xs mt-1">{formatRelativeTime(notif.created_at)}</p>
              </div>
              {!notif.is_read && (
                <div className="w-2 h-2 rounded-full bg-accent-primary shrink-0 mt-1.5" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

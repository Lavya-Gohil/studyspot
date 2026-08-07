import { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatRelativeTime } from '@studyspot/utils'
import type { Notification } from '@studyspot/types'
import { theme } from '@/lib/theme'

const ICONS: Record<string, string> = {
  new_request: '👤', request_approved: '✓', request_declined: '✗',
  session_reminder: '📍', new_message: '💬', verification_approved: '✓',
  verification_rejected: '✗', session_cancelled: '❌',
}

export default function NotificationsScreen() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
      setNotifications((data || []) as Notification[])
    }
    load()
  }, [])

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg.base }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: theme.text.primary }}>Notifications</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        renderItem={({ item: notif }) => (
          <TouchableOpacity
            onPress={() => {
              markRead(notif.id)
              const data = notif.data as any
              if (data?.session_id) router.push(`/sessions/${data.session_id}`)
            }}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, marginBottom: 8, borderRadius: 12, backgroundColor: notif.is_read ? theme.bg.surface : 'rgba(123,97,255,0.05)', borderWidth: 1, borderColor: notif.is_read ? theme.border.subtle : 'rgba(123,97,255,0.20)' }}
          >
            <Text style={{ fontSize: 20 }}>{ICONS[notif.type] || '🔔'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{notif.title}</Text>
              <Text style={{ fontSize: 13, color: theme.text.secondary, marginTop: 2 }}>{notif.body}</Text>
              <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 4 }}>{formatRelativeTime(notif.created_at)}</Text>
            </View>
            {!notif.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.brand.primary, marginTop: 4 }} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: 48, alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 36 }}>🔔</Text>
            <Text style={{ fontSize: 14, color: theme.text.secondary }}>You're all caught up!</Text>
          </View>
        }
      />
    </View>
  )
}

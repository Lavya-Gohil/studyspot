import { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatRelativeTime } from '@studyspot/utils'
import type { Notification } from '@studyspot/types'

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
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: '#F5F4FF' }}>Notifications</Text>
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
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, marginBottom: 8, borderRadius: 12, backgroundColor: notif.is_read ? '#141419' : 'rgba(123,97,255,0.05)', borderWidth: 1, borderColor: notif.is_read ? 'rgba(255,255,255,0.06)' : 'rgba(123,97,255,0.20)' }}
          >
            <Text style={{ fontSize: 20 }}>{ICONS[notif.type] || '🔔'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#F5F4FF' }}>{notif.title}</Text>
              <Text style={{ fontSize: 13, color: '#9B9AAD', marginTop: 2 }}>{notif.body}</Text>
              <Text style={{ fontSize: 12, color: '#5C5B6E', marginTop: 4 }}>{formatRelativeTime(notif.created_at)}</Text>
            </View>
            {!notif.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#7B61FF', marginTop: 4 }} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: 48, alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 36 }}>🔔</Text>
            <Text style={{ fontSize: 14, color: '#9B9AAD' }}>You're all caught up!</Text>
          </View>
        }
      />
    </View>
  )
}

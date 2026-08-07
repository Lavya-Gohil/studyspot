import { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatRelativeTime } from '@studyspot/utils'
import type { Notification } from '@studyspot/types'
import {
  BadgeCheck,
  Bell,
  CalendarX,
  CheckCircle2,
  MapPin,
  MessageCircle,
  UserPlus,
  XCircle,
  type LucideIcon,
} from '@/components/icons'
import { theme } from '@/lib/theme'

/**
 * Notification type to glyph. Icons rather than emoji: emoji renders
 * differently on every OS version and cannot take the colour that tells you
 * whether a thing went well or badly.
 */
const ICONS: Record<string, { icon: LucideIcon; tone: 'brand' | 'good' | 'bad' }> = {
  new_request: { icon: UserPlus, tone: 'brand' },
  request_approved: { icon: CheckCircle2, tone: 'good' },
  request_declined: { icon: XCircle, tone: 'bad' },
  session_reminder: { icon: MapPin, tone: 'brand' },
  new_message: { icon: MessageCircle, tone: 'brand' },
  verification_approved: { icon: BadgeCheck, tone: 'good' },
  verification_rejected: { icon: XCircle, tone: 'bad' },
  session_cancelled: { icon: CalendarX, tone: 'bad' },
}

const TONE = { brand: theme.brand.text, good: theme.accent.green, bad: theme.accent.red }

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
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
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12 }}>
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
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, marginBottom: 8, borderRadius: 12, backgroundColor: notif.is_read ? theme.bg.surface : theme.brand.wash, borderWidth: 1, borderColor: notif.is_read ? theme.border.subtle : theme.brand.line }}
          >
            {(() => {
              const meta = ICONS[notif.type] ?? { icon: Bell, tone: 'brand' as const }
              const Glyph = meta.icon
              return <Glyph size={20} color={TONE[meta.tone]} strokeWidth={2} />
            })()}
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
            <Bell size={30} color={theme.text.tertiary} strokeWidth={1.6} />
            <Text style={{ fontSize: 14, color: theme.text.secondary }}>You are all caught up.</Text>
          </View>
        }
      />
    </View>
  )
}

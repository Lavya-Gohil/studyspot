import { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

export default function ChatsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [chats, setChats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: approvedRequests } = await supabase
        .from('session_requests')
        .select(`session_id, sessions(id, subject, location_name, status, start_time)`)
        .eq('requester_id', user.id)
        .eq('status', 'approved')

      const { data: hostedSessions } = await supabase
        .from('sessions')
        .select('id, subject, location_name, status, start_time')
        .eq('host_id', user.id)
        .in('status', ['active', 'full', 'ongoing', 'completed'])

      const allChats = [
        ...((approvedRequests || []).map((r: any) => r.sessions).filter(Boolean)),
        ...(hostedSessions || []),
      ]

      const unique = allChats.filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
      setChats(unique)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg.base }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: theme.text.primary }}>Chats</Text>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/sessions/${item.id}`)}
            style={{ backgroundColor: theme.bg.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border.subtle, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: theme.brand.tint, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>💬</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>{item.subject}</Text>
              <Text style={{ fontSize: 13, color: theme.text.secondary }}>{item.location_name}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: 48, alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 40 }}>💬</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>No chats yet</Text>
            <Text style={{ fontSize: 14, color: theme.text.secondary, textAlign: 'center' }}>
              Your group chats will appear here once you join a session.
            </Text>
          </View>
        }
      />
    </View>
  )
}

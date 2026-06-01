import { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function ChatsScreen() {
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
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: '#F5F4FF' }}>Chats</Text>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/sessions/${item.id}`)}
            style={{ backgroundColor: '#141419', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(123,97,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>💬</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#F5F4FF' }}>{item.subject}</Text>
              <Text style={{ fontSize: 13, color: '#9B9AAD' }}>{item.location_name}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: 48, alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 40 }}>💬</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#F5F4FF' }}>No chats yet</Text>
            <Text style={{ fontSize: 14, color: '#9B9AAD', textAlign: 'center' }}>
              Your group chats will appear here once you join a session.
            </Text>
          </View>
        }
      />
    </View>
  )
}

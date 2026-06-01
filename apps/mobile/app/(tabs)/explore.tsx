import { useState, useEffect } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Session } from '@studyspot/types'
import { formatSessionTime } from '@studyspot/utils'

export default function ExploreScreen() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('session_feed')
        .select('*')
        .in('status', ['active', 'full', 'ongoing'])
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(50)
      setSessions((data || []) as Session[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = sessions.filter((s) => {
    if (!query) return true
    const q = query.toLowerCase()
    return s.subject.toLowerCase().includes(q) || s.location_name.toLowerCase().includes(q)
  })

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: '#F5F4FF' }}>Explore</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search sessions..."
          placeholderTextColor="#5C5B6E"
          style={{ height: 44, paddingHorizontal: 16, borderRadius: 99, backgroundColor: '#1C1C24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', color: '#F5F4FF', fontSize: 14 }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/sessions/${item.id}`)}
            style={{ backgroundColor: '#141419', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 14, marginBottom: 10, gap: 6 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#F5F4FF' }}>{item.subject}</Text>
            <Text style={{ fontSize: 13, color: '#9B9AAD' }}>📍 {item.location_name}</Text>
            <Text style={{ fontSize: 13, color: '#9B9AAD' }}>📅 {formatSessionTime(item.start_time, item.end_time)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#9B9AAD', fontSize: 14 }}>
              {loading ? 'Loading...' : query ? 'No sessions match your search.' : 'No sessions yet.'}
            </Text>
          </View>
        }
      />
    </View>
  )
}

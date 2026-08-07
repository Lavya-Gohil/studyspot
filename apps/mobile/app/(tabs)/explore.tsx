import { useState, useEffect } from 'react'
import { View, Text, TextInput, FlatList, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Session } from '@studyspot/types'
import { formatSessionTime } from '@studyspot/utils'
import { CalendarDays, MapPin } from '@/components/icons'
import { theme } from '@/lib/theme'

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
    // location_name is null for online sessions, so an unguarded call here
    // crashes the search the moment one is in the list.
    return (
      s.subject.toLowerCase().includes(q) ||
      (s.location_name?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg.base }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: theme.text.primary }}>Explore</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search sessions..."
          placeholderTextColor={theme.text.tertiary}
          style={{ height: 44, paddingHorizontal: 16, borderRadius: 99, backgroundColor: theme.bg.elevated, borderWidth: 1, borderColor: theme.border.default, color: theme.text.primary, fontSize: 14 }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/sessions/${item.id}`)}
            style={{ backgroundColor: theme.bg.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border.subtle, padding: 14, marginBottom: 10, gap: 6 }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>{item.subject}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} color={theme.text.tertiary} strokeWidth={2} />
              <Text style={{ fontSize: 13, color: theme.text.secondary, flex: 1 }} numberOfLines={1}>
                {item.location_name ?? 'Online'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CalendarDays size={14} color={theme.text.tertiary} strokeWidth={2} />
              <Text style={{ fontSize: 13, color: theme.text.secondary, flex: 1 }} numberOfLines={1}>
                {formatSessionTime(item.start_time, item.end_time)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: theme.text.secondary, fontSize: 14 }}>
              {loading ? 'Loading...' : query ? 'No sessions match your search.' : 'No sessions yet.'}
            </Text>
          </View>
        }
      />
    </View>
  )
}

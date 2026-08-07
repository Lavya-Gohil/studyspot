import { useState, useEffect } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Session } from '@studyspot/types'
import { formatSessionTime, truncate } from '@studyspot/utils'
import { theme } from '@/lib/theme'

export default function FeedScreen() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userCountry, setUserCountry] = useState<string | null>(null)
  const [requestStatuses, setRequestStatuses] = useState<Record<string, string>>({})

  async function loadFeed() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)/login'); return }

    const { data: profile } = await supabase.from('profiles').select('country').eq('id', user.id).single()
    setUserCountry(profile?.country || null)

    let query = supabase
      .from('session_feed')
      .select('*')
      .in('status', ['active', 'full', 'ongoing'])
      .gt('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(20)

    if (profile?.country) query = query.eq('location_country', profile.country)

    const { data } = await query
    setSessions((data || []) as Session[])

    const { data: reqs } = await supabase.from('session_requests').select('session_id, status').eq('requester_id', user.id)
    if (reqs) {
      const map: Record<string, string> = {}
      reqs.forEach((r: any) => { map[r.session_id] = r.status })
      setRequestStatuses(map)
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { loadFeed() }, [])

  async function handleInterest(sessionId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('session_requests').insert({ session_id: sessionId, requester_id: user.id })
    if (!error) setRequestStatuses((prev) => ({ ...prev, [sessionId]: 'pending' }))
  }

  const renderItem = ({ item: session }: { item: Session }) => {
    const status = requestStatuses[session.id]
    const remaining = session.spots_remaining ?? session.spots_total - session.spots_filled

    return (
      <TouchableOpacity
        onPress={() => router.push(`/sessions/${session.id}`)}
        style={{ backgroundColor: theme.bg.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border.subtle, padding: 16, marginBottom: 12, gap: 12 }}
      >
        {/* Host row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.bg.elevated, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
              {(session.host_name || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{session.host_name}</Text>
            {session.host_college && <Text style={{ fontSize: 12, color: theme.text.secondary }}>{session.host_college}</Text>}
          </View>
          {session.host_verification_status === 'verified' && (
            <Text style={{ fontSize: 12, color: theme.accent.green }}>✓ Verified</Text>
          )}
        </View>

        {/* Subject */}
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>{session.subject}</Text>

        {/* Location + time */}
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>📍 {session.location_name}</Text>
          <Text style={{ fontSize: 13, color: theme.text.secondary }}>📅 {formatSessionTime(session.start_time, session.end_time)}</Text>
        </View>

        {/* Pills */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: theme.brand.tint, borderWidth: 1, borderColor: 'rgba(123,97,255,0.2)' }}>
            <Text style={{ fontSize: 12, color: theme.brand.text, fontWeight: '500' }}>{session.vibe.replace('_', ' ')}</Text>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: 'rgba(0,229,160,0.1)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.2)' }}>
            <Text style={{ fontSize: 12, color: theme.accent.green, fontWeight: '500' }}>{remaining} spot{remaining === 1 ? '' : 's'} left</Text>
          </View>
        </View>

        {session.description && (
          <Text style={{ fontSize: 13, color: theme.text.secondary, fontStyle: 'italic' }}>"{truncate(session.description, 80)}"</Text>
        )}

        {/* CTA */}
        <TouchableOpacity
          onPress={() => handleInterest(session.id)}
          disabled={!!status || remaining === 0}
          style={{ height: 40, borderRadius: 10, backgroundColor: status ? theme.bg.elevated : theme.brand.text, alignItems: 'center', justifyContent: 'center', opacity: (status || remaining === 0) ? 0.7 : 1, borderWidth: status ? 1 : 0, borderColor: theme.border.default }}
        >
          <Text style={{ color: status ? theme.text.secondary : theme.brand.fg, fontWeight: '500', fontSize: 14 }}>
            {status === 'approved' ? '✓ You\'re in — Chat' : status === 'pending' ? 'Request sent ✓' : remaining === 0 ? 'Session full' : 'Interested'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg.base }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: theme.brand.text }}>StudySpot</Text>
        <TouchableOpacity onPress={() => router.push('/sessions/create')} style={{ height: 32, paddingHorizontal: 16, borderRadius: 10, backgroundColor: theme.brand.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.brand.fg, fontSize: 13, fontWeight: '500' }}>+ Create</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sessions}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFeed() }} tintColor={theme.brand.text} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: theme.text.secondary }}>Loading sessions...</Text>
            </View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 40 }}>📚</Text>
              <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text.primary }}>No sessions near you yet</Text>
              <Text style={{ fontSize: 14, color: theme.text.secondary }}>Be the first to create one.</Text>
              <TouchableOpacity onPress={() => router.push('/sessions/create')} style={{ height: 40, paddingHorizontal: 24, borderRadius: 10, backgroundColor: theme.brand.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.brand.fg, fontWeight: '500' }}>Create a session</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </View>
  )
}

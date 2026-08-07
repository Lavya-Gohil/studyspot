import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatSessionTime } from '@studyspot/utils'
import type { Session, SessionRequest } from '@studyspot/types'
import { BadgeCheck, CalendarDays, MapPin } from '@/components/icons'
import { theme } from '@/lib/theme'

export default function SessionDetailScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [userRequest, setUserRequest] = useState<SessionRequest | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [requestLoading, setRequestLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)

      const { data } = await supabase.from('session_feed').select('*').eq('id', id).single()
      setSession(data as Session)

      if (user) {
        const { data: req } = await supabase.from('session_requests').select('*').eq('session_id', id).eq('requester_id', user.id).maybeSingle()
        setUserRequest(req as SessionRequest | null)
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function handleInterest() {
    if (!currentUserId || !session) return
    setRequestLoading(true)
    const { data, error } = await supabase.from('session_requests').insert({ session_id: session.id, requester_id: currentUserId }).select().single()
    setRequestLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    setUserRequest(data as SessionRequest)
  }

  if (loading || !session) {
    return <View style={{ flex: 1, backgroundColor: theme.bg.base, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: theme.text.secondary }}>Loading...</Text></View>
  }

  const isHost = currentUserId === session.host_id
  const remaining = session.spots_remaining ?? session.spots_total - session.spots_filled

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg.base }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.text.secondary, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Host */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.bg.elevated, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: theme.text.primary }}>{(session.host_name || '?')[0].toUpperCase()}</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>{session.host_name}</Text>
              {session.host_verification_status === 'verified' ? (
                <BadgeCheck size={16} color={theme.accent.green} strokeWidth={2} accessibilityLabel="Verified" />
              ) : null}
            </View>
            {session.host_college && <Text style={{ fontSize: 13, color: theme.text.secondary }}>{session.host_college}</Text>}
          </View>
        </View>

        <Text style={{ fontSize: 26, fontWeight: '700', color: theme.text.primary }}>{session.subject}</Text>

        <View style={{ backgroundColor: theme.bg.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.border.subtle, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <MapPin size={15} color={theme.text.tertiary} strokeWidth={2} style={{ marginTop: 2 }} />
            <Text style={{ fontSize: 14, color: theme.text.secondary, flex: 1 }}>
              {session.location_name ?? 'Online'}
              {session.location_address ? `\n${session.location_address}` : ''}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CalendarDays size={15} color={theme.text.tertiary} strokeWidth={2} />
            <Text style={{ fontSize: 14, color: theme.text.secondary, flex: 1 }}>
              {formatSessionTime(session.start_time, session.end_time)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: theme.brand.tint, borderWidth: 1, borderColor: theme.brand.line }}>
              <Text style={{ fontSize: 12, color: theme.brand.text, fontWeight: '500' }}>{session.vibe.replace('_', ' ')}</Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: remaining > 0 ? theme.accent.greenWash : theme.accent.redWash, borderWidth: 1, borderColor: remaining > 0 ? theme.accent.greenLine : theme.accent.redLine }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: remaining > 0 ? theme.accent.green : theme.accent.red }}>
                {remaining > 0 ? `${remaining} spot${remaining === 1 ? '' : 's'} left` : 'Full'}
              </Text>
            </View>
          </View>
          {session.description && <Text style={{ fontSize: 14, color: theme.text.secondary, fontStyle: 'italic' }}>"{session.description}"</Text>}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12 }}>
        {(userRequest?.status === 'approved' || isHost) ? (
          <TouchableOpacity
            onPress={() => router.push(`/sessions/${id}/room`)}
            style={{ height: 48, borderRadius: 12, backgroundColor: theme.accent.greenWash, borderWidth: 1, borderColor: theme.accent.greenLine, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: theme.accent.green, fontWeight: '600', fontSize: 15 }}>Open the room</Text>
          </TouchableOpacity>
        ) : userRequest?.status === 'pending' ? (
          <View style={{ height: 48, borderRadius: 12, backgroundColor: theme.bg.elevated, borderWidth: 1, borderColor: theme.border.default, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.text.secondary, fontWeight: '500', fontSize: 15 }}>Request sent. Waiting for the host</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleInterest}
            disabled={requestLoading || remaining === 0}
            style={{ height: 48, borderRadius: 12, backgroundColor: theme.brand.primary, alignItems: 'center', justifyContent: 'center', opacity: (requestLoading || remaining === 0) ? 0.5 : 1 }}
          >
            <Text style={{ color: theme.brand.fg, fontWeight: '600', fontSize: 15 }}>
              {requestLoading ? 'Sending...' : remaining === 0 ? 'Session full' : 'Interested'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { formatSessionTime } from '@studyspot/utils'
import type { Session, SessionRequest } from '@studyspot/types'

export default function SessionDetailScreen() {
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
    return <View style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#9B9AAD' }}>Loading...</Text></View>
  }

  const isHost = currentUserId === session.host_id
  const remaining = session.spots_remaining ?? session.spots_total - session.spots_filled

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#9B9AAD', fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Host */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#1C1C24', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#F5F4FF' }}>{(session.host_name || '?')[0].toUpperCase()}</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#F5F4FF' }}>{session.host_name}</Text>
              {session.host_verification_status === 'verified' && <Text style={{ fontSize: 12, color: '#00E5A0' }}>✓ Verified</Text>}
            </View>
            {session.host_college && <Text style={{ fontSize: 13, color: '#9B9AAD' }}>{session.host_college}</Text>}
          </View>
        </View>

        <Text style={{ fontSize: 26, fontWeight: '700', color: '#F5F4FF' }}>{session.subject}</Text>

        <View style={{ backgroundColor: '#141419', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 14, color: '#9B9AAD' }}>📍 {session.location_name}{session.location_address ? `\n${session.location_address}` : ''}</Text>
          <Text style={{ fontSize: 14, color: '#9B9AAD' }}>📅 {formatSessionTime(session.start_time, session.end_time)}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: 'rgba(123,97,255,0.15)', borderWidth: 1, borderColor: 'rgba(123,97,255,0.2)' }}>
              <Text style={{ fontSize: 12, color: '#7B61FF', fontWeight: '500' }}>{session.vibe.replace('_', ' ')}</Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: remaining > 0 ? 'rgba(0,229,160,0.1)' : 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: remaining > 0 ? 'rgba(0,229,160,0.2)' : 'rgba(239,68,68,0.2)' }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: remaining > 0 ? '#00E5A0' : '#EF4444' }}>
                {remaining > 0 ? `${remaining} spot${remaining === 1 ? '' : 's'} left` : 'Full'}
              </Text>
            </View>
          </View>
          {session.description && <Text style={{ fontSize: 14, color: '#9B9AAD', fontStyle: 'italic' }}>"{session.description}"</Text>}
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12 }}>
        {(userRequest?.status === 'approved' || isHost) ? (
          <TouchableOpacity
            onPress={() => router.push(`/sessions/${id}/chat`)}
            style={{ height: 48, borderRadius: 12, backgroundColor: 'rgba(0,229,160,0.15)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.3)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#00E5A0', fontWeight: '600', fontSize: 15 }}>Open group chat →</Text>
          </TouchableOpacity>
        ) : userRequest?.status === 'pending' ? (
          <View style={{ height: 48, borderRadius: 12, backgroundColor: '#1C1C24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#9B9AAD', fontWeight: '500', fontSize: 15 }}>Request sent ✓ — waiting for host</Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleInterest}
            disabled={requestLoading || remaining === 0}
            style={{ height: 48, borderRadius: 12, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', opacity: (requestLoading || remaining === 0) ? 0.5 : 1 }}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>
              {requestLoading ? 'Sending...' : remaining === 0 ? 'Session full' : 'Interested'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

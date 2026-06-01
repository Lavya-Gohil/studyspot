import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@studyspot/types'

export default function ProfileScreen() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/(auth)/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data as Profile)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  if (!profile) return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#9B9AAD' }}>Loading...</Text>
    </View>
  )

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0A0A0F' }} contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, gap: 20 }}>
        {/* Avatar + name */}
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#1C1C24', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: '600', color: '#F5F4FF' }}>
              {(profile.full_name || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 22, fontWeight: '600', color: '#F5F4FF' }}>{profile.full_name || 'Anonymous'}</Text>
              {profile.verification_status === 'verified' && (
                <Text style={{ fontSize: 13, color: '#00E5A0' }}>✓ Verified</Text>
              )}
            </View>
            {profile.college && <Text style={{ fontSize: 14, color: '#9B9AAD' }}>{profile.college}</Text>}
            {profile.course && <Text style={{ fontSize: 13, color: '#9B9AAD' }}>{profile.course}</Text>}
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', backgroundColor: '#141419', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
          {[
            { label: 'Attended', value: profile.total_sessions_attended },
            { label: 'Hosted', value: profile.total_sessions_hosted },
            { label: 'Streak 🔥', value: profile.study_streak },
          ].map((stat, i) => (
            <View key={stat.label} style={{ flex: 1, alignItems: 'center', padding: 16, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: 'rgba(255,255,255,0.06)' }}>
              <Text style={{ fontSize: 22, fontWeight: '600', color: '#F5F4FF', fontVariant: ['tabular-nums'] }}>{stat.value}</Text>
              <Text style={{ fontSize: 12, color: '#9B9AAD', marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Subjects */}
        {profile.subjects && profile.subjects.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#9B9AAD', textTransform: 'uppercase', letterSpacing: 0.5 }}>Subjects</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {profile.subjects.map((s) => (
                <View key={s} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: '#1C1C24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
                  <Text style={{ fontSize: 12, color: '#9B9AAD' }}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Verification prompt */}
        {profile.verification_status === 'unverified' && (
          <TouchableOpacity
            onPress={() => router.push('/(auth)/onboarding/verify')}
            style={{ backgroundColor: 'rgba(123,97,255,0.06)', borderWidth: 1, borderColor: 'rgba(123,97,255,0.20)', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#F5F4FF' }}>✦ Verify your student status</Text>
              <Text style={{ fontSize: 13, color: '#9B9AAD', marginTop: 2 }}>Get 3x more approved requests.</Text>
            </View>
            <Text style={{ color: '#7B61FF', fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        )}

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{ height: 44, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#EF4444', fontWeight: '500', fontSize: 14 }}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

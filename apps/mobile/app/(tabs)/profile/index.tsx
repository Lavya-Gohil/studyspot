import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@studyspot/types'
import { theme } from '@/lib/theme'

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
    <View style={{ flex: 1, backgroundColor: theme.bg.base, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.text.secondary }}>Loading...</Text>
    </View>
  )

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg.base }} contentContainerStyle={{ paddingBottom: 80 }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, gap: 20 }}>
        {/* Avatar + name */}
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.bg.elevated, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: '600', color: theme.text.primary }}>
              {(profile.full_name || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 22, fontWeight: '600', color: theme.text.primary }}>{profile.full_name || 'Anonymous'}</Text>
              {profile.verification_status === 'verified' && (
                <Text style={{ fontSize: 13, color: theme.accent.green }}>✓ Verified</Text>
              )}
            </View>
            {profile.college && <Text style={{ fontSize: 14, color: theme.text.secondary }}>{profile.college}</Text>}
            {profile.course && <Text style={{ fontSize: 13, color: theme.text.secondary }}>{profile.course}</Text>}
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', backgroundColor: theme.bg.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border.subtle }}>
          {[
            { label: 'Attended', value: profile.total_sessions_attended },
            { label: 'Hosted', value: profile.total_sessions_hosted },
            { label: 'Streak 🔥', value: profile.study_streak },
          ].map((stat, i) => (
            <View key={stat.label} style={{ flex: 1, alignItems: 'center', padding: 16, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: theme.border.subtle }}>
              <Text style={{ fontSize: 22, fontWeight: '600', color: theme.text.primary, fontVariant: ['tabular-nums'] }}>{stat.value}</Text>
              <Text style={{ fontSize: 12, color: theme.text.secondary, marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Subjects */}
        {profile.subjects && profile.subjects.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: theme.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Subjects</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {profile.subjects.map((s) => (
                <View key={s} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: theme.bg.elevated, borderWidth: 1, borderColor: theme.border.default }}>
                  <Text style={{ fontSize: 12, color: theme.text.secondary }}>{s}</Text>
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
              <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text.primary }}>✦ Verify your student status</Text>
              <Text style={{ fontSize: 13, color: theme.text.secondary, marginTop: 2 }}>Get 3x more approved requests.</Text>
            </View>
            <Text style={{ color: theme.brand.text, fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        )}

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={{ height: 44, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.10)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.30)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: theme.accent.red, fontWeight: '500', fontSize: 14 }}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

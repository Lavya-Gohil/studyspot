import { useState, useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import {
  BadgeCheck,
  ChevronRight,
  Flame,
  Target,
  TrendingUp,
  Settings,
  Trophy,
  type LucideIcon,
} from '@/components/icons'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@studyspot/types'
import { theme } from '@/lib/theme'
import { Screen, Card, Button, SectionHeading, Chip, Loading } from '@/components/ui'

/**
 * The "you" tab, and the entry point to stats, goals and the leaderboard.
 *
 * Those three used to exist only on web, which meant the entire progression
 * side of the product was invisible on the device people actually carry.
 */
export default function ProfileScreen() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/(auth)/login')
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data as Profile)
    }
    void load()
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  if (!profile) return <Loading />

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: theme.bg.elevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: '600', color: theme.text.primary }}>
            {(profile.full_name || '?')[0].toUpperCase()}
          </Text>
        </View>

        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 22, fontWeight: '600', color: theme.text.primary }}>
              {profile.full_name || 'Anonymous'}
            </Text>
            {profile.verification_status === 'verified' ? (
              <BadgeCheck size={18} color={theme.accent.green} strokeWidth={2} />
            ) : null}
          </View>
          {profile.college ? (
            <Text style={{ fontSize: 14, color: theme.text.secondary }}>{profile.college}</Text>
          ) : null}
          {profile.course ? (
            <Text style={{ fontSize: 13, color: theme.text.tertiary }}>{profile.course}</Text>
          ) : null}
        </View>
      </View>

      <Card padded={false}>
        <View style={{ flexDirection: 'row' }}>
          <Stat label="Attended" value={profile.total_sessions_attended} />
          <Stat label="Hosted" value={profile.total_sessions_hosted} divider />
          <Stat label="Streak" value={profile.study_streak} divider icon={Flame} />
        </View>
      </Card>

      <SectionHeading>Progress</SectionHeading>
      <Card padded={false}>
        <NavRow
          icon={TrendingUp}
          label="Your stats"
          hint="Focus time, level and badges"
          onPress={() => router.push('/(tabs)/profile/stats')}
        />
        <NavRow
          icon={Trophy}
          label="Leaderboard"
          hint="Ranked by focused minutes"
          onPress={() => router.push('/(tabs)/profile/leaderboard')}
        />
        <NavRow
          icon={Target}
          label="Goals"
          hint="What you committed to"
          onPress={() => router.push('/(tabs)/profile/goals')}
        />
        <NavRow
          icon={Settings}
          label="Settings"
          hint="Name, college, subjects"
          onPress={() => router.push('/(tabs)/profile/settings')}
          last
        />
      </Card>

      {profile.subjects && profile.subjects.length > 0 ? (
        <>
          <SectionHeading>Subjects</SectionHeading>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {profile.subjects.map((s) => (
              <Chip key={s} label={s} />
            ))}
          </View>
        </>
      ) : null}

      {profile.verification_status === 'unverified' ? (
        <Pressable
          onPress={() => router.push('/(auth)/onboarding/verify')}
          style={({ pressed }) => [
            {
              backgroundColor: theme.brand.wash,
              borderWidth: 1,
              borderColor: theme.brand.line,
              borderRadius: 14,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <BadgeCheck size={20} color={theme.brand.text} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
              Verify your student status
            </Text>
            <Text style={{ fontSize: 13, color: theme.text.secondary, marginTop: 2 }}>
              Verified hosts get far more approved requests.
            </Text>
          </View>
          <ChevronRight size={18} color={theme.text.tertiary} strokeWidth={2} />
        </Pressable>
      ) : null}

      <View style={{ marginTop: 8 }}>
        <Button label="Sign out" variant="secondary" onPress={handleSignOut} />
      </View>
    </Screen>
  )
}

function Stat({
  label,
  value,
  divider,
  icon: Glyph,
}: {
  label: string
  value: number
  divider?: boolean
  icon?: LucideIcon
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderLeftWidth: divider ? 1 : 0,
        borderLeftColor: theme.border.subtle,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {Glyph ? <Glyph size={16} color={theme.brand.text} strokeWidth={2} /> : null}
        <Text
          style={{
            fontSize: 22,
            fontWeight: '700',
            color: theme.text.primary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {value}
        </Text>
      </View>
      <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 2 }}>{label}</Text>
    </View>
  )
}

function NavRow({
  icon: Glyph,
  label,
  hint,
  onPress,
  last,
}: {
  icon: LucideIcon
  label: string
  hint: string
  onPress: () => void
  last?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: theme.border.subtle,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Glyph size={18} color={theme.text.tertiary} strokeWidth={2} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>{label}</Text>
        <Text style={{ fontSize: 12, color: theme.text.tertiary }}>{hint}</Text>
      </View>
      <ChevronRight size={18} color={theme.text.tertiary} strokeWidth={2} />
    </Pressable>
  )
}

import { useEffect, useState } from 'react'
import { View, Text, Alert } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import type { Profile, StudyStats } from '@studyspot/types'
import { computeReputation } from '@studyspot/utils'
import { blockUser, reportUser } from '@studyspot/api/profiles'
import { friendlyDbError } from '@studyspot/utils/db-errors'
import { BadgeCheck, Flame } from '@/components/icons'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { Screen, Card, Button, Chip, SectionHeading, StatTile, Loading } from '@/components/ui'

/**
 * Someone else's profile.
 *
 * Reputation is computed by computeReputation in @studyspot/utils rather than
 * being re-derived here, so a person's tier reads the same on both platforms.
 * Block and report go through @studyspot/api/profiles for the same reason.
 */
export default function PublicProfileScreen() {
  const { user_id } = useLocalSearchParams<{ user_id: string }>()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<StudyStats | null>(null)
  const [busy, setBusy] = useState(false)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    void (async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user_id).maybeSingle(),
        supabase.from('user_study_stats').select('*').eq('user_id', user_id).maybeSingle(),
      ])
      if (!p) {
        setMissing(true)
        return
      }
      setProfile(p as Profile)
      setStats((s as StudyStats | null) ?? null)
    })()
  }, [user_id])

  async function handleBlock() {
    Alert.alert(
      'Block this person?',
      'They will no longer be able to see or contact you, and you will not see them.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setBusy(true)
            try {
              await blockUser(supabase, user_id)
              router.back()
            } catch (e) {
              Alert.alert('Could not block', friendlyDbError((e as Error)?.message))
            }
            setBusy(false)
          },
        },
      ]
    )
  }

  async function handleReport() {
    setBusy(true)
    try {
      await reportUser(supabase, user_id, 'other', 'Reported from mobile profile')
      Alert.alert('Report sent', 'A human reviews every report.')
    } catch (e) {
      Alert.alert('Could not report', friendlyDbError((e as Error)?.message))
    }
    setBusy(false)
  }

  if (missing) {
    return (
      <Screen>
        <Text style={{ fontSize: 15, color: theme.text.secondary }}>
          That profile is not available.
        </Text>
      </Screen>
    )
  }

  if (!profile) return <Loading />

  const reputation = stats ? computeReputation(stats) : null

  return (
    <>
      <Stack.Screen options={{ title: profile.full_name ?? 'Profile' }} />
      <Screen>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              backgroundColor: theme.bg.elevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 27, fontWeight: '600', color: theme.text.primary }}>
              {(profile.full_name || '?')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: theme.text.primary }}>
              {profile.full_name ?? 'Someone'}
            </Text>
            {profile.verification_status === 'verified' ? (
              <BadgeCheck size={17} color={theme.accent.green} strokeWidth={2} />
            ) : null}
          </View>
          {profile.college ? (
            <Text style={{ fontSize: 13, color: theme.text.secondary }}>{profile.college}</Text>
          ) : null}
        </View>

        {reputation ? (
          <Card>
            <SectionHeading>Reputation</SectionHeading>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: theme.brand.text }}>
                {reputation.label}
              </Text>
              {reputation.score !== null ? (
                <Text style={{ fontSize: 13, color: theme.text.tertiary }}>
                  {reputation.score}/100
                </Text>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <StatTile label="Hours" value={Math.round(stats?.verified_hours ?? 0)} />
              <StatTile label="Sessions" value={stats?.verified_sessions ?? 0} />
              <StatTile
                label="Rating"
                value={stats?.avg_rating ? stats.avg_rating.toFixed(1) : 'n/a'}
              />
            </View>
          </Card>
        ) : null}

        <Card>
          <View style={{ flexDirection: 'row' }}>
            <StatTile label="Attended" value={profile.total_sessions_attended} />
            <StatTile label="Hosted" value={profile.total_sessions_hosted} />
            <View style={{ flex: 1, minWidth: 84 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Flame size={16} color={theme.brand.text} strokeWidth={2} />
                <Text style={{ fontSize: 22, fontWeight: '700', color: theme.text.primary }}>
                  {profile.study_streak}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 11,
                  color: theme.text.tertiary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginTop: 2,
                }}
              >
                Streak
              </Text>
            </View>
          </View>
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

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Button label="Report" variant="ghost" onPress={handleReport} disabled={busy} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Block" variant="secondary" onPress={handleBlock} disabled={busy} />
          </View>
        </View>
      </Screen>
    </>
  )
}

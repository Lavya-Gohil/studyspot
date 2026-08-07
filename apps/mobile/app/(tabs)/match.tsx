import { useCallback, useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import type { StudyStats } from '@studyspot/types'
import { scoreCompatibility, type MatchProfile, type MatchResult } from '@studyspot/utils'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { Screen, Title, Subtitle, Card, Button, Chip, EmptyState, Loading } from '@/components/ui'

/**
 * Study partner matching.
 *
 * Scoring runs through scoreCompatibility in @studyspot/utils, the same
 * function the web uses, so the same two people get the same score on both
 * platforms. Before that function was promoted out of apps/web, this screen
 * could not have existed without reimplementing it and quietly disagreeing.
 */

const PROFILE_FIELDS =
  'id, full_name, avatar_url, college, course, year_of_study, subjects, city, country, study_streak, total_sessions_attended, verification_status'

const MAX_RESULTS = 24

export default function MatchScreen() {
  const router = useRouter()
  const [ranked, setRanked] = useState<MatchResult[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/(auth)/login')
      return
    }

    const { data: me } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .eq('id', user.id)
      .single()
    if (!me) {
      setLoading(false)
      return
    }

    // Same country, excluding yourself. Blocked users are already filtered by
    // RLS, so there is nothing to re-check here.
    let query = supabase.from('profiles').select(PROFILE_FIELDS).neq('id', user.id).limit(120)
    if (me.country) query = query.eq('country', me.country)
    const { data: others } = await query

    const statsById = new Map<string, StudyStats>()
    const ids = (others ?? []).map((p: any) => p.id)
    if (ids.length > 0) {
      const { data: stats } = await supabase
        .from('user_study_stats')
        .select('*')
        .in('user_id', ids)
      for (const s of stats ?? []) statsById.set((s as StudyStats).user_id, s as StudyStats)
    }

    const scored = (others ?? [])
      // Stats are passed in so the reliability bonus applies; without them the
      // score silently drops that term and disagrees with web.
      .map((p: any) =>
        scoreCompatibility(me as MatchProfile, p as MatchProfile, statsById.get(p.id))
      )
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)

    setRanked(scored)
    setLoading(false)
  }, [router])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <Loading />

  const current = ranked[index]

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <Title>Match</Title>
        <Subtitle>People studying what you study, near you.</Subtitle>
      </View>

      {!current ? (
        <EmptyState
          title={ranked.length === 0 ? 'No matches yet' : 'That is everyone for now'}
          description={
            ranked.length === 0
              ? 'Add your subjects and college to your profile, and matches start showing up.'
              : 'Check back once more people in your subjects have joined.'
          }
          action={
            ranked.length > 0 ? (
              <Button label="Start over" variant="secondary" onPress={() => setIndex(0)} />
            ) : null
          }
        />
      ) : (
        <>
          <Card>
            <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: theme.bg.elevated,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 26, fontWeight: '600', color: theme.text.primary }}>
                  {(current.profile.full_name || '?')[0].toUpperCase()}
                </Text>
              </View>

              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 19, fontWeight: '600', color: theme.text.primary }}>
                  {current.profile.full_name ?? 'Someone'}
                </Text>
                {current.profile.college ? (
                  <Text style={{ fontSize: 13, color: theme.text.secondary }}>
                    {current.profile.college}
                  </Text>
                ) : null}
                {current.profile.course ? (
                  <Text style={{ fontSize: 12, color: theme.text.tertiary }}>
                    {current.profile.course}
                  </Text>
                ) : null}
              </View>

              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: theme.brand.tint,
                  borderWidth: 1,
                  borderColor: theme.brand.line,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.brand.text }}>
                  {current.score}% match
                </Text>
              </View>
            </View>

            {current.reasons.length > 0 ? (
              <View style={{ gap: 6, marginTop: 8 }}>
                {current.reasons.map((r) => (
                  <Text key={r} style={{ fontSize: 13, color: theme.text.secondary }}>
                    {r}
                  </Text>
                ))}
              </View>
            ) : null}

            {current.profile.subjects && current.profile.subjects.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {current.profile.subjects.slice(0, 6).map((s) => (
                  <Chip key={s} label={s} />
                ))}
              </View>
            ) : null}
          </Card>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button
                label="Next"
                variant="secondary"
                onPress={() => setIndex((i) => i + 1)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="View profile"
                onPress={() => router.push(`/profile/${current.profile.id}`)}
              />
            </View>
          </View>

          <Text style={{ fontSize: 12, color: theme.text.tertiary, textAlign: 'center' }}>
            {index + 1} of {ranked.length}
          </Text>
        </>
      )}
    </Screen>
  )
}

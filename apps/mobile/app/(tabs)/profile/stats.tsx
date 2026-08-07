import { useCallback, useEffect, useState } from 'react'
import { View, Text, RefreshControl } from 'react-native'
import { Stack } from 'expo-router'
import {
  fetchLevelState,
  fetchEarnedBadges,
  fetchFocusDays,
  summariseFocusDays,
  localDay,
  type LevelState,
  type EarnedBadge,
  type FocusDay,
} from '@studyspot/api'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import {
  Screen,
  Title,
  Subtitle,
  SectionHeading,
  Card,
  ProgressBar,
  StatTile,
  EmptyState,
  Loading,
} from '@/components/ui'

/**
 * Focus stats, the mobile counterpart of /stats on web.
 *
 * Every figure comes from focus_daily and the profile, both already
 * aggregated server-side, so this screen never pulls raw session rows.
 */
export default function StatsScreen() {
  const [level, setLevel] = useState<LevelState | null>(null)
  const [badges, setBadges] = useState<EarnedBadge[]>([])
  const [days, setDays] = useState<FocusDay[]>([])
  const [timezone, setTimezone] = useState('UTC')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .maybeSingle()

    const tz = profile?.timezone || 'UTC'
    const since = localDay(new Date(Date.now() - 29 * 864e5), tz)

    const [lvl, earned, focus] = await Promise.all([
      fetchLevelState(supabase, user.id).catch(() => null),
      fetchEarnedBadges(supabase, user.id).catch(() => []),
      fetchFocusDays(supabase, since).catch(() => []),
    ])

    setTimezone(tz)
    setLevel(lvl)
    setBadges(earned)
    setDays(focus)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const today = localDay(new Date(), timezone)
  const totals = summariseFocusDays(days, today)
  const best = days.reduce((a, d) => Math.max(a, d.minutes), 0)

  const intoLevel = level ? level.xp - level.floorXp : 0
  const levelSpan = level ? Math.max(1, level.ceilXp - level.floorXp) : 1

  return (
    <>
      <Stack.Screen options={{ title: 'Your stats' }} />
      <Screen
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void load()
            }}
            tintColor={theme.brand.text}
          />
        }
      >
        <View style={{ gap: 4 }}>
          <Title>Your stats</Title>
          <Subtitle>Every focus timer you finish lands here.</Subtitle>
        </View>

        {loading ? (
          <Loading />
        ) : (
          <>
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}>
                  Level {level?.level ?? 1}
                </Text>
                <Text style={{ fontSize: 12, color: theme.text.tertiary }}>
                  {Math.max(0, (level?.ceilXp ?? 0) - (level?.xp ?? 0))} XP to next
                </Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <ProgressBar value={intoLevel} max={levelSpan} />
              </View>
              <Text style={{ fontSize: 12, color: theme.text.tertiary, marginTop: 6 }}>
                One XP per focused minute.
              </Text>
            </Card>

            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <StatTile label="Today" value={totals.todayMinutes} unit="min" />
              <StatTile label="Last 30d" value={Math.round(totals.weekMinutes / 60)} unit="h" />
              <StatTile label="Best day" value={best} unit="min" />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <StatTile label="Streak" value={level?.studyStreak ?? 0} unit="d" />
              <StatTile label="Best streak" value={level?.longestStreak ?? 0} unit="d" />
              <StatTile label="Badges" value={badges.length} />
            </View>

            <SectionHeading>Last 30 days</SectionHeading>
            <FocusStrip days={days} today={today} />

            <SectionHeading>Badges</SectionHeading>
            {badges.length === 0 ? (
              <EmptyState
                title="None yet"
                description="Finish a focus timer and the first one lands."
              />
            ) : (
              <View style={{ gap: 8 }}>
                {badges.map((b) => (
                  <Card key={b.code}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
                      {b.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.text.secondary }}>{b.description}</Text>
                  </Card>
                ))}
              </View>
            )}
          </>
        )}
      </Screen>
    </>
  )
}

/**
 * Thirty bars, one per local day.
 *
 * A web-style contribution grid needs a wide viewport to be readable; on a
 * phone the same data reads better as a strip, where height carries the
 * value and the eye follows one axis instead of two.
 */
function FocusStrip({ days, today }: { days: FocusDay[]; today: string }) {
  const byDay = new Map(days.map((d) => [d.day, d.minutes]))
  const peak = Math.max(60, ...days.map((d) => d.minutes))

  const cells: { day: string; minutes: number }[] = []
  for (let i = 29; i >= 0; i--) {
    // Date arithmetic on the ISO string's own day, so the strip lines up with
    // the buckets focus_daily produced rather than drifting by a timezone.
    const d = new Date(`${today}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    cells.push({ day: key, minutes: byDay.get(key) ?? 0 })
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 72 }}>
      {cells.map((c) => (
        <View
          key={c.day}
          accessibilityLabel={`${c.day}: ${c.minutes} minutes`}
          style={{
            flex: 1,
            height: Math.max(3, (c.minutes / peak) * 72),
            borderRadius: 2,
            backgroundColor: c.minutes > 0 ? theme.brand.primary : theme.bg.subtle,
          }}
        />
      ))}
    </View>
  )
}

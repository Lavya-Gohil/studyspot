import { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'
import { fetchLeaderboard, type LeaderboardRow, type LeaderboardScope } from '@studyspot/api'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { Title, Subtitle, Chip, Avatar, EmptyState, Loading } from '@/components/ui'

const SCOPES: { value: LeaderboardScope; label: string }[] = [
  { value: 'global', label: 'Everyone' },
  { value: 'college', label: 'My college' },
]

const RANGES = [
  { value: 7, label: 'Week' },
  { value: 30, label: 'Month' },
]

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets()
  const [scope, setScope] = useState<LeaderboardScope>('global')
  const [days, setDays] = useState(7)
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [hasCollege, setHasCollege] = useState(true)
  const [loading, setLoading] = useState(true)
  const [meId, setMeId] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      setMeId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('college')
        .eq('id', user.id)
        .maybeSingle()
      setHasCollege(!!data?.college)
    })()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await fetchLeaderboard(supabase, { scope, days }))
    } catch {
      setRows([])
    }
    setLoading(false)
  }, [scope, days])

  useEffect(() => {
    void load()
  }, [load])

  const collegeUnavailable = scope === 'college' && !hasCollege

  return (
    <>
      <Stack.Screen options={{ title: 'Leaderboard' }} />
      <View style={{ flex: 1, backgroundColor: theme.bg.base, paddingTop: insets.top + 12 }}>
        <View style={{ paddingHorizontal: 16, gap: 12, paddingBottom: 12 }}>
          <Title>Leaderboard</Title>
          <Subtitle>Ranked by focused minutes. Only finished timers count.</Subtitle>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SCOPES.map((s) => (
              <Chip
                key={s.value}
                label={s.label}
                selected={scope === s.value}
                onPress={() => setScope(s.value)}
              />
            ))}
            <View style={{ flex: 1 }} />
            {RANGES.map((r) => (
              <Chip
                key={r.value}
                label={r.label}
                selected={days === r.value}
                onPress={() => setDays(r.value)}
              />
            ))}
          </View>
        </View>

        {collegeUnavailable ? (
          <EmptyState
            title="No college on your profile"
            description="Add your college and you'll be ranked against people studying alongside you."
          />
        ) : loading ? (
          <Loading />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
            ListEmptyComponent={
              <EmptyState
                title="Nobody has focused yet"
                description="Run a focus timer to the end and this fills in."
              />
            }
            renderItem={({ item }) => {
              const isMe = item.userId === meId
              return (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    paddingHorizontal: isMe ? 12 : 0,
                    marginHorizontal: isMe ? -12 : 0,
                    borderRadius: 12,
                    backgroundColor: isMe ? theme.brand.tint : 'transparent',
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border.subtle,
                  }}
                >
                  {/* Rank comes from RANK() in the RPC, so ties share a number
                      and the next rank skips. Numbering by list position here
                      would quietly disagree with the server. */}
                  <Text
                    style={{
                      width: 28,
                      fontSize: 14,
                      fontWeight: item.rank <= 3 ? '700' : '400',
                      color: item.rank <= 3 ? theme.brand.text : theme.text.tertiary,
                    }}
                  >
                    {item.rank}
                  </Text>
                  <Avatar name={item.fullName} size={34} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}
                    >
                      {item.fullName ?? 'Someone'}
                      {isMe ? ' (you)' : ''}
                    </Text>
                    {item.college ? (
                      <Text numberOfLines={1} style={{ fontSize: 12, color: theme.text.tertiary }}>
                        {item.college}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text.primary }}>
                    {formatMinutes(item.minutes)}
                  </Text>
                </View>
              )
            }}
          />
        )}
      </View>
    </>
  )
}

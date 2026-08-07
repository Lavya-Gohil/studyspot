import { useCallback, useEffect, useState } from 'react'
import { View, Text, TextInput, Alert } from 'react-native'
import { Stack } from 'expo-router'
import {
  fetchMyCircles,
  fetchCirclesWithMembership,
  joinCircle,
  joinCircleByCode,
  type Circle,
  type CircleWithMembership,
} from '@studyspot/api'
import { joinCodeSchema, validate } from '@studyspot/utils/validation'
import { friendlyDbError } from '@studyspot/utils/db-errors'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import {
  Screen,
  Title,
  Subtitle,
  SectionHeading,
  Card,
  Button,
  EmptyState,
  Loading,
} from '@/components/ui'

/**
 * Circles, the mobile counterpart of /circles.
 *
 * Join-by-code goes through joinCircleByCode in @studyspot/api, which calls
 * the SECURITY DEFINER RPC rather than selecting on join_code. A private
 * circle is invisible to a non-member under RLS, so a direct read would fail
 * for exactly the case codes exist to serve.
 */
export default function CirclesScreen() {
  const [mine, setMine] = useState<Circle[]>([])
  const [discover, setDiscover] = useState<CircleWithMembership[]>([])
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const [m, d] = await Promise.all([
      fetchMyCircles(supabase, user.id).catch(() => []),
      fetchCirclesWithMembership(supabase, user.id).catch(() => []),
    ])
    setMine(m)
    setDiscover(d)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function submitCode() {
    const v = validate(joinCodeSchema, code)
    if (!v.ok) {
      setError(v.error)
      return
    }
    setError('')
    setJoining(true)
    try {
      const circleId = await joinCircleByCode(supabase, v.data)
      if (!circleId) {
        setError('No circle found for that code.')
      } else {
        setCode('')
        await load()
      }
    } catch (e) {
      setError(friendlyDbError((e as Error)?.message))
    }
    setJoining(false)
  }

  async function join(circle: CircleWithMembership) {
    try {
      await joinCircle(supabase, circle.id)
      await load()
    } catch (e) {
      Alert.alert('Could not join', friendlyDbError((e as Error)?.message))
    }
  }

  const mineIds = new Set(mine.map((c) => c.id))

  return (
    <>
      <Stack.Screen options={{ title: 'Circles' }} />
      <Screen>
        <View style={{ gap: 4 }}>
          <Title>Circles</Title>
          <Subtitle>Small groups that study together on a schedule.</Subtitle>
        </View>

        <Card>
          <SectionHeading>Join with a code</SectionHeading>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor={theme.text.tertiary}
              autoCapitalize="characters"
              maxLength={6}
              style={{
                flex: 1,
                height: 44,
                paddingHorizontal: 14,
                borderRadius: 10,
                backgroundColor: theme.bg.elevated,
                borderWidth: 1,
                borderColor: theme.border.default,
                color: theme.text.primary,
                fontSize: 15,
                letterSpacing: 2,
              }}
            />
            <Button label="Join" onPress={submitCode} loading={joining} disabled={code.length < 6} />
          </View>
          {error ? (
            <Text style={{ fontSize: 12, color: theme.accent.red, marginTop: 8 }}>{error}</Text>
          ) : null}
        </Card>

        {loading ? (
          <Loading />
        ) : (
          <>
            <SectionHeading>Your circles</SectionHeading>
            {mine.length === 0 ? (
              <EmptyState
                title="You're not in a circle yet"
                description="Join one below, or use a code someone shared with you."
              />
            ) : (
              <View style={{ gap: 10 }}>
                {mine.map((c) => (
                  <CircleCard key={c.id} circle={c} />
                ))}
              </View>
            )}

            <SectionHeading>Discover</SectionHeading>
            {discover.filter((c) => !mineIds.has(c.id)).length === 0 ? (
              <EmptyState title="No public circles yet" description="Create the first one on web." />
            ) : (
              <View style={{ gap: 10 }}>
                {discover
                  .filter((c) => !mineIds.has(c.id))
                  .map((c) => (
                    <CircleCard key={c.id} circle={c} onJoin={() => join(c)} />
                  ))}
              </View>
            )}
          </>
        )}
      </Screen>
    </>
  )
}

function CircleCard({ circle, onJoin }: { circle: Circle; onJoin?: () => void }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {/* The emoji here is user-chosen data, not decoration, so it stays. */}
        <Text style={{ fontSize: 22 }}>{circle.emoji || '📚'}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}
          >
            {circle.name}
          </Text>
          <Text style={{ fontSize: 12, color: theme.text.tertiary }}>
            {circle.member_count} {circle.member_count === 1 ? 'member' : 'members'}
            {circle.topic ? ` · ${circle.topic}` : ''}
          </Text>
        </View>
        {onJoin ? <Button label="Join" size="sm" variant="secondary" onPress={onJoin} /> : null}
      </View>
      {circle.description ? (
        <Text numberOfLines={2} style={{ fontSize: 13, color: theme.text.secondary, marginTop: 8 }}>
          {circle.description}
        </Text>
      ) : null}
    </Card>
  )
}

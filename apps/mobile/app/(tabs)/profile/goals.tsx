import { useCallback, useEffect, useState } from 'react'
import { View, Text, Alert } from 'react-native'
import { Stack } from 'expo-router'
import type { Goal } from '@studyspot/types'
import {
  fetchGoals,
  fetchGoalStats,
  statValueForGoal,
  setManualProgress,
  setGoalStatus,
  deleteGoal,
  type GoalStats,
} from '@studyspot/api'
import { goalProgress, goalTypeLabel } from '@studyspot/utils'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import {
  Screen,
  Title,
  Subtitle,
  Card,
  Button,
  ProgressBar,
  EmptyState,
  Loading,
} from '@/components/ui'

/**
 * Goals, the mobile counterpart of /goals.
 *
 * Progress is read through goalProgress() in @studyspot/utils, the same
 * function the web uses, so the two apps cannot show different percentages
 * for the same goal.
 */
export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [stats, setStats] = useState<GoalStats>({ verified_hours: 0, verified_sessions: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const [g, s] = await Promise.all([
      fetchGoals(supabase, user.id).catch(() => []),
      fetchGoalStats(supabase, user.id).catch(() => ({ verified_hours: 0, verified_sessions: 0 })),
    ])
    setGoals(g)
    setStats(s)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function bump(goal: Goal, amount: number) {
    const next = Math.max(0, goal.manual_progress + amount)
    // Optimistic: the write is a single column on a row the user owns, and
    // a counter that waits for a round trip feels broken on a phone.
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, manual_progress: next } : g)))
    try {
      await setManualProgress(supabase, goal.id, next)
    } catch {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)))
    }
  }

  async function complete(goal: Goal) {
    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, status: 'completed' as Goal['status'] } : g))
    )
    try {
      await setGoalStatus(supabase, goal.id, 'completed')
    } catch {
      void load()
    }
  }

  function confirmRemove(goal: Goal) {
    Alert.alert('Delete goal', `Remove "${goal.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setGoals((prev) => prev.filter((g) => g.id !== goal.id))
          try {
            await deleteGoal(supabase, goal.id)
          } catch {
            void load()
          }
        },
      },
    ])
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Goals' }} />
      <Screen>
        <View style={{ gap: 4 }}>
          <Title>Goals</Title>
          <Subtitle>Commit to something and track it.</Subtitle>
        </View>

        {loading ? (
          <Loading />
        ) : goals.length === 0 ? (
          <EmptyState
            title="No goals yet"
            description="Set one on the web app and it shows up here."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {goals.map((goal) => {
              const { current, percent, complete: reached } = goalProgress(
                goal,
                statValueForGoal(goal, stats)
              )
              const active = goal.status === 'active'

              return (
                <Card key={goal.id}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        style={{ fontSize: 15, fontWeight: '600', color: theme.text.primary }}
                      >
                        {goal.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.text.tertiary }}>
                        {goalTypeLabel(goal.type)}
                        {goal.deadline
                          ? ` · due ${new Date(goal.deadline).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}`
                          : ''}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        color: reached ? theme.accent.green : theme.text.secondary,
                      }}
                    >
                      {goal.status === 'completed' ? 'Done' : reached ? 'Reached' : `${percent}%`}
                    </Text>
                  </View>

                  <View style={{ marginTop: 10, gap: 6 }}>
                    <ProgressBar value={current} max={goal.target} />
                    <Text style={{ fontSize: 12, color: theme.text.secondary }}>
                      {current} / {goal.target} {goal.unit}
                    </Text>
                  </View>

                  {active ? (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                      {goal.type === 'custom' ? (
                        <>
                          <Button label="-1" size="sm" variant="secondary" onPress={() => bump(goal, -1)} />
                          <Button label="+1" size="sm" variant="secondary" onPress={() => bump(goal, 1)} />
                        </>
                      ) : null}
                      <View style={{ flex: 1 }} />
                      <Button label="Complete" size="sm" variant="ghost" onPress={() => complete(goal)} />
                      <Button label="Delete" size="sm" variant="ghost" onPress={() => confirmRemove(goal)} />
                    </View>
                  ) : null}
                </Card>
              )
            })}
          </View>
        )}
      </Screen>
    </>
  )
}

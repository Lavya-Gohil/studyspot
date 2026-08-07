import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { recordFocusSession } from '@studyspot/api/focus'
import { useRoomChannel } from '@studyspot/api/room'
import {
  secondsLeft,
  type CurrentUser,
  type SessionInfo,
} from '@studyspot/api/room-types'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { Button, Loading } from '@/components/ui'

/**
 * The virtual study room, on mobile.
 *
 * Presence, the shared countdown and the message stream all come from
 * useRoomChannel in @studyspot/api, the same hook the web room runs. That
 * matters more here than anywhere else in the app: web and mobile users sit
 * in the SAME channel, so any drift in how a seat is claimed or how two
 * simultaneous timer presses are ordered would show up as two people looking
 * at different clocks.
 */

const PRESETS = [
  { label: '25m', value: 25 * 60 },
  { label: '50m', value: 50 * 60 },
  { label: '5m', value: 5 * 60 },
]

function mmss(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function RoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [session, setSession] = useState<SessionInfo | null>(null)
  const [online, setOnline] = useState(true)
  const [me, setMe] = useState<CurrentUser | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/(auth)/login')
        return
      }

      const { data: s } = await supabase
        .from('session_feed')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (!s) {
        setDenied(true)
        return
      }

      // Same gate as the web page: host, or an approved member. RLS would
      // stop the writes anyway, but a room you can see and not speak in is
      // worse than being told plainly.
      if (s.host_id !== user.id) {
        const { data: req } = await supabase
          .from('session_requests')
          .select('status')
          .eq('session_id', id)
          .eq('requester_id', user.id)
          .maybeSingle()
        if (req?.status !== 'approved') {
          setDenied(true)
          return
        }
      }

      const { data: p } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, verification_status')
        .eq('id', user.id)
        .single()

      setOnline(s.mode === 'online')
      setSession({
        id: s.id,
        subject: s.subject,
        room_name: s.location_name,
        vibe: s.vibe,
        start_time: s.start_time,
        end_time: s.end_time,
        status: s.status,
        host_id: s.host_id,
        spots_total: s.spots_total,
      })
      setMe(
        p
          ? {
              id: p.id,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
              verification_status: p.verification_status,
            }
          : { id: user.id, full_name: null, avatar_url: null, verification_status: 'unverified' }
      )
    })()
  }, [id, router])

  if (denied) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg.base, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text.primary }}>
          You are not in this room
        </Text>
        <Text style={{ fontSize: 14, color: theme.text.secondary, textAlign: 'center' }}>
          The host approves every join request. Ask to join from the session page.
        </Text>
        <Button label="Back to session" variant="secondary" onPress={() => router.replace(`/sessions/${id}`)} />
      </View>
    )
  }

  if (!session || !me) return <Loading />

  return <Room session={session} me={me} online={online} />
}

function Room({
  session,
  me,
  online,
}: {
  session: SessionInfo
  me: CurrentUser
  /** In-person sessions get the thread only: no seats, no shared clock. */
  online: boolean
}) {
  // At least the group size, rounded up to a tidy grid of 4. Same rule as web,
  // so both clients agree on which seat indices exist.
  const seatCount = useMemo(
    () => Math.max(8, Math.ceil((session.spots_total + 1) / 4) * 4),
    [session.spots_total]
  )

  const {
    members,
    messages,
    timer,
    mySeat,
    myStatus,
    connected,
    claimSeat,
    toggleStatus,
    publishTimer,
    sendMessage,
  } = useRoomChannel({ client: supabase, session, currentUser: me, seatCount })

  const insets = useSafeAreaInsets()
  const [now, setNow] = useState(() => Date.now())
  const [draft, setDraft] = useState('')
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null)
  const [banked, setBanked] = useState<string | null>(null)

  // One interval for the whole screen. The countdown is derived from endsAt
  // rather than decremented, so a backgrounded app resumes at the right
  // number instead of however many ticks it missed.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  const left = secondsLeft(timer, now)
  const finished = timer.running && left === 0

  useEffect(() => {
    if (!finished) return

    // Stop the shared clock for everyone, then record only the interval THIS
    // client watched run: someone who joined halfway did not focus for the
    // whole stretch, and RLS only lets them write their own row anyway.
    publishTimer({ running: false, endsAt: null, remaining: 0, duration: timer.duration })

    const startedAt = runStartedAt
    setRunStartedAt(null)
    if (startedAt === null) return

    void recordFocusSession(supabase, {
      startedAt,
      endedAt: Date.now(),
      sessionId: session.id,
      subject: session.subject,
    }).then((r) => {
      if (r.ok) setBanked(`${Math.round(r.seconds / 60)} min banked`)
    })
  }, [finished, publishTimer, timer.duration, runStartedAt, session.id, session.subject])

  const start = useCallback(() => {
    setRunStartedAt(Date.now())
    publishTimer({
      running: true,
      endsAt: Date.now() + left * 1000,
      remaining: left,
      duration: timer.duration,
    })
  }, [left, timer.duration, publishTimer])

  const pause = useCallback(() => {
    publishTimer({ running: false, endsAt: null, remaining: left, duration: timer.duration })
  }, [left, timer.duration, publishTimer])

  const setPreset = useCallback(
    (value: number) => {
      setRunStartedAt(null)
      publishTimer({ running: false, endsAt: null, remaining: value, duration: value })
    },
    [publishTimer]
  )

  const focusing = members.filter((m) => m.status === 'focusing').length
  const seats = Array.from({ length: seatCount }, (_, i) => members.find((m) => m.seat === i) ?? null)

  async function send() {
    const content = draft.trim()
    if (!content) return
    setDraft('')
    await sendMessage(content)
  }

  return (
    <>
      <Stack.Screen options={{ title: session.subject }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.bg.base }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12, gap: 4 }}>
          <Text numberOfLines={1} style={{ fontSize: 20, fontWeight: '700', color: theme.text.primary }}>
            {session.subject}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: connected ? theme.accent.green : theme.text.tertiary,
              }}
            />
            <Text style={{ fontSize: 12, color: theme.text.secondary }}>
              {connected ? `${members.length} here, ${focusing} focusing` : 'Connecting'}
            </Text>
          </View>
        </View>

        {/* Timer and seats are the online-room experience. An in-person
            session has a real table; showing eight dashed squares for it
            would be inventing a thing that does not exist. */}
      {online ? (
        <>
        {/* Timer */}
        <View style={{ alignItems: 'center', paddingVertical: 16, gap: 12 }}>
          <Text
            style={{
              fontSize: 56,
              fontWeight: '200',
              color: theme.text.primary,
              fontVariant: ['tabular-nums'],
            }}
          >
            {mmss(left)}
          </Text>

          {banked ? (
            <Text style={{ fontSize: 12, color: theme.brand.text }}>{banked}</Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PRESETS.map((p) => (
              <Pressable
                key={p.value}
                onPress={() => setPreset(p.value)}
                disabled={timer.running}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: timer.duration === p.value ? theme.brand.text : theme.border.default,
                    backgroundColor: timer.duration === p.value ? theme.brand.tint : 'transparent',
                    opacity: timer.running ? 0.4 : pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: timer.duration === p.value ? theme.brand.text : theme.text.secondary,
                  }}
                >
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              label={timer.running ? 'Pause' : 'Start'}
              onPress={timer.running ? pause : start}
            />
            <Button
              label={myStatus === 'focusing' ? 'Take a break' : 'Back to focus'}
              variant="secondary"
              onPress={toggleStatus}
            />
          </View>
          <Text style={{ fontSize: 11, color: theme.text.tertiary }}>
            The timer is shared. Anyone here can start or pause it.
          </Text>
        </View>

        {/* Seats */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 }}>
          {seats.map((member, i) => {
            const isMe = member?.user_id === me.id
            const free = !member
            return (
              <Pressable
                key={i}
                onPress={free ? () => claimSeat(i) : undefined}
                accessibilityLabel={
                  member ? `${member.name ?? 'Someone'}, ${member.status}` : `Empty seat ${i + 1}`
                }
                style={({ pressed }) => [
                  {
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderStyle: free ? 'dashed' : 'solid',
                    borderColor: isMe ? theme.brand.text : free ? theme.border.default : theme.border.subtle,
                    backgroundColor: free
                      ? 'transparent'
                      : member.status === 'focusing'
                        ? theme.brand.tint
                        : theme.bg.elevated,
                    opacity: pressed && free ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: free ? theme.text.tertiary : theme.text.primary,
                  }}
                >
                  {member ? (member.name ?? '?')[0].toUpperCase() : ''}
                </Text>
              </Pressable>
            )
          })}
        </View>
        {mySeat === -1 ? (
          <Text style={{ fontSize: 11, color: theme.text.tertiary, paddingHorizontal: 16, marginTop: 8 }}>
            Every seat is taken. Tap one as it frees up.
          </Text>
        ) : null}
        </>
      ) : null}

        {/* Chat */}
        <ScrollView
          style={{ flex: 1, marginTop: 16 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 10 }}
        >
          {messages.map((m) => {
            const mine = m.sender_id === me.id
            return (
              <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                {!mine ? (
                  <Text style={{ fontSize: 11, color: theme.text.tertiary, marginBottom: 2 }}>
                    {(m as any).sender?.full_name ?? 'Someone'}
                  </Text>
                ) : null}
                <View
                  style={{
                    maxWidth: '80%',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 14,
                    backgroundColor: mine ? theme.brand.primary : theme.bg.surface,
                    borderWidth: mine ? 0 : 1,
                    borderColor: theme.border.subtle,
                  }}
                >
                  <Text style={{ fontSize: 14, color: mine ? theme.brand.fg : theme.text.primary }}>
                    {m.content}
                  </Text>
                </View>
              </View>
            )
          })}
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 12,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: theme.border.subtle,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message the room"
            placeholderTextColor={theme.text.tertiary}
            onSubmitEditing={send}
            returnKeyType="send"
            style={{
              flex: 1,
              height: 44,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: theme.bg.elevated,
              borderWidth: 1,
              borderColor: theme.border.default,
              color: theme.text.primary,
              fontSize: 14,
            }}
          />
          <Button label="Send" onPress={send} disabled={!draft.trim()} />
        </View>
      </KeyboardAvoidingView>
    </>
  )
}

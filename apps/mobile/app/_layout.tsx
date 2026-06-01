import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { supabase } from '@/lib/supabase'
import { registerPushToken } from '@/lib/notifications'
import type { Session } from '@supabase/supabase-js'
import '../global.css'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session) registerPushToken()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) registerPushToken()
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#0A0A0F" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0F' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sessions/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sessions/create" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  )
}

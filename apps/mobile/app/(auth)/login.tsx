import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      Alert.alert('Error', 'Invalid email or password.')
      return
    }
    router.replace('/(tabs)/feed')
  }

  return (
    <ScrollView className="flex-1 bg-bg-base" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="flex-1 justify-center px-6 py-12 gap-8">
        <View className="items-center gap-2">
          <Text className="text-3xl font-bold text-accent-primary">StudySpot</Text>
          <Text className="text-text-secondary text-sm">Welcome back</Text>
        </View>

        <View className="gap-4">
          <View className="gap-1">
            <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@university.edu"
              placeholderTextColor="#5C5B6E"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ height: 44, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#1C1C24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', color: '#F5F4FF', fontSize: 14 }}
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor="#5C5B6E"
              secureTextEntry
              style={{ height: 44, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#1C1C24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', color: '#F5F4FF', fontSize: 14 }}
            />
          </View>

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={{ height: 44, borderRadius: 10, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.5 : 1 }}
          >
            <Text style={{ color: 'white', fontWeight: '500', fontSize: 14 }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/signup')} className="items-center">
          <Text className="text-text-secondary text-sm">
            Don&apos;t have an account? <Text className="text-accent-primary">Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

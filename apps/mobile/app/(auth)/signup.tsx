import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function SignupScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup() {
    if (!email.includes('@') || password.length < 8) return
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    router.replace('/(auth)/onboarding/basic-info')
  }

  return (
    <ScrollView className="flex-1 bg-bg-base" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="flex-1 justify-center px-6 py-12 gap-8">
        <View className="items-center gap-2">
          <Text className="text-3xl font-bold text-accent-primary">StudySpot</Text>
          <Text className="text-text-secondary text-sm">Find your study crew</Text>
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
              className="h-11 px-4 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm"
              style={{ borderColor: 'rgba(255,255,255,0.10)' }}
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs font-medium text-text-secondary uppercase tracking-wide">Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              placeholderTextColor="#5C5B6E"
              secureTextEntry
              className="h-11 px-4 rounded-md bg-bg-elevated text-text-primary text-sm"
              style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 6 }}
            />
          </View>

          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading || !email.includes('@') || password.length < 8}
            className="h-11 rounded-md bg-accent-primary items-center justify-center"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            <Text className="text-white font-medium text-sm">
              {loading ? 'Creating account...' : 'Create account'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} className="items-center">
          <Text className="text-text-secondary text-sm">
            Already have an account? <Text className="text-accent-primary">Log in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function BasicInfoScreen() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [loading, setLoading] = useState(false)

  const ageNum = parseInt(age)
  const isValid = fullName.trim().length >= 2 && ageNum >= 16 && ageNum <= 100

  async function handleContinue() {
    if (!isValid) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)/login'); return }

    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      age: ageNum,
      is_minor: ageNum < 18,
      onboarding_step: 2,
    }).eq('id', user.id)

    setLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    router.push('/(auth)/onboarding/location')
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0A0A0F' }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, padding: 24, paddingTop: 60, gap: 24 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 24, fontWeight: '600', color: '#F5F4FF' }}>Tell us about yourself</Text>
          <Text style={{ fontSize: 14, color: '#9B9AAD' }}>Just a couple of things to get started.</Text>
        </View>

        <View style={{ gap: 16 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#9B9AAD', textTransform: 'uppercase', letterSpacing: 0.5 }}>Full name *</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor="#5C5B6E"
              autoComplete="name"
              style={{ height: 44, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#1C1C24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', color: '#F5F4FF', fontSize: 14 }}
            />
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#9B9AAD', textTransform: 'uppercase', letterSpacing: 0.5 }}>Age *</Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              placeholder="Your age"
              placeholderTextColor="#5C5B6E"
              keyboardType="number-pad"
              style={{ height: 44, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#1C1C24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', color: '#F5F4FF', fontSize: 14 }}
            />
            {age && ageNum < 16 && (
              <Text style={{ fontSize: 12, color: '#EF4444' }}>You must be at least 16 to use StudySpot.</Text>
            )}
            {age && ageNum >= 16 && ageNum < 18 && (
              <Text style={{ fontSize: 12, color: '#F59E0B' }}>Your profile will show an "Under 18" label to hosts.</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={!isValid || loading}
          style={{ height: 44, borderRadius: 10, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', opacity: (!isValid || loading) ? 0.5 : 1 }}
        >
          <Text style={{ color: 'white', fontWeight: '500', fontSize: 14 }}>
            {loading ? 'Saving...' : 'Continue →'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

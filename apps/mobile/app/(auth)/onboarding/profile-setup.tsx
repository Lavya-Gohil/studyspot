import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { SUBJECT_CATEGORIES, YEAR_LABELS, type YearOfStudy } from '@studyspot/types'

export default function ProfileSetupScreen() {
  const router = useRouter()
  const [college, setCollege] = useState('')
  const [course, setCourse] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  function toggleSubject(s: string) {
    setSelectedSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  async function handleFinish() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)/login'); return }

    const { error } = await supabase.from('profiles').update({
      college: college.trim() || null,
      course: course.trim() || null,
      subjects: selectedSubjects,
      onboarding_step: 5,
    }).eq('id', user.id)

    setLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    router.replace('/(tabs)/feed')
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0A0A0F' }} contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 24 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: '#F5F4FF' }}>Set up your study profile</Text>
        <Text style={{ fontSize: 14, color: '#9B9AAD' }}>All optional — you can fill this in later.</Text>
      </View>

      <View style={{ gap: 16 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: '#9B9AAD', textTransform: 'uppercase' }}>College / University</Text>
          <TextInput value={college} onChangeText={setCollege} placeholder="Your university name" placeholderTextColor="#5C5B6E" style={{ height: 44, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#1C1C24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', color: '#F5F4FF', fontSize: 14 }} />
        </View>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: '#9B9AAD', textTransform: 'uppercase' }}>Course / Major</Text>
          <TextInput value={course} onChangeText={setCourse} placeholder="e.g. Computer Science" placeholderTextColor="#5C5B6E" style={{ height: 44, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#1C1C24', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', color: '#F5F4FF', fontSize: 14 }} />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: '#9B9AAD', textTransform: 'uppercase' }}>Subjects / Interests</Text>
          {SUBJECT_CATEGORIES.map((cat) => (
            <View key={cat.category} style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, color: '#5C5B6E' }}>{cat.category}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {cat.subjects.map((s) => (
                  <TouchableOpacity key={s} onPress={() => toggleSubject(s)} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: selectedSubjects.includes(s) ? '#7B61FF' : 'rgba(255,255,255,0.06)', backgroundColor: selectedSubjects.includes(s) ? 'rgba(123,97,255,0.15)' : 'transparent' }}>
                    <Text style={{ fontSize: 12, color: selectedSubjects.includes(s) ? '#7B61FF' : '#9B9AAD' }}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity onPress={handleFinish} disabled={loading} style={{ height: 44, borderRadius: 10, backgroundColor: '#7B61FF', alignItems: 'center', justifyContent: 'center', opacity: loading ? 0.5 : 1 }}>
        <Text style={{ color: 'white', fontWeight: '500', fontSize: 14 }}>
          {loading ? 'Finishing setup...' : 'Finish setup →'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

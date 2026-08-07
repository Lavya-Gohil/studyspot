import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

const VIBES = [
  { value: 'silent', label: 'Silent Study' },
  { value: 'pomodoro', label: 'Pomodoro' },
  { value: 'discussion', label: 'Group Discussion' },
  { value: 'coding', label: 'Coding Session' },
  { value: 'exam_prep', label: 'Exam Prep' },
  { value: 'casual', label: 'Casual Study' },
]

export default function CreateSessionScreen() {
  const router = useRouter()
  const [locationName, setLocationName] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [vibe, setVibe] = useState('')
  const [spots, setSpots] = useState(2)
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [loading, setLoading] = useState(false)

  const isValid = locationName.trim().length >= 2 && subject.trim().length >= 2 && vibe && startDate && startTime && endTime

  async function handleCreate() {
    if (!isValid) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)/login'); return }

    const { data: profile } = await supabase.from('profiles').select('country, state_region').eq('id', user.id).single()

    const startDt = new Date(`${startDate}T${startTime}`)
    const endDt = new Date(`${startDate}T${endTime}`)

    if (endDt <= startDt) { Alert.alert('Error', 'End time must be after start time.'); setLoading(false); return }

    const { data, error } = await supabase.from('sessions').insert({
      host_id: user.id,
      subject: subject.trim(),
      description: description.trim() || null,
      vibe,
      location_name: locationName.trim(),
      location_country: profile?.country || null,
      location_state: profile?.state_region || null,
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
      spots_total: spots,
    }).select().single()

    setLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    router.replace(`/sessions/${data.id}`)
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg.base }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.text.secondary, fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text.primary }}>Create session</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {[
          { label: 'Venue *', value: locationName, onChange: setLocationName, placeholder: 'e.g. Blue Tokai Coffee' },
          { label: 'Subject *', value: subject, onChange: setSubject, placeholder: 'e.g. Physics – Thermodynamics' },
          { label: 'Date (YYYY-MM-DD) *', value: startDate, onChange: setStartDate, placeholder: '2025-06-15' },
          { label: 'Start time (HH:MM) *', value: startTime, onChange: setStartTime, placeholder: '18:00' },
          { label: 'End time (HH:MM) *', value: endTime, onChange: setEndTime, placeholder: '21:00' },
        ].map((field) => (
          <View key={field.label} style={{ gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '500', color: theme.text.secondary, textTransform: 'uppercase' }}>{field.label}</Text>
            <TextInput value={field.value} onChangeText={field.onChange} placeholder={field.placeholder} placeholderTextColor={theme.text.tertiary} style={{ height: 44, paddingHorizontal: 14, borderRadius: 6, backgroundColor: theme.bg.elevated, borderWidth: 1, borderColor: theme.border.default, color: theme.text.primary, fontSize: 14 }} />
          </View>
        ))}

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: theme.text.secondary, textTransform: 'uppercase' }}>Spots (not counting you)</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={() => setSpots(Math.max(1, spots - 1))} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: theme.bg.elevated, borderWidth: 1, borderColor: theme.border.default, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.text.primary, fontSize: 18 }}>−</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: '600', color: theme.text.primary, width: 24, textAlign: 'center' }}>{spots}</Text>
            <TouchableOpacity onPress={() => setSpots(Math.min(9, spots + 1))} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: theme.bg.elevated, borderWidth: 1, borderColor: theme.border.default, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.text.primary, fontSize: 18 }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: theme.text.secondary, textTransform: 'uppercase' }}>Study vibe *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {VIBES.map((v) => (
              <TouchableOpacity key={v.value} onPress={() => setVibe(v.value)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: vibe === v.value ? theme.brand.text : theme.border.default, backgroundColor: vibe === v.value ? theme.brand.tint : 'transparent' }}>
                <Text style={{ fontSize: 13, color: vibe === v.value ? theme.brand.text : theme.text.secondary, fontWeight: vibe === v.value ? '500' : '400' }}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: theme.text.secondary, textTransform: 'uppercase' }}>Note (optional)</Text>
          <TextInput value={description} onChangeText={setDescription} placeholder="Anything you'd like people to know..." placeholderTextColor={theme.text.tertiary} multiline numberOfLines={3} maxLength={280} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 6, backgroundColor: theme.bg.elevated, borderWidth: 1, borderColor: theme.border.default, color: theme.text.primary, fontSize: 14, minHeight: 80, textAlignVertical: 'top' }} />
        </View>

        <TouchableOpacity onPress={handleCreate} disabled={!isValid || loading} style={{ height: 48, borderRadius: 12, backgroundColor: theme.brand.primary, alignItems: 'center', justifyContent: 'center', opacity: (!isValid || loading) ? 0.5 : 1, marginTop: 8 }}>
          <Text style={{ color: theme.brand.fg, fontWeight: '600', fontSize: 15 }}>
            {loading ? 'Posting...' : 'Post session'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

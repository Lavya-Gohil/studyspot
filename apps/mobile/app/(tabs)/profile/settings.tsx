import { useEffect, useState } from 'react'
import { View, Text, TextInput, Alert } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import type { Profile } from '@studyspot/types'
import { updateProfile } from '@studyspot/api/profiles'
import { profileUpdateSchema, validate } from '@studyspot/utils/validation'
import { friendlyDbError } from '@studyspot/utils/db-errors'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'
import { Screen, Title, Subtitle, Card, Button, SectionHeading, Chip, Loading } from '@/components/ui'

/**
 * Profile settings.
 *
 * Validation runs through profileUpdateSchema in @studyspot/utils, the same
 * schema the web form uses. Before that was promoted out of apps/web, mobile
 * had no validation layer at all, so identical input could be accepted here
 * and rejected there.
 */

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'Economics', 'Law', 'Medicine', 'Engineering', 'Psychology',
  'History', 'Literature', 'Business', 'Design',
]

export default function SettingsScreen() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [college, setCollege] = useState('')
  const [course, setCourse] = useState('')
  const [bio, setBio] = useState('')
  const [subjects, setSubjects] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/(auth)/login')
        return
      }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!data) return
      const p = data as Profile
      setProfile(p)
      setFullName(p.full_name ?? '')
      setCollege(p.college ?? '')
      setCourse(p.course ?? '')
      setBio(p.bio ?? '')
      setSubjects(p.subjects ?? [])
    })()
  }, [router])

  function toggleSubject(s: string) {
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  async function save() {
    setError('')
    const v = validate(profileUpdateSchema, {
      full_name: fullName,
      college: college || undefined,
      course: course || undefined,
      bio: bio || undefined,
      subjects,
    })
    if (!v.ok) {
      setError(v.error)
      return
    }

    setSaving(true)
    try {
      await updateProfile(supabase, profile!.id, v.data as Partial<Profile>)
      Alert.alert('Saved', 'Your profile is up to date.')
    } catch (e) {
      setError(friendlyDbError((e as Error)?.message))
    }
    setSaving(false)
  }

  if (!profile) return <Loading />

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <Screen>
        <View style={{ gap: 4 }}>
          <Title>Settings</Title>
          <Subtitle>How you appear to other students.</Subtitle>
        </View>

        <Card>
          <Field label="Name" value={fullName} onChange={setFullName} placeholder="Your name" />
          <Field label="College" value={college} onChange={setCollege} placeholder="Your university" />
          <Field label="Course" value={course} onChange={setCourse} placeholder="e.g. Computer Science" />
          <Field label="Bio" value={bio} onChange={setBio} placeholder="A line about how you study" multiline />
        </Card>

        <SectionHeading>Subjects</SectionHeading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {SUBJECTS.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={subjects.includes(s)}
              onPress={() => toggleSubject(s)}
            />
          ))}
        </View>

        {error ? (
          <Text style={{ fontSize: 13, color: theme.accent.red }}>{error}</Text>
        ) : null}

        <Button label="Save changes" onPress={save} loading={saving} />
      </Screen>
    </>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  multiline?: boolean
}) {
  return (
    <View style={{ gap: 6, marginBottom: 12 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: theme.text.tertiary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.text.tertiary}
        multiline={multiline}
        style={{
          minHeight: multiline ? 76 : 44,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 10 : 0,
          borderRadius: 10,
          backgroundColor: theme.bg.elevated,
          borderWidth: 1,
          borderColor: theme.border.default,
          color: theme.text.primary,
          fontSize: 14,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  )
}

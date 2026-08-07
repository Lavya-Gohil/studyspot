import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

export default function VerifyScreen() {
  const router = useRouter()
  const [file, setFile] = useState<{ name: string; uri: string; mimeType: string; size: number } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [skipping, setSkipping] = useState(false)

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'application/pdf'],
      copyToCacheDirectory: true,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      if ((asset.size || 0) > 10 * 1024 * 1024) {
        Alert.alert('Error', 'File must be under 10MB.')
        return
      }
      setFile({ name: asset.name, uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg', size: asset.size || 0 })
    }
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ fileType: file.mimeType, fileSize: file.size }),
    })

    if (!res.ok) {
      const err = await res.json()
      Alert.alert('Error', err.error || 'Upload failed.')
      setUploading(false)
      return
    }

    const { uploadUrl } = await res.json()
    const fileContent = await (await fetch(file.uri)).blob()
    await fetch(uploadUrl, { method: 'PUT', body: fileContent, headers: { 'Content-Type': file.mimeType } })

    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ onboarding_step: 4 }).eq('id', user.id)

    setUploading(false)
    router.push('/(auth)/onboarding/profile-setup')
  }

  async function handleSkip() {
    setSkipping(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('profiles').update({ verification_status: 'unverified', onboarding_step: 4 }).eq('id', user.id)
    router.push('/(auth)/onboarding/profile-setup')
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg.base }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, padding: 24, paddingTop: 60, gap: 24 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 24, fontWeight: '600', color: theme.text.primary }}>Verify your student status</Text>
          <Text style={{ fontSize: 14, color: theme.text.secondary, lineHeight: 20 }}>
            Upload your college ID, timetable, or fee receipt to get a ✓ Verified Student badge. You can skip this and do it later.
          </Text>
        </View>

        <TouchableOpacity
          onPress={pickFile}
          style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: theme.border.default, borderRadius: 14, padding: 32, alignItems: 'center', gap: 12, backgroundColor: 'rgba(123,97,255,0.02)' }}
        >
          <Text style={{ fontSize: 32 }}>📄</Text>
          {file ? (
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ color: theme.text.primary, fontSize: 14, fontWeight: '500' }}>{file.name}</Text>
              <Text style={{ color: theme.text.secondary, fontSize: 12 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</Text>
              <TouchableOpacity onPress={() => setFile(null)}>
                <Text style={{ color: theme.text.secondary, fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ color: theme.text.secondary, fontSize: 14 }}>Tap to upload college ID, timetable, or fee receipt</Text>
              <Text style={{ color: theme.text.tertiary, fontSize: 12 }}>JPG · PNG · PDF · Max 10MB</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ gap: 12 }}>
          {file && (
            <TouchableOpacity
              onPress={handleUpload}
              disabled={uploading}
              style={{ height: 44, borderRadius: 10, backgroundColor: theme.brand.primary, alignItems: 'center', justifyContent: 'center', opacity: uploading ? 0.5 : 1 }}
            >
              <Text style={{ color: theme.brand.fg, fontWeight: '500', fontSize: 14 }}>
                {uploading ? 'Uploading...' : 'Upload & Continue'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleSkip} disabled={skipping} style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: theme.text.secondary, fontSize: 14, textDecorationLine: 'underline' }}>
              {skipping ? 'Skipping...' : 'Skip for now →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

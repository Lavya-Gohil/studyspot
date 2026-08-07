import { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Picker } from '@react-native-picker/picker'
import { useRouter } from 'expo-router'
import { Country, State } from 'country-state-city'
import { supabase } from '@/lib/supabase'
import { theme } from '@/lib/theme'

export default function LocationScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [countryCode, setCountryCode] = useState('')
  const [countryName, setCountryName] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [loading, setLoading] = useState(false)

  const allCountries = Country.getAllCountries()
  const states = countryCode ? State.getStatesOfCountry(countryCode) : []

  async function handleContinue() {
    if (!countryCode) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/(auth)/login'); return }

    const selectedState = states.find((s) => s.isoCode === stateCode)
    const { error } = await supabase.from('profiles').update({
      country: countryCode,
      country_name: countryName,
      state_region: selectedState?.name || stateCode || null,
      onboarding_step: 3,
    }).eq('id', user.id)

    setLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    router.push('/(auth)/onboarding/verify')
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg.base }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, padding: 24, paddingTop: insets.top + 16, gap: 24 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 24, fontWeight: '600', color: theme.text.primary }}>Where are you based?</Text>
          <Text style={{ fontSize: 14, color: theme.text.secondary }}>This helps us show you nearby study sessions.</Text>
        </View>

        <View style={{ gap: 16 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '500', color: theme.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>Country *</Text>
            <View style={{ borderRadius: 6, backgroundColor: theme.bg.elevated, borderWidth: 1, borderColor: theme.border.default, overflow: 'hidden' }}>
              <Picker
                selectedValue={countryCode}
                onValueChange={(value: string) => {
                  const found = allCountries.find((c) => c.isoCode === value)
                  setCountryCode(value)
                  setCountryName(found?.name || '')
                  setStateCode('')
                }}
                style={{ color: theme.text.primary, backgroundColor: theme.bg.elevated }}
                dropdownIconColor={theme.text.secondary}
              >
                <Picker.Item label="Select country..." value="" />
                {allCountries.map((c) => (
                  <Picker.Item key={c.isoCode} label={`${c.flag} ${c.name}`} value={c.isoCode} />
                ))}
              </Picker>
            </View>
          </View>

          {states.length > 0 && (
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '500', color: theme.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>State / Region</Text>
              <View style={{ borderRadius: 6, backgroundColor: theme.bg.elevated, borderWidth: 1, borderColor: theme.border.default, overflow: 'hidden' }}>
                <Picker
                  selectedValue={stateCode}
                  onValueChange={setStateCode}
                  style={{ color: theme.text.primary, backgroundColor: theme.bg.elevated }}
                  dropdownIconColor={theme.text.secondary}
                >
                  <Picker.Item label="Select state / region..." value="" />
                  {states.map((s) => (
                    <Picker.Item key={s.isoCode} label={s.name} value={s.isoCode} />
                  ))}
                </Picker>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={handleContinue}
          disabled={!countryCode || loading}
          style={{ height: 44, borderRadius: 10, backgroundColor: theme.brand.primary, alignItems: 'center', justifyContent: 'center', opacity: (!countryCode || loading) ? 0.5 : 1 }}
        >
          <Text style={{ color: theme.brand.fg, fontWeight: '500', fontSize: 14 }}>
            {loading ? 'Saving...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

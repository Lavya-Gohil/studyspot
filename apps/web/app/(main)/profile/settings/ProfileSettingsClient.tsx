'use client'

import { useState } from 'react'
import { Check, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/profile/Avatar'
import { NotificationToggle } from '@/components/profile/NotificationToggle'
import { Icon } from '@/components/ui/Icon'
import { LocationFields } from '@/components/profile/LocationFields'
import type { CountryOption } from '@/lib/geo-data'
import { SUBJECT_CATEGORIES, YEAR_LABELS, type YearOfStudy } from '@studyspot/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AVATAR_MAX_BYTES, AVATAR_TYPES, profileUpdateSchema, validate } from '@studyspot/utils/validation'
import { friendlyDbError } from '@studyspot/utils/db-errors'

export function ProfileSettingsClient({
  profile,
  countries,
}: {
  profile: any
  countries: CountryOption[]
}) {
  const supabase = createClient()
  const router = useRouter()

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [college, setCollege] = useState(profile?.college || '')
  const [course, setCourse] = useState(profile?.course || '')
  const [yearOfStudy, setYearOfStudy] = useState<YearOfStudy | ''>(profile?.year_of_study || '')
  const [subjects, setSubjects] = useState<string[]>(profile?.subjects || [])
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function pickAvatar(file: File | null) {
    if (!file) return setAvatarFile(null)
    // Validate before upload: type + size (5MB), never trust the picker alone.
    if (!AVATAR_TYPES.includes(file.type)) {
      setError('Avatar must be a JPEG or PNG image.')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError('Avatar must be under 5MB.')
      return
    }
    setError('')
    setAvatarFile(file)
  }

  // Location (so users who move can update where they study)
  const [countryCode, setCountryCode] = useState<string>(profile?.country || '')
  const [countryName, setCountryName] = useState<string>(profile?.country_name || '')
  const [stateCode, setStateCode] = useState<string>('')
  const [stateName, setStateName] = useState<string>(profile?.state_region || '')
  const [city, setCity] = useState<string>(profile?.city || '')

  function toggleSubject(s: string) {
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  async function handleSave() {
    // Schema validation + sanitization of all text fields (lib/validation.ts).
    // Empty optional fields are omitted from validation and saved as null.
    const v = validate(profileUpdateSchema, {
      ...(fullName.trim() ? { full_name: fullName } : {}),
      college,
      course,
      ...(yearOfStudy ? { year_of_study: yearOfStudy } : {}),
      subjects,
      bio,
      ...(countryCode ? { country: countryCode } : {}),
      country_name: countryName,
      state_region: stateName,
      city,
    })
    if (!v.ok) {
      setError(v.error)
      return
    }

    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let avatar_url = profile?.avatar_url

    if (avatarFile) {
      const ext = avatarFile.type === 'image/png' ? 'png' : 'jpg'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(`${user.id}/avatar.${ext}`, avatarFile, { upsert: true })
      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(`${user.id}/avatar.${ext}`)
        avatar_url = data.publicUrl
      }
    }

    const p = v.data
    const { error: saveError } = await supabase.from('profiles').update({
      full_name: p.full_name ?? null,
      college: p.college ?? null,
      course: p.course ?? null,
      year_of_study: p.year_of_study ?? null,
      subjects: p.subjects ?? [],
      bio: p.bio ?? null,
      country: p.country ?? null,
      country_name: p.country_name ?? null,
      state_region: p.state_region ?? null,
      city: p.city ?? null,
      ...(avatar_url !== profile?.avatar_url ? { avatar_url } : {}),
    }).eq('id', user.id)

    if (saveError) {
      setError(friendlyDbError(saveError.message))
      setLoading(false)
      return
    }

    setSaved(true)
    setLoading(false)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Edit profile</h1>
        <Link href={`/profile/${profile?.id}`} className="text-text-secondary hover:text-text-primary text-sm">
          View profile →
        </Link>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <Avatar
          userId={profile?.id || ''}
          name={fullName}
          avatarUrl={avatarFile ? URL.createObjectURL(avatarFile) : profile?.avatar_url}
          size="xl"
        />
        <label className="cursor-pointer text-accent-primary text-sm hover:underline">
          Change photo
          <input type="file" accept="image/jpeg,image/png" onChange={(e) => pickAvatar(e.target.files?.[0] || null)} className="hidden" />
        </label>
      </div>

      {error && <p className="text-accent-red text-sm">{error}</p>}

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Full name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">College / University</label>
          <input type="text" value={college} onChange={(e) => setCollege(e.target.value)} className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Course / Major</label>
          <input type="text" value={course} onChange={(e) => setCourse(e.target.value)} className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent-primary" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Year of study</label>
          <select value={yearOfStudy} onChange={(e) => setYearOfStudy(e.target.value as YearOfStudy)} className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent-primary appearance-none">
            <option value="">Select year</option>
            {Object.entries(YEAR_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} rows={3} className="w-full px-3.5 py-2.5 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent-primary resize-none" />
          <p className="text-text-tertiary text-xs text-right">{280 - bio.length} chars</p>
        </div>

        {/* Location */}
        <div className="space-y-3 rounded-xl border border-border-subtle bg-bg-surface p-4">
          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Location</label>
            <p className="text-text-tertiary text-xs mt-0.5">
              Moved? Update this to see in-person sessions where you now live.
            </p>
          </div>
          <LocationFields
            countries={countries}
            countryCode={countryCode}
            stateCode={stateCode}
            stateName={stateName}
            city={city}
            disabled={loading}
            onCountryChange={(code, name) => {
              setCountryCode(code)
              setCountryName(name)
            }}
            onStateChange={(code, name) => {
              setStateCode(code)
              setStateName(name)
            }}
            onCityChange={setCity}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Subjects</label>
          {SUBJECT_CATEGORIES.map((cat) => (
            <div key={cat.category}>
              <p className="text-text-tertiary text-xs mb-1.5">{cat.category}</p>
              <div className="flex flex-wrap gap-1.5">
                {cat.subjects.map((s) => (
                  <button key={s} type="button" onClick={() => toggleSubject(s)} className={`px-2.5 py-1 rounded-full text-xs transition-colors ${subjects.includes(s) ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50' : 'bg-bg-subtle border border-border-subtle text-text-secondary hover:border-border-default'}`}>{s}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notifications. Per-device, not per-account; the subscription belongs
          to this browser, so the switch reflects this browser only. */}
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
        <NotificationToggle />
      </div>

      {/* Verification status */}
      {profile?.verification_status === 'unverified' && (
        <Link href="/auth/onboarding/verify" className="block bg-accent-primary/[0.06] border border-accent-primary/20 rounded-lg p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <Icon as={ShieldCheck} size="sm" className="text-brand-text" />
            Verify your student status
          </p>
          <p className="text-text-secondary text-xs mt-0.5">Verified users get 3x more approved requests.</p>
        </Link>
      )}
      {profile?.verification_status === 'pending' && (
        <div className="bg-accent-amber/10 border border-accent-amber/30 rounded-lg p-4">
          <p className="text-accent-amber text-sm font-medium">Verification under review</p>
          <p className="text-text-secondary text-xs mt-0.5">We&apos;ll notify you within 24 hours.</p>
        </div>
      )}
      {profile?.verification_status === 'rejected' && (
        <Link href="/auth/onboarding/verify" className="block bg-accent-red/10 border border-accent-red/30 rounded-lg p-4">
          <p className="text-accent-red text-sm font-medium">Verification not approved</p>
          <p className="text-text-secondary text-xs mt-0.5">{profile.verification_rejected_reason || 'Please try uploading again.'}</p>
        </Link>
      )}

      <button onClick={handleSave} disabled={loading} className="w-full h-11 rounded-md bg-accent-primary hover:bg-accent-hover text-accent-fg font-medium text-sm transition-colors disabled:opacity-50">
        {saved ? (
          <span className="inline-flex items-center gap-1.5">
            <Icon as={Check} size="sm" />
            Saved
          </span>
        ) : loading ? (
          'Saving'
        ) : (
          'Save changes'
        )}
      </button>
    </div>
  )
}

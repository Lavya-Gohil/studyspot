'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Country, State } from 'country-state-city'
import { Avatar } from '@/components/profile/Avatar'
import { SUBJECT_CATEGORIES, YEAR_LABELS, type YearOfStudy } from '@studyspot/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function ProfileSettingsClient({ profile }: { profile: any }) {
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

  // Location (so users who move can update where they study)
  const allCountries = Country.getAllCountries()
  const [countryCode, setCountryCode] = useState<string>(profile?.country || '')
  const [countryName, setCountryName] = useState<string>(profile?.country_name || '')
  const [stateName, setStateName] = useState<string>(profile?.state_region || '')
  const [city, setCity] = useState<string>(profile?.city || '')
  const states = countryCode ? State.getStatesOfCountry(countryCode) : []

  function toggleSubject(s: string) {
    setSubjects((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  async function handleSave() {
    setLoading(true)
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

    await supabase.from('profiles').update({
      full_name: fullName.trim() || null,
      college: college.trim() || null,
      course: course.trim() || null,
      year_of_study: yearOfStudy || null,
      subjects,
      bio: bio.trim() || null,
      country: countryCode || null,
      country_name: countryName || null,
      state_region: stateName || null,
      city: city.trim() || null,
      ...(avatar_url !== profile?.avatar_url ? { avatar_url } : {}),
    }).eq('id', user.id)

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
          <input type="file" accept="image/jpeg,image/png" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} className="hidden" />
        </label>
      </div>

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
          <div className="space-y-1">
            <label className="text-xs text-text-secondary">Country</label>
            <select
              value={countryCode}
              onChange={(e) => {
                const code = e.target.value
                setCountryCode(code)
                setCountryName(allCountries.find((c) => c.isoCode === code)?.name || '')
                setStateName('')
              }}
              className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent-primary appearance-none"
            >
              <option value="">Select your country</option>
              {allCountries.map((c) => (
                <option key={c.isoCode} value={c.isoCode}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </div>
          {states.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs text-text-secondary">State / Region</label>
              <select
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent-primary appearance-none"
              >
                <option value="">Select your state / region</option>
                {states.map((s) => (
                  <option key={s.isoCode} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-text-secondary">City (optional)</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Your city"
              className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary"
            />
          </div>
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

      {/* Verification status */}
      {profile?.verification_status === 'unverified' && (
        <Link href="/auth/onboarding/verify" className="block bg-accent-primary/[0.06] border border-accent-primary/20 rounded-lg p-4">
          <p className="font-medium text-text-primary text-sm">✦ Verify your student status →</p>
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
        {saved ? 'Saved ✓' : loading ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  )
}

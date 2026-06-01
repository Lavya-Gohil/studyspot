'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OnboardingProgress } from '@/components/ui/OnboardingProgress'
import { SUBJECT_CATEGORIES, YEAR_LABELS, type YearOfStudy } from '@studyspot/types'

export default function ProfileSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [college, setCollege] = useState('')
  const [course, setCourse] = useState('')
  const [yearOfStudy, setYearOfStudy] = useState<YearOfStudy | ''>('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [subjectSearch, setSubjectSearch] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const allSubjects = SUBJECT_CATEGORIES.flatMap((c) => c.subjects)
  const filteredSubjects = subjectSearch
    ? allSubjects.filter((s) => s.toLowerCase().includes(subjectSearch.toLowerCase()))
    : []

  function toggleSubject(subject: string) {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    )
  }

  async function handleFinish() {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    let avatar_url: string | null = null

    if (avatarFile) {
      const ext = avatarFile.type === 'image/png' ? 'png' : 'jpg'
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })
      if (!uploadError) {
        const { data } = supabase.storage.from('avatars').getPublicUrl(path)
        avatar_url = data.publicUrl
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        college: college.trim() || null,
        course: course.trim() || null,
        year_of_study: yearOfStudy || null,
        subjects: selectedSubjects,
        ...(avatar_url ? { avatar_url } : {}),
        onboarding_step: 5,
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/feed')
  }

  return (
    <div className="space-y-6">
      <OnboardingProgress currentStep={4} />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-text-primary">Set up your study profile</h1>
        <p className="text-text-secondary text-sm">All optional — you can fill this in later.</p>
      </div>

      <div className="space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center overflow-hidden shrink-0">
            {avatarFile ? (
              <img
                src={URL.createObjectURL(avatarFile)}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-text-tertiary text-xs">Photo</span>
            )}
          </div>
          <label className="cursor-pointer text-accent-primary text-sm hover:underline">
            Upload photo
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
        </div>

        {/* College */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            College / University
          </label>
          <input
            type="text"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            placeholder="Your university name"
            className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
          />
        </div>

        {/* Course */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Course / Major
          </label>
          <input
            type="text"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="e.g. Computer Science"
            className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
          />
        </div>

        {/* Year */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Year of study
          </label>
          <select
            value={yearOfStudy}
            onChange={(e) => setYearOfStudy(e.target.value as YearOfStudy)}
            className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary text-sm focus:outline-none focus:border-accent-primary appearance-none"
          >
            <option value="">Select year</option>
            {Object.entries(YEAR_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Subjects */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Subjects / Interests
          </label>
          <input
            type="text"
            value={subjectSearch}
            onChange={(e) => setSubjectSearch(e.target.value)}
            placeholder="Search subjects..."
            className="w-full h-11 px-3.5 rounded-md bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/15"
          />

          {filteredSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filteredSubjects.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSubject(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedSubjects.includes(s)
                      ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
                      : 'bg-bg-elevated border border-border-default text-text-secondary hover:border-border-strong'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {selectedSubjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedSubjects.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-accent-primary/15 text-accent-primary border border-accent-primary/30 flex items-center gap-1.5"
                >
                  {s}
                  <button type="button" onClick={() => toggleSubject(s)} className="opacity-60 hover:opacity-100">
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {!subjectSearch && (
            <div className="space-y-2 mt-2">
              {SUBJECT_CATEGORIES.map((cat) => (
                <div key={cat.category}>
                  <p className="text-text-tertiary text-xs mb-1.5">{cat.category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.subjects.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSubject(s)}
                        className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                          selectedSubjects.includes(s)
                            ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/50'
                            : 'bg-bg-subtle border border-border-subtle text-text-secondary hover:border-border-default'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-accent-red text-sm">{error}</p>}

      <button
        type="button"
        onClick={handleFinish}
        disabled={loading}
        className="w-full h-11 rounded-md bg-accent-primary hover:bg-accent-hover text-white font-medium text-sm transition-colors disabled:opacity-50"
      >
        {loading ? 'Finishing setup...' : 'Finish setup →'}
      </button>
    </div>
  )
}

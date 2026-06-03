import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Avatar } from '@/components/profile/Avatar'
import { ReputationCard } from '@/components/profile/ReputationCard'
import { VerifiedBadge, UnderAgeLabel } from '@/components/ui/Badge'
import { YEAR_LABELS } from '@studyspot/types'
import type { YearOfStudy, StudyStats } from '@studyspot/types'
import Link from 'next/link'

export default async function UserProfilePage({ params }: { params: Promise<{ user_id: string }> }) {
  const { user_id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, college, course, year_of_study, subjects, bio, verification_status, is_minor, study_streak, total_sessions_hosted, total_sessions_attended, created_at')
    .eq('id', user_id)
    .single()

  if (!profile) notFound()

  const isOwnProfile = user?.id === user_id

  const { data: statsRow } = await supabase
    .from('user_study_stats')
    .select('*')
    .eq('user_id', user_id)
    .maybeSingle()

  const stats: StudyStats = (statsRow as StudyStats | null) ?? {
    user_id,
    verified_hours: 0,
    verified_sessions: 0,
    on_time_count: 0,
    approved_count: 0,
    showed_count: 0,
    avg_rating: null,
    rating_count: 0,
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Profile header */}
      <div className="bg-bg-surface border border-border-subtle rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between">
          <Avatar userId={profile.id} name={profile.full_name} avatarUrl={profile.avatar_url} size="xl" />
          {isOwnProfile && (
            <Link
              href="/profile/settings"
              className="h-8 px-4 rounded-md bg-bg-elevated border border-border-default text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              Edit profile
            </Link>
          )}
          {!isOwnProfile && (
            <div className="flex gap-2">
              <ReportButton reportedId={user_id} />
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold text-text-primary">{profile.full_name || 'Anonymous'}</h1>
            {profile.verification_status === 'verified' && <VerifiedBadge size="md" />}
            {profile.is_minor && <UnderAgeLabel />}
          </div>
          {profile.college && <p className="text-text-secondary">{profile.college}</p>}
          {profile.course && (
            <p className="text-text-secondary text-sm">
              {profile.course}
              {profile.year_of_study ? ` · ${YEAR_LABELS[profile.year_of_study as YearOfStudy]}` : ''}
            </p>
          )}
        </div>

        {profile.bio && <p className="text-text-primary text-sm">{profile.bio}</p>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border-subtle">
          <div className="text-center">
            <div className="text-xl font-semibold font-mono text-text-primary">
              {profile.total_sessions_attended}
            </div>
            <div className="text-xs text-text-tertiary">Attended</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold font-mono text-text-primary">
              {profile.total_sessions_hosted}
            </div>
            <div className="text-xs text-text-tertiary">Hosted</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold font-mono text-text-primary">
              🔥 {profile.study_streak}
            </div>
            <div className="text-xs text-text-tertiary">Day streak</div>
          </div>
        </div>
      </div>

      {/* Reputation & verified hours */}
      <ReputationCard stats={stats} isOwn={isOwnProfile} />

      {/* Subjects */}
      {profile.subjects && profile.subjects.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Subjects</h2>
          <div className="flex flex-wrap gap-2">
            {profile.subjects.map((s: string) => (
              <span key={s} className="px-3 py-1 rounded-full text-xs font-medium bg-bg-elevated border border-border-default text-text-secondary">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Verification prompt for own profile */}
      {isOwnProfile && profile.verification_status === 'unverified' && (
        <Link
          href="/auth/onboarding/verify"
          className="block bg-accent-primary/[0.06] border border-accent-primary/20 rounded-lg p-4 hover:bg-accent-primary/[0.10] transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-text-primary text-sm">✦ Verify your student status</p>
              <p className="text-text-secondary text-xs mt-0.5">
                Verified users get 3x more approved requests. It only takes 2 minutes.
              </p>
            </div>
            <span className="text-accent-primary text-sm shrink-0">→</span>
          </div>
        </Link>
      )}
    </div>
  )
}

function ReportButton({ reportedId }: { reportedId: string }) {
  return (
    <form action={`/api/report`} method="post">
      <input type="hidden" name="reportedId" value={reportedId} />
      <button
        type="button"
        className="h-8 px-3 rounded-md bg-bg-elevated border border-border-default text-text-secondary hover:text-text-primary text-xs transition-colors"
        onClick={() => {
          const reason = prompt('Report reason: harassment, spam, inappropriate, fake_profile, other')
          if (reason) {
            fetch('/api/report', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reportedId, reason }),
            })
          }
        }}
      >
        ···
      </button>
    </form>
  )
}

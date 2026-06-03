import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/profile/Avatar'
import { VerifiedBadge } from '@/components/ui/Badge'
import { scoreCompatibility, scoreSimilarity, type MatchProfile } from '@/lib/matching'
import type { StudyStats } from '@studyspot/types'

const PROFILE_FIELDS =
  'id, full_name, avatar_url, college, course, year_of_study, subjects, city, country, study_streak, total_sessions_attended, verification_status'

export default async function MatchPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: meRow } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', user.id)
    .single()

  const me = meRow as unknown as MatchProfile
  const mySubjects: string[] = me?.subjects || []

  // Candidate pool: people who share a subject with me (best signal),
  // falling back to same-country students.
  let query = supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .neq('id', user.id)
    .eq('is_banned', false)
    .gte('onboarding_step', 5)
    .limit(60)

  if (mySubjects.length > 0) {
    query = query.overlaps('subjects', mySubjects)
  } else if (me?.country) {
    query = query.eq('country', me.country)
  }

  const { data: candRows } = await query
  const candidates = (candRows as unknown as MatchProfile[]) || []

  // Reputation/stats for the candidate pool, in one query.
  const statsById = new Map<string, StudyStats>()
  if (candidates.length > 0) {
    const { data: statRows } = await supabase
      .from('user_study_stats')
      .select('*')
      .in(
        'user_id',
        candidates.map((c) => c.id)
      )
    for (const s of (statRows as StudyStats[]) || []) statsById.set(s.user_id, s)
  }

  const compat = candidates
    .map((c) => scoreCompatibility(me, c, statsById.get(c.id)))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)

  const similar = candidates
    .map((c) => scoreSimilarity(me, c))
    .sort((a, b) => b.score - a.score)
  const twin = similar[0] && similar[0].score >= 40 ? similar[0] : null

  const recommended = compat.slice(0, 12)

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Find your people</h1>
        <p className="text-sm text-text-secondary">
          Matched on your subjects, course, year, and study habits.
        </p>
      </div>

      {mySubjects.length === 0 && (
        <div className="rounded-xl border border-accent-primary/20 bg-accent-primary/[0.06] p-4 text-sm text-text-secondary">
          Add your subjects in{' '}
          <Link href="/profile/settings" className="text-accent-primary hover:underline">
            profile settings
          </Link>{' '}
          to get much better matches.
        </div>
      )}

      {/* Study Twin */}
      {twin && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Your study twin
          </h2>
          <Link
            href={`/profile/${twin.profile.id}`}
            className="block rounded-2xl border border-accent-primary/30 bg-accent-primary/[0.06] p-5 transition-colors hover:border-accent-primary/50"
          >
            <div className="flex items-center gap-4">
              <Avatar
                userId={twin.profile.id}
                name={twin.profile.full_name}
                avatarUrl={twin.profile.avatar_url}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-display text-lg font-semibold">
                    {twin.profile.full_name || 'Student'}
                  </h3>
                  {twin.profile.verification_status === 'verified' && <VerifiedBadge />}
                </div>
                {twin.profile.college && (
                  <p className="truncate text-sm text-text-secondary">{twin.profile.college}</p>
                )}
                {twin.reasons.length > 0 && (
                  <p className="mt-1 text-xs text-text-tertiary">{twin.reasons.join(' · ')}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="font-display text-2xl font-bold tnum text-accent-primary">
                  {twin.score}%
                </div>
                <div className="text-[11px] text-text-tertiary">similar</div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Recommended partners */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Recommended study partners
        </h2>
        {recommended.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            No matches yet. Add subjects to your profile, or check back as more students join.
          </p>
        ) : (
          <div className="space-y-3">
            {recommended.map((r) => (
              <Link
                key={r.profile.id}
                href={`/profile/${r.profile.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-bg-surface p-4 transition-colors hover:border-border-default"
              >
                <Avatar
                  userId={r.profile.id}
                  name={r.profile.full_name}
                  avatarUrl={r.profile.avatar_url}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-text-primary">
                      {r.profile.full_name || 'Student'}
                    </span>
                    {r.profile.verification_status === 'verified' && <VerifiedBadge />}
                  </div>
                  {r.reasons.length > 0 && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">
                      {r.reasons.join(' · ')}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-display text-lg font-bold tnum text-accent-primary">
                    {r.score}
                  </div>
                  <div className="text-[10px] text-text-tertiary">match</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

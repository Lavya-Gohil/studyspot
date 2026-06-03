import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/profile/Avatar'
import { CircleDetailClient } from './CircleDetailClient'
import type { CirclePost } from '@studyspot/types'

export default async function CircleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: circle } = await supabase.from('circles').select('*').eq('id', id).single()
  if (!circle) notFound()

  const { data: members } = await supabase
    .from('circle_members')
    .select('role, member:profiles!user_id(id, full_name, avatar_url, college, verification_status)')
    .eq('circle_id', id)
    .order('created_at', { ascending: true })

  const myMembership = ((members as any[]) || []).find((m) => m.member?.id === user.id)
  const isMember = !!myMembership
  const isOwner = circle.owner_id === user.id

  let posts: CirclePost[] = []
  if (isMember) {
    const { data } = await supabase
      .from('circle_posts')
      .select('*, author:profiles!author_id(id, full_name, avatar_url)')
      .eq('circle_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    posts = (data as CirclePost[]) || []
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Link
        href="/circles"
        className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        ← All circles
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border-subtle bg-bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-elevated text-2xl">
            {circle.emoji || '📚'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold">{circle.name}</h1>
              {circle.is_private && (
                <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] text-text-tertiary">
                  private
                </span>
              )}
            </div>
            {circle.topic && <p className="text-sm text-text-secondary">{circle.topic}</p>}
            <p className="mt-1 text-xs text-text-tertiary">
              {circle.member_count} {circle.member_count === 1 ? 'member' : 'members'}
            </p>
          </div>
        </div>
        {circle.description && (
          <p className="mt-4 text-sm text-text-secondary">{circle.description}</p>
        )}
      </div>

      <CircleDetailClient
        circleId={id}
        joinCode={circle.join_code}
        isMember={isMember}
        isOwner={isOwner}
        userId={user.id}
        initialPosts={posts}
      />

      {/* Members */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Members
        </h2>
        <div className="space-y-2">
          {((members as any[]) || []).map((m) => (
            <Link
              key={m.member?.id}
              href={`/profile/${m.member?.id}`}
              className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface p-3 transition-colors hover:border-border-default"
            >
              <Avatar
                userId={m.member?.id}
                name={m.member?.full_name}
                avatarUrl={m.member?.avatar_url}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {m.member?.full_name || 'Member'}
                </p>
                {m.member?.college && (
                  <p className="truncate text-xs text-text-secondary">{m.member.college}</p>
                )}
              </div>
              {m.role !== 'member' && (
                <span className="rounded-full bg-accent-primary/15 px-2 py-0.5 text-[11px] font-medium capitalize text-accent-primary">
                  {m.role}
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

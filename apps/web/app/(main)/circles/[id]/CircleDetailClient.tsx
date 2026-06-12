'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/profile/Avatar'
import { formatRelativeTime } from '@studyspot/utils'
import type { CirclePost } from '@studyspot/types'
import { circlePostSchema, friendlyDbError, validate } from '@/lib/validation'

interface Props {
  circleId: string
  joinCode: string
  isMember: boolean
  isOwner: boolean
  userId: string
  initialPosts: CirclePost[]
}

export function CircleDetailClient({
  circleId,
  joinCode,
  isMember,
  isOwner,
  userId,
  initialPosts,
}: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [member, setMember] = useState(isMember)
  const [posts, setPosts] = useState<CirclePost[]>(initialPosts)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  async function join() {
    setBusy(true)
    await supabase.from('circle_members').insert({ circle_id: circleId, user_id: userId })
    setBusy(false)
    setMember(true)
    router.refresh()
  }

  async function leave() {
    setBusy(true)
    await supabase
      .from('circle_members')
      .delete()
      .eq('circle_id', circleId)
      .eq('user_id', userId)
    setBusy(false)
    setMember(false)
    router.refresh()
  }

  async function post(e: React.FormEvent) {
    e.preventDefault()
    // Sanitize + length-check via schema before insert (lib/validation.ts).
    const v = validate(circlePostSchema, { content: input })
    if (!v.ok) return
    setInput('')
    const { data, error } = await supabase
      .from('circle_posts')
      .insert({ circle_id: circleId, author_id: userId, content: v.data.content })
      .select('*, author:profiles!author_id(id, full_name, avatar_url)')
      .single()
    if (error) {
      // Restore the draft so a rate-limited post isn't lost.
      setInput(v.data.content)
      alert(friendlyDbError(error.message))
      return
    }
    if (data) setPosts((prev) => [data as CirclePost, ...prev])
  }

  return (
    <div className="space-y-5">
      {/* Membership actions */}
      <div className="flex flex-wrap items-center gap-2">
        {isOwner ? (
          <span className="inline-flex h-9 items-center rounded-md border border-border-default bg-bg-elevated px-3 text-sm text-text-secondary">
            You own this circle
          </span>
        ) : member ? (
          <button
            onClick={leave}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-md border border-border-default bg-bg-elevated px-4 text-sm text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
          >
            Leave circle
          </button>
        ) : (
          <button
            onClick={join}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-md bg-accent-primary px-5 text-sm font-medium text-accent-fg transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
          >
            Join circle
          </button>
        )}

        {member && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(joinCode)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border-default bg-bg-elevated px-3 text-sm text-text-secondary transition-colors hover:text-text-primary"
            title="Share this code to invite people"
          >
            <span className="font-mono tracking-wider text-text-primary">{joinCode}</span>
            {copied ? '✓ copied' : 'invite code'}
          </button>
        )}
      </div>

      {/* Discussion wall */}
      {member ? (
        <div className="space-y-4">
          <form onSubmit={post} className="flex items-start gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Share an update, resource, or question…"
              maxLength={1000}
              rows={2}
              className="flex-1 resize-none rounded-md border border-border-default bg-bg-elevated px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="h-11 shrink-0 rounded-md bg-accent-primary px-4 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              Post
            </button>
          </form>

          <div className="space-y-3">
            {posts.length === 0 && (
              <p className="py-6 text-center text-sm text-text-tertiary">
                No posts yet. Start the conversation.
              </p>
            )}
            {posts.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border-subtle bg-bg-surface p-4"
              >
                <div className="flex items-center gap-2">
                  <Avatar
                    userId={p.author_id || ''}
                    name={p.author?.full_name || null}
                    avatarUrl={p.author?.avatar_url || null}
                    size="xs"
                  />
                  <span className="text-sm font-medium text-text-primary">
                    {p.author?.full_name || 'Member'}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {formatRelativeTime(p.created_at)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{p.content}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-border-subtle bg-bg-surface p-5 text-sm text-text-secondary">
          Join this circle to see and join the discussion.
        </p>
      )}
    </div>
  )
}

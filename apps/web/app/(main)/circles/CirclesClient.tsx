'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Circle } from '@studyspot/types'
import { createCircleSchema, friendlyDbError, joinCodeSchema, validate } from '@/lib/validation'

const EMOJIS = ['📚', '🧪', '💻', '⚖️', '🩺', '🎨', '🗣️', '🧮', '🌍', '🎯']

interface Props {
  mine: Circle[]
  discover: Circle[]
  userId: string
}

export function CirclesClient({ mine, discover, userId }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('📚')
  const [isPrivate, setIsPrivate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')

  async function createCircle() {
    // Schema validation + sanitization (lib/validation.ts) before insert.
    const v = validate(createCircleSchema, {
      name,
      topic,
      description,
      emoji,
      is_private: isPrivate,
    })
    if (!v.ok) {
      setError(v.error)
      return
    }
    setCreating(true)
    setError('')
    const { data, error } = await supabase
      .from('circles')
      .insert({
        owner_id: userId,
        name: v.data.name,
        topic: v.data.topic ?? null,
        description: v.data.description ?? null,
        emoji: v.data.emoji ?? '📚',
        is_private: v.data.is_private,
      })
      .select('id')
      .single()
    setCreating(false)
    if (error) {
      setError(friendlyDbError(error.message))
      return
    }
    router.push(`/circles/${data.id}`)
  }

  async function joinByCode() {
    // Codes are exactly 6 alphanumerics — reject anything else locally
    // (the RPC re-validates and rate-limits server-side).
    const v = validate(joinCodeSchema, joinCode)
    if (!v.ok) {
      setError(v.error)
      return
    }
    setError('')
    const { data, error } = await supabase.rpc('join_circle_by_code', { p_code: v.data })
    if (error) {
      setError(
        error.message.includes('rate_limit_exceeded')
          ? 'Too many attempts — wait a minute and try again.'
          : 'No circle found for that code.'
      )
      return
    }
    router.push(`/circles/${data}`)
  }

  async function join(circleId: string) {
    await supabase.from('circle_members').insert({ circle_id: circleId, user_id: userId })
    router.push(`/circles/${circleId}`)
  }

  const myIds = new Set(mine.map((c) => c.id))

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Study circles</h1>
          <p className="text-sm text-text-secondary">
            Private communities for exams, subjects, and interests.
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex h-9 shrink-0 items-center rounded-md bg-accent-primary px-4 text-sm font-medium text-accent-fg transition-all hover:bg-accent-hover active:scale-[0.98]"
        >
          {showCreate ? 'Close' : '+ New circle'}
        </button>
      </div>

      {/* Join by code */}
      <div className="flex items-center gap-2">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Enter a join code"
          className="h-10 flex-1 rounded-md border border-border-default bg-bg-elevated px-3.5 text-sm uppercase tracking-wider text-text-primary placeholder:normal-case placeholder:tracking-normal placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
        />
        <button
          onClick={joinByCode}
          className="h-10 rounded-md border border-border-default bg-bg-elevated px-4 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          Join
        </button>
      </div>

      {error && <p className="text-sm text-accent-red">{error}</p>}

      {/* Create form */}
      {showCreate && (
        <div className="space-y-4 rounded-2xl border border-border-default bg-bg-surface p-5">
          <div className="flex gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg ${
                  emoji === e ? 'border-accent-primary bg-accent-primary/10' : 'border-border-default'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Circle name (e.g. NEET 2026 Grinders)"
            maxLength={60}
            className="h-11 w-full rounded-md border border-border-default bg-bg-elevated px-3.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
          />
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic / exam / subject (optional)"
            maxLength={60}
            className="h-11 w-full rounded-md border border-border-default bg-bg-elevated px-3.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this circle about?"
            maxLength={280}
            rows={2}
            className="w-full resize-none rounded-md border border-border-default bg-bg-elevated px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
          />
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-4 w-4 accent-accent-primary"
            />
            Private — only people with the join code can join
          </label>
          <button
            onClick={createCircle}
            disabled={creating || name.trim().length < 2}
            className="h-11 w-full rounded-md bg-accent-primary text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create circle'}
          </button>
        </div>
      )}

      {/* My circles */}
      {mine.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Your circles
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {mine.map((c) => (
              <CircleCard key={c.id} circle={c} href={`/circles/${c.id}`} />
            ))}
          </div>
        </section>
      )}

      {/* Discover */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Discover
        </h2>
        {discover.filter((c) => !myIds.has(c.id)).length === 0 ? (
          <p className="text-sm text-text-tertiary">No public circles yet — create the first one.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {discover
              .filter((c) => !myIds.has(c.id))
              .map((c) => (
                <CircleCard key={c.id} circle={c} onJoin={() => join(c.id)} />
              ))}
          </div>
        )}
      </section>
    </div>
  )
}

function CircleCard({
  circle,
  href,
  onJoin,
}: {
  circle: Circle
  href?: string
  onJoin?: () => void
}) {
  const body = (
    <div className="flex h-full flex-col rounded-2xl border border-border-subtle bg-bg-surface p-5 transition-colors hover:border-border-default">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-elevated text-xl">
          {circle.emoji || '📚'}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-display font-semibold">{circle.name}</h3>
          {circle.topic && <p className="truncate text-xs text-text-secondary">{circle.topic}</p>}
        </div>
      </div>
      {circle.description && (
        <p className="mt-3 line-clamp-2 text-sm text-text-secondary">{circle.description}</p>
      )}
      <div className="mt-4 flex items-center justify-between pt-1">
        <span className="text-xs text-text-tertiary">
          {circle.member_count} {circle.member_count === 1 ? 'member' : 'members'}
          {circle.is_private && ' · private'}
        </span>
        {onJoin && (
          <button
            onClick={onJoin}
            className="h-7 rounded-md bg-accent-primary/15 px-3 text-xs font-medium text-accent-primary transition-colors hover:bg-accent-primary/25"
          >
            Join
          </button>
        )}
      </div>
    </div>
  )
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  )
}

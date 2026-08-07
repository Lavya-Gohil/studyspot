'use client'

import { useState } from 'react'
import { Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/ui/Icon'
import { goalProgress, goalTypeLabel } from '@studyspot/utils'
import { createGoalSchema, validate } from '@studyspot/utils/validation'
import { friendlyDbError } from '@studyspot/utils/db-errors'
import type { Goal, GoalType } from '@studyspot/types'

interface Props {
  initialGoals: Goal[]
  stats: { verified_hours: number; verified_sessions: number }
  userId: string
}

export function GoalsClient({ initialGoals, stats, userId }: Props) {
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [showCreate, setShowCreate] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<GoalType>('hours')
  const [target, setTarget] = useState('10')
  const [unit, setUnit] = useState('')
  const [deadline, setDeadline] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [creating, setCreating] = useState(false)

  function statFor(g: Goal) {
    return g.type === 'hours' ? stats.verified_hours : g.type === 'sessions' ? stats.verified_sessions : 0
  }

  async function createGoal() {
    // Schema validation + sanitization (lib/validation.ts) before insert.
    const v = validate(createGoalSchema, {
      title,
      description,
      type,
      target,
      unit: type === 'hours' ? 'hours' : type === 'sessions' ? 'sessions' : unit || 'units',
      deadline,
      is_public: isPublic,
    })
    if (!v.ok) {
      alert(v.error)
      return
    }
    setCreating(true)
    const baseline = type === 'hours' ? stats.verified_hours : type === 'sessions' ? stats.verified_sessions : 0
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        title: v.data.title,
        description: v.data.description ?? null,
        type: v.data.type,
        target: v.data.target,
        baseline,
        unit: v.data.unit ?? 'units',
        deadline: v.data.deadline ?? null,
        is_public: v.data.is_public ?? true,
      })
      .select('*')
      .single()
    setCreating(false)
    if (error) {
      alert(friendlyDbError(error.message))
      return
    }
    if (data) {
      setGoals((prev) => [data as Goal, ...prev])
      setShowCreate(false)
      setTitle('')
      setDescription('')
      setTarget('10')
      setUnit('')
      setDeadline('')
    }
  }

  async function addProgress(goal: Goal, amount: number) {
    const next = Math.max(0, goal.manual_progress + amount)
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, manual_progress: next } : g)))
    await supabase.from('goals').update({ manual_progress: next }).eq('id', goal.id)
  }

  async function setStatus(goal: Goal, status: Goal['status']) {
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? { ...g, status } : g)))
    await supabase.from('goals').update({ status }).eq('id', goal.id)
  }

  async function remove(goal: Goal) {
    setGoals((prev) => prev.filter((g) => g.id !== goal.id))
    await supabase.from('goals').delete().eq('id', goal.id)
  }

  const active = goals.filter((g) => g.status === 'active')
  const done = goals.filter((g) => g.status !== 'active')

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Accountability</h1>
          <p className="text-sm text-text-secondary">
            Commit to a goal and track your progress.
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex h-9 shrink-0 items-center rounded-md bg-accent-primary px-4 text-sm font-medium text-accent-fg transition-all hover:bg-accent-hover active:scale-[0.98]"
        >
          {showCreate ? 'Close' : '+ New goal'}
        </button>
      </div>

      {showCreate && (
        <div className="space-y-4 rounded-2xl border border-border-default bg-bg-surface p-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Goal (e.g. Study 40 hours before finals)"
            maxLength={120}
            className="h-11 w-full rounded-md border border-border-default bg-bg-elevated px-3.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary">Track</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as GoalType)}
                className="mt-1 h-11 w-full rounded-md border border-border-default bg-bg-elevated px-3 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              >
                <option value="hours">Verified study hours (auto)</option>
                <option value="sessions">Sessions attended (auto)</option>
                <option value="custom">Custom (manual)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-secondary">Target</label>
              <input
                type="number"
                min="1"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-border-default bg-bg-elevated px-3.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              />
            </div>
          </div>
          {type === 'custom' && (
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unit (e.g. chapters, problems, pages)"
              maxLength={20}
              className="h-11 w-full rounded-md border border-border-default bg-bg-elevated px-3.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
            />
          )}
          <div>
            <label className="text-xs text-text-secondary">Deadline (optional)</label>
            <input
              type="date"
              value={deadline}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border-default bg-bg-elevated px-3.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 accent-accent-primary"
            />
            Make this goal public (others can see it for accountability)
          </label>
          <button
            onClick={createGoal}
            disabled={creating || title.trim().length < 2}
            className="h-11 w-full rounded-md bg-accent-primary text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Commit to goal'}
          </button>
        </div>
      )}

      {goals.length === 0 && !showCreate && (
        <div className="rounded-2xl border border-border-subtle bg-bg-surface p-10 text-center">
          <Icon as={Target} size="xl" className="mx-auto text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            No goals yet. Commit to one and hold yourself accountable.
          </p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              statValue={statFor(g)}
              onAdd={(amt) => addProgress(g, amt)}
              onComplete={() => setStatus(g, 'completed')}
              onRemove={() => remove(g)}
            />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            Past goals
          </h2>
          {done.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              statValue={statFor(g)}
              onAdd={() => {}}
              onComplete={() => {}}
              onRemove={() => remove(g)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GoalCard({
  goal,
  statValue,
  onAdd,
  onComplete,
  onRemove,
}: {
  goal: Goal
  statValue: number
  onAdd: (amount: number) => void
  onComplete: () => void
  onRemove: () => void
}) {
  const { current, percent, complete } = goalProgress(goal, statValue)
  const isActive = goal.status === 'active'
  const deadlinePassed = goal.deadline && new Date(goal.deadline) < new Date()

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-semibold">{goal.title}</h3>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {goalTypeLabel(goal.type)}
            {goal.deadline && (
              <>
                {' · '}
                <span className={deadlinePassed && isActive ? 'text-accent-red' : ''}>
                  due {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </>
            )}
            {!goal.is_public && ' · private'}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            goal.status === 'completed' || complete
              ? 'bg-accent-green/15 text-accent-green'
              : goal.status === 'failed'
                ? 'bg-accent-red/15 text-accent-red'
                : 'bg-accent-primary/15 text-accent-primary'
          }`}
        >
          {goal.status === 'completed' ? 'Completed' : complete ? 'Reached' : `${percent}%`}
        </span>
      </div>

      {goal.description && (
        <p className="mt-2 text-sm text-text-secondary">{goal.description}</p>
      )}

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span className="tnum">
            {current} / {goal.target} {goal.unit}
          </span>
          <span className="tnum">{percent}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bg-subtle">
          <div
            className={`h-full rounded-full ${complete ? 'bg-accent-green' : 'bg-accent-primary'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      {isActive && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {goal.type === 'custom' && (
            <>
              <button
                onClick={() => onAdd(1)}
                className="h-8 rounded-md border border-border-default bg-bg-elevated px-3 text-xs text-text-secondary hover:text-text-primary"
              >
                +1
              </button>
              <button
                onClick={() => onAdd(5)}
                className="h-8 rounded-md border border-border-default bg-bg-elevated px-3 text-xs text-text-secondary hover:text-text-primary"
              >
                +5
              </button>
            </>
          )}
          <button
            onClick={onComplete}
            className="h-8 rounded-md bg-accent-green/15 px-3 text-xs font-medium text-accent-green hover:bg-accent-green/25"
          >
            Mark complete
          </button>
          <button
            onClick={onRemove}
            className="ml-auto h-8 rounded-md px-2 text-xs text-text-tertiary hover:text-accent-red"
          >
            Delete
          </button>
        </div>
      )}
      {!isActive && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onRemove}
            className="text-xs text-text-tertiary hover:text-accent-red"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

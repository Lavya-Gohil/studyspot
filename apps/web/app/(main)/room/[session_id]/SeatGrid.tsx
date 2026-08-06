'use client'

import { Avatar } from '@/components/profile/Avatar'
import type { CurrentUser, Member } from './types'

/**
 * The classroom itself: a grid of seats showing who is present and whether
 * they're focusing or on a break. Presence is the whole point of the virtual
 * room — seeing other people working is the mechanism that makes body-doubling
 * effective — so this is the primary surface, not a sidebar.
 */
export function SeatGrid({
  seatCount,
  members,
  currentUser,
  onClaimSeat,
}: {
  seatCount: number
  members: Member[]
  currentUser: CurrentUser
  onClaimSeat: (index: number) => void
}) {
  const bySeat = new Map<number, Member>()
  members.forEach((m) => {
    if (m.seat >= 0) bySeat.set(m.seat, m)
  })

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="mx-auto grid max-w-2xl grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: seatCount }).map((_, i) => {
          const occupant = bySeat.get(i)
          const isMine = occupant?.user_id === currentUser.id
          const label = occupant
            ? isMine
              ? 'You'
              : occupant.name?.split(' ')[0] || 'Student'
            : 'Sit'

          return (
            <button
              key={i}
              onClick={() => onClaimSeat(i)}
              disabled={Boolean(occupant)}
              aria-label={
                occupant
                  ? `${occupant.name ?? 'Student'}, ${occupant.status === 'focusing' ? 'focusing' : 'on break'}`
                  : `Take seat ${i + 1}`
              }
              className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border p-2 transition-all ${
                occupant
                  ? isMine
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-default bg-bg-surface'
                  : 'cursor-pointer border-dashed border-border-subtle bg-transparent hover:border-accent-primary/50 hover:bg-bg-surface'
              }`}
            >
              {occupant ? (
                <>
                  <div
                    className={`rounded-full ${
                      occupant.status === 'focusing'
                        ? 'ring-2 ring-accent-green'
                        : 'opacity-60 ring-2 ring-accent-amber'
                    }`}
                  >
                    <Avatar
                      userId={occupant.user_id}
                      name={occupant.name}
                      avatarUrl={occupant.avatar_url}
                      size="md"
                    />
                  </div>
                  <span className="max-w-full truncate text-[11px] text-text-secondary">
                    {label}
                  </span>
                </>
              ) : (
                <span className="text-xs text-text-tertiary">Sit</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

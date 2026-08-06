'use client'

import { useMemo } from 'react'
import { FocusTimer } from './FocusTimer'
import { RoomChat } from './RoomChat'
import { RoomHeader } from './RoomHeader'
import { SeatGrid } from './SeatGrid'
import { useRoomChannel } from './useRoomChannel'
import type { CurrentUser, SessionInfo } from './types'

/**
 * Virtual study room. Composition only — presence, the shared timer and chat
 * each own their own state and markup:
 *
 *   useRoomChannel  realtime: presence, timer broadcast, message stream
 *   RoomHeader      title, live counts, focus/break toggle
 *   SeatGrid        who's here and where they're sitting
 *   FocusTimer      the shared countdown
 *   RoomChat        messages
 */
export function RoomClient({
  session,
  currentUser,
}: {
  session: SessionInfo
  currentUser: CurrentUser
}) {
  // At least the group size, rounded up to a tidy grid of 4.
  const seatCount = useMemo(
    () => Math.max(8, Math.ceil((session.spots_total + 1) / 4) * 4),
    [session.spots_total]
  )

  const {
    members,
    messages,
    timer,
    myStatus,
    connected,
    claimSeat,
    toggleStatus,
    publishTimer,
    sendMessage,
  } = useRoomChannel({ session, currentUser, seatCount })

  const focusingCount = members.filter((m) => m.status === 'focusing').length

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col lg:flex-row">
      <div className="flex min-h-0 flex-1 flex-col">
        <RoomHeader
          session={session}
          memberCount={members.length}
          focusingCount={focusingCount}
          myStatus={myStatus}
          connected={connected}
          onToggleStatus={toggleStatus}
        />

        {session.vibe === 'silent' ? (
          <div className="shrink-0 border-b border-border-subtle bg-accent-primary/5 px-4 py-2 text-center text-xs text-text-secondary">
            🔇 Silent study — mics off, chat quiet. Just focus together and keep each other
            accountable.
          </div>
        ) : null}

        <SeatGrid
          seatCount={seatCount}
          members={members}
          currentUser={currentUser}
          onClaimSeat={claimSeat}
        />

        <FocusTimer timer={timer} onPublish={publishTimer} />
      </div>

      <RoomChat
        messages={messages}
        currentUser={currentUser}
        canSend={session.status !== 'cancelled'}
        onSend={sendMessage}
      />
    </div>
  )
}

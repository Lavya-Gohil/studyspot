'use client'

import { useEffect, useRef, useState } from 'react'
import { formatRelativeTime } from '@studyspot/utils'
import type { Message } from '@studyspot/types'
import { useToast } from '@/components/ui/Toast'
import { friendlyDbError } from '@/lib/db-errors'
import { messageSchema, validate } from '@/lib/validation'
import type { CurrentUser } from './types'

/** How close to the bottom still counts as "following the conversation". */
const STICK_THRESHOLD_PX = 80

export function RoomChat({
  messages,
  currentUser,
  canSend,
  onSend,
}: {
  messages: Message[]
  currentUser: CurrentUser
  canSend: boolean
  /** Resolves to a Postgres error, or null on success. */
  onSend: (content: string) => Promise<{ message: string } | null>
}) {
  const toast = useToast()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  // Only follow new messages when the reader is already at the bottom —
  // auto-scrolling unconditionally yanked people out of the history they had
  // deliberately scrolled back to.
  const stickToBottom = useRef(true)

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottom.current = distance <= STICK_THRESHOLD_PX
  }

  useEffect(() => {
    if (!stickToBottom.current) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return

    // Sanitize + length-check before insert; mirrors the DB CHECK constraint.
    const parsed = validate(messageSchema, { content: input })
    if (!parsed.ok) {
      toast.error(parsed.error)
      return
    }

    setSending(true)
    setInput('')
    const error = await onSend(parsed.data.content)
    setSending(false)

    if (error) {
      setInput(parsed.data.content) // restore a rate-limited draft
      toast.error(friendlyDbError(error.message))
    } else {
      // A successful send means the reader intends to be at the bottom.
      stickToBottom.current = true
    }
  }

  return (
    <div className="flex min-h-0 flex-col border-t border-border-subtle lg:w-80 lg:border-l lg:border-t-0">
      <div className="shrink-0 border-b border-border-subtle px-4 py-2.5 text-sm font-medium text-text-primary">
        Room chat
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-text-tertiary">No messages yet.</p>
        ) : null}

        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUser.id

          if (msg.type === 'system' || msg.type === 'checkin') {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="rounded-full bg-bg-subtle px-3 py-1 text-[11px] text-text-tertiary">
                  {msg.content}
                </span>
              </div>
            )
          }

          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              {!isOwn ? (
                <span className="mb-0.5 ml-1 text-[11px] text-text-tertiary">
                  {msg.sender?.full_name}
                </span>
              ) : null}
              <div
                className={`max-w-[85%] rounded-xl px-3 py-1.5 text-sm ${
                  isOwn
                    ? 'rounded-br-sm bg-accent-primary text-accent-fg'
                    : 'rounded-bl-sm bg-bg-elevated text-text-primary'
                }`}
              >
                {msg.content}
              </div>
              <span className="px-1 text-[10px] text-text-tertiary">
                {formatRelativeTime(msg.created_at)}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {canSend ? (
        <form
          onSubmit={submit}
          className="flex shrink-0 items-center gap-2 border-t border-border-subtle px-3 py-2.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message the room..."
            maxLength={1000}
            aria-label="Message the room"
            className="h-9 flex-1 rounded-full border border-border-default bg-bg-elevated px-3.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-primary text-accent-fg transition-opacity hover:bg-accent-hover disabled:opacity-50"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      ) : null}
    </div>
  )
}

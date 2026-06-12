'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/profile/Avatar'
import { VerifiedBadge } from '@/components/ui/Badge'
import { formatRelativeTime, formatCountdown } from '@studyspot/utils'
import type { Message } from '@studyspot/types'
import Link from 'next/link'
import { friendlyDbError, messageSchema, validate } from '@/lib/validation'

interface Props {
  sessionId: string
  session: { id: string; subject: string; location_name: string; start_time: string; end_time: string; status: string; host_id: string }
  currentUser: { id: string; full_name: string | null; avatar_url: string | null; verification_status: string } | null
}

export function ChatClient({ sessionId, session, currentUser }: Props) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [userRequest, setUserRequest] = useState<any>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select(`*, sender:profiles!sender_id(id, full_name, avatar_url, verification_status)`)
        .eq('session_id', sessionId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100)
      setMessages((data || []) as Message[])
    }
    loadMessages()

    async function loadRequest() {
      if (currentUser) {
        const { data } = await supabase
          .from('session_requests')
          .select('*')
          .eq('session_id', sessionId)
          .eq('requester_id', currentUser.id)
          .maybeSingle()
        setUserRequest(data)
      }
    }
    loadRequest()

    const channel = supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `session_id=eq.${sessionId}`,
      }, async (payload) => {
        const { data: withSender } = await supabase
          .from('messages')
          .select(`*, sender:profiles!sender_id(id, full_name, avatar_url, verification_status)`)
          .eq('id', payload.new.id)
          .single()
        if (withSender) setMessages((prev) => [...prev, withSender as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending || !currentUser) return
    // Sanitize + length-check via schema before the message leaves the browser.
    const v = validate(messageSchema, { content: input })
    if (!v.ok) return
    setSending(true)
    setInput('')
    const { error } = await supabase
      .from('messages')
      .insert({ session_id: sessionId, sender_id: currentUser.id, content: v.data.content, type: 'text' })
    if (error) {
      // Put the text back so a rate-limited message isn't lost.
      setInput(v.data.content)
      alert(friendlyDbError(error.message))
    }
    setSending(false)
  }

  async function checkIn() {
    if (!userRequest) return
    await supabase.from('session_requests').update({ checked_in_at: new Date().toISOString() }).eq('id', userRequest.id)
    setUserRequest((prev: any) => ({ ...prev, checked_in_at: new Date().toISOString() }))
  }

  const now = new Date()
  const startTime = new Date(session.start_time)
  const endTime = new Date(session.end_time)
  const minsUntilStart = (startTime.getTime() - now.getTime()) / 60000
  const showCheckin = userRequest && !userRequest.checked_in_at && minsUntilStart <= 30 && now < endTime

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="border-b border-border-subtle px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Link href={`/sessions/${sessionId}`} className="text-base font-semibold text-text-primary hover:text-accent-primary">
              {session.subject}
            </Link>
          </div>
          <p className="text-text-secondary text-xs">
            {session.location_name} · {formatCountdown(session.start_time)}
          </p>
        </div>
        {showCheckin && (
          <button
            onClick={checkIn}
            className="h-8 px-4 rounded-md bg-accent-green/15 border border-accent-green/30 text-accent-green text-xs font-medium hover:bg-accent-green/25 transition-colors"
          >
            Check in ✓
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg, i) => {
          const isOwn = msg.sender_id === currentUser?.id
          const isSystem = msg.type === 'system' || msg.type === 'checkin'
          const prevMsg = messages[i - 1]
          const showAvatar = !isOwn && !isSystem && (prevMsg?.sender_id !== msg.sender_id || prevMsg?.type === 'system')

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center py-1">
                <span className="text-xs text-text-tertiary bg-bg-subtle px-3 py-1 rounded-full">
                  {msg.content}
                </span>
              </div>
            )
          }

          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {!isOwn && (
                <div className="w-6 shrink-0">
                  {showAvatar && (
                    <Avatar
                      userId={msg.sender_id || ''}
                      name={msg.sender?.full_name || null}
                      avatarUrl={msg.sender?.avatar_url || null}
                      size="xs"
                    />
                  )}
                </div>
              )}
              <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {showAvatar && !isOwn && (
                  <span className="text-xs text-text-tertiary ml-1">
                    {msg.sender?.full_name}
                    {msg.sender?.verification_status === 'verified' && (
                      <span className="ml-1 text-accent-green">✓</span>
                    )}
                  </span>
                )}
                <div
                  className={`px-3.5 py-2 rounded-xl text-sm ${
                    isOwn
                      ? 'bg-accent-primary text-accent-fg rounded-br-sm'
                      : 'bg-bg-elevated text-text-primary rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-text-tertiary px-1">{formatRelativeTime(msg.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {session.status !== 'cancelled' && (
        <form onSubmit={sendMessage} className="border-t border-border-subtle px-4 py-3 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            maxLength={1000}
            className="flex-1 h-10 px-3.5 rounded-full bg-bg-elevated border border-border-default text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:border-accent-primary"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-fg flex items-center justify-center disabled:opacity-50 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      )}
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatClient } from './ChatClient'

export default async function ChatPage({ params }: { params: Promise<{ session_id: string }> }) {
  const { session_id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: session } = await supabase
    .from('sessions')
    .select('id, subject, location_name, start_time, end_time, status, host_id, mode')
    .eq('id', session_id)
    .single()

  if (!session) redirect('/feed')

  // For online sessions the chat lives inside the room — never expose it
  // as a standalone page.
  if (session.mode === 'online') redirect(`/room/${session_id}`)

  const isHost = user.id === session.host_id

  if (!isHost) {
    const { data: request } = await supabase
      .from('session_requests')
      .select('status')
      .eq('session_id', session_id)
      .eq('requester_id', user.id)
      .maybeSingle()

    if (!request || request.status !== 'approved') redirect(`/sessions/${session_id}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, verification_status')
    .eq('id', user.id)
    .single()

  return (
    <ChatClient
      sessionId={session_id}
      session={session}
      currentUser={profile}
    />
  )
}

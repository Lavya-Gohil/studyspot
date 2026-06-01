import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { RoomClient } from './RoomClient'

export default async function RoomPage({
  params,
}: {
  params: Promise<{ session_id: string }>
}) {
  const { session_id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: session } = await supabase
    .from('session_feed')
    .select('*')
    .eq('id', session_id)
    .single()

  if (!session) notFound()

  // Online rooms only.
  if (session.mode !== 'online') {
    redirect(`/sessions/${session_id}`)
  }

  const isHost = session.host_id === user.id

  // Access: host, or an approved member.
  if (!isHost) {
    const { data: request } = await supabase
      .from('session_requests')
      .select('status')
      .eq('session_id', session_id)
      .eq('requester_id', user.id)
      .maybeSingle()

    if (request?.status !== 'approved') {
      redirect(`/sessions/${session_id}`)
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, verification_status')
    .eq('id', user.id)
    .single()

  return (
    <RoomClient
      session={{
        id: session.id,
        subject: session.subject,
        room_name: session.location_name,
        vibe: session.vibe,
        start_time: session.start_time,
        end_time: session.end_time,
        status: session.status,
        host_id: session.host_id,
        spots_total: session.spots_total,
      }}
      currentUser={
        profile
          ? {
              id: profile.id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              verification_status: profile.verification_status,
            }
          : { id: user.id, full_name: null, avatar_url: null, verification_status: 'unverified' }
      }
      isHost={isHost}
    />
  )
}

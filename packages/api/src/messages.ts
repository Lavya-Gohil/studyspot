import type { SupabaseClient } from '@supabase/supabase-js'
import type { Message } from '@studyspot/types'

export async function fetchMessages(
  client: SupabaseClient,
  sessionId: string,
  params?: { before?: string; limit?: number }
): Promise<Message[]> {
  const { before, limit = 50 } = params || {}

  let query = client
    .from('messages')
    .select(
      `*, sender:profiles!sender_id(id, full_name, avatar_url, verification_status)`
    )
    .eq('session_id', sessionId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query
  if (error) throw error
  return ((data || []) as Message[]).reverse()
}

export async function sendMessage(
  client: SupabaseClient,
  sessionId: string,
  content: string
): Promise<Message> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await client
    .from('messages')
    .insert({ session_id: sessionId, sender_id: user.id, content, type: 'text' })
    .select(
      `*, sender:profiles!sender_id(id, full_name, avatar_url, verification_status)`
    )
    .single()
  if (error) throw error
  return data as Message
}

export async function softDeleteMessage(
  client: SupabaseClient,
  messageId: string
): Promise<void> {
  const { error } = await client
    .from('messages')
    .update({ is_deleted: true })
    .eq('id', messageId)
  if (error) throw error
}

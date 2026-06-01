import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401 })

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()
    if (authError || !user) return new Response('Unauthorized', { status: 401 })

    const { fileType, fileSize } = await req.json()
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(fileType)) {
      return new Response(JSON.stringify({ error: 'Invalid file type' }), { status: 400 })
    }
    if (fileSize > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File too large (max 10MB)' }), { status: 400 })
    }

    const ext = fileType === 'application/pdf' ? 'pdf' : fileType === 'image/png' ? 'png' : 'jpg'
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await adminClient.storage
      .from('verification-docs')
      .createSignedUploadUrl(path)
    if (error) throw error

    await adminClient
      .from('profiles')
      .update({ verification_status: 'pending', verification_doc_path: path })
      .eq('id', user.id)

    const slackWebhook = Deno.env.get('ADMIN_SLACK_WEBHOOK_URL')
    if (slackWebhook) {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `New verification doc from user ${user.id}. Review at /admin/verifications`,
        }),
      })
    }

    return new Response(JSON.stringify({ uploadUrl: data.signedUrl, path }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
})

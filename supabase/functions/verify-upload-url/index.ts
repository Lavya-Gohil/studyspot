import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json, rateLimit, readJsonBody } from '../_shared/security.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
}
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

serve(async (req) => {
  // CORS preflight — the browser sends OPTIONS before the authed POST.
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json(req, { error: 'unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()
    if (authError || !user) return json(req, { error: 'unauthorized' }, 401)

    // A student re-verifying legitimately needs a handful of tries at most.
    const limited = rateLimit(req, `verify-upload:${user.id}`, 5, 10 * 60 * 1000)
    if (limited) return limited

    // Strict body: exactly { fileType, fileSize } — anything else is a 400.
    const parsed = await readJsonBody(req, ['fileType', 'fileSize'])
    if (!parsed.ok) return parsed.response
    const { fileType, fileSize } = parsed.body

    if (typeof fileType !== 'string' || !(fileType in ALLOWED_TYPES)) {
      return json(req, { error: 'invalid_file_type', allowed: Object.keys(ALLOWED_TYPES) }, 400)
    }
    // Number.isFinite guards NaN/Infinity tricks that pass naive `>` checks.
    if (typeof fileSize !== 'number' || !Number.isFinite(fileSize) || fileSize <= 0) {
      return json(req, { error: 'invalid_file_size' }, 400)
    }
    if (fileSize > MAX_FILE_SIZE) {
      return json(req, { error: 'file_too_large', maxBytes: MAX_FILE_SIZE }, 400)
    }

    // Path is built only from values WE generate (auth uid + random uuid) —
    // never from client input, so no traversal/overwrite is possible.
    const path = `${user.id}/${crypto.randomUUID()}.${ALLOWED_TYPES[fileType]}`

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

    return json(req, { uploadUrl: data.signedUrl, path })
  } catch (err) {
    // Never echo internal error details to the client (information leakage).
    console.error(err)
    return json(req, { error: 'internal_error' }, 500)
  }
})

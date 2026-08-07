# StudySpot

Find your study crew, in person or online. StudySpot connects students for real
study sessions at cafés, libraries, and campuses, or in a **live virtual classroom**
where everyone shows up as an avatar with a shared chat and group focus timer.

## Stack

Turborepo monorepo:

- **`apps/web`**. Next.js 14 (App Router) + Tailwind CSS + Supabase SSR
- **`apps/mobile`**. Expo (React Native) + NativeWind + Expo Router
- **`packages/*`**, shared `types`, `api` (Supabase data layer), `utils`
- **`supabase/`**. Postgres + PostGIS schema, RLS, and Edge Functions

## Local development

```bash
pnpm install
cp .env.example apps/web/.env.local   # then fill in the values below
pnpm dev --filter=@studyspot/web      # web on http://localhost:3000
pnpm dev --filter=@studyspot/mobile   # Expo
```

> Note: turbo's `--filter` matches the package **name** (`@studyspot/web`), not the folder.

### Environment variables (`apps/web/.env.local`)

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side admin actions |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | optional | Maps / location |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | optional | Web Push; omit and the browser can't subscribe |
| `RESEND_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, … | optional | Email / analytics |

## Database setup

Apply every migration in order against your project:

```bash
supabase db push --db-url "postgresql://postgres:<PASSWORD>@db.<REF>.supabase.co:5432/postgres"
```

Use the **direct connection or session pooler, port 5432**. The transaction
pooler on 6543 cannot run this DDL. If the password contains `@`, percent-encode
it (`@` → `%40`), or the URI parser reads it as the credentials separator and
the connection fails with a misleading host error.

```
001_schema.sql              tables, enums, triggers (creates PostGIS itself:
                            no manual extension step needed)
002_rls.sql                 row-level security
003_online_sessions.sql
004_reputation.sql
005_circles_and_goals.sql
006_security_hardening.sql
007_country_constraint.sql
008_push_subscriptions.sql
009_definer_search_path.sql
010_realtime_publication.sql
011_focus_sessions.sql
012_session_feed_security.sql
013_gamification.sql
014_public_stats.sql
```

**009 is not optional.** Without it, `handle_new_user()` resolves `profiles`
against GoTrue's `search_path=auth`, the trigger raises, and *every signup*
fails with `500 Database error creating new user`.

**010 is not optional either.** A new project's `supabase_realtime` publication
is empty, and `postgres_changes` only replays tables that belong to it. The
channel still opens and reports `SUBSCRIBED`, so there is no error anywhere;
live chat messages simply never arrive. The room hides this best, because its
seats and shared timer ride on presence and broadcast, which never needed the
publication at all.

**012 is a security fix.** A Postgres view runs with its *owner's* privileges
unless created `WITH (security_invoker = true)`, so `session_feed`: the view
behind all 11 feed / session / room read paths, bypassed RLS entirely.
Blocking a user did not hide their sessions. 012 flips it and audits every
other view we own.

> **Rule for any new view:** always write
> `CREATE VIEW … WITH (security_invoker = true)`. An unqualified `CREATE VIEW`
> silently opts out of row-level security, and because the view still returns
> data, nothing surfaces the problem until someone tests a policy through it.

Create two Storage buckets:

| Bucket | Access | Limit | Types |
|---|---|---|---|
| `avatars` | public | 5 MB | `image/jpeg`, `image/png` |
| `verification-docs` | private | 10 MB | `image/jpeg`, `image/png`, `application/pdf` |

Those limits mirror `AVATAR_*` in `apps/web/lib/validation.ts` and
`ALLOWED_TYPES`/`MAX_FILE_SIZE` in `supabase/functions/verify-upload-url`.

## Security

The app follows OWASP best practices across three layers, see the inline comments
in each file for the reasoning:

- **HTTP layer** (`apps/web/middleware.ts`, `next.config.js`): per-IP **and**
  per-user rate limiting with graceful `429 + Retry-After` responses (tight budget
  on `/auth/*`, generous elsewhere), plus CSP, HSTS, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` headers.
  The `/auth/callback` route validates the `next` param against open redirects.
- **Input layer** (`apps/web/lib/validation.ts`): every form runs its payload
  through a strict zod schema (unexpected fields rejected, control characters
  stripped, length limits mirroring the DB constraints) before anything is sent
  to Supabase.
- **Database layer** (`006_security_hardening.sql`): the browser talks to
  Supabase directly, so the unbypassable rate limits live in Postgres, per-user
  insert throttles on messages/sessions/requests/posts/goals/reports/ratings, a
  brute-force cap + format check on `join_circle_by_code`, and `NOT VALID` CHECK
  constraints for field lengths. RLS (002/004/005) remains the authorization
  source of truth.
- **Edge Functions** (`supabase/functions/_shared/security.ts`): webhook + cron
  functions **require shared secrets** (`WEBHOOK_SECRET` via `x-webhook-secret`,
  `CRON_SECRET` via `x-cron-secret`) and fail closed; user-facing functions get
  CORS origin allow-listing, strict body validation, and per-user rate limits.
- **Push notifications** (`supabase/functions/_shared/push.ts`): web payloads are
  end-to-end encrypted per subscription (RFC 8291 `aes128gcm`) and signed with
  VAPID (RFC 8292), so the push service relays bytes it cannot read and cannot
  be impersonated. Subscriptions live in `push_subscriptions` (008) under RLS;
  a user may only read, create, or revoke their own, and endpoints the push
  service reports as gone are deleted on the next send.

### Secrets & key handling

- No keys are committed; everything comes from env vars (`.env.local` is
  gitignored; see `.env.example` for the template and rotation instructions).
- Only `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` reach the
  browser; the anon key is safe to expose **only because RLS gates every table**.
  The service-role key and shared secrets are server-only, never prefix them
  with `NEXT_PUBLIC_`/`EXPO_PUBLIC_`.
- **Before deploying the Edge Functions**, set their secrets or webhook/cron
  calls will be rejected (fail closed):

  ```bash
  supabase secrets set WEBHOOK_SECRET=$(openssl rand -base64 32)
  supabase secrets set CRON_SECRET=$(openssl rand -base64 32)
  supabase functions deploy
  ```

- **For Web Push**, generate a VAPID keypair once (`npx web-push
  generate-vapid-keys`) and give both halves to the functions, the public half
  to the browser:

  ```bash
  supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
    VAPID_SUBJECT=mailto:admin@studyspot.app
  ```

  Then add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (the same public key) to Vercel. The
  public key only identifies the sender, so exposing it is safe; the private
  key signs every push and is server-only. Without these the functions still
  deliver to Expo and simply log that web push is unconfigured; push must
  never fail closed the way the shared secrets do.

  Then add `x-webhook-secret: <WEBHOOK_SECRET>` as an HTTP header on the
  Database Webhooks (Dashboard → Database → Webhooks) and `x-cron-secret:
  <CRON_SECRET>` on whatever scheduler triggers the cron functions.
- To rotate a leaked key: Supabase Dashboard → Settings → API → Reset, then
  update Vercel env vars and function secrets.

## Deploy (Vercel)

This is a server-rendered app (middleware, server components, Supabase auth), it
needs a Node host, **not** GitHub Pages.

1. Import the repo at [vercel.com](https://vercel.com) → **Add New Project**.
2. Set **Root Directory** to `apps/web` (Vercel auto-detects pnpm + Next.js).
3. Add the environment variables from the table above.
4. In **Supabase → Auth → URL Configuration**, add your `*.vercel.app` domain as a
   Site URL / redirect URL so OAuth and the `/auth/callback` route work.
5. Deploy. Every push to `main` auto-deploys.

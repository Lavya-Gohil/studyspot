# StudySpot

Find your study crew — in person or online. StudySpot connects students for real
study sessions at cafés, libraries, and campuses, or in a **live virtual classroom**
where everyone shows up as an avatar with a shared chat and group focus timer.

## Stack

Turborepo monorepo:

- **`apps/web`** — Next.js 14 (App Router) + Tailwind CSS + Supabase SSR
- **`apps/mobile`** — Expo (React Native) + NativeWind + Expo Router
- **`packages/*`** — shared `types`, `api` (Supabase data layer), `utils`
- **`supabase/`** — Postgres + PostGIS schema, RLS, and Edge Functions

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
| `RESEND_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, … | optional | Email / analytics |

## Database setup

In your Supabase project: enable the PostGIS extension, then run the migrations in
order:

```
supabase/migrations/001_schema.sql
supabase/migrations/002_rls.sql
supabase/migrations/003_online_sessions.sql
```

Create two Storage buckets: `avatars` (public) and `verification-docs` (private).

## Deploy (Vercel)

This is a server-rendered app (middleware, server components, Supabase auth) — it
needs a Node host, **not** GitHub Pages.

1. Import the repo at [vercel.com](https://vercel.com) → **Add New Project**.
2. Set **Root Directory** to `apps/web` (Vercel auto-detects pnpm + Next.js).
3. Add the environment variables from the table above.
4. In **Supabase → Auth → URL Configuration**, add your `*.vercel.app` domain as a
   Site URL / redirect URL so OAuth and the `/auth/callback` route work.
5. Deploy. Every push to `main` auto-deploys.

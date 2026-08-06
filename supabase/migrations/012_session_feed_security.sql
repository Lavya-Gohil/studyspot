-- 012: Make session_feed obey row-level security.
--
-- BLOCKING A USER DOES NOT CURRENTLY HIDE THEIR SESSIONS.
--
-- RLS on the sessions table is right:
--
--   USING (status != 'cancelled' AND NOT is_blocked(host_id))   -- 002_rls.sql
--
-- But nothing reads the sessions table. Everything reads the session_feed
-- view — 11 call sites across packages/api/src/sessions.ts, both web session
-- and room pages, and three mobile screens. A Postgres view executes with the
-- privileges of its OWNER unless it is explicitly created with
-- security_invoker, and this one is owned by postgres. So the view runs with
-- RLS effectively switched off, and every policy protecting the underlying
-- tables is bypassed on the app's primary read path.
--
-- Verified against the live project before writing this: user A blocks user B,
-- B hosts an active session, and A queries as themselves through RLS —
--
--   via the sessions table : 0 rows   (policy works)
--   via session_feed       : 1 row    (policy bypassed)
--
-- Same shape as 009 and 010: invisible to type-check, invisible to review,
-- and only observable against a real database with real policies.
--
-- Flipping it to security_invoker applies the caller's policies to both joined
-- tables. sessions stops showing blocked hosts, and profiles — whose policy is
-- `id = auth.uid() OR (is_banned = FALSE AND NOT is_blocked(id))` — makes the
-- inner join additionally drop sessions hosted by banned accounts, which is
-- also what should have been happening.
--
-- Note this is a behaviour change for the feed, deliberately: some rows that
-- used to appear will stop appearing. Those are precisely the rows a user
-- asked not to see.

ALTER VIEW public.session_feed SET (security_invoker = true);

-- The same audit applied to every other view we own. focus_daily (011) was
-- already declared security_invoker; this catches anything that predates the
-- rule and anything added later that forgets it — an unqualified CREATE VIEW
-- silently opts out of RLS, so this is worth keeping as a net.
--
-- Extension-owned views are excluded: PostGIS installs geography_columns and
-- geometry_columns into public, we are not their owner, and ALTER VIEW on them
-- fails outright. The pg_depend deptype 'e' test is what distinguishes "our
-- schema" from "something an extension put in our schema".
DO $$
DECLARE
  v RECORD;
BEGIN
  FOR v IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND NOT COALESCE(c.reloptions::text LIKE '%security_invoker=true%', false)
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.objid = c.oid AND d.deptype = 'e'
      )
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v.relname);
    RAISE NOTICE 'view audit: enabled security_invoker on %', v.relname;
  END LOOP;
END $$;

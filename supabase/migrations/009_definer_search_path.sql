-- 009: Pin search_path on every SECURITY DEFINER function.
--
-- SIGNUP IS BROKEN WITHOUT THIS on any freshly created Supabase project.
--
-- handle_new_user() is the trigger on auth.users that creates the profile row.
-- It is SECURITY DEFINER, which changes the *role* a function runs as — but
-- not the *search_path*, which is inherited from the caller. GoTrue connects as
-- supabase_auth_admin, whose role config is `search_path=auth`. So `INSERT INTO
-- profiles` resolved against the auth schema only, the table wasn't found, the
-- trigger raised, and the whole signup transaction rolled back. The user sees
-- HTTP 500 "Database error creating new user" with nothing pointing at cause.
--
-- It works when the same insert runs as postgres, whose search_path does
-- include public — which is why this survives local testing and direct SQL,
-- and only shows up through the real auth endpoint.
--
-- The same omission is a security problem in its own right, and the reason
-- 006_security_hardening.sql pinned search_path on the functions it introduced:
-- an unpinned SECURITY DEFINER function executes whatever a caller-controlled
-- search_path resolves its identifiers to, so anyone able to create an object
-- in an earlier schema can have it run with the definer's privileges. 006 only
-- covered its own new functions; these ten predate it.
--
-- `extensions` is included because PostGIS lives there and the geography
-- columns on profiles/sessions are in scope for several of these.

-- Trigger functions
ALTER FUNCTION public.handle_new_user()                SET search_path = public, extensions;
ALTER FUNCTION public.handle_checkin()                 SET search_path = public, extensions;
ALTER FUNCTION public.handle_new_request()             SET search_path = public, extensions;
ALTER FUNCTION public.handle_request_status_change()   SET search_path = public, extensions;
ALTER FUNCTION public.handle_new_circle()              SET search_path = public, extensions;
ALTER FUNCTION public.handle_circle_member_change()    SET search_path = public, extensions;

-- RLS helper predicates. These run as the querying role rather than through
-- auth, so they were not the signup failure — but they gate every policy in
-- 002/004/005, which makes them the worst possible place to leave resolution
-- up to the caller.
ALTER FUNCTION public.is_admin()                       SET search_path = public, extensions;
ALTER FUNCTION public.is_blocked(uuid)                 SET search_path = public, extensions;
ALTER FUNCTION public.is_session_member(uuid)          SET search_path = public, extensions;
ALTER FUNCTION public.is_circle_member(uuid)           SET search_path = public, extensions;

-- update_updated_at() is SECURITY INVOKER and needs no change; the PostGIS
-- st_estimatedextent() overloads belong to the extension, not this schema.

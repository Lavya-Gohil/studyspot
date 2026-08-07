-- 010: Publish the tables the app subscribes to over Realtime.
--
-- LIVE CHAT IS BROKEN WITHOUT THIS on any freshly created Supabase project.
--
-- Supabase Realtime has three transports, and only one of them touches Postgres:
--
--   * presence, ephemeral, held in the Realtime server's memory
--   * broadcast, ephemeral, relayed between clients
--   * postgres_changes, replayed from the write-ahead log
--
-- The first two work out of the box. postgres_changes only delivers rows for
-- tables that are members of the `supabase_realtime` publication, and a new
-- project ships that publication EMPTY. Nothing in 001-009 ever added to it, so
-- on a fresh project `pg_publication_tables` returns zero rows and the WAL
-- reader has nothing to forward.
--
-- Two subscriptions depend on it today, both on `messages`:
--
--   apps/web/app/(main)/chat/[session_id]/ChatClient.tsx:54
--   apps/web/app/(main)/room/[session_id]/useRoomChannel.ts:122
--
-- Both call .subscribe() successfully and receive SUBSCRIBED; the channel is
-- genuinely open, it simply never carries an event. So there is no error, no
-- failed request, and no console warning: sent messages just don't appear for
-- anyone else until the page is reloaded.
--
-- The room hides it best of all. Its seats and shared focus timer ride on
-- presence and broadcast, which never needed the publication, so the room looks
-- fully alive while its message pane is the one dead part of it.
--
-- Row-level security still applies after this change. Realtime evaluates each
-- row against the subscriber's policies before forwarding it, so `messages` is
-- gated by "messages: session members can read" and `notifications` by
-- "notifications: users can read own" (both in 002_rls.sql). Publishing a table
-- does not widen who can see its rows.

-- Idempotent: a project may already have these added via the dashboard, and
-- ALTER PUBLICATION ... ADD TABLE errors on a duplicate rather than no-opping.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- REPLICA IDENTITY controls how much of the *old* row reaches the WAL. The new
-- row is always complete, so INSERT subscriptions need nothing special.
--
-- notifications: FULL. The unread bell has to distinguish "a notification was
-- created" from "one was marked read", and that means comparing old.is_read to
-- new.is_read. Without FULL the old record carries only the primary key. The
-- table is low-volume and per-user, so the extra WAL is negligible.
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- messages: left at DEFAULT deliberately. It is the highest-volume table here
-- and only INSERT is ever subscribed to, so FULL would double its WAL traffic
-- to populate an old record nothing reads. If a future feature needs live edits
-- or deletions, revisit this then, with the volume in mind.

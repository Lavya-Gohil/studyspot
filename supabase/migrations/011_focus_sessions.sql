-- 011: Make focus time real, and make "a day" mean the user's day.
--
-- The room's focus timer has never recorded anything. It counts down, it
-- announces that time is up, and then the interval is gone — so the single
-- most repeated action in the product leaves no trace, and there is nothing to
-- build streaks, stats or leaderboards on top of.
--
-- This also fixes a latent correctness bug in handle_checkin(). It compares
-- last_checkin_date against CURRENT_DATE, which Postgres evaluates in the
-- SERVER's timezone — UTC on Supabase. A student in India studying at 01:00
-- IST is at 19:30 UTC the previous day, so their day rolls over mid-evening:
-- two check-ins on the same local night can count as two separate days, and a
-- genuine consecutive day can look like a gap and reset the streak. Streaks
-- are about to become load-bearing, so the day boundary has to be the user's.

-- ------------------------------------------------------------
-- The user's day
-- ------------------------------------------------------------

-- IANA name, e.g. 'Asia/Kolkata'. Defaulting to UTC preserves exactly today's
-- behaviour for anyone we haven't learned a timezone for yet.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- Reject junk before it can silently corrupt every date calculation
-- downstream. pg_timezone_names is the authoritative list this server accepts,
-- so this can't drift from what AT TIME ZONE will actually resolve.
CREATE OR REPLACE FUNCTION public.is_valid_timezone(tz TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = tz);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_timezone_valid
  CHECK (is_valid_timezone(timezone)) NOT VALID;

-- Existing rows are all 'UTC' by the DEFAULT above, so validating is free.
ALTER TABLE profiles VALIDATE CONSTRAINT profiles_timezone_valid;

/**
 * The calendar date it currently is *for this user*.
 * One definition, used by streaks, the heatmap and the digest alike — the bug
 * above came from three call sites each deciding for themselves.
 */
CREATE OR REPLACE FUNCTION public.user_local_date(p_user_id UUID, at TIMESTAMPTZ DEFAULT NOW())
RETURNS DATE AS $$
  SELECT (at AT TIME ZONE COALESCE(NULLIF(p.timezone, ''), 'UTC'))::date
  FROM profiles p WHERE p.id = p_user_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions;

-- ------------------------------------------------------------
-- Focus sessions
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS focus_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Nullable: focus can happen in a study room, or alone from /stats.
  -- SET NULL rather than CASCADE — deleting a session must not erase the hours
  -- somebody actually put in.
  session_id       UUID REFERENCES sessions(id) ON DELETE SET NULL,
  started_at       TIMESTAMPTZ NOT NULL,
  ended_at         TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL
                     CHECK (duration_seconds > 0 AND duration_seconds <= 86400),
  subject          TEXT CHECK (char_length(subject) <= 120),
  source           TEXT NOT NULL DEFAULT 'room' CHECK (source IN ('room', 'solo')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT focus_sessions_ordered CHECK (ended_at > started_at)
);

-- Every read is "this user, most recent first" or a range scan over a window.
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_time
  ON focus_sessions (user_id, started_at DESC);

-- A person cannot focus twice at once. This is the anti-inflation guard: XP,
-- streaks and leaderboards all derive from this table, and without it a client
-- could post a thousand overlapping hours in a loop. Stated as a fact about
-- reality rather than a rate limit, so it can't be tuned away by accident.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'focus_sessions_no_overlap'
  ) THEN
    ALTER TABLE focus_sessions ADD CONSTRAINT focus_sessions_no_overlap
      EXCLUDE USING gist (
        user_id WITH =,
        tstzrange(started_at, ended_at) WITH &&
      );
  END IF;
END $$;

-- Recording time you haven't spent yet is not a thing.
CREATE OR REPLACE FUNCTION public.check_focus_session_bounds()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at > NOW() + INTERVAL '2 minutes' THEN
    RAISE EXCEPTION 'focus session cannot end in the future'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Trust the timestamps, not a client-supplied total.
  NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::int;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

DROP TRIGGER IF EXISTS trg_focus_session_bounds ON focus_sessions;
CREATE TRIGGER trg_focus_session_bounds
  BEFORE INSERT ON focus_sessions
  FOR EACH ROW EXECUTE FUNCTION check_focus_session_bounds();

-- ------------------------------------------------------------
-- RLS — your own hours, and nobody else's
-- ------------------------------------------------------------

ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "focus_sessions: read own" ON focus_sessions;
CREATE POLICY "focus_sessions: read own"
  ON focus_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "focus_sessions: insert own" ON focus_sessions;
CREATE POLICY "focus_sessions: insert own"
  ON focus_sessions FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT is_banned FROM profiles WHERE id = auth.uid()) = FALSE
  );

-- Deliberately no UPDATE or DELETE policy. This is an append-only log of time
-- that was actually spent; editing it retroactively is exactly the thing the
-- overlap constraint exists to prevent.

-- ------------------------------------------------------------
-- Daily rollup for the heatmap
-- ------------------------------------------------------------

-- security_invoker so the caller's RLS applies. Without it the view would run
-- as its owner and hand every user everybody else's hours — the classic way a
-- view quietly becomes a data leak.
CREATE OR REPLACE VIEW focus_daily
WITH (security_invoker = true) AS
SELECT
  f.user_id,
  (f.started_at AT TIME ZONE COALESCE(NULLIF(p.timezone, ''), 'UTC'))::date AS day,
  SUM(f.duration_seconds)::bigint AS total_seconds,
  COUNT(*)::int                   AS session_count
FROM focus_sessions f
JOIN profiles p ON p.id = f.user_id
GROUP BY 1, 2;

-- ------------------------------------------------------------
-- Streaks now count the user's days
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_checkin()
RETURNS TRIGGER AS $$
DECLARE
  user_last_checkin DATE;
  today             DATE;
BEGIN
  IF NEW.checked_in_at IS NOT NULL AND OLD.checked_in_at IS NULL THEN
    SELECT last_checkin_date INTO user_last_checkin
    FROM profiles WHERE id = NEW.requester_id;

    -- Was CURRENT_DATE, i.e. the server's day. See the header note.
    today := user_local_date(NEW.requester_id, NEW.checked_in_at);

    UPDATE profiles
    SET
      total_sessions_attended = total_sessions_attended + 1,
      last_checkin_date = today,
      study_streak = CASE
        WHEN user_last_checkin IS NULL             THEN 1
        WHEN user_last_checkin = today - 1         THEN study_streak + 1
        WHEN user_last_checkin = today             THEN study_streak
        ELSE 1
      END
    WHERE id = NEW.requester_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

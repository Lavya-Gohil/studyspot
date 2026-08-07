-- ============================================================
-- StudySpot. Security hardening (006)
--
-- Why this lives in Postgres: the web/mobile clients talk to
-- Supabase DIRECTLY (PostgREST + RLS), so HTTP-layer rate
-- limiting in Next.js middleware never sees those writes. The
-- database is the only place limits cannot be bypassed.
--
-- Contents:
--   1. enforce_insert_rate_limit(), generic per-user insert
--      throttle, applied to every user-writable table.
--   2. Brute-force protection for join_circle_by_code().
--   3. Length/format CHECK constraints (NOT VALID: they apply
--      to new writes without failing on pre-existing rows).
--
-- Run AFTER 001–005 in the Supabase SQL editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Generic per-user insert rate limiting
-- ------------------------------------------------------------
-- Trigger args: (user_id_column, max_inserts, window_seconds).
-- Counts the user's recent rows in the same table and rejects
-- the insert when over budget. SECURITY DEFINER so the count
-- isn't blinded by the caller's RLS visibility; search_path is
-- pinned (hijack protection for definer functions).
CREATE OR REPLACE FUNCTION enforce_insert_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_col    TEXT := TG_ARGV[0];
  max_rows    INT  := TG_ARGV[1]::INT;
  window_secs INT  := TG_ARGV[2]::INT;
  uid UUID;
  recent_count INT;
BEGIN
  EXECUTE format('SELECT ($1).%I', user_col) INTO uid USING NEW;

  -- System rows (e.g. messages with NULL sender) are service-written; skip.
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  EXECUTE format(
    'SELECT count(*) FROM %I WHERE %I = $1 AND created_at > now() - make_interval(secs => $2)',
    TG_TABLE_NAME, user_col
  ) INTO recent_count USING uid, window_secs;

  IF recent_count >= max_rows THEN
    -- Clients surface this as a friendly "slow down" message.
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = format('Max %s per %s seconds for %s.', max_rows, window_secs, TG_TABLE_NAME),
            ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Sensible per-table budgets: far above honest usage, far below abuse.
CREATE TRIGGER rl_messages BEFORE INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION enforce_insert_rate_limit('sender_id', '20', '30');

CREATE TRIGGER rl_session_requests BEFORE INSERT ON session_requests
  FOR EACH ROW EXECUTE FUNCTION enforce_insert_rate_limit('requester_id', '10', '60');

CREATE TRIGGER rl_sessions BEFORE INSERT ON sessions
  FOR EACH ROW EXECUTE FUNCTION enforce_insert_rate_limit('host_id', '6', '300');

CREATE TRIGGER rl_circle_posts BEFORE INSERT ON circle_posts
  FOR EACH ROW EXECUTE FUNCTION enforce_insert_rate_limit('author_id', '12', '60');

CREATE TRIGGER rl_circles BEFORE INSERT ON circles
  FOR EACH ROW EXECUTE FUNCTION enforce_insert_rate_limit('owner_id', '5', '3600');

CREATE TRIGGER rl_goals BEFORE INSERT ON goals
  FOR EACH ROW EXECUTE FUNCTION enforce_insert_rate_limit('user_id', '15', '3600');

CREATE TRIGGER rl_reports BEFORE INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION enforce_insert_rate_limit('reporter_id', '5', '3600');

CREATE TRIGGER rl_session_ratings BEFORE INSERT ON session_ratings
  FOR EACH ROW EXECUTE FUNCTION enforce_insert_rate_limit('rater_id', '30', '60');

-- ------------------------------------------------------------
-- 2. Brute-force protection for circle join codes
-- ------------------------------------------------------------
-- join_code is only 6 chars; unthrottled, a script could sweep the
-- keyspace and crash private circles. Track attempts per user and
-- cap them inside the SECURITY DEFINER function itself.
CREATE TABLE IF NOT EXISTS join_code_attempts (
  user_id      UUID NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_join_attempts ON join_code_attempts (user_id, attempted_at DESC);

-- No policies on purpose: only the definer function below may touch it.
ALTER TABLE join_code_attempts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION join_circle_by_code(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid UUID;
  attempts INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Strict input validation before the code touches any query.
  IF p_code IS NULL OR p_code !~ '^[A-Za-z0-9]{6}$' THEN
    RAISE EXCEPTION 'Invalid code format';
  END IF;

  -- Throttle: 8 attempts/minute per user makes a 36^6 sweep infeasible.
  SELECT count(*) INTO attempts
  FROM join_code_attempts
  WHERE user_id = auth.uid() AND attempted_at > now() - interval '60 seconds';

  IF attempts >= 8 THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING HINT = 'Too many join attempts. Wait a minute and try again.';
  END IF;

  INSERT INTO join_code_attempts (user_id) VALUES (auth.uid());
  -- Opportunistic cleanup of this user's stale attempt rows.
  DELETE FROM join_code_attempts
  WHERE user_id = auth.uid() AND attempted_at < now() - interval '10 minutes';

  SELECT id INTO cid FROM circles WHERE join_code = upper(p_code);
  IF cid IS NULL THEN
    RAISE EXCEPTION 'Circle not found';
  END IF;

  INSERT INTO circle_members (circle_id, user_id)
  VALUES (cid, auth.uid())
  ON CONFLICT (circle_id, user_id) DO NOTHING;

  RETURN cid;
END;
$$;

-- ------------------------------------------------------------
-- 3. Input length/format constraints missing from 001/005
-- ------------------------------------------------------------
-- NOT VALID = enforced for all NEW inserts/updates, but existing
-- rows aren't scanned, so applying this migration can never fail
-- on legacy data. Limits mirror apps/web/lib/validation.ts.
ALTER TABLE profiles
  ADD CONSTRAINT chk_profiles_full_name_len CHECK (char_length(full_name) <= 80) NOT VALID,
  ADD CONSTRAINT chk_profiles_username_fmt  CHECK (username ~ '^[A-Za-z0-9_.-]{3,30}$') NOT VALID,
  ADD CONSTRAINT chk_profiles_college_len   CHECK (char_length(college) <= 120) NOT VALID,
  ADD CONSTRAINT chk_profiles_course_len    CHECK (char_length(course) <= 120) NOT VALID,
  ADD CONSTRAINT chk_profiles_subjects_size CHECK (array_length(subjects, 1) IS NULL OR array_length(subjects, 1) <= 12) NOT VALID;

ALTER TABLE sessions
  ADD CONSTRAINT chk_sessions_subject_len  CHECK (char_length(subject) <= 120) NOT VALID,
  ADD CONSTRAINT chk_sessions_locname_len  CHECK (char_length(location_name) <= 160) NOT VALID,
  ADD CONSTRAINT chk_sessions_locaddr_len  CHECK (char_length(location_address) <= 240) NOT VALID,
  ADD CONSTRAINT chk_sessions_tags_size    CHECK (array_length(subject_tags, 1) IS NULL OR array_length(subject_tags, 1) <= 12) NOT VALID;

ALTER TABLE circles
  ADD CONSTRAINT chk_circles_topic_len CHECK (char_length(topic) <= 40) NOT VALID,
  ADD CONSTRAINT chk_circles_emoji_len CHECK (char_length(emoji) <= 16) NOT VALID;

ALTER TABLE goals
  ADD CONSTRAINT chk_goals_unit_len   CHECK (char_length(unit) <= 20) NOT VALID,
  ADD CONSTRAINT chk_goals_target_max CHECK (target <= 100000) NOT VALID;

-- ------------------------------------------------------------
-- Manual dashboard steps (not expressible in SQL); do these too:
--   * Auth → Rate Limits: keep Supabase's built-in auth limits on.
--   * Auth → Passwords: enable leaked-password (HIBP) protection.
--   * Storage: confirm `verification-docs` bucket stays PRIVATE.
-- ------------------------------------------------------------

-- 013: XP, levels, badges and leaderboards.
--
-- Everything here derives from focus_sessions (011), which is append-only and
-- carries the overlap constraint — so XP cannot be inflated without first
-- defeating a constraint that encodes a fact about reality. Nothing in this
-- migration trusts a client-supplied number.

-- ------------------------------------------------------------
-- XP and levels
-- ------------------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0);

-- Streak freezes: a day missed without breaking the streak. Earned slowly,
-- spent automatically. Without this a single sick day erases months of work,
-- which is how streak systems teach people to stop caring about streaks.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS streak_freezes SMALLINT NOT NULL DEFAULT 0
    CHECK (streak_freezes BETWEEN 0 AND 3);
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;

/**
 * Level from XP.
 *
 * Quadratic: level N begins at 100 * (N-1)^2 XP, so levels 1-5 arrive at
 * 0 / 100 / 400 / 900 / 1600. At 1 XP per focused minute that is roughly
 * 0h, 1.7h, 6.7h, 15h, 27h of real study — fast at the start where
 * encouragement matters, slow later where it should mean something.
 *
 * IMMUTABLE so it can be used in generated columns and indexes.
 */
CREATE OR REPLACE FUNCTION public.level_from_xp(p_xp INTEGER)
RETURNS INTEGER AS $$
  SELECT GREATEST(1, FLOOR(SQRT(GREATEST(p_xp, 0)::numeric / 100)) + 1)::int;
$$ LANGUAGE sql IMMUTABLE;

-- Stored, not a column to keep in sync by hand.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS level INTEGER
  GENERATED ALWAYS AS (level_from_xp(xp)) STORED;

-- ------------------------------------------------------------
-- Badges
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS badges (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  -- Lucide glyph name, resolved by the UI's icon layer.
  icon        TEXT NOT NULL,
  -- Ordering for display; also the rough difficulty.
  tier        SMALLINT NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 4),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL REFERENCES badges(code) ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_code)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges (user_id, earned_at DESC);

INSERT INTO badges (code, name, description, icon, tier) VALUES
  ('first_hour',    'First hour',      'Focused for a full hour',            'Timer',        1),
  ('night_owl',     'Night owl',       'Focused after midnight, your time',  'Moon',         1),
  ('early_bird',    'Early bird',      'Focused before 7am, your time',      'Sunrise',      1),
  ('streak_7',      'One week',        'A seven day study streak',           'Flame',        2),
  ('streak_30',     'One month',       'A thirty day study streak',          'Flame',        3),
  ('hours_10',      'Ten hours',       'Ten hours of focused study',         'Clock',        2),
  ('hours_100',     'Century',         'One hundred hours of focused study', 'Trophy',       4),
  ('host_first',    'Host',            'Hosted your first session',          'Users',        1),
  ('social_10',     'Regular',         'Attended ten sessions',              'UsersRound',   2),
  ('marathon',      'Marathon',        'A single focus session over 3 hours','Mountain',     3)
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- Awarding XP and badges
-- ------------------------------------------------------------

/**
 * Runs after every completed focus session.
 *
 * XP is one point per whole focused minute, computed from the row that just
 * passed 011's trigger (which recomputes duration from the timestamps), so the
 * client never supplies it.
 */
CREATE OR REPLACE FUNCTION public.award_for_focus_session()
RETURNS TRIGGER AS $$
DECLARE
  minutes      INTEGER;
  local_hour   INTEGER;
  tz           TEXT;
  total_secs   BIGINT;
  streak       INTEGER;
BEGIN
  minutes := GREATEST(0, NEW.duration_seconds / 60);

  UPDATE profiles
  SET xp = xp + minutes
  WHERE id = NEW.user_id;

  SELECT COALESCE(NULLIF(timezone, ''), 'UTC'), study_streak
    INTO tz, streak
  FROM profiles WHERE id = NEW.user_id;

  local_hour := EXTRACT(HOUR FROM (NEW.started_at AT TIME ZONE tz))::int;

  SELECT COALESCE(SUM(duration_seconds), 0) INTO total_secs
  FROM focus_sessions WHERE user_id = NEW.user_id;

  -- Badges are idempotent by primary key, so this can run on every insert.
  INSERT INTO user_badges (user_id, badge_code)
  SELECT NEW.user_id, code FROM (VALUES
    ('first_hour', NEW.duration_seconds >= 3600),
    ('marathon',   NEW.duration_seconds >= 10800),
    ('night_owl',  local_hour >= 0 AND local_hour < 5),
    ('early_bird', local_hour >= 5 AND local_hour < 7),
    ('hours_10',   total_secs >= 36000),
    ('hours_100',  total_secs >= 360000),
    ('streak_7',   streak >= 7),
    ('streak_30',  streak >= 30)
  ) AS t(code, earned)
  WHERE t.earned
  ON CONFLICT (user_id, badge_code) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

DROP TRIGGER IF EXISTS trg_award_for_focus_session ON focus_sessions;
CREATE TRIGGER trg_award_for_focus_session
  AFTER INSERT ON focus_sessions
  FOR EACH ROW EXECUTE FUNCTION award_for_focus_session();

-- Keep longest_streak honest whenever study_streak moves.
CREATE OR REPLACE FUNCTION public.track_longest_streak()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.study_streak > COALESCE(OLD.longest_streak, 0) THEN
    NEW.longest_streak := NEW.study_streak;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

DROP TRIGGER IF EXISTS trg_track_longest_streak ON profiles;
CREATE TRIGGER trg_track_longest_streak
  BEFORE UPDATE OF study_streak ON profiles
  FOR EACH ROW EXECUTE FUNCTION track_longest_streak();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badges: readable by all" ON badges;
CREATE POLICY "badges: readable by all"
  ON badges FOR SELECT TO authenticated USING (TRUE);

-- Badges are shown on public profiles, so they follow the same visibility rule
-- profiles already uses: anyone you can see the profile of, you can see the
-- badges of.
DROP POLICY IF EXISTS "user_badges: readable for visible profiles" ON user_badges;
CREATE POLICY "user_badges: readable for visible profiles"
  ON user_badges FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = user_id)
  );

-- Nobody writes badges from the client. Only the trigger above, which runs as
-- definer. No INSERT/UPDATE/DELETE policy exists, so PostgREST rejects all of
-- them regardless of what a client sends.

-- ------------------------------------------------------------
-- Leaderboards
-- ------------------------------------------------------------

/**
 * Why a function and not a view.
 *
 * focus_sessions is RLS'd to own-rows-only, which is correct — your study log
 * is nobody else's business. But that makes a leaderboard impossible to build
 * as a security_invoker view: it would only ever contain the caller's own row.
 *
 * So this is SECURITY DEFINER, deliberately and narrowly. It reads across
 * users but returns ONLY what a leaderboard needs — display name, avatar,
 * level, and a minute total — never the underlying sessions, subjects or
 * timestamps. It re-implements the visibility rules by hand because it has
 * stepped outside RLS: banned accounts are excluded, and blocks are honoured
 * in both directions via is_blocked().
 *
 * search_path is pinned, per 009.
 */
CREATE OR REPLACE FUNCTION public.leaderboard(
  p_scope TEXT DEFAULT 'global',   -- 'global' | 'college' | 'circle'
  p_circle_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 7,
  p_limit INTEGER DEFAULT 25
)
RETURNS TABLE (
  user_id       UUID,
  full_name     TEXT,
  avatar_url    TEXT,
  college       TEXT,
  level         INTEGER,
  total_minutes BIGINT,
  rank          BIGINT
) AS $$
DECLARE
  me_college TEXT;
BEGIN
  IF p_scope NOT IN ('global', 'college', 'circle') THEN
    RAISE EXCEPTION 'unknown leaderboard scope: %', p_scope
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  p_days  := LEAST(GREATEST(COALESCE(p_days, 7), 1), 365);
  p_limit := LEAST(GREATEST(COALESCE(p_limit, 25), 1), 100);

  SELECT p.college INTO me_college FROM profiles p WHERE p.id = auth.uid();

  RETURN QUERY
  WITH totals AS (
    SELECT
      f.user_id AS uid,
      SUM(f.duration_seconds) / 60 AS mins
    FROM focus_sessions f
    JOIN profiles p ON p.id = f.user_id
    WHERE f.started_at >= NOW() - make_interval(days => p_days)
      AND p.is_banned = FALSE
      AND NOT is_blocked(f.user_id)
      AND (
        p_scope = 'global'
        OR (p_scope = 'college' AND me_college IS NOT NULL AND p.college = me_college)
        OR (p_scope = 'circle'  AND p_circle_id IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM circle_members cm
              WHERE cm.circle_id = p_circle_id AND cm.user_id = f.user_id
            )
            -- You can only read a circle's board if you are in that circle.
            AND EXISTS (
              SELECT 1 FROM circle_members me
              WHERE me.circle_id = p_circle_id AND me.user_id = auth.uid()
            ))
      )
    GROUP BY f.user_id
  )
  SELECT
    p.id, p.full_name, p.avatar_url, p.college, p.level,
    t.mins::bigint,
    RANK() OVER (ORDER BY t.mins DESC)
  FROM totals t
  JOIN profiles p ON p.id = t.uid
  ORDER BY t.mins DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions;

REVOKE ALL ON FUNCTION public.leaderboard(TEXT, UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leaderboard(TEXT, UUID, INTEGER, INTEGER) TO authenticated;

-- Leaderboards scan a time window across many users; without this they degrade
-- into a full scan as the table grows.
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started
  ON focus_sessions (started_at DESC);

-- ============================================================
-- StudySpot. Reputation & Verified Study Hours
-- Peer ratings + a public stats view that powers the Study
-- Reputation Score and Verified Study Hours features.
-- ============================================================

-- ------------------------------------------------------------
-- Peer ratings: members/hosts rate each other after a session
-- ------------------------------------------------------------
CREATE TABLE session_ratings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  rater_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ratee_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, rater_id, ratee_id),
  CHECK (rater_id <> ratee_id)
);

CREATE INDEX idx_ratings_ratee ON session_ratings (ratee_id);
CREATE INDEX idx_ratings_session ON session_ratings (session_id);

ALTER TABLE session_ratings ENABLE ROW LEVEL SECURITY;

-- Aggregate reputation is public, so any authenticated user may read ratings.
CREATE POLICY "ratings: authenticated can read"
  ON session_ratings FOR SELECT TO authenticated
  USING (true);

-- Only people who actually shared the session may rate, and only each other.
CREATE POLICY "ratings: members can rate co-attendees"
  ON session_ratings FOR INSERT TO authenticated
  WITH CHECK (
    rater_id = auth.uid()
    AND rater_id <> ratee_id
    AND is_session_member(session_id)
    AND (
      EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND host_id = ratee_id)
      OR EXISTS (
        SELECT 1 FROM session_requests
        WHERE session_id = session_ratings.session_id
          AND requester_id = ratee_id
          AND status = 'approved'
      )
    )
  );

CREATE POLICY "ratings: rater can update own"
  ON session_ratings FOR UPDATE TO authenticated
  USING (rater_id = auth.uid())
  WITH CHECK (rater_id = auth.uid());

-- ------------------------------------------------------------
-- Public per-user stats view (verified hours + reliability)
-- Views run with the definer's rights here (same pattern as
-- session_feed), so aggregates are visible for any profile.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW user_study_stats AS
WITH attended AS (
  -- Members who checked in
  SELECT
    sr.requester_id AS user_id,
    s.start_time,
    s.end_time,
    (sr.checked_in_at <= s.start_time + INTERVAL '10 minutes') AS on_time
  FROM session_requests sr
  JOIN sessions s ON s.id = sr.session_id
  WHERE sr.checked_in_at IS NOT NULL
    AND s.status <> 'cancelled'
  UNION ALL
  -- Hosts of sessions that have ended
  SELECT
    s.host_id AS user_id,
    s.start_time,
    s.end_time,
    TRUE AS on_time
  FROM sessions s
  WHERE s.status <> 'cancelled'
    AND s.end_time < NOW()
),
hours AS (
  SELECT
    user_id,
    SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0) AS verified_hours,
    COUNT(*) AS verified_sessions,
    COUNT(*) FILTER (WHERE on_time) AS on_time_count
  FROM attended
  GROUP BY user_id
),
reliability AS (
  -- Of approved spots in ended sessions, how many did the user show up to?
  SELECT
    sr.requester_id AS user_id,
    COUNT(*) AS approved_count,
    COUNT(*) FILTER (WHERE sr.checked_in_at IS NOT NULL) AS showed_count
  FROM session_requests sr
  JOIN sessions s ON s.id = sr.session_id
  WHERE sr.status = 'approved'
    AND s.end_time < NOW()
    AND s.status <> 'cancelled'
  GROUP BY sr.requester_id
),
ratings AS (
  SELECT
    ratee_id AS user_id,
    AVG(rating)::numeric(3, 2) AS avg_rating,
    COUNT(*) AS rating_count
  FROM session_ratings
  GROUP BY ratee_id
)
SELECT
  p.id AS user_id,
  ROUND(COALESCE(h.verified_hours, 0)::numeric, 1) AS verified_hours,
  COALESCE(h.verified_sessions, 0) AS verified_sessions,
  COALESCE(h.on_time_count, 0) AS on_time_count,
  COALESCE(rel.approved_count, 0) AS approved_count,
  COALESCE(rel.showed_count, 0) AS showed_count,
  r.avg_rating,
  COALESCE(r.rating_count, 0) AS rating_count
FROM profiles p
LEFT JOIN hours h ON h.user_id = p.id
LEFT JOIN reliability rel ON rel.user_id = p.id
LEFT JOIN ratings r ON r.user_id = p.id;

-- ============================================================
-- StudySpot. Online sessions
-- Adds a `mode` to sessions so they can be in-person OR online
-- (a live virtual classroom). Physical location becomes optional
-- for online sessions.
-- ============================================================

CREATE TYPE session_mode_enum AS ENUM ('in_person', 'online');

ALTER TABLE sessions
  ADD COLUMN mode session_mode_enum NOT NULL DEFAULT 'in_person';

-- Online sessions don't need a physical venue.
ALTER TABLE sessions
  ALTER COLUMN location_name DROP NOT NULL;

-- ...but in-person sessions still must have one.
ALTER TABLE sessions
  ADD CONSTRAINT location_required_for_in_person
  CHECK (mode = 'online' OR location_name IS NOT NULL);

CREATE INDEX idx_sessions_mode ON sessions (mode, status, start_time);

-- ------------------------------------------------------------
-- Recreate the feed view so it includes the new `mode` column.
-- (SELECT s.* is expanded at creation time, so the view must be
-- rebuilt to pick up the added column.)
-- ------------------------------------------------------------
DROP VIEW IF EXISTS session_feed;

CREATE VIEW session_feed AS
SELECT
  s.*,
  p.full_name AS host_name,
  p.avatar_url AS host_avatar,
  p.college AS host_college,
  p.verification_status AS host_verification_status,
  p.is_minor AS host_is_minor,
  (s.spots_total - s.spots_filled) AS spots_remaining
FROM sessions s
JOIN profiles p ON s.host_id = p.id
WHERE s.status IN ('active', 'full', 'ongoing');

-- ============================================================
-- StudySpot. Full Database Schema
-- PostgreSQL via Supabase
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE verification_status_enum AS ENUM (
  'unverified', 'pending', 'verified', 'rejected'
);

CREATE TYPE session_status_enum AS ENUM (
  'active', 'full', 'ongoing', 'completed', 'cancelled'
);

CREATE TYPE session_vibe_enum AS ENUM (
  'silent', 'pomodoro', 'discussion', 'coding', 'exam_prep', 'casual'
);

CREATE TYPE request_status_enum AS ENUM (
  'pending', 'approved', 'declined', 'withdrawn'
);

CREATE TYPE message_type_enum AS ENUM (
  'text', 'system', 'checkin'
);

CREATE TYPE report_reason_enum AS ENUM (
  'harassment', 'spam', 'inappropriate', 'fake_profile', 'other'
);

CREATE TYPE year_of_study_enum AS ENUM (
  'year_1', 'year_2', 'year_3', 'year_4', 'year_5',
  'postgraduate', 'phd', 'self_studying'
);

-- ============================================================
-- TABLE: profiles
-- ============================================================

CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 TEXT NOT NULL,
  onboarding_step       SMALLINT NOT NULL DEFAULT 0,
  full_name             TEXT,
  username              TEXT UNIQUE,
  age                   SMALLINT CHECK (age >= 16 AND age <= 100),
  is_minor              BOOLEAN NOT NULL DEFAULT FALSE,
  country               TEXT,
  country_name          TEXT,
  state_region          TEXT,
  city                  TEXT,
  last_location         geography(Point, 4326),
  verification_status   verification_status_enum NOT NULL DEFAULT 'unverified',
  verification_doc_path TEXT,
  verification_rejected_reason TEXT,
  avatar_url            TEXT,
  college               TEXT,
  course                TEXT,
  year_of_study         year_of_study_enum,
  subjects              TEXT[] DEFAULT '{}',
  bio                   TEXT CHECK (char_length(bio) <= 280),
  study_streak          INTEGER NOT NULL DEFAULT 0,
  total_sessions_hosted INTEGER NOT NULL DEFAULT 0,
  total_sessions_attended INTEGER NOT NULL DEFAULT 0,
  last_checkin_date     DATE,
  expo_push_token       TEXT,
  web_push_subscription JSONB,
  is_admin              BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned             BOOLEAN NOT NULL DEFAULT FALSE,
  ban_reason            TEXT,
  banned_at             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_country ON profiles (country);
CREATE INDEX idx_profiles_verification ON profiles (verification_status);
CREATE INDEX idx_profiles_location ON profiles USING GIST (last_location);
CREATE INDEX idx_profiles_college ON profiles (college);

-- ============================================================
-- TABLE: sessions
-- ============================================================

CREATE TABLE sessions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject               TEXT NOT NULL,
  subject_tags          TEXT[] DEFAULT '{}',
  description           TEXT CHECK (char_length(description) <= 280),
  vibe                  session_vibe_enum NOT NULL,
  location_name         TEXT NOT NULL,
  location_address      TEXT,
  location_geo          geography(Point, 4326),
  google_place_id       TEXT,
  location_country      TEXT,
  location_state        TEXT,
  location_city         TEXT,
  start_time            TIMESTAMPTZ NOT NULL,
  end_time              TIMESTAMPTZ NOT NULL,
  CHECK (end_time > start_time),
  CHECK (EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 <= 8),
  spots_total           SMALLINT NOT NULL CHECK (spots_total BETWEEN 1 AND 9),
  spots_filled          SMALLINT NOT NULL DEFAULT 0 CHECK (spots_filled >= 0),
  status                session_status_enum NOT NULL DEFAULT 'active',
  view_count            INTEGER NOT NULL DEFAULT 0,
  interest_count        INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_location ON sessions USING GIST (location_geo);
CREATE INDEX idx_sessions_status_time ON sessions (status, start_time);
CREATE INDEX idx_sessions_host ON sessions (host_id);
CREATE INDEX idx_sessions_country ON sessions (location_country, status, start_time);
CREATE INDEX idx_sessions_tags ON sessions USING GIN (subject_tags);
CREATE INDEX idx_sessions_vibe ON sessions (vibe, status);

-- ============================================================
-- TABLE: session_requests
-- ============================================================

CREATE TABLE session_requests (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id            UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  requester_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message               TEXT CHECK (char_length(message) <= 140),
  status                request_status_enum NOT NULL DEFAULT 'pending',
  checked_in_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, requester_id)
);

CREATE INDEX idx_requests_session_status ON session_requests (session_id, status);
CREATE INDEX idx_requests_requester ON session_requests (requester_id);
CREATE INDEX idx_requests_session_requester ON session_requests (session_id, requester_id);

-- ============================================================
-- TABLE: messages
-- ============================================================

CREATE TABLE messages (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id            UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content               TEXT NOT NULL CHECK (char_length(content) <= 1000),
  type                  message_type_enum NOT NULL DEFAULT 'text',
  is_deleted            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_session_time ON messages (session_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages (sender_id);

-- ============================================================
-- TABLE: reports
-- ============================================================

CREATE TABLE reports (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id            UUID REFERENCES sessions(id) ON DELETE SET NULL,
  reason                report_reason_enum NOT NULL,
  details               TEXT CHECK (char_length(details) <= 280),
  resolved              BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes           TEXT,
  resolved_at           TIMESTAMPTZ,
  resolved_by           UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_reported ON reports (reported_id, resolved);
CREATE INDEX idx_reports_unresolved ON reports (resolved, created_at) WHERE resolved = FALSE;

-- ============================================================
-- TABLE: blocks
-- ============================================================

CREATE TABLE blocks (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocks_blocker ON blocks (blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks (blocked_id);

-- ============================================================
-- TABLE: saved_sessions
-- ============================================================

CREATE TABLE saved_sessions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id            UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, session_id)
);

CREATE INDEX idx_saved_user ON saved_sessions (user_id);

-- ============================================================
-- TABLE: notifications
-- ============================================================

CREATE TABLE notifications (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type                  TEXT NOT NULL,
  title                 TEXT NOT NULL,
  body                  TEXT NOT NULL,
  data                  JSONB DEFAULT '{}',
  is_read               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, is_read, created_at DESC);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER session_requests_updated_at
  BEFORE UPDATE ON session_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION handle_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE sessions
    SET
      spots_filled = spots_filled + 1,
      status = CASE
        WHEN spots_filled + 1 >= spots_total THEN 'full'::session_status_enum
        ELSE status
      END
    WHERE id = NEW.session_id;
  END IF;

  IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE sessions
    SET
      spots_filled = GREATEST(spots_filled - 1, 0),
      status = CASE
        WHEN status = 'full'::session_status_enum THEN 'active'::session_status_enum
        ELSE status
      END
    WHERE id = NEW.session_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_request_status_change
  AFTER UPDATE OF status ON session_requests
  FOR EACH ROW EXECUTE FUNCTION handle_request_status_change();

CREATE OR REPLACE FUNCTION handle_new_request()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sessions SET interest_count = interest_count + 1 WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_request_insert
  AFTER INSERT ON session_requests
  FOR EACH ROW EXECUTE FUNCTION handle_new_request();

CREATE OR REPLACE FUNCTION handle_checkin()
RETURNS TRIGGER AS $$
DECLARE
  user_last_checkin DATE;
BEGIN
  IF NEW.checked_in_at IS NOT NULL AND OLD.checked_in_at IS NULL THEN
    SELECT last_checkin_date INTO user_last_checkin
    FROM profiles WHERE id = NEW.requester_id;

    UPDATE profiles
    SET
      total_sessions_attended = total_sessions_attended + 1,
      last_checkin_date = CURRENT_DATE,
      study_streak = CASE
        WHEN user_last_checkin IS NULL THEN 1
        WHEN user_last_checkin = CURRENT_DATE - INTERVAL '1 day' THEN study_streak + 1
        WHEN user_last_checkin = CURRENT_DATE THEN study_streak
        ELSE 1
      END
    WHERE id = NEW.requester_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_checkin
  AFTER UPDATE OF checked_in_at ON session_requests
  FOR EACH ROW EXECUTE FUNCTION handle_checkin();

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW session_feed AS
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

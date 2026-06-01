-- ============================================================
-- StudySpot — Row Level Security Policies
-- ============================================================

CREATE OR REPLACE FUNCTION is_blocked(other_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = auth.uid() AND blocked_id = other_user_id)
       OR (blocker_id = other_user_id AND blocked_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_session_member(s_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM session_requests
    WHERE session_id = s_id AND requester_id = auth.uid() AND status = 'approved'
  ) OR EXISTS (
    SELECT 1 FROM sessions WHERE id = s_id AND host_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: authenticated users can read"
  ON profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (is_banned = FALSE AND NOT is_blocked(id))
  );

CREATE POLICY "profiles: users can update own"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid())
    AND is_banned = (SELECT is_banned FROM profiles WHERE id = auth.uid())
  );

-- ============================================================
-- SESSIONS
-- ============================================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions: authenticated users can read active"
  ON sessions FOR SELECT TO authenticated
  USING (status != 'cancelled' AND NOT is_blocked(host_id));

CREATE POLICY "sessions: authenticated users can create"
  ON sessions FOR INSERT TO authenticated
  WITH CHECK (
    host_id = auth.uid()
    AND (SELECT is_banned FROM profiles WHERE id = auth.uid()) = FALSE
  );

CREATE POLICY "sessions: host can update"
  ON sessions FOR UPDATE TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- ============================================================
-- SESSION REQUESTS
-- ============================================================

ALTER TABLE session_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_requests: host and requester can read"
  ON session_requests FOR SELECT TO authenticated
  USING (
    requester_id = auth.uid()
    OR EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND host_id = auth.uid())
  );

CREATE POLICY "session_requests: authenticated users can request"
  ON session_requests FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = auth.uid()
    AND (SELECT is_banned FROM profiles WHERE id = auth.uid()) = FALSE
    AND NOT EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND host_id = auth.uid())
    AND EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND status IN ('active', 'full'))
  );

CREATE POLICY "session_requests: host can update status"
  ON session_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND host_id = auth.uid())
    OR requester_id = auth.uid()
  )
  WITH CHECK (requester_id = requester_id);

-- ============================================================
-- MESSAGES
-- ============================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages: session members can read"
  ON messages FOR SELECT TO authenticated
  USING (is_session_member(session_id));

CREATE POLICY "messages: session members can send"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND is_session_member(session_id)
    AND (SELECT is_banned FROM profiles WHERE id = auth.uid()) = FALSE
    AND EXISTS (
      SELECT 1 FROM sessions
      WHERE id = session_id AND status IN ('active', 'full', 'ongoing', 'completed')
    )
  );

CREATE POLICY "messages: sender can soft delete"
  ON messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() AND is_deleted = TRUE);

-- ============================================================
-- REPORTS
-- ============================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports: admins only read"
  ON reports FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "reports: authenticated users can report"
  ON reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid() AND reporter_id != reported_id);

CREATE POLICY "reports: admins can update"
  ON reports FOR UPDATE TO authenticated
  USING (is_admin());

-- ============================================================
-- BLOCKS
-- ============================================================

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks: users can read own"
  ON blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());

CREATE POLICY "blocks: users can block"
  ON blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "blocks: users can unblock"
  ON blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());

-- ============================================================
-- SAVED SESSIONS
-- ============================================================

ALTER TABLE saved_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_sessions: users can read own"
  ON saved_sessions FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "saved_sessions: users can save"
  ON saved_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_sessions: users can unsave"
  ON saved_sessions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: users can read own"
  ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications: users can mark read"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND is_read = TRUE);

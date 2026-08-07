-- ============================================================
-- StudySpot. Web Push subscriptions (008)
--
-- Push was Expo-only (profiles.expo_push_token), so the web app,
-- where every feature ships first, delivered nothing at all:
-- no service worker, no subscription store, no transport.
--
-- Additive on purpose. profiles.expo_push_token keeps working
-- exactly as before and stays the mobile transport; a user can
-- hold an Expo token AND several browser subscriptions at once,
-- and supabase/functions/_shared/push.ts fans out to both.
--
-- Run AFTER 001–007.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- The push service URL IS the subscription's identity, hence UNIQUE. A
  -- browser profile has exactly one and it outlives logout, so the row has to
  -- move to whoever is signed in now rather than be duplicated per user.
  endpoint   TEXT NOT NULL UNIQUE,
  -- Client public key + shared auth secret from PushManager.subscribe(). The
  -- Edge Function needs both to encrypt payloads the push service can relay
  -- but not read (RFC 8291).
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  platform   TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The fan-out always reads by user; nothing ever scans this table whole.
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions (user_id);

-- ------------------------------------------------------------
-- Format constraints
-- ------------------------------------------------------------
-- NOT VALID then VALIDATE, matching 006/007. The table is new so the
-- validation scan is instant; the two-step form is kept so every constraint
-- in this schema is added the same way and re-running the file on a database
-- that already has rows can never fail the migration.
ALTER TABLE push_subscriptions
  ADD CONSTRAINT chk_push_subs_endpoint_https
    CHECK (endpoint ~ '^https://[^[:space:]]{1,900}$') NOT VALID,
  -- 65-byte EC point and 16-byte secret, base64url; anything else could never
  -- have come from a real PushManager subscription.
  ADD CONSTRAINT chk_push_subs_p256dh_fmt
    CHECK (p256dh ~ '^[A-Za-z0-9_-]{80,200}$') NOT VALID,
  ADD CONSTRAINT chk_push_subs_auth_fmt
    CHECK (auth ~ '^[A-Za-z0-9_-]{16,48}$') NOT VALID,
  ADD CONSTRAINT chk_push_subs_platform
    CHECK (platform IN ('web', 'ios', 'android')) NOT VALID;

ALTER TABLE push_subscriptions VALIDATE CONSTRAINT chk_push_subs_endpoint_https;
ALTER TABLE push_subscriptions VALIDATE CONSTRAINT chk_push_subs_p256dh_fmt;
ALTER TABLE push_subscriptions VALIDATE CONSTRAINT chk_push_subs_auth_fmt;
ALTER TABLE push_subscriptions VALIDATE CONSTRAINT chk_push_subs_platform;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
-- A subscription is a delivery address for one person's devices. Nobody but
-- its owner may read it (it would let them push to that device), create one
-- in someone else's name, or revoke someone else's notifications.
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions: users can read own"
  ON push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions: users can subscribe"
  ON push_subscriptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions: users can unsubscribe"
  ON push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- No UPDATE policy: a subscription's keys are meaningless without its
-- endpoint, so a change is a new row, not an edit.

-- ------------------------------------------------------------
-- Registration
-- ------------------------------------------------------------
-- Why a definer function instead of a plain INSERT: the endpoint is owned by
-- the *browser*, not the account. Sign out and sign in as someone else and
-- PushManager hands back the same endpoint; the row must transfer, but RLS
-- (correctly) forbids deleting another user's row. Doing the handover inside
-- SECURITY DEFINER keeps the policies strict while making re-registration
-- work. search_path is pinned, as in 006's join_circle_by_code.
CREATE OR REPLACE FUNCTION upsert_push_subscription(
  p_endpoint TEXT,
  p_p256dh   TEXT,
  p_auth     TEXT,
  p_platform TEXT DEFAULT 'web'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate before anything is written: a definer function must never be a
  -- way to smuggle values past the table's own constraints.
  IF p_endpoint !~ '^https://[^[:space:]]{1,900}$' THEN
    RAISE EXCEPTION 'Invalid endpoint';
  END IF;
  IF p_p256dh !~ '^[A-Za-z0-9_-]{80,200}$' OR p_auth !~ '^[A-Za-z0-9_-]{16,48}$' THEN
    RAISE EXCEPTION 'Invalid subscription keys';
  END IF;
  IF p_platform NOT IN ('web', 'ios', 'android') THEN
    RAISE EXCEPTION 'Invalid platform';
  END IF;

  -- Device handover (see above) and plain re-subscription both land here.
  DELETE FROM push_subscriptions WHERE endpoint = p_endpoint;

  INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, platform)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth, p_platform)
  RETURNING id INTO sub_id;

  -- Cap rows per user instead of using the 006 insert-rate-limit trigger:
  -- honest clients re-register on every permission grant, so a time-based
  -- throttle would lock real users out of notifications. A hard cap still
  -- stops an authenticated script from farming rows, and 20 is far more
  -- browsers than anyone signs into.
  DELETE FROM push_subscriptions
  WHERE user_id = auth.uid()
    AND id NOT IN (
      SELECT id FROM push_subscriptions
      WHERE user_id = auth.uid()
      ORDER BY created_at DESC
      LIMIT 20
    );

  RETURN sub_id;
END;
$$;

-- ============================================================
-- StudySpot — Study Circles & Accountability Contracts (Goals)
-- ============================================================

CREATE TYPE circle_role_enum AS ENUM ('owner', 'admin', 'member');
CREATE TYPE goal_type_enum AS ENUM ('hours', 'sessions', 'custom');
CREATE TYPE goal_status_enum AS ENUM ('active', 'completed', 'failed', 'archived');

-- ------------------------------------------------------------
-- Study Circles
-- ------------------------------------------------------------
CREATE TABLE circles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  description   TEXT CHECK (char_length(description) <= 280),
  topic         TEXT,
  emoji         TEXT,
  is_private    BOOLEAN NOT NULL DEFAULT FALSE,
  join_code     TEXT NOT NULL UNIQUE DEFAULT upper(substr(md5(random()::text), 1, 6)),
  member_count  INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circles_owner ON circles (owner_id);
CREATE INDEX idx_circles_discover ON circles (is_private, created_at DESC);
CREATE INDEX idx_circles_topic ON circles (topic);

CREATE TABLE circle_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id   UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        circle_role_enum NOT NULL DEFAULT 'member',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (circle_id, user_id)
);

CREATE INDEX idx_circle_members_circle ON circle_members (circle_id);
CREATE INDEX idx_circle_members_user ON circle_members (user_id);

CREATE TABLE circle_posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id   UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_circle_posts_circle ON circle_posts (circle_id, created_at DESC);

-- ------------------------------------------------------------
-- Accountability Contracts (Goals)
-- ------------------------------------------------------------
CREATE TABLE goals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  description     TEXT CHECK (char_length(description) <= 280),
  type            goal_type_enum NOT NULL DEFAULT 'custom',
  target          NUMERIC NOT NULL CHECK (target > 0),
  -- For auto-tracked types ('hours','sessions'): the user's stat value when the
  -- goal was created, so progress = current_stat - baseline.
  baseline        NUMERIC NOT NULL DEFAULT 0,
  -- For 'custom' goals the user updates this directly.
  manual_progress NUMERIC NOT NULL DEFAULT 0,
  unit            TEXT,
  deadline        DATE,
  status          goal_status_enum NOT NULL DEFAULT 'active',
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_user ON goals (user_id, status);

-- ------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------
CREATE TRIGGER circles_updated_at
  BEFORE UPDATE ON circles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Keep circles.member_count in sync.
CREATE OR REPLACE FUNCTION handle_circle_member_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE circles SET member_count = member_count + 1 WHERE id = NEW.circle_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE circles SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.circle_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER circle_member_count
  AFTER INSERT OR DELETE ON circle_members
  FOR EACH ROW EXECUTE FUNCTION handle_circle_member_change();

-- Owner automatically joins their own circle.
CREATE OR REPLACE FUNCTION handle_new_circle()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO circle_members (circle_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_circle_created
  AFTER INSERT ON circles
  FOR EACH ROW EXECUTE FUNCTION handle_new_circle();

-- ------------------------------------------------------------
-- Helpers & RPCs
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_circle_member(c_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM circle_members WHERE circle_id = c_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Join a (possibly private) circle by its code; bypasses SELECT RLS.
CREATE OR REPLACE FUNCTION join_circle_by_code(p_code TEXT)
RETURNS UUID AS $$
DECLARE cid UUID;
BEGIN
  SELECT id INTO cid FROM circles WHERE join_code = upper(p_code);
  IF cid IS NULL THEN
    RAISE EXCEPTION 'Circle not found';
  END IF;
  INSERT INTO circle_members (circle_id, user_id)
  VALUES (cid, auth.uid())
  ON CONFLICT (circle_id, user_id) DO NOTHING;
  RETURN cid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "circles: readable when public or member"
  ON circles FOR SELECT TO authenticated
  USING (is_private = FALSE OR owner_id = auth.uid() OR is_circle_member(id));

CREATE POLICY "circles: create own"
  ON circles FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "circles: owner can update"
  ON circles FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "circles: owner can delete"
  ON circles FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "circle_members: visible to members or for public circles"
  ON circle_members FOR SELECT TO authenticated
  USING (
    is_circle_member(circle_id)
    OR EXISTS (SELECT 1 FROM circles WHERE id = circle_id AND is_private = FALSE)
  );

CREATE POLICY "circle_members: self-join public circles"
  ON circle_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM circles WHERE id = circle_id AND is_private = FALSE)
  );

CREATE POLICY "circle_members: leave"
  ON circle_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE circle_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "circle_posts: members can read"
  ON circle_posts FOR SELECT TO authenticated
  USING (is_circle_member(circle_id));

CREATE POLICY "circle_posts: members can post"
  ON circle_posts FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND is_circle_member(circle_id));

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals: owner or public can read"
  ON goals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_public = TRUE);

CREATE POLICY "goals: create own"
  ON goals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "goals: update own"
  ON goals FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "goals: delete own"
  ON goals FOR DELETE TO authenticated
  USING (user_id = auth.uid());

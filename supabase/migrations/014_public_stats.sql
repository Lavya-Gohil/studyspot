-- 014: Aggregate counters the marketing pages can show to logged-out visitors.
--
-- The landing page used to render an invented SESSIONS array, "Calc II grind"
-- at "Bean & Brew" with three made-up classmates. That is the single most
-- recognisable tell of a generated product page, and it is also a small lie:
-- it shows a busy product to someone who cannot yet tell whether anyone is
-- here.
--
-- Showing the truth instead needs a way in, because every RLS policy in
-- 002/004/005 is granted `TO authenticated`: an anonymous visitor reading
-- sessions or profiles correctly gets nothing back. So rather than loosening
-- any policy, this is one narrow SECURITY DEFINER function that returns
-- COUNTS ONLY.
--
-- What it deliberately cannot leak: no names, no ids, no locations, no
-- subjects, no timestamps, nothing per-user, nothing that could identify a
-- student. Four integers. If the numbers are small the page says so honestly
-- rather than inventing bigger ones.
--
-- search_path pinned, per 009.

CREATE OR REPLACE FUNCTION public.public_stats()
RETURNS TABLE (
  active_sessions  INTEGER,
  studying_now     INTEGER,
  students         INTEGER,
  hours_focused    INTEGER
) AS $$
  SELECT
    (SELECT COUNT(*) FROM sessions
      WHERE status IN ('active', 'full')
        AND end_time > NOW())::int,
    (SELECT COUNT(*) FROM sessions
      WHERE status = 'ongoing'
        AND start_time <= NOW() AND end_time > NOW())::int,
    (SELECT COUNT(*) FROM profiles WHERE is_banned = FALSE)::int,
    (SELECT COALESCE(SUM(duration_seconds), 0) / 3600 FROM focus_sessions)::int;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions;

-- anon needs it (that is the whole point); authenticated gets it too so the
-- same component works signed in.
REVOKE ALL ON FUNCTION public.public_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_stats() TO anon, authenticated;

-- 007: Constrain country codes at the database layer.
--
-- profiles.country and sessions.location_country were declared as bare TEXT
-- (001_schema.sql). The only thing enforcing the ISO 3166-1 alpha-2 shape was
-- the zod regex in apps/web/lib/validation.ts — and since the browser talks to
-- Supabase directly, a client can PATCH its own profile and skip that entirely.
--
-- That mattered because profiles.country is interpolated into a PostgREST
-- `.or()` filter expression when building the feed. packages/api/src/filters.ts
-- now validates the value before it reaches that filter; this migration closes
-- the same hole one layer down, so the bad value can't be stored in the first
-- place. Consistent with the project's rule that the database is the
-- authoritative enforcement layer (README, "Security").

-- NOT VALID: applies to all new writes immediately without a full table scan,
-- and without failing the migration on pre-existing rows. Matches the pattern
-- used by the CHECK constraints in 006_security_hardening.sql.
ALTER TABLE profiles
  ADD CONSTRAINT profiles_country_iso3166
  CHECK (country IS NULL OR country ~ '^[A-Z]{2}$') NOT VALID;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_location_country_iso3166
  CHECK (location_country IS NULL OR location_country ~ '^[A-Z]{2}$') NOT VALID;

-- Existing rows are left unvalidated above. Normalise what can be normalised,
-- then null out anything still malformed so the constraints can be validated.
UPDATE profiles
  SET country = UPPER(TRIM(country))
  WHERE country IS NOT NULL AND UPPER(TRIM(country)) ~ '^[A-Z]{2}$' AND country !~ '^[A-Z]{2}$';

UPDATE profiles
  SET country = NULL
  WHERE country IS NOT NULL AND country !~ '^[A-Z]{2}$';

UPDATE sessions
  SET location_country = UPPER(TRIM(location_country))
  WHERE location_country IS NOT NULL
    AND UPPER(TRIM(location_country)) ~ '^[A-Z]{2}$'
    AND location_country !~ '^[A-Z]{2}$';

UPDATE sessions
  SET location_country = NULL
  WHERE location_country IS NOT NULL AND location_country !~ '^[A-Z]{2}$';

-- Now that the data conforms, promote both constraints to fully validated so
-- the planner and future readers can rely on them.
ALTER TABLE profiles VALIDATE CONSTRAINT profiles_country_iso3166;
ALTER TABLE sessions VALIDATE CONSTRAINT sessions_location_country_iso3166;

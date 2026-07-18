-- =============================================================================
-- OSS baseline init migration
-- =============================================================================
-- Canonical baseline schema for the NXT Grid mini-grid management platform,
-- derived from the legacy migration chain (legacy/supabase/migrations/) minus
-- dead/deprecated/company-specific objects. Every deviation from the legacy
-- chain is recorded in docs/plans/002-oss-migration/002b-schema-deviation-register.md
-- (register entries #1-#34 and the Column/Programmability/Performance/Data API/
-- FK adjustment sections) — that file is the authoritative source for "why" any
-- given line here differs from the legacy chain.
-- =============================================================================

-- =============================================================================
-- Extensions
-- =============================================================================
-- Only extensions NOT already enabled on a fresh Supabase Postgres image are
-- created here. Platform defaults (pg_stat_statements, pgcrypto,
-- supabase_vault, uuid-ossp), pg_graphql, and advisor tooling (hypopg,
-- index_advisor) are intentionally omitted — see register #11.
-- pgjwt is intentionally NOT enabled: unavailable on Postgres 17 and confirmed
-- unused in the legacy schema/app code (register #11, amended 2026-07-10).

CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgsodium";

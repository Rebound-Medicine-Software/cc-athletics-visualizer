-- Warning #11 (Section 3, framework.md): "Extension installed in the public schema (should be isolated)".
--
-- uuid-ossp, pg_cron, and pg_net were originally created with no explicit
-- schema back on 2025-06-09, which landed them in `public`. A later
-- migration (2026-04-28 12:36, 20260428123625_...) tried to fix this with
-- `CREATE EXTENSION IF NOT EXISTS pg_cron/pg_net WITH SCHEMA extensions;`
-- but that was a silent no-op: the extensions already existed, so
-- "IF NOT EXISTS" skipped creation entirely and the WITH SCHEMA clause was
-- never applied. As far as migration history shows, all three extensions
-- are still registered in `public` today.
--
-- This migration actually relocates them using ALTER EXTENSION ... SET
-- SCHEMA, guarded so it only acts if an extension is still in `public`
-- (safe to re-run) and wrapped so one extension failing to move doesn't
-- block the others.
--
-- Why this is safe:
-- - Supabase's default search_path for all roles already includes
--   `extensions`, so unqualified calls (e.g. uuid_generate_v4()) keep
--   resolving after the move.
-- - Existing column defaults like `DEFAULT uuid_generate_v4()` reference
--   the function by OID, not by schema-qualified name, so they are
--   unaffected by relocating the extension.
-- - pg_cron's `cron.*` functions and pg_net's `net.*` functions already
--   live in their own fixed schemas regardless of which schema the
--   extension itself is registered under, so no call sites change.

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname = 'uuid-ossp' AND n.nspname = 'public'
    ) THEN
    ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not move uuid-ossp to extensions schema: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname = 'pg_cron' AND n.nspname = 'public'
    ) THEN
    ALTER EXTENSION pg_cron SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not move pg_cron to extensions schema: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname = 'pg_net' AND n.nspname = 'public'
    ) THEN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not move pg_net to extensions schema: %', SQLERRM;
END $$;

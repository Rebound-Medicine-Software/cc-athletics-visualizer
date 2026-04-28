-- Q1: Quarantine deprecated public objects into a new `legacy` schema.
-- Data is preserved (ALTER ... SET SCHEMA), no DROP TABLE.

-- 1. Create the quarantine schema
CREATE SCHEMA IF NOT EXISTS legacy;

-- 2. Drop dependent RLS policies that reference deprecated objects from live tables.
--    The `bookings` table's policy references public.clients; since clients is being
--    quarantined, we drop the dependent policy. Team-based access on bookings is
--    already covered by the existing `team can manage bookings` policy.
DROP POLICY IF EXISTS "Clients can view their own bookings" ON public.bookings;

-- 3. Move tables to legacy schema (preserves all rows, indexes, constraints, RLS)
ALTER TABLE public.clients                  SET SCHEMA legacy;
ALTER TABLE public.athletes_new             SET SCHEMA legacy;
ALTER TABLE public.test_results             SET SCHEMA legacy;
ALTER TABLE public."Elite Athlete Data"     SET SCHEMA legacy;
ALTER TABLE public."Elite Athletes New"     SET SCHEMA legacy;
ALTER TABLE public.elite_athlete_metrics    SET SCHEMA legacy;

-- 4. Move the user_profiles view to legacy schema
ALTER VIEW  public.user_profiles            SET SCHEMA legacy;

-- 5. Revoke public/anon/authenticated access on quarantined objects.
--    They should not be reachable via PostgREST anymore (legacy schema is not exposed).
REVOKE ALL ON ALL TABLES    IN SCHEMA legacy FROM anon, authenticated, public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA legacy FROM anon, authenticated, public;
REVOKE ALL ON SCHEMA legacy                  FROM anon, authenticated, public;

-- 6. Grant service_role full access for any future admin/recovery work
GRANT USAGE ON SCHEMA legacy TO service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA legacy TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA legacy TO service_role;
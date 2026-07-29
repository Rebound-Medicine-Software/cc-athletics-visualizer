-- Security fix (framework.md Section 3, Critical #4): "Any authenticated user can
-- subscribe to Realtime channels."
--
-- Context: Postgres Changes payloads are already correctly filtered by each source
-- table's own RLS policies (confirmed by code review 29 July 2026) --
-- platform_activity_logs / integration_health_logs / super_admin_impersonation_logs
-- are super-admin-only via public.is_super_admin(), and platform_in_app_notifications
-- is scoped to "recipient_user_id = auth.uid()". So no *data* has been leaking through
-- these channels to the wrong person.
--
-- What was NOT locked down: by default, any authenticated client (the app used plain
-- public channels, never `private: true`) can open a websocket and join any of these
-- channel topics by name, since nothing on the realtime.messages table currently
-- authorizes who may even join the topic -- table RLS only filters which *rows* they'd
-- receive, not whether they can subscribe in the first place. This migration adds that
-- missing layer, per Supabase's documented Realtime Authorization pattern:
-- https://supabase.com/docs/guides/realtime/authorization
--
-- Companion frontend change (same PR): the 6 channel() calls that use these topic names
-- now pass `{ config: { private: true } }`, since public channels skip realtime.messages
-- RLS entirely -- without that change these policies would never be consulted.
--
-- Scope note: this does not touch Realtime for public.test_data used elsewhere in the
-- app outside the "cc-test-data" Control Centre channel -- that broader question is
-- framework.md Section 3, Warning #5 (won't-fix, by design), not this item.

CREATE POLICY "super admins can join control centre realtime topics"
ON "realtime"."messages"
FOR SELECT
TO authenticated
USING (
    (select realtime.topic()) IN (
      'cc-platform-activity',
      'cc-integration-health',
      'cc-test-data',
      'cc-impersonation-logs'
    )
    AND public.is_super_admin()
  );

CREATE POLICY "users can join their own notification realtime topics"
ON "realtime"."messages"
FOR SELECT
TO authenticated
USING (
    (select realtime.topic()) = 'client-notifications-' || (select auth.uid())::text
    OR (select realtime.topic()) = 'in-app-notifications-' || (select auth.uid())::text
  );

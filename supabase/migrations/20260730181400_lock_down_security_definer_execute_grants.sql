-- Security fix: lock down SECURITY DEFINER function EXECUTE grants
-- (Section 3, Warnings #7 and #8 of the NEXUS Hub security scan)
--
-- #7: Postgres grants EXECUTE on every newly created function to PUBLIC by
-- default. A batch of RPCs added across the H16/H24 migrations (platform
-- settings, feature flags, in-app notifications, webhook endpoint admin,
-- super-admin health snapshot, team report activity) were granted to
-- `authenticated` but the matching `REVOKE ... FROM PUBLIC` was never added,
-- so anon/public callers could still invoke them. Each of these functions
-- already checks is_super_admin() or scopes by auth.uid()/team internally,
-- so this was not exploitable today, but it is exactly the "public can
-- execute a SECURITY DEFINER function" gap the scanner flags, and leaves no
-- safety net if one of those internal checks ever regresses. Closing it here
-- for defense in depth.
--
-- #8: mark_webhook_endpoint_result(uuid, boolean, text) is a real gap, not
-- just a defense-in-depth one: it has no internal authorization check at
-- all and was granted EXECUTE to `authenticated`. It is only ever called by
-- the webhook-test-fire edge function using the service-role key (which
-- bypasses grants entirely), so the `authenticated` grant serves no purpose
-- other than letting any logged-in user overwrite last_success_at /
-- last_failure_at / failure_reason on any team's webhook endpoint. Revoking
-- authenticated's access here removes that gap without touching the edge
-- function, which never relied on the authenticated grant.

-- #7: close the PUBLIC/anon execute gap left open on this batch of
-- authenticated-only, internally-guarded RPCs.
REVOKE ALL ON FUNCTION public.get_platform_settings(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_feature_flags() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_platform_setting(text, jsonb, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_feature_flag(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.count_active_webhook_endpoints() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_in_app_notifications(boolean, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dismiss_notification(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.count_unread_in_app_notifications() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_webhook_endpoints() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_webhook_endpoint(text, text, text, uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.toggle_webhook_endpoint(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_webhook_endpoint(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_webhook_test_fired(uuid, boolean, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_super_admin_health_snapshot() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_webhook_url(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.log_webhook_test_blocked(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_team_report_activity(uuid, int) FROM PUBLIC, anon;

-- #8: mark_webhook_endpoint_result has no internal auth check and is only
-- ever called by the webhook-test-fire edge function via the service-role
-- key, which bypasses grants anyway. Revoke it from everyone except the
-- table/function owner so a logged-in end user can no longer call it
-- directly and tamper with another team's webhook endpoint status.
REVOKE ALL ON FUNCTION public.mark_webhook_endpoint_result(uuid, boolean, text) FROM PUBLIC, anon, authenticated;

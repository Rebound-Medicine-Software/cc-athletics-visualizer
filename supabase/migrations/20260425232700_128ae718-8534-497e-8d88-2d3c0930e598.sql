create index if not exists idx_platform_activity_logs_created_at on public.platform_activity_logs(created_at desc);
create index if not exists idx_platform_alerts_created_at on public.platform_alerts(created_at desc);
create index if not exists idx_org_health_team_date on public.organisation_health_metrics(team_id, snapshot_date desc);
create index if not exists idx_integration_logs_logged_at on public.integration_health_logs(logged_at desc);
create index if not exists idx_billing_team on public.billing_subscriptions(team_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);
create index if not exists idx_benchmark_lookup on public.benchmark_data_warehouse(sport, age_group, weight_category, test_type);

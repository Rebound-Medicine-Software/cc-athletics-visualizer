
CREATE OR REPLACE FUNCTION public.list_team_report_activity(team_uuid uuid, row_limit int DEFAULT 25)
RETURNS TABLE (
  id uuid,
  event_type text,
  severity text,
  organisation_name text,
  team_id uuid,
  athlete_id uuid,
  report_type text,
  status text,
  report_url text,
  filename text,
  duration_ms int,
  test_count int,
  error_reason text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- AuthZ: caller must be super admin OR belong to the requested team
  IF NOT (
    public.is_super_admin()
    OR public.can_access_team_row(team_uuid)
  ) THEN
    RAISE EXCEPTION 'Access denied to team report activity';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.event_type,
    l.severity,
    l.organisation_name,
    l.team_id,
    l.athlete_id,
    COALESCE(l.metadata->>'report_type', NULL)               AS report_type,
    CASE
      WHEN l.event_type IN ('report_generation_failed','report_email_failed','ai_coach_insight_failed') THEN 'failed'
      ELSE 'success'
    END                                                       AS status,
    -- Only expose URL on success events; never for failures
    CASE
      WHEN l.event_type IN ('report_generation_failed','report_email_failed','ai_coach_insight_failed') THEN NULL
      ELSE NULLIF(l.metadata->>'report_url','')
    END                                                       AS report_url,
    NULLIF(l.metadata->>'filename','')                        AS filename,
    NULLIF(l.metadata->>'duration_ms','')::int                AS duration_ms,
    NULLIF(l.metadata->>'test_count','')::int                 AS test_count,
    NULLIF(l.metadata->>'error','')                           AS error_reason,
    l.created_at
  FROM public.platform_activity_logs l
  WHERE l.team_id = team_uuid
    AND l.event_type IN (
      'report_generated',
      'report_generation_failed',
      'report_email_sent',
      'report_email_failed',
      'ai_coach_insight_generated',
      'ai_coach_insight_failed'
    )
  ORDER BY l.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(row_limit, 25), 200));
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_team_report_activity(uuid, int) TO authenticated;


CREATE OR REPLACE FUNCTION public.get_bookings_overview()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  v_month_start timestamptz := date_trunc('month', now());
  v_today_start timestamptz := date_trunc('day', now());
  v_24h timestamptz := now() - interval '24 hours';
  v_monthly_bookings bigint;
  v_booking_limit numeric;
  v_utilisation numeric;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  SELECT count(*) INTO v_monthly_bookings
  FROM public.bookings
  WHERE appointment_date >= v_month_start
    AND appointment_date < v_month_start + interval '1 month'
    AND coalesce(status,'scheduled') <> 'cancelled';

  SELECT nullif(sum(t.max_bookings_per_month * coalesce(b.seat_count,1)),0)
  INTO v_booking_limit
  FROM public.billing_subscriptions b
  JOIN public.tiers t ON lower(t.name) = lower(b.tier_name)
   AND (t.team_id = b.team_id OR t.team_id IS NULL)
  WHERE b.status = 'active'
    AND t.max_bookings_per_month IS NOT NULL
    AND t.max_bookings_per_month > 0;

  IF v_booking_limit IS NOT NULL THEN
    v_utilisation := round((v_monthly_bookings::numeric / v_booking_limit) * 100, 1);
  END IF;

  SELECT json_build_object(
    'bookings_this_month', v_monthly_bookings,
    'bookings_today', (
      SELECT count(*) FROM public.bookings
      WHERE appointment_date >= v_today_start
        AND appointment_date < v_today_start + interval '1 day'
        AND coalesce(status,'scheduled') <> 'cancelled'
    ),
    'cancellations_this_month', (
      SELECT count(*) FROM public.bookings
      WHERE status = 'cancelled' AND coalesce(updated_at, created_at) >= v_month_start
    ),
    'failed_syncs_24h', (
      SELECT count(*) FROM public.bookings
      WHERE sync_status = 'failed' AND coalesce(updated_at, created_at) >= v_24h
    ) + (
      SELECT count(*) FROM public.integration_health_logs
      WHERE integration_name IN ('cal_com','calcom')
        AND status = 'failed' AND logged_at >= v_24h
    ),
    'connected_calcom_orgs', (
      SELECT count(*) FROM public.teams WHERE calcom_connected IS TRUE
    ),
    'total_bookings', (SELECT count(*) FROM public.bookings),
    'booking_limit_total', v_booking_limit,
    'booking_utilisation_percent', v_utilisation
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_bookings_trends(days_back integer DEFAULT 30)
RETURNS TABLE(day date, created_count bigint, cancelled_count bigint, sync_failure_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  RETURN QUERY
  WITH series AS (
    SELECT generate_series(
      (current_date - (days_back - 1) * interval '1 day')::date,
      current_date,
      interval '1 day'
    )::date AS d
  )
  SELECT
    s.d,
    COALESCE((SELECT count(*) FROM public.bookings b
              WHERE b.created_at::date = s.d), 0)::bigint,
    COALESCE((SELECT count(*) FROM public.bookings b
              WHERE b.status = 'cancelled' AND coalesce(b.updated_at,b.created_at)::date = s.d), 0)::bigint,
    COALESCE((SELECT count(*) FROM public.bookings b
              WHERE b.sync_status = 'failed' AND coalesce(b.updated_at,b.created_at)::date = s.d), 0)::bigint
    +
    COALESCE((SELECT count(*) FROM public.integration_health_logs il
              WHERE il.integration_name IN ('cal_com','calcom')
                AND il.status = 'failed' AND il.logged_at::date = s.d), 0)::bigint
  FROM series s
  ORDER BY s.d;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_booking_failures(row_limit integer DEFAULT 50)
RETURNS TABLE(
  id text,
  source text,
  organisation_name text,
  booking_id uuid,
  failure_reason text,
  occurred_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  RETURN QUERY
  (
    SELECT
      ('bk:'||b.id::text),
      coalesce(b.booking_source, 'bookings')::text AS source,
      (SELECT name FROM public.teams t WHERE t.id = b.team_id) AS organisation_name,
      b.id AS booking_id,
      coalesce(b.failure_reason, 'Sync failed')::text,
      coalesce(b.updated_at, b.created_at) AS occurred_at
    FROM public.bookings b
    WHERE b.sync_status = 'failed'
    ORDER BY coalesce(b.updated_at, b.created_at) DESC
    LIMIT row_limit
  )
  UNION ALL
  (
    SELECT
      ('ih:'||il.id::text),
      il.integration_name::text,
      (SELECT name FROM public.teams t WHERE t.id = il.team_id) AS organisation_name,
      NULL::uuid,
      coalesce(il.failure_reason, 'Integration failure')::text,
      il.logged_at
    FROM public.integration_health_logs il
    WHERE il.integration_name IN ('cal_com','calcom')
      AND il.status = 'failed'
    ORDER BY il.logged_at DESC
    LIMIT row_limit
  )
  ORDER BY occurred_at DESC NULLS LAST
  LIMIT row_limit;
END;
$$;

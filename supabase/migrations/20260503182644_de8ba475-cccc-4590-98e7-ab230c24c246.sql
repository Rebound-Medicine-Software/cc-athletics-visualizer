DO $$
DECLARE
  v_team_id uuid := '2577a78f-edf7-4201-a70b-db764ce489fc';
  v_user_id uuid := 'ca50e050-fb02-4760-85ab-5886990b20c1';
  v_tier_id uuid;
BEGIN
  -- Create or reuse an internal-testing tier scoped to this team
  SELECT id INTO v_tier_id
  FROM public.tiers
  WHERE name = 'Internal Testing' AND team_id = v_team_id
  LIMIT 1;

  IF v_tier_id IS NULL THEN
    INSERT INTO public.tiers (
      team_id, name, price_monthly,
      can_view_analytics, can_edit_programming, can_export_reports,
      can_adjust_sets_reps, can_use_ai_coach, max_bookings_per_month
    ) VALUES (
      v_team_id, 'Internal Testing', 0,
      true, true, true,
      true, true, 999
    )
    RETURNING id INTO v_tier_id;
  ELSE
    UPDATE public.tiers
    SET can_view_analytics = true,
        can_edit_programming = true,
        can_export_reports = true,
        can_adjust_sets_reps = true,
        can_use_ai_coach = true,
        max_bookings_per_month = 999,
        updated_at = now()
    WHERE id = v_tier_id;
  END IF;

  -- Apply tier to team and user profile
  UPDATE public.teams SET tier_id = v_tier_id, updated_at = now() WHERE id = v_team_id;
  UPDATE public.profiles SET tier_id = v_tier_id, updated_at = now() WHERE user_id = v_user_id;

  -- Best-effort audit log
  INSERT INTO public.platform_activity_logs (event_type, event_source, team_id, user_id, severity, metadata)
  VALUES (
    'tier_assigned', 'programming.pgm5', v_team_id, v_user_id, 'info',
    jsonb_build_object('tier_id', v_tier_id, 'tier_name', 'Internal Testing', 'reason', 'PGM5 full-access for testing')
  );
END $$;
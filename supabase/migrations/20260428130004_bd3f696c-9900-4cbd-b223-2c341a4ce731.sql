
CREATE OR REPLACE FUNCTION public.update_support_ticket(
  ticket_uuid uuid,
  new_status text DEFAULT NULL::text,
  new_priority text DEFAULT NULL::text,
  new_assigned_to uuid DEFAULT NULL::uuid,
  clear_assigned boolean DEFAULT false,
  append_entry_kind text DEFAULT NULL::text,
  append_entry_body text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_email text;
  v_admin_name  text;
  v_admin_id    uuid := auth.uid();
  v_entry       jsonb;
  v_row         public.support_tickets;
  v_prev        public.support_tickets;
  v_subject     text;
  v_severity    text;
  v_meta_base   jsonb;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  -- Snapshot previous state
  SELECT * INTO v_prev FROM public.support_tickets WHERE id = ticket_uuid;
  IF v_prev.id IS NULL THEN
    RAISE EXCEPTION 'ticket not found: %', ticket_uuid;
  END IF;

  SELECT email, full_name
    INTO v_admin_email, v_admin_name
    FROM public.super_admin_users
   WHERE auth_user_id = v_admin_id
   LIMIT 1;

  v_subject := coalesce(v_prev.subject, '(no subject)');

  -- Apply status/priority/assignment update
  UPDATE public.support_tickets
     SET status = COALESCE(new_status, status),
         priority = COALESCE(new_priority, priority),
         assigned_to = CASE
            WHEN clear_assigned THEN NULL
            WHEN new_assigned_to IS NOT NULL THEN new_assigned_to
            ELSE assigned_to
         END,
         updated_at = now()
   WHERE id = ticket_uuid;

  -- Append note/reply entry if provided
  IF append_entry_kind IS NOT NULL AND append_entry_body IS NOT NULL
     AND length(trim(append_entry_body)) > 0 THEN
    v_entry := jsonb_build_object(
      'kind', append_entry_kind,
      'body', append_entry_body,
      'author_id', v_admin_id,
      'author_email', v_admin_email,
      'author_name', v_admin_name,
      'author_role', 'super_admin',
      'at', now()
    );
    UPDATE public.support_tickets
       SET conversation = coalesce(conversation,'[]'::jsonb) || jsonb_build_array(v_entry),
           updated_at = now()
     WHERE id = ticket_uuid;
  END IF;

  SELECT * INTO v_row FROM public.support_tickets WHERE id = ticket_uuid;

  v_meta_base := jsonb_build_object(
    'ticket_id', ticket_uuid,
    'subject', v_subject,
    'team_id', v_row.team_id,
    'actor_email', v_admin_email,
    'actor_name', v_admin_name
  );

  -- Status change event
  IF new_status IS NOT NULL AND new_status IS DISTINCT FROM v_prev.status THEN
    v_severity := CASE WHEN new_status IN ('escalated','critical') THEN 'warning' ELSE 'info' END;
    INSERT INTO public.platform_activity_logs (event_type, event_source, severity, team_id, user_id, metadata)
    VALUES (
      'support_ticket_status_changed', 'support_desk', v_severity, v_row.team_id, v_admin_id,
      v_meta_base || jsonb_build_object('previous_status', v_prev.status, 'new_status', new_status)
    );
  END IF;

  -- Priority change event
  IF new_priority IS NOT NULL AND new_priority IS DISTINCT FROM v_prev.priority THEN
    v_severity := CASE WHEN new_priority IN ('high','urgent') THEN 'warning' ELSE 'info' END;
    INSERT INTO public.platform_activity_logs (event_type, event_source, severity, team_id, user_id, metadata)
    VALUES (
      'support_ticket_priority_changed', 'support_desk', v_severity, v_row.team_id, v_admin_id,
      v_meta_base || jsonb_build_object('previous_priority', v_prev.priority, 'new_priority', new_priority)
    );
  END IF;

  -- Assignment events
  IF clear_assigned AND v_prev.assigned_to IS NOT NULL THEN
    INSERT INTO public.platform_activity_logs (event_type, event_source, severity, team_id, user_id, metadata)
    VALUES (
      'support_ticket_unassigned', 'support_desk', 'info', v_row.team_id, v_admin_id,
      v_meta_base || jsonb_build_object('previous_assignee', v_prev.assigned_to, 'new_assignee', NULL)
    );
  ELSIF new_assigned_to IS NOT NULL AND new_assigned_to IS DISTINCT FROM v_prev.assigned_to THEN
    INSERT INTO public.platform_activity_logs (event_type, event_source, severity, team_id, user_id, metadata)
    VALUES (
      'support_ticket_assigned', 'support_desk', 'info', v_row.team_id, v_admin_id,
      v_meta_base || jsonb_build_object('previous_assignee', v_prev.assigned_to, 'new_assignee', new_assigned_to)
    );
  END IF;

  -- Note / reply entry event
  IF v_entry IS NOT NULL THEN
    INSERT INTO public.platform_activity_logs (event_type, event_source, severity, team_id, user_id, metadata)
    VALUES (
      CASE WHEN append_entry_kind = 'reply' THEN 'support_ticket_reply_added'
           ELSE 'support_ticket_note_added' END,
      'support_desk', 'info', v_row.team_id, v_admin_id,
      v_meta_base || jsonb_build_object(
        'entry_kind', append_entry_kind,
        'body_preview', left(append_entry_body, 200)
      )
    );
  END IF;

  RETURN row_to_json(v_row);
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_support_tickets()
RETURNS TABLE (
  id uuid,
  team_id uuid,
  organisation_name text,
  subject text,
  status text,
  priority text,
  assigned_to uuid,
  assigned_to_name text,
  opened_by uuid,
  opened_by_name text,
  conversation_count integer,
  last_message_preview text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.team_id,
    tm.name AS organisation_name,
    t.subject,
    coalesce(t.status, 'open') AS status,
    coalesce(t.priority, 'normal') AS priority,
    t.assigned_to,
    pa.full_name AS assigned_to_name,
    t.opened_by,
    po.full_name AS opened_by_name,
    coalesce(jsonb_array_length(t.conversation), 0) AS conversation_count,
    (
      SELECT (e->>'body')
      FROM jsonb_array_elements(coalesce(t.conversation,'[]'::jsonb)) WITH ORDINALITY AS arr(e, ord)
      ORDER BY ord DESC
      LIMIT 1
    ) AS last_message_preview,
    t.created_at,
    t.updated_at
  FROM public.support_tickets t
  LEFT JOIN public.teams tm ON tm.id = t.team_id
  LEFT JOIN public.profiles pa ON pa.user_id = t.assigned_to
  LEFT JOIN public.profiles po ON po.user_id = t.opened_by
  ORDER BY t.updated_at DESC NULLS LAST, t.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_support_ticket_detail(ticket_uuid uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  SELECT json_build_object(
    'id', t.id,
    'team_id', t.team_id,
    'organisation_name', (SELECT name FROM public.teams WHERE id = t.team_id),
    'subject', t.subject,
    'status', coalesce(t.status,'open'),
    'priority', coalesce(t.priority,'normal'),
    'assigned_to', t.assigned_to,
    'assigned_to_name', (SELECT full_name FROM public.profiles WHERE user_id = t.assigned_to LIMIT 1),
    'assigned_to_email', (SELECT email FROM public.profiles WHERE user_id = t.assigned_to LIMIT 1),
    'opened_by', t.opened_by,
    'opened_by_name', (SELECT full_name FROM public.profiles WHERE user_id = t.opened_by LIMIT 1),
    'opened_by_email', (SELECT email FROM public.profiles WHERE user_id = t.opened_by LIMIT 1),
    'conversation', coalesce(t.conversation, '[]'::jsonb),
    'created_at', t.created_at,
    'updated_at', t.updated_at
  ) INTO result
  FROM public.support_tickets t
  WHERE t.id = ticket_uuid;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_support_ticket(
  ticket_uuid uuid,
  new_status text DEFAULT NULL,
  new_priority text DEFAULT NULL,
  new_assigned_to uuid DEFAULT NULL,
  clear_assigned boolean DEFAULT false,
  append_entry_kind text DEFAULT NULL,   -- 'note' or 'reply'
  append_entry_body text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email text;
  v_admin_name  text;
  v_entry       jsonb;
  v_row         public.support_tickets;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'unauthorised';
  END IF;

  SELECT email, full_name
    INTO v_admin_email, v_admin_name
    FROM public.super_admin_users
   WHERE auth_user_id = auth.uid()
   LIMIT 1;

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

  IF append_entry_kind IS NOT NULL AND append_entry_body IS NOT NULL
     AND length(trim(append_entry_body)) > 0 THEN
    v_entry := jsonb_build_object(
      'kind', append_entry_kind,
      'body', append_entry_body,
      'author_id', auth.uid(),
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
  RETURN row_to_json(v_row);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_support_tickets() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_support_ticket_detail(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_support_ticket(uuid, text, text, uuid, boolean, text, text) FROM anon;
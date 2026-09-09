-- Client messaging: schema for Phase 1 Item 1's third practitioner day-one
-- action, "message or send a resource to a specific client" (framework.md
-- Section 4, Item 1 — specced 29 July 2026, confirmed ready to build, not
-- yet started). This migration only adds the table + RLS; the UI (a compose
-- box on the practitioner's client view, a messages list on the athlete
-- side) is deliberately left for a future run so this doesn't turn into an
-- unreviewed multi-screen feature build in one pass.
--
-- Design notes:
--   * Kept team-scoped (not cross-team) on purpose. Unlike the dashboard's
--     intentional cross-team reads (Section 3, Warning #5), this is direct
--     communication to a named person, so a practitioner can only message
--     clients on their own team.
--   * athlete_id is the link to the recipient, resolved to their auth user
--     via athletes.user_id at query time rather than storing a separate
--     recipient_user_id — avoids the column going stale if an athlete's
--     account gets relinked, same reasoning already used elsewhere in this
--     schema (e.g. the profiles/athletes full_name backfills).
--   * A trigger (not just RLS) stops a recipient from editing anything but
--     read_at — Postgres RLS alone can't compare old vs. new column values
--     within one UPDATE policy, so a plain USING/WITH CHECK pair would have
--     let a client silently rewrite a message's own body/sender.

CREATE TABLE public.client_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.athletes(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT NOT NULL,
  resource_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_client_messages_athlete ON public.client_messages(athlete_id, created_at DESC);
CREATE INDEX idx_client_messages_team ON public.client_messages(team_id);

ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;

-- Service role: full access, same as every other staff-facing table in this repo.
CREATE POLICY "service role client_messages"
  ON public.client_messages FOR ALL
  USING (auth.role() = 'service_role');

-- Super admins: full access.
CREATE POLICY "super admins manage client_messages"
  ON public.client_messages FOR ALL
  USING (public.get_my_role() = 'super_admin')
  WITH CHECK (public.get_my_role() = 'super_admin');

-- Practitioners/org admins can send a message to a client on their own team,
-- and only their own team (checked both via get_my_team_id() and by
-- confirming the target athlete actually belongs to that team).
CREATE POLICY "Team staff can send client messages"
  ON public.client_messages FOR INSERT
  WITH CHECK (
    team_id = public.get_my_team_id()
    AND public.get_my_role() IN ('practitioner', 'organisation')
    AND sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = athlete_id AND a.team_id = client_messages.team_id
    )
  );

-- Practitioners/org admins can view messages sent to their own team's
-- clients (not just the ones they personally sent), so a colleague can see
-- what's already gone out.
CREATE POLICY "Team staff can view client messages"
  ON public.client_messages FOR SELECT
  USING (
    team_id = public.get_my_team_id()
    AND public.get_my_role() IN ('practitioner', 'organisation')
  );

-- A client/athlete can read only messages addressed to them.
CREATE POLICY "Recipients can read own client messages"
  ON public.client_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = client_messages.athlete_id AND a.user_id = auth.uid()
    )
  );

-- A client/athlete can update only their own messages (further restricted
-- to read_at only by the trigger below).
CREATE POLICY "Recipients can mark own client messages read"
  ON public.client_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = client_messages.athlete_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.athletes a
      WHERE a.id = client_messages.athlete_id AND a.user_id = auth.uid()
    )
  );

-- Enforce, at the trigger level, that a non-staff caller (i.e. the
-- recipient, once the UPDATE policy above lets them in) can only change
-- read_at. Staff (practitioner/organisation/super_admin) can edit freely.
CREATE OR REPLACE FUNCTION public.client_messages_recipient_read_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_my_role() IN ('practitioner', 'organisation', 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.team_id IS DISTINCT FROM OLD.team_id
     OR NEW.athlete_id IS DISTINCT FROM OLD.athlete_id
     OR NEW.sender_user_id IS DISTINCT FROM OLD.sender_user_id
     OR NEW.subject IS DISTINCT FROM OLD.subject
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.resource_url IS DISTINCT FROM OLD.resource_url
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Recipients may only mark client_messages as read';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER client_messages_recipient_read_only_trigger
  BEFORE UPDATE ON public.client_messages
  FOR EACH ROW EXECUTE FUNCTION public.client_messages_recipient_read_only();

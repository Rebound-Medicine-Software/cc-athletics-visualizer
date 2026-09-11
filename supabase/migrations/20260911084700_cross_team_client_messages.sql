-- Josh's correction, 11 September 2026 (live chat): client_messages was
-- shipped team-scoped in PR #57 ("a practitioner can only message clients on
-- their own team"), and PR #59 built the compose UI to match that. Josh
-- corrected this directly in chat: messaging should be cross-team, same as
-- every other practitioner-facing surface in this app (Section 3, Warning
-- #5 — "a logged-in practitioner should see all data regardless of team").
-- His framing: access is governed by the organisation's own data (what its
-- API key/account can reach), not by which individual team row a staff
-- profile happens to be attached to.
--
-- This migration removes the team_id = get_my_team_id() gate from both the
-- INSERT and SELECT staff policies PR #57 added. It deliberately keeps two
-- things unchanged: (1) team_id is still recorded on every row and must
-- still match the target athlete's actual team (data integrity, not an
-- access check), and (2) the role check (practitioner/organisation only)
-- and sender_user_id = auth.uid() check are untouched — this only removes
-- the cross-team restriction, not the role gate. The recipient-side
-- policies (an athlete can only read/mark-read their own messages) are
-- also untouched — this is about which staff can act, not who receives.

DROP POLICY IF EXISTS "Team staff can send client messages" ON public.client_messages;
DROP POLICY IF EXISTS "Team staff can view client messages" ON public.client_messages;

CREATE POLICY "Staff can send client messages"
ON public.client_messages FOR INSERT
WITH CHECK (
  public.get_my_role() IN ('practitioner', 'organisation')
  AND sender_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.athletes a
    WHERE a.id = athlete_id AND a.team_id = client_messages.team_id
  )
);

CREATE POLICY "Staff can view client messages"
ON public.client_messages FOR SELECT
USING (
  public.get_my_role() IN ('practitioner', 'organisation')
);

-- Allow a user to insert their own in-app notifications.
--
-- platform_in_app_notifications had RLS enabled (migration 20260430090541)
-- but only ever got SELECT/UPDATE "own row" policies plus service_role/
-- super_admin FOR ALL policies. There was never an INSERT policy for a
-- regular authenticated user at all -- not even for inserting a row
-- addressed to themselves.
--
-- Confirmed via code search this run: ClientMyTesting.tsx's
-- handleRequestRetest and ClientToday.tsx's requestRetest both do
--   supabase.from('platform_in_app_notifications').insert({ recipient_user_id: user.id, ... })
-- directly from the athlete's own browser session as a "Retest requested"
-- self-confirmation, immediately before also calling the
-- notify-practitioners-of-client-event edge function (which is unaffected,
-- since it inserts via the service-role client). supabase-js does not
-- throw on an RLS-rejected insert by default, so this has been failing
-- silently since it shipped -- the practitioner does get notified via the
-- edge function, but the athlete's own "request sent" notification never
-- actually lands in their inbox.
--
-- Fix: add a narrow INSERT policy scoped to a user inserting a row
-- addressed to themselves only (recipient_user_id = auth.uid()). This
-- can't be used to write a notification into anyone else's inbox, so it
-- carries the same low blast radius as the existing "Recipients can
-- update own" policy right below it.
--
-- Deliberately NOT covering AthleteReportView.tsx's separate "coach note"
-- save (a practitioner inserting a notification FOR an athlete,
-- recipient_user_id != auth.uid()) -- that's a different, cross-user
-- write this self-only policy can't and shouldn't authorize. Flagged
-- separately in framework.md as still open.

CREATE POLICY "Recipients can insert own in_app_notifications"
ON public.platform_in_app_notifications FOR INSERT
WITH CHECK (recipient_user_id = auth.uid());

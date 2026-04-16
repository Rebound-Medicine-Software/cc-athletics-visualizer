
CREATE TABLE public.booking_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cal_uid TEXT NOT NULL,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  notes TEXT NOT NULL DEFAULT '',
  last_edited_by UUID,
  last_edited_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (cal_uid, team_id)
);

CREATE INDEX idx_booking_notes_team_uid ON public.booking_notes(team_id, cal_uid);

ALTER TABLE public.booking_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view booking notes"
  ON public.booking_notes FOR SELECT
  USING (team_id = public.get_my_team_id() OR public.get_my_role() = 'super_admin');

CREATE POLICY "Team practitioners can insert booking notes"
  ON public.booking_notes FOR INSERT
  WITH CHECK (
    (team_id = public.get_my_team_id() AND public.get_my_role() IN ('practitioner', 'organisation'))
    OR public.get_my_role() = 'super_admin'
  );

CREATE POLICY "Team practitioners can update booking notes"
  ON public.booking_notes FOR UPDATE
  USING (
    (team_id = public.get_my_team_id() AND public.get_my_role() IN ('practitioner', 'organisation'))
    OR public.get_my_role() = 'super_admin'
  );

CREATE POLICY "Team practitioners can delete booking notes"
  ON public.booking_notes FOR DELETE
  USING (
    (team_id = public.get_my_team_id() AND public.get_my_role() IN ('practitioner', 'organisation'))
    OR public.get_my_role() = 'super_admin'
  );

CREATE TRIGGER booking_notes_updated_at
  BEFORE UPDATE ON public.booking_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

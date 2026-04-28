import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveTeamId } from "@/lib/impersonation/useEffectiveTeamId";
import { useViewAsWriteGuard } from "@/lib/impersonation/useViewAsWriteGuard";
import { toast } from "sonner";

export interface BookingNote {
  id: string;
  cal_uid: string;
  team_id: string;
  notes: string;
  last_edited_by: string | null;
  last_edited_by_name: string | null;
  updated_at: string;
}

export const useBookingNotes = () => {
  const { profile } = useAuth();
  const { teamId: effectiveTeamId } = useEffectiveTeamId();
  const guardWrite = useViewAsWriteGuard();
  const [notesByUid, setNotesByUid] = useState<Record<string, BookingNote>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!effectiveTeamId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("booking_notes" as any)
      .select("*")
      .eq("team_id", effectiveTeamId);
    if (!error && data) {
      const map: Record<string, BookingNote> = {};
      (data as any[]).forEach((n) => {
        map[n.cal_uid] = n as BookingNote;
      });
      setNotesByUid(map);
    }
    setIsLoading(false);
  }, [effectiveTeamId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const upsertNote = useCallback(
    async (calUid: string, notes: string) => {
      if (guardWrite('Saving booking notes')) return;
      if (!profile?.team_id || !profile.user_id) {
        toast.error("Cannot save notes – not signed in");
        return;
      }
      const payload = {
        cal_uid: calUid,
        team_id: profile.team_id,
        notes,
        last_edited_by: profile.user_id,
        last_edited_by_name: profile.full_name || profile.email || "Practitioner",
      };
      const { error } = await supabase
        .from("booking_notes" as any)
        .upsert(payload, { onConflict: "cal_uid,team_id" });
      if (error) {
        toast.error(`Failed to save notes: ${error.message}`);
        return;
      }
      toast.success("Notes saved");
      await fetchAll();
    },
    [profile, fetchAll]
  );

  const getNote = useCallback(
    (calUid: string | undefined) => (calUid ? notesByUid[calUid] : undefined),
    [notesByUid]
  );

  return { notesByUid, isLoading, upsertNote, getNote, refetch: fetchAll };
};

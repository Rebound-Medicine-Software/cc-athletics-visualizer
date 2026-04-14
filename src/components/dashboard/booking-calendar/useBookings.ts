import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BookingEvent } from "./types";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, addWeeks, addDays, subMonths, subWeeks, subDays, format
} from "date-fns";

export const useBookings = () => {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!profile?.team_id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("team_id", profile.team_id)
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      const events: BookingEvent[] = (data || []).map((b) => ({
        id: b.id,
        title: b.notes || "Appointment",
        client_id: b.client_id,
        therapist_id: b.therapist_id,
        team_id: b.team_id,
        appointment_date: b.appointment_date,
        end_date: new Date(new Date(b.appointment_date).getTime() + 60 * 60 * 1000).toISOString(),
        status: b.status,
        notes: b.notes,
      }));
      setBookings(events);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.team_id]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const createBooking = async (date: Date, title: string, notes?: string) => {
    if (!profile?.team_id) {
      toast.error("No team found");
      return;
    }
    try {
      const { error } = await supabase.from("bookings").insert({
        appointment_date: date.toISOString(),
        team_id: profile.team_id,
        therapist_id: profile.user_id,
        notes: title || "New Appointment",
        status: "scheduled",
      });
      if (error) throw error;
      toast.success("Booking created");
      await fetchBookings();
    } catch (err) {
      toast.error("Failed to create booking");
    }
  };

  const updateBooking = async (id: string, updates: Partial<BookingEvent>) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          appointment_date: updates.appointment_date,
          notes: updates.notes ?? updates.title,
          status: updates.status,
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Booking updated");
      await fetchBookings();
    } catch (err) {
      toast.error("Failed to update booking");
    }
  };

  const deleteBooking = async (id: string) => {
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
      toast.success("Booking deleted");
      await fetchBookings();
    } catch (err) {
      toast.error("Failed to delete booking");
    }
  };

  return { bookings, isLoading, createBooking, updateBooking, deleteBooking, refetch: fetchBookings };
};

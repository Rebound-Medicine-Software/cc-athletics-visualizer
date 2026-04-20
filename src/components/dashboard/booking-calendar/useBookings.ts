import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BookingEvent, CalComBooking } from "./types";

export const useBookings = () => {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [eventTypes, setEventTypes] = useState<Array<{ id: number; title: string; slug: string; length: number; lengthOptions?: number[] }>>([]);
  const [schedules, setSchedules] = useState<Array<{ id: number; name: string; availability: Array<{ days: number[]; startTime: string; endTime: string }> }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [calConnected, setCalConnected] = useState(false);

  // Check if Cal.com is connected
  useEffect(() => {
    const checkCal = async () => {
      if (!profile?.team_id) return;
      const { data: team } = await supabase
        .from("teams")
        .select("setup_data")
        .eq("id", profile.team_id)
        .single();

      if (team?.setup_data && typeof team.setup_data === "object") {
        const sd = team.setup_data as Record<string, any>;
        setCalConnected(!!sd.cal_username);
      }
    };
    checkCal();
  }, [profile?.team_id]);

  const callCalProxy = useCallback(
    async (action: string, method: string = "GET", body?: any, extraParams?: Record<string, string>) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const params = new URLSearchParams({ action, ...extraParams });
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cal-com-proxy?${params}`;

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Request failed" }));
        const message = typeof errBody?.error === "string" ? errBody.error : 
                        typeof errBody?.error?.message === "string" ? errBody.error.message :
                        `HTTP ${res.status}`;
        throw new Error(message);
      }
      return res.json();
    },
    []
  );

  const fetchBookings = useCallback(async () => {
    if (!profile?.team_id) return;
    setIsLoading(true);

    try {
      const results: BookingEvent[] = [];

      // Fetch from Cal.com API if connected
      if (calConnected) {
        try {
          const [upcomingData, pastData] = await Promise.all([
            callCalProxy("list-bookings", "GET", undefined, { status: "upcoming" }),
            callCalProxy("list-bookings", "GET", undefined, { status: "past" }),
          ]);

          const mapCalBooking = (b: CalComBooking): BookingEvent => ({
            id: String(b.id),
            uid: b.uid,
            title: b.title || "Cal.com Booking",
            client_id: null,
            therapist_id: null,
            team_id: profile.team_id,
            appointment_date: b.start,
            end_date: b.end,
            status: b.status,
            notes: b.description || null,
            attendeeName: b.attendees?.[0]?.name || undefined,
            attendeeEmail: b.attendees?.[0]?.email || undefined,
            eventTypeId: b.eventTypeId,
            source: "cal",
          });

          const upcoming = (upcomingData?.data || []).map(mapCalBooking);
          const past = (pastData?.data || []).map(mapCalBooking);
          results.push(...upcoming, ...past);
        } catch (err) {
          console.error("Error fetching Cal.com bookings:", err);
          // Fall through to local bookings
        }
      }

      // Also fetch local bookings from Supabase
      const { data: localData, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("team_id", profile.team_id)
        .order("appointment_date", { ascending: true });

      if (!error && localData) {
        const localEvents: BookingEvent[] = localData.map((b) => ({
          id: b.id,
          uid: b.id,
          title: b.notes || "Appointment",
          client_id: b.client_id,
          therapist_id: b.therapist_id,
          team_id: b.team_id,
          appointment_date: b.appointment_date,
          end_date: new Date(new Date(b.appointment_date).getTime() + 60 * 60 * 1000).toISOString(),
          status: b.status,
          notes: b.notes,
          source: "local" as const,
        }));
        results.push(...localEvents);
      }

      // Sort by date
      results.sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime());
      setBookings(results);
    } catch (err) {
      console.error("Error fetching bookings:", err);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.team_id, calConnected, callCalProxy]);

  // Fetch event types from Cal.com
  const fetchEventTypes = useCallback(async () => {
    if (!calConnected) return;
    try {
      const data = await callCalProxy("list-event-types");
      // Cal.com v2 may return either:
      //  - { data: [ { id, title, slug, lengthInMinutes }, ... ] }     (flat, personal accounts)
      //  - { data: { eventTypeGroups: [{ eventTypes: [...] }] } }      (grouped, team accounts)
      const raw = data?.data;
      const collected: any[] = [];
      if (Array.isArray(raw)) {
        collected.push(...raw);
      } else if (raw?.eventTypeGroups && Array.isArray(raw.eventTypeGroups)) {
        raw.eventTypeGroups.forEach((g: any) => {
          if (Array.isArray(g.eventTypes)) collected.push(...g.eventTypes);
        });
      } else if (Array.isArray(raw?.eventTypes)) {
        collected.push(...raw.eventTypes);
      }
      const mapped = collected
        .filter((et: any) => et && (et.id !== undefined))
        .map((et: any) => {
          const baseLen = et.lengthInMinutes ?? et.length ?? 30;
          const opts: number[] | undefined = Array.isArray(et.lengthInMinutesOptions) && et.lengthInMinutesOptions.length > 0
            ? et.lengthInMinutesOptions.map((n: any) => Number(n)).filter((n: number) => !isNaN(n))
            : undefined;
          return {
            id: et.id,
            title: et.title || et.name || et.slug || "Untitled",
            slug: et.slug || "",
            length: baseLen,
            lengthOptions: opts,
          };
        });
      console.log(`[Cal.com] Loaded ${mapped.length} event types`, mapped);
      setEventTypes(mapped);
    } catch (err) {
      console.error("Error fetching event types:", err);
    }
  }, [calConnected, callCalProxy]);

  const fetchSchedules = useCallback(async () => {
    if (!calConnected) return;
    try {
      const data = await callCalProxy("list-schedules");
      const raw = data?.data || data?.schedules || [];
      setSchedules(
        (Array.isArray(raw) ? raw : []).map((s: any) => ({
          id: s.id,
          name: s.name,
          availability: (s.availability || []).map((a: any) => ({
            days: a.days || [],
            startTime: a.startTime || "09:00",
            endTime: a.endTime || "17:00",
          })),
        }))
      );
    } catch (err) {
      console.error("Error fetching schedules:", err);
    }
  }, [calConnected, callCalProxy]);

  useEffect(() => {
    fetchBookings();
    fetchEventTypes();
    fetchSchedules();
  }, [fetchBookings, fetchEventTypes, fetchSchedules]);

  const createBooking = async (date: Date, title: string, notes?: string) => {
    if (!profile?.team_id) {
      toast.error("No team found");
      return;
    }
    try {
      // Create local booking in Supabase
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

  // Create a real Cal.com booking via the proxy
  const createCalBooking = async (params: {
    eventTypeId: number;
    start: string; // ISO
    attendeeName: string;
    attendeeEmail: string;
    notes?: string;
    lengthInMinutes?: number;
  }) => {
    try {
      const result = await callCalProxy("create-booking", "POST", {
        eventTypeId: params.eventTypeId,
        start: params.start,
        ...(params.lengthInMinutes ? { lengthInMinutes: params.lengthInMinutes } : {}),
        attendee: {
          name: params.attendeeName,
          email: params.attendeeEmail,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        ...(params.notes ? { metadata: {}, bookingFieldsResponses: { notes: params.notes } } : {}),
      });
      const newUid = result?.data?.uid;
      // If notes were provided, save them to the collaborative notes table
      if (params.notes && newUid && profile?.team_id) {
        await supabase.from("booking_notes" as any).insert({
          cal_uid: newUid,
          team_id: profile.team_id,
          notes: params.notes,
          last_edited_by: profile.user_id,
          last_edited_by_name: profile.full_name || profile.email,
        });
      }
      toast.success("Booking created in Cal.com");
      await fetchBookings();
      return result;
    } catch (err: any) {
      const msg = err.message || "Unknown error";
      if (msg.toLowerCase().includes("not available") || msg.toLowerCase().includes("already")) {
        toast.error("That time slot is no longer available. Please pick another.");
      } else {
        toast.error(`Failed to create booking: ${msg}`);
      }
      throw err;
    }
  };

  // Fetch slots for an event type within a date range
  const fetchSlots = useCallback(
    async (eventTypeId: number, startISO: string, endISO: string, durationMinutes?: number): Promise<string[]> => {
      try {
        const params: Record<string, string> = {
          eventTypeId: String(eventTypeId),
          start: startISO,
          end: endISO,
        };
        if (durationMinutes) params.duration = String(durationMinutes);
        const data = await callCalProxy("list-slots", "GET", undefined, params);
        // Cal.com v2 returns { data: { "2026-04-16": [{ start: "..." }, ...] } }
        const slotsMap = data?.data || {};
        const all: string[] = [];
        for (const day of Object.keys(slotsMap)) {
          const items = slotsMap[day];
          if (Array.isArray(items)) {
            items.forEach((s: any) => {
              if (typeof s === "string") all.push(s);
              else if (s?.start) all.push(s.start);
              else if (s?.time) all.push(s.time);
            });
          }
        }
        return all;
      } catch (err) {
        console.error("Error fetching slots:", err);
        return [];
      }
    },
    [callCalProxy]
  );

  const updateBooking = async (id: string, updates: Partial<BookingEvent>) => {
    const booking = bookings.find((b) => b.id === id);

    // Cal.com booking — reschedule via API
    if (booking?.source === "cal" && updates.appointment_date) {
      // Prevent rescheduling to a time in the past
      if (new Date(updates.appointment_date) < new Date()) {
        toast.error("Cannot reschedule a booking to a time in the past");
        await fetchBookings();
        return;
      }
      try {
        await callCalProxy("reschedule-booking", "POST", {
          uid: booking.uid,
          start: updates.appointment_date,
          reason: "Rescheduled via dashboard",
        });
        toast.success("Cal.com booking rescheduled");
        await fetchBookings();
        return;
      } catch (err: any) {
        const msg = err.message || "Unknown error";
        if (msg.includes("already has booking") || msg.includes("not available")) {
          toast.error("This time slot is unavailable. The user already has a booking or is outside working hours.");
        } else {
          toast.error(`Failed to reschedule: ${msg}`);
        }
        return;
      }
    }

    // Local booking
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
    const booking = bookings.find((b) => b.id === id);

    // Cal.com booking — cancel via API
    if (booking?.source === "cal") {
      // Prevent cancelling bookings that have already ended
      if (booking.end_date && new Date(booking.end_date) < new Date()) {
        toast.error("Cannot cancel a booking that has already ended");
        return;
      }
      try {
        await callCalProxy("cancel-booking", "POST", {
          uid: booking.uid,
          reason: "Cancelled via dashboard",
        });
        toast.success("Cal.com booking cancelled");
        await fetchBookings();
        return;
      } catch (err: any) {
        toast.error(`Failed to cancel: ${err.message}`);
        return;
      }
    }

    // Local booking
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
      toast.success("Booking deleted");
      await fetchBookings();
    } catch (err) {
      toast.error("Failed to delete booking");
    }
  };

  const resizeBooking = async (bookingId: string, newDurationMinutes: number, matchingEventTypeId: number) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking || booking.source !== "cal") {
      toast.error("Duration resize is only supported for Cal.com bookings");
      return;
    }

    // Check if booking is in the past
    if (booking.end_date && new Date(booking.end_date) < new Date()) {
      toast.error("Cannot modify a booking that has already ended");
      return;
    }

    // Only send lengthInMinutes if the event type actually supports multiple lengths
    const et = eventTypes.find((e) => e.id === matchingEventTypeId);
    const supportsMultipleLengths = !!(et?.lengthOptions && et.lengthOptions.length > 1);

    // Block resize when the event type has a fixed duration
    if (!supportsMultipleLengths) {
      const fixedLen = et?.length ?? booking.end_date
        ? Math.round((new Date(booking.end_date!).getTime() - new Date(booking.appointment_date).getTime()) / 60000)
        : null;
      toast.error(
        `You cannot assign this event due to "${et?.title || "this event type"}" having a fixed duration${fixedLen ? ` of ${fixedLen} minutes` : ""}. Multiple lengths are not enabled for it in Cal.com.`
      );
      await fetchBookings();
      return;
    }

    // Block if the requested duration isn't one of the allowed options
    if (et?.lengthOptions && !et.lengthOptions.includes(newDurationMinutes)) {
      toast.error(
        `You cannot assign this event due to ${newDurationMinutes} minutes not being an allowed duration. Allowed: ${et.lengthOptions.join(", ")} min.`
      );
      await fetchBookings();
      return;
    }

    try {
      // Step 1: Cancel the existing booking
      await callCalProxy("cancel-booking", "POST", {
        uid: booking.uid,
        reason: "Duration changed via dashboard – rebooking",
      });

      // Step 2: Create a new booking with the SAME event type and new duration
      await callCalProxy("create-booking", "POST", {
        eventTypeId: matchingEventTypeId,
        start: booking.appointment_date,
        ...(supportsMultipleLengths ? { lengthInMinutes: newDurationMinutes } : {}),
        attendee: {
          name: booking.attendeeName || "Attendee",
          email: booking.attendeeEmail || "",
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });

      toast.success(`Booking updated to ${newDurationMinutes} minutes`);
      await fetchBookings();
    } catch (err: any) {
      const msg = err.message || "Unknown error";
      if (msg.includes("already has booking") || msg.includes("not available")) {
        toast.error("Cannot resize: the new time slot conflicts with an existing booking or is outside working hours.");
      } else {
        toast.error(`Failed to resize booking: ${msg}`);
      }
      // Try to refetch in case partial changes happened
      await fetchBookings();
    }
  };

  return {
    bookings,
    eventTypes,
    schedules,
    isLoading,
    calConnected,
    callCalProxy,
    createBooking,
    createCalBooking,
    fetchSlots,
    updateBooking,
    deleteBooking,
    resizeBooking,
    refetch: fetchBookings,
  };
};

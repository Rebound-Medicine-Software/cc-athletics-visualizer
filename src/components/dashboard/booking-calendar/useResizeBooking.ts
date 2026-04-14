import { useState, useCallback, useRef } from "react";
import { BookingEvent } from "./types";

interface EventType {
  id: number;
  title: string;
  slug: string;
  length: number;
}

interface UseResizeBookingProps {
  eventTypes: EventType[];
  onResize: (bookingId: string, newDurationMinutes: number, matchingEventTypeId: number) => void;
  pixelsPerHour: number;
}

export const useResizeBooking = ({ eventTypes, onResize, pixelsPerHour }: UseResizeBookingProps) => {
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeDelta, setResizeDelta] = useState(0);
  const startY = useRef(0);
  const bookingRef = useRef<BookingEvent | null>(null);

  const availableDurations = eventTypes.map((et) => et.length).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

  const getSnappedDuration = useCallback(
    (currentDurationMin: number, deltaPixels: number): { duration: number; eventTypeId: number | null } => {
      const deltaMinutes = (deltaPixels / pixelsPerHour) * 60;
      const rawDuration = Math.max(15, currentDurationMin + deltaMinutes);

      // Find closest available event type duration
      let closest = availableDurations[0] || 30;
      let minDiff = Math.abs(rawDuration - closest);
      let matchIdx = 0;
      for (let i = 1; i < availableDurations.length; i++) {
        const diff = Math.abs(rawDuration - availableDurations[i]);
        if (diff < minDiff) {
          minDiff = diff;
          closest = availableDurations[i];
          matchIdx = i;
        }
      }

      const matchingET = eventTypes.find((et) => et.length === closest);
      return { duration: closest, eventTypeId: matchingET?.id || null };
    },
    [availableDurations, eventTypes, pixelsPerHour]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, booking: BookingEvent) => {
      e.stopPropagation();
      e.preventDefault();
      startY.current = e.clientY;
      bookingRef.current = booking;
      setResizingId(booking.id);
      setResizeDelta(0);

      const handleMouseMove = (me: MouseEvent) => {
        const delta = me.clientY - startY.current;
        setResizeDelta(delta);
      };

      const handleMouseUp = (me: MouseEvent) => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        const delta = me.clientY - startY.current;
        const b = bookingRef.current;
        if (b && Math.abs(delta) > 5) {
          const start = new Date(b.appointment_date);
          const end = new Date(b.end_date);
          const currentDuration = (end.getTime() - start.getTime()) / 60000;
          const { duration, eventTypeId } = getSnappedDuration(currentDuration, delta);

          if (duration !== currentDuration && eventTypeId) {
            onResize(b.id, duration, eventTypeId);
          }
        }

        setResizingId(null);
        setResizeDelta(0);
        bookingRef.current = null;
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [getSnappedDuration, onResize]
  );

  const getResizePreview = useCallback(
    (booking: BookingEvent): { heightPx: number; label: string } | null => {
      if (resizingId !== booking.id) return null;
      const start = new Date(booking.appointment_date);
      const end = new Date(booking.end_date);
      const currentDuration = (end.getTime() - start.getTime()) / 60000;
      const { duration } = getSnappedDuration(currentDuration, resizeDelta);
      const heightPx = (duration / 60) * pixelsPerHour;
      return { heightPx, label: `${duration} min` };
    },
    [resizingId, resizeDelta, getSnappedDuration, pixelsPerHour]
  );

  return {
    resizingId,
    handleResizeStart,
    getResizePreview,
    availableDurations,
  };
};

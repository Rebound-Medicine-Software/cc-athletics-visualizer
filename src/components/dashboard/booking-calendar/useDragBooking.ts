import { useState, useCallback, useRef } from "react";
import { BookingEvent } from "./types";

export interface DragState {
  bookingId: string;
  type: "move" | "resize";
  snappedDeltaPx: number;
}

interface UseDragBookingProps {
  pixelsPerHour: number;
  onMoveEnd: (booking: BookingEvent, deltaMinutes: number) => void;
  onResizeEnd: (booking: BookingEvent, newDurationMinutes: number) => void;
}

export const useDragBooking = ({ pixelsPerHour, onMoveEnd, onResizeEnd }: UseDragBookingProps) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const startYRef = useRef(0);
  const bookingRef = useRef<BookingEvent | null>(null);
  const SNAP_PX = pixelsPerHour / 4; // 15 minutes

  const startDrag = useCallback((e: React.MouseEvent, booking: BookingEvent, type: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    startYRef.current = e.clientY;
    bookingRef.current = booking;
    setDragState({ bookingId: booking.id, type, snappedDeltaPx: 0 });

    const onMouseMove = (me: MouseEvent) => {
      const rawDelta = me.clientY - startYRef.current;
      const snapped = Math.round(rawDelta / SNAP_PX) * SNAP_PX;
      setDragState(prev => prev ? { ...prev, snappedDeltaPx: snapped } : null);
    };

    const onMouseUp = (me: MouseEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      const rawDelta = me.clientY - startYRef.current;
      const snapped = Math.round(rawDelta / SNAP_PX) * SNAP_PX;
      const deltaMinutes = (snapped / pixelsPerHour) * 60;
      const b = bookingRef.current;

      if (b && Math.abs(snapped) > 2) {
        if (type === "move") {
          onMoveEnd(b, deltaMinutes);
        } else {
          const start = new Date(b.appointment_date);
          const end = new Date(b.end_date);
          const currentDuration = (end.getTime() - start.getTime()) / 60000;
          const newDuration = Math.max(15, currentDuration + deltaMinutes);
          onResizeEnd(b, newDuration);
        }
      }

      setDragState(null);
      bookingRef.current = null;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [SNAP_PX, pixelsPerHour, onMoveEnd, onResizeEnd]);

  return { dragState, startDrag };
};

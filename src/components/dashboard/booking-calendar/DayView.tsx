import { useMemo, useCallback } from "react";
import { format, isSameDay } from "date-fns";
import { BookingEvent } from "./types";
import { cn } from "@/lib/utils";
import { useDragBooking } from "./useDragBooking";
import { GripHorizontal } from "lucide-react";

interface EventType {
  id: number;
  title: string;
  slug: string;
  length: number;
}

interface DayViewProps {
  currentDate: Date;
  bookings: BookingEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: BookingEvent) => void;
  onEventDrop: (eventId: string, newDate: Date) => void;
  eventTypes?: EventType[];
  onEventResize?: (bookingId: string, newDurationMinutes: number, matchingEventTypeId: number) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am–9pm
const START_HOUR = 6;
const HOUR_HEIGHT = 56;

const statusColor: Record<string, string> = {
  scheduled: "bg-blue-100 border-blue-400 text-blue-800",
  confirmed: "bg-green-100 border-green-400 text-green-800",
  completed: "bg-gray-100 border-gray-400 text-gray-700",
  cancelled: "bg-red-100 border-red-400 text-red-800",
  "no-show": "bg-yellow-100 border-yellow-400 text-yellow-800",
  accepted: "bg-blue-100 border-blue-400 text-blue-800",
};

export const DayView = ({ currentDate, bookings, onDateClick, onEventClick, onEventDrop, eventTypes = [], onEventResize }: DayViewProps) => {
  const dayBookings = useMemo(
    () => bookings.filter((b) => isSameDay(new Date(b.appointment_date), currentDate)),
    [bookings, currentDate]
  );

  const handleMoveEnd = useCallback((booking: BookingEvent, deltaMinutes: number) => {
    const start = new Date(booking.appointment_date);
    const newStart = new Date(start.getTime() + deltaMinutes * 60000);
    onEventDrop(booking.id, newStart);
  }, [onEventDrop]);

  const handleResizeEnd = useCallback((booking: BookingEvent, newDurationMinutes: number) => {
    if (booking.source === "cal" && eventTypes.length > 0 && onEventResize) {
      const closest = eventTypes.reduce((prev, curr) =>
        Math.abs(curr.length - newDurationMinutes) < Math.abs(prev.length - newDurationMinutes) ? curr : prev
      );
      onEventResize(booking.id, closest.length, closest.id);
    }
  }, [eventTypes, onEventResize]);

  const { dragState, startDrag } = useDragBooking({
    pixelsPerHour: HOUR_HEIGHT,
    onMoveEnd: handleMoveEnd,
    onResizeEnd: handleResizeEnd,
  });

  const canResize = (b: BookingEvent) => b.source === "cal" && eventTypes.length > 1 && onEventResize;

  const getEventPosition = (b: BookingEvent) => {
    const start = new Date(b.appointment_date);
    const end = new Date(b.end_date);
    const startMinutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
    const durationMin = (end.getTime() - start.getTime()) / 60000;

    let topPx = (startMinutes / 60) * HOUR_HEIGHT;
    let heightPx = Math.max(HOUR_HEIGHT / 4, (durationMin / 60) * HOUR_HEIGHT);

    if (dragState?.bookingId === b.id) {
      if (dragState.type === "move") {
        topPx += dragState.snappedDeltaPx;
      } else {
        heightPx = Math.max(HOUR_HEIGHT / 4, heightPx + dragState.snappedDeltaPx);
      }
    }

    return { top: topPx, height: heightPx };
  };

  const getPreviewLabel = (b: BookingEvent) => {
    if (!dragState || dragState.bookingId !== b.id) return null;
    const deltaMinutes = (dragState.snappedDeltaPx / HOUR_HEIGHT) * 60;

    if (dragState.type === "move") {
      const start = new Date(b.appointment_date);
      const newStart = new Date(start.getTime() + deltaMinutes * 60000);
      return format(newStart, "h:mm a");
    } else {
      const start = new Date(b.appointment_date);
      const end = new Date(b.end_date);
      const currentDuration = (end.getTime() - start.getTime()) / 60000;
      const newDuration = Math.max(15, currentDuration + deltaMinutes);
      return `${newDuration} min`;
    }
  };

  const totalHeight = HOURS.length * HOUR_HEIGHT;

  return (
    <div className="border rounded-lg overflow-auto max-h-[650px]">
      <div className="relative select-none" style={{ height: totalHeight }}>
        {/* Hour grid lines */}
        {HOURS.map((hour, i) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-b flex hover:bg-muted/30 cursor-pointer"
            style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            onClick={() => {
              const d = new Date(currentDate);
              d.setHours(hour, 0);
              onDateClick(d);
            }}
          >
            <div className="w-16 shrink-0 border-r py-2 text-xs text-muted-foreground text-right pr-3">
              {format(new Date(2000, 0, 1, hour), "h:mm a")}
            </div>
          </div>
        ))}

        {/* 15-min sub-grid lines */}
        {HOURS.map((hour, i) =>
          [1, 2, 3].map((q) => (
            <div
              key={`${hour}-${q}`}
              className="absolute left-16 right-0 border-b border-dashed border-muted/40 pointer-events-none"
              style={{ top: i * HOUR_HEIGHT + q * (HOUR_HEIGHT / 4) }}
            />
          ))
        )}

        {/* Events – absolutely positioned */}
        <div className="absolute left-16 right-0 top-0 bottom-0">
          {dayBookings.map((b) => {
            const { top, height } = getEventPosition(b);
            const isDragging = dragState?.bookingId === b.id;
            const start = new Date(b.appointment_date);
            const end = new Date(b.end_date);
            const previewLabel = getPreviewLabel(b);

            return (
              <div
                key={b.id}
                className={cn("absolute left-1 right-1 z-10", isDragging && "z-30")}
                style={{ top, height }}
              >
                {/* Event body – drag to move */}
                <div
                  className={cn(
                    "absolute inset-0 px-3 py-2 rounded-md border-l-[3px] cursor-grab active:cursor-grabbing overflow-hidden transition-shadow",
                    statusColor[b.status || "scheduled"],
                    isDragging && "ring-2 ring-primary shadow-lg opacity-90"
                  )}
                  onMouseDown={(e) => startDrag(e, b, "move")}
                  onClick={(e) => { e.stopPropagation(); if (!isDragging) onEventClick(b); }}
                >
                  <div className="text-sm font-medium truncate">{b.title}</div>
                  <div className="text-xs opacity-70">
                    {isDragging && dragState?.type === "move" && previewLabel ? (
                      <span className="font-semibold text-primary">{previewLabel}</span>
                    ) : (
                      <>
                        {format(start, "h:mm a")} – {format(end, "h:mm a")}
                      </>
                    )}
                    {isDragging && dragState?.type === "resize" && previewLabel && (
                      <span className="ml-1 font-semibold text-primary">→ {previewLabel}</span>
                    )}
                  </div>
                  {!isDragging && b.notes && b.notes !== b.title && (
                    <div className="text-xs mt-1 opacity-60 truncate">{b.notes}</div>
                  )}
                </div>

                {/* Resize handle */}
                {canResize(b) && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-3 flex items-center justify-center cursor-s-resize hover:bg-primary/10 rounded-b-md group z-10"
                    onMouseDown={(e) => startDrag(e, b, "resize")}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripHorizontal className="w-4 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

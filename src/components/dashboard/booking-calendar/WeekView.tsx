import { useMemo, useCallback } from "react";
import { startOfWeek, addDays, format, isSameDay, isToday } from "date-fns";
import { BookingEvent } from "./types";
import { cn } from "@/lib/utils";
import { useDragBooking } from "./useDragBooking";
import { GripHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBookingNotes } from "./useBookingNotes";

interface EventType {
  id: number;
  title: string;
  slug: string;
  length: number;
}

interface WeekViewProps {
  currentDate: Date;
  bookings: BookingEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: BookingEvent) => void;
  onEventDrop: (eventId: string, newDate: Date) => void;
  eventTypes?: EventType[];
  onEventResize?: (bookingId: string, newDurationMinutes: number, matchingEventTypeId: number) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6am–7pm
const START_HOUR = 6;
const HOUR_HEIGHT = 48;

const statusColor: Record<string, string> = {
  scheduled: "bg-blue-100 border-blue-400 text-blue-800",
  confirmed: "bg-green-100 border-green-400 text-green-800",
  completed: "bg-gray-100 border-gray-400 text-gray-700",
  cancelled: "bg-red-100 border-red-400 text-red-800",
  "no-show": "bg-yellow-100 border-yellow-400 text-yellow-800",
  accepted: "bg-blue-100 border-blue-400 text-blue-800",
};

export const WeekView = ({ currentDate, bookings, onDateClick, onEventClick, onEventDrop, eventTypes = [], onEventResize }: WeekViewProps) => {
  const { getNote } = useBookingNotes();
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

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

  const { dragState, startDrag, wasDragging } = useDragBooking({
    pixelsPerHour: HOUR_HEIGHT,
    onMoveEnd: handleMoveEnd,
    onResizeEnd: handleResizeEnd,
  });

  const canResize = (b: BookingEvent) => b.source === "cal" && eventTypes.length > 1 && onEventResize;

  const getBookingsForDay = (day: Date) =>
    bookings.filter((b) => isSameDay(new Date(b.appointment_date), day));

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
      return format(newStart, "HH:mm");
    } else {
      const start = new Date(b.appointment_date);
      const end = new Date(b.end_date);
      const currentDuration = (end.getTime() - start.getTime()) / 60000;
      const newDuration = Math.max(15, currentDuration + deltaMinutes);
      return `${newDuration}m`;
    }
  };

  const totalHeight = HOURS.length * HOUR_HEIGHT;

  return (
    <TooltipProvider delayDuration={300}>
    <div className="border rounded-lg overflow-auto max-h-[650px]">
      {/* Sticky header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-20 bg-background border-b">
        <div className="border-r" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={cn("text-center py-2 border-r", isToday(day) && "bg-primary/5")}
          >
            <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
            <div className={cn(
              "text-sm font-semibold w-7 h-7 flex items-center justify-center mx-auto rounded-full",
              isToday(day) && "bg-primary text-primary-foreground"
            )}>{format(day, "d")}</div>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)]">
        {/* Time labels column */}
        <div className="border-r relative" style={{ height: totalHeight }}>
          {HOURS.map((hour, i) => (
            <div
              key={hour}
              className="absolute left-0 right-0 border-b text-[10px] text-muted-foreground text-right pr-2 pt-1"
              style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              {format(new Date(2000, 0, 1, hour), "ha")}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day) => {
          const dayEvents = getBookingsForDay(day);
          return (
            <div
              key={day.toISOString()}
              className="border-r relative select-none"
              style={{ height: totalHeight }}
            >
              {/* Hour grid lines */}
              {HOURS.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-b hover:bg-muted/30 cursor-pointer"
                  style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(hour, 0);
                    onDateClick(d);
                  }}
                />
              ))}

              {/* 15-min sub-grid lines */}
              {HOURS.map((hour, i) =>
                [1, 2, 3].map((q) => (
                  <div
                    key={`${hour}-${q}`}
                    className="absolute left-0 right-0 border-b border-dashed border-muted/30 pointer-events-none"
                    style={{ top: i * HOUR_HEIGHT + q * (HOUR_HEIGHT / 4) }}
                  />
                ))
              )}

              {/* Events */}
              {dayEvents.map((b) => {
                const { top, height } = getEventPosition(b);
                const isDragging = dragState?.bookingId === b.id;
                const start = new Date(b.appointment_date);
                const previewLabel = getPreviewLabel(b);

                return (
                  <div
                    key={b.id}
                    className={cn("absolute left-0.5 right-0.5 z-10", isDragging && "z-30")}
                    style={{ top, height }}
                  >
                    {/* Event body – drag to move */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute inset-0 text-[10px] px-1.5 py-1 rounded border-l-2 cursor-grab active:cursor-grabbing overflow-hidden transition-shadow",
                            statusColor[b.status || "scheduled"],
                            isDragging && "ring-2 ring-primary shadow-lg opacity-90"
                          )}
                          onMouseDown={(e) => startDrag(e, b, "move")}
                          onClick={(e) => { e.stopPropagation(); if (!wasDragging()) onEventClick(b); }}
                        >
                          <div className="truncate font-medium">
                            {isDragging && dragState?.type === "move" && previewLabel ? (
                              <span className="text-primary font-bold">{previewLabel}</span>
                            ) : (
                              <>{format(start, "HH:mm")} {b.title}</>
                            )}
                          </div>
                          {isDragging && dragState?.type === "resize" && previewLabel && (
                            <div className="text-[9px] font-semibold text-primary mt-0.5">→ {previewLabel}</div>
                          )}
                        </div>
                      </TooltipTrigger>
                      {(() => {
                        const note = getNote(b.uid);
                        const content = note?.notes || b.notes;
                        if (!content) return null;
                        return (
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-medium text-xs mb-1">{b.title}</p>
                            <p className="text-xs whitespace-pre-wrap">{content}</p>
                            {note?.last_edited_by_name && (
                              <p className="text-[10px] opacity-70 mt-1">— {note.last_edited_by_name}</p>
                            )}
                          </TooltipContent>
                        );
                      })()}
                    </Tooltip>

                    {/* Resize handle */}
                    {canResize(b) && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-2 flex items-center justify-center cursor-s-resize hover:bg-primary/10 rounded-b z-10 group"
                        onMouseDown={(e) => startDrag(e, b, "resize")}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <GripHorizontal className="w-3 h-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
    </TooltipProvider>
  );
};

import { useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { BookingEvent } from "./types";
import { cn } from "@/lib/utils";
import { useResizeBooking } from "./useResizeBooking";
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

  const getBookingsForHour = (hour: number) =>
    dayBookings.filter((b) => new Date(b.appointment_date).getHours() === hour);

  const handleDrop = (e: React.DragEvent, hour: number, containerEl: HTMLElement | null) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("eventId");
    if (eventId && containerEl) {
      const rect = containerEl.getBoundingClientRect();
      const yOffset = e.clientY - rect.top;
      const fractionOfHour = yOffset / HOUR_HEIGHT;
      const minuteSlot = Math.floor(fractionOfHour * 4) * 15; // snap to 15-min
      const newDate = new Date(currentDate);
      newDate.setHours(hour, Math.min(minuteSlot, 45), 0, 0);
      onEventDrop(eventId, newDate);
    }
  };

  const { resizingId, handleResizeStart, getResizePreview, availableDurations } = useResizeBooking({
    eventTypes,
    onResize: onEventResize || (() => {}),
    pixelsPerHour: HOUR_HEIGHT,
  });

  const canResize = (b: BookingEvent) => b.source === "cal" && availableDurations.length > 1 && onEventResize;

  return (
    <div className="border rounded-lg overflow-auto max-h-[650px]">
      {HOURS.map((hour) => {
        const events = getBookingsForHour(hour);
        return (
          <div
            key={hour}
            className="flex border-b min-h-[56px] hover:bg-muted/30 cursor-pointer"
            onClick={() => {
              const d = new Date(currentDate);
              d.setHours(hour, 0);
              onDateClick(d);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, hour, e.currentTarget as HTMLElement)}
          >
            <div className="w-16 shrink-0 border-r py-2 text-xs text-muted-foreground text-right pr-3">
              {format(new Date(2000, 0, 1, hour), "h:mm a")}
            </div>
            <div className="flex-1 p-1 space-y-1">
              {events.map((b) => {
                const preview = getResizePreview(b);
                const isResizing = resizingId === b.id;
                const start = new Date(b.appointment_date);
                const end = new Date(b.end_date);
                const durationMin = (end.getTime() - start.getTime()) / 60000;
                const heightPx = preview ? preview.heightPx : Math.max(32, (durationMin / 60) * HOUR_HEIGHT);

                return (
                  <div
                    key={b.id}
                    className="relative"
                    style={{ height: `${heightPx}px` }}
                  >
                    <div
                      draggable={!isResizing}
                      onDragStart={(e) => e.dataTransfer.setData("eventId", b.id)}
                      onClick={(e) => { e.stopPropagation(); onEventClick(b); }}
                      className={cn(
                        "absolute inset-0 px-3 py-2 rounded-md border-l-3 cursor-grab active:cursor-grabbing overflow-hidden",
                        statusColor[b.status || "scheduled"],
                        isResizing && "ring-2 ring-primary shadow-lg"
                      )}
                    >
                      <div className="text-sm font-medium truncate">{b.title}</div>
                      <div className="text-xs opacity-70">
                        {format(start, "h:mm a")} – {format(end, "h:mm a")} · {preview ? preview.label : `${durationMin} min`}
                      </div>
                      {b.notes && b.notes !== b.title && (
                        <div className="text-xs mt-1 opacity-60 truncate">{b.notes}</div>
                      )}
                    </div>
                    {/* Resize handle */}
                    {canResize(b) && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-3 flex items-center justify-center cursor-s-resize hover:bg-primary/10 rounded-b-md group z-10"
                        onMouseDown={(e) => handleResizeStart(e, b)}
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
        );
      })}
    </div>
  );
};

import { useMemo } from "react";
import { startOfWeek, addDays, format, isSameDay, isToday } from "date-fns";
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
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const getBookingsForDayHour = (day: Date, hour: number) =>
    bookings.filter((b) => {
      const d = new Date(b.appointment_date);
      return isSameDay(d, day) && d.getHours() === hour;
    });

  const handleDrop = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("eventId");
    if (eventId) {
      const newDate = new Date(day);
      newDate.setHours(hour, 0, 0, 0);
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
      <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 z-10 bg-background border-b">
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
      <div className="grid grid-cols-[60px_repeat(7,1fr)]">
        {HOURS.map((hour) => (
          <div key={hour} className="contents">
            <div className="border-r border-b py-2 text-[10px] text-muted-foreground text-right pr-2">
              {format(new Date(2000, 0, 1, hour), "ha")}
            </div>
            {weekDays.map((day) => {
              const events = getBookingsForDayHour(day, hour);
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className="border-r border-b min-h-[48px] p-0.5 cursor-pointer hover:bg-muted/30 relative"
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(hour, 0);
                    onDateClick(d);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, day, hour)}
                >
                  {events.map((b) => {
                    const preview = getResizePreview(b);
                    const isResizing = resizingId === b.id;
                    const start = new Date(b.appointment_date);
                    const end = new Date(b.end_date);
                    const durationMin = (end.getTime() - start.getTime()) / 60000;
                    const heightPx = preview ? preview.heightPx : undefined;

                    return (
                      <div
                        key={b.id}
                        className="relative"
                        style={heightPx ? { height: `${heightPx}px` } : undefined}
                      >
                        <div
                          draggable={!isResizing}
                          onDragStart={(e) => e.dataTransfer.setData("eventId", b.id)}
                          onClick={(e) => { e.stopPropagation(); onEventClick(b); }}
                          className={cn(
                            "text-[10px] px-1.5 py-1 rounded border-l-2 mb-0.5 cursor-grab active:cursor-grabbing truncate",
                            statusColor[b.status || "scheduled"],
                            isResizing && "ring-2 ring-primary shadow-lg",
                            heightPx ? "absolute inset-0 overflow-hidden" : ""
                          )}
                        >
                          <div className="truncate">
                            {format(start, "HH:mm")} {b.title}
                          </div>
                          {preview && (
                            <div className="text-[9px] font-semibold text-primary mt-0.5">{preview.label}</div>
                          )}
                        </div>
                        {/* Resize handle */}
                        {canResize(b) && (
                          <div
                            className="absolute bottom-0 left-0 right-0 h-2 flex items-center justify-center cursor-s-resize hover:bg-primary/10 rounded-b z-10"
                            onMouseDown={(e) => handleResizeStart(e, b)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripHorizontal className="w-3 h-2 text-muted-foreground opacity-0 hover:opacity-100" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

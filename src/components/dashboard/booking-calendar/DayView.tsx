import { useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { BookingEvent } from "./types";
import { cn } from "@/lib/utils";

interface DayViewProps {
  currentDate: Date;
  bookings: BookingEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: BookingEvent) => void;
  onEventDrop: (eventId: string, newDate: Date) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am–9pm

const statusColor: Record<string, string> = {
  scheduled: "bg-blue-100 border-blue-400 text-blue-800",
  confirmed: "bg-green-100 border-green-400 text-green-800",
  completed: "bg-gray-100 border-gray-400 text-gray-700",
  cancelled: "bg-red-100 border-red-400 text-red-800",
  "no-show": "bg-yellow-100 border-yellow-400 text-yellow-800",
};

export const DayView = ({ currentDate, bookings, onDateClick, onEventClick, onEventDrop }: DayViewProps) => {
  const dayBookings = useMemo(
    () => bookings.filter((b) => isSameDay(new Date(b.appointment_date), currentDate)),
    [bookings, currentDate]
  );

  const getBookingsForHour = (hour: number) =>
    dayBookings.filter((b) => new Date(b.appointment_date).getHours() === hour);

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("eventId");
    if (eventId) {
      const newDate = new Date(currentDate);
      newDate.setHours(hour, 0, 0, 0);
      onEventDrop(eventId, newDate);
    }
  };

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
            onDrop={(e) => handleDrop(e, hour)}
          >
            <div className="w-16 shrink-0 border-r py-2 text-xs text-muted-foreground text-right pr-3">
              {format(new Date(2000, 0, 1, hour), "h:mm a")}
            </div>
            <div className="flex-1 p-1 space-y-1">
              {events.map((b) => (
                <div
                  key={b.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("eventId", b.id)}
                  onClick={(e) => { e.stopPropagation(); onEventClick(b); }}
                  className={cn(
                    "px-3 py-2 rounded-md border-l-3 cursor-grab active:cursor-grabbing",
                    statusColor[b.status || "scheduled"]
                  )}
                >
                  <div className="text-sm font-medium">{b.title}</div>
                  <div className="text-xs opacity-70">
                    {format(new Date(b.appointment_date), "h:mm a")} · {b.status}
                  </div>
                  {b.notes && b.notes !== b.title && (
                    <div className="text-xs mt-1 opacity-60">{b.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

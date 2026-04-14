import { useMemo } from "react";
import { startOfWeek, addDays, format, isSameDay, isToday } from "date-fns";
import { BookingEvent } from "./types";
import { cn } from "@/lib/utils";

interface WeekViewProps {
  currentDate: Date;
  bookings: BookingEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: BookingEvent) => void;
  onEventDrop: (eventId: string, newDate: Date) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6am–7pm

const statusColor: Record<string, string> = {
  scheduled: "bg-blue-100 border-blue-400 text-blue-800",
  confirmed: "bg-green-100 border-green-400 text-green-800",
  completed: "bg-gray-100 border-gray-400 text-gray-700",
  cancelled: "bg-red-100 border-red-400 text-red-800",
  "no-show": "bg-yellow-100 border-yellow-400 text-yellow-800",
};

export const WeekView = ({ currentDate, bookings, onDateClick, onEventClick, onEventDrop }: WeekViewProps) => {
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
                  className="border-r border-b min-h-[48px] p-0.5 cursor-pointer hover:bg-muted/30"
                  onClick={() => {
                    const d = new Date(day);
                    d.setHours(hour, 0);
                    onDateClick(d);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, day, hour)}
                >
                  {events.map((b) => (
                    <div
                      key={b.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("eventId", b.id)}
                      onClick={(e) => { e.stopPropagation(); onEventClick(b); }}
                      className={cn(
                        "text-[10px] px-1.5 py-1 rounded border-l-2 mb-0.5 cursor-grab active:cursor-grabbing truncate",
                        statusColor[b.status || "scheduled"]
                      )}
                    >
                      {format(new Date(b.appointment_date), "HH:mm")} {b.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

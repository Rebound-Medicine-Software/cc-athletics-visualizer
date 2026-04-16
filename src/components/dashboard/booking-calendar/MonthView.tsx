import { useMemo } from "react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday
} from "date-fns";
import { BookingEvent } from "./types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBookingNotes } from "./useBookingNotes";

interface MonthViewProps {
  currentDate: Date;
  bookings: BookingEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: BookingEvent) => void;
  onEventDrop: (eventId: string, newDate: Date) => void;
}

const statusColor: Record<string, string> = {
  scheduled: "bg-blue-500",
  confirmed: "bg-green-500",
  completed: "bg-muted-foreground",
  cancelled: "bg-destructive",
  "no-show": "bg-yellow-500",
};

export const MonthView = ({ currentDate, bookings, onDateClick, onEventClick, onEventDrop }: MonthViewProps) => {
  const { getNote } = useBookingNotes();
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const bookingsByDay = useMemo(() => {
    const map: Record<string, BookingEvent[]> = {};
    bookings.forEach((b) => {
      const key = format(new Date(b.appointment_date), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  const handleDragStart = (e: React.DragEvent, eventId: string) => {
    e.dataTransfer.setData("eventId", eventId);
  };

  const handleDrop = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("eventId");
    if (eventId) {
      const original = bookings.find((b) => b.id === eventId);
      if (original) {
        const oldDate = new Date(original.appointment_date);
        const newDate = new Date(day);
        newDate.setHours(oldDate.getHours(), oldDate.getMinutes());
        onEventDrop(eventId, newDate);
      }
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-muted">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[100px]">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayBookings = bookingsByDay[key] || [];
            const inMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={key}
                className={cn(
                  "border-t border-r p-1 cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden",
                  !inMonth && "bg-muted/30 text-muted-foreground"
                )}
                onClick={() => onDateClick(day)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, day)}
              >
                <div className={cn(
                  "text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayBookings.slice(0, 3).map((b) => {
                    const note = getNote(b.uid);
                    const tooltipContent = note?.notes || b.notes;
                    return (
                      <Tooltip key={b.id}>
                        <TooltipTrigger asChild>
                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, b.id)}
                            onClick={(e) => { e.stopPropagation(); onEventClick(b); }}
                            className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight bg-accent/50 hover:bg-accent cursor-grab active:cursor-grabbing truncate"
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusColor[b.status || "scheduled"])} />
                            <span className="truncate">{format(new Date(b.appointment_date), "HH:mm")} {b.title}</span>
                          </div>
                        </TooltipTrigger>
                        {tooltipContent && (
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-medium text-xs mb-1">{b.title}</p>
                            <p className="text-xs whitespace-pre-wrap">{tooltipContent}</p>
                            {note?.last_edited_by_name && (
                              <p className="text-[10px] opacity-70 mt-1">— {note.last_edited_by_name}</p>
                            )}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                  {dayBookings.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">+{dayBookings.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};

import { useMemo } from "react";
import { format, isAfter, isBefore, startOfDay, addDays } from "date-fns";
import { BookingEvent } from "./types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListViewProps {
  bookings: BookingEvent[];
  onEventClick: (event: BookingEvent) => void;
  onDelete: (id: string) => void;
}

const statusVariant: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  accepted: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  "no-show": "bg-yellow-100 text-yellow-800 border-yellow-200",
  past: "bg-gray-100 text-gray-600 border-gray-200",
};

export const ListView = ({ bookings, onEventClick, onDelete }: ListViewProps) => {
  const grouped = useMemo(() => {
    const sorted = [...bookings].sort(
      (a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
    );
    const groups: Record<string, BookingEvent[]> = {};
    sorted.forEach((b) => {
      const key = format(new Date(b.appointment_date), "EEEE, MMMM d, yyyy");
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return groups;
  }, [bookings]);

  if (bookings.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No bookings found</p>
        <p className="text-sm">Click "New Booking" to schedule an appointment</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg divide-y overflow-hidden">
      {Object.entries(grouped).map(([dateLabel, events]) => (
        <div key={dateLabel}>
          <div className="bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground sticky top-0">
            {dateLabel}
          </div>
          {events.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
              onClick={() => onEventClick(b)}
            >
              <div className="text-sm font-mono text-muted-foreground w-16 shrink-0">
                {format(new Date(b.appointment_date), "HH:mm")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate flex items-center gap-1.5">
                  {b.title}
                  {b.source === "cal" && (
                    <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                  )}
                </div>
                {b.attendeeName && (
                  <div className="text-xs text-muted-foreground truncate">{b.attendeeName}</div>
                )}
                {b.notes && b.notes !== b.title && !b.attendeeName && (
                  <div className="text-xs text-muted-foreground truncate">{b.notes}</div>
                )}
              </div>
              <Badge variant="outline" className={cn("text-[10px] shrink-0", statusVariant[b.status || "scheduled"])}>
                {b.status}
              </Badge>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEventClick(b); }}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(b.id); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

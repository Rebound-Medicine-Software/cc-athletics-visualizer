import { Button } from "@/components/ui/button";
import { CalendarView } from "./types";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format } from "date-fns";

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNewBooking: () => void;
}

export const CalendarHeader = ({
  currentDate, view, onViewChange, onPrev, onNext, onToday, onNewBooking
}: CalendarHeaderProps) => {
  const label =
    view === "month" ? format(currentDate, "MMMM yyyy") :
    view === "week" ? `Week of ${format(currentDate, "MMM d, yyyy")}` :
    format(currentDate, "EEEE, MMMM d, yyyy");

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onPrev}><ChevronLeft className="w-4 h-4" /></Button>
        <Button variant="outline" size="icon" onClick={onNext}><ChevronRight className="w-4 h-4" /></Button>
        <Button variant="outline" size="sm" onClick={onToday}>Today</Button>
        <h3 className="text-lg font-semibold ml-2">{label}</h3>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border overflow-hidden">
          {(["month", "week", "day", "list"] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                view === v ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onNewBooking} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Booking
        </Button>
      </div>
    </div>
  );
};

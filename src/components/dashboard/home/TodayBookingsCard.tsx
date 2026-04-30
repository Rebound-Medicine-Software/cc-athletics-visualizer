import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { format, isToday, isPast } from "date-fns";
import { ListSkeleton } from "@/components/dashboard/skeletons";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { TodayBooking } from "@/hooks/useHomeRoleData";

interface Props {
  bookings?: TodayBooking[];
  isLoading: boolean;
  onCreateBooking?: () => void;
  title?: string;
}

export const TodayBookingsCard = ({
  bookings,
  isLoading,
  onCreateBooking,
  title = "Today's bookings",
}: Props) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-rose-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : !bookings || bookings.length === 0 ? (
          <EmptyState
            inline
            compact
            icon={Calendar}
            title="Nothing scheduled today"
            description="A clear calendar — perfect time to invite athletes or sync with Cal.com."
            primaryAction={
              onCreateBooking
                ? { label: "Open bookings", icon: Calendar, onClick: onCreateBooking }
                : undefined
            }
          />
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {bookings.map((b) => {
              const date = new Date(b.appointment_date);
              const past = isPast(date) && isToday(date);
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 border border-border/40"
                >
                  <div className="flex flex-col items-center justify-center w-12 shrink-0 text-center">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground mb-0.5" />
                    <span className="text-xs font-semibold tabular-nums">
                      {format(date, "HH:mm")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {b.notes || "Appointment"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {format(date, "EEE d MMM")}
                    </p>
                  </div>
                  <Badge
                    variant={past ? "secondary" : "default"}
                    className="shrink-0 capitalize"
                  >
                    {b.status || (past ? "done" : "upcoming")}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import { useState, useCallback } from "react";
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarView, BookingEvent } from "./types";
import { useBookings } from "./useBookings";
import { CalendarHeader } from "./CalendarHeader";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { ListView } from "./ListView";
import { BookingDialog } from "./BookingDialog";
import { RefreshCw } from "lucide-react";

export const NookalCalendar = () => {
  const { bookings, eventTypes, isLoading, createBooking, updateBooking, deleteBooking, resizeBooking } = useBookings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const navigate = useCallback((dir: 1 | -1) => {
    setCurrentDate((d) =>
      view === "month" ? (dir === 1 ? addMonths(d, 1) : subMonths(d, 1)) :
      view === "week" ? (dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)) :
      (dir === 1 ? addDays(d, 1) : subDays(d, 1))
    );
  }, [view]);

  const handleDateClick = (date: Date) => {
    setSelectedBooking(null);
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const handleEventClick = (event: BookingEvent) => {
    setSelectedBooking(event);
    setSelectedDate(null);
    setDialogOpen(true);
  };

  const handleEventDrop = (eventId: string, newDate: Date) => {
    updateBooking(eventId, { appointment_date: newDate.toISOString() });
  };

  const handleEventResize = (bookingId: string, newDurationMinutes: number, matchingEventTypeId: number) => {
    resizeBooking(bookingId, newDurationMinutes, matchingEventTypeId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onViewChange={setView}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
          onToday={() => setCurrentDate(new Date())}
          onNewBooking={() => { setSelectedBooking(null); setSelectedDate(new Date()); setDialogOpen(true); }}
        />

        {view === "month" && (
          <MonthView
            currentDate={currentDate}
            bookings={bookings}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            onEventDrop={handleEventDrop}
          />
        )}
        {view === "week" && (
          <WeekView
            currentDate={currentDate}
            bookings={bookings}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            onEventDrop={handleEventDrop}
            eventTypes={eventTypes}
            onEventResize={handleEventResize}
          />
        )}
        {view === "day" && (
          <DayView
            currentDate={currentDate}
            bookings={bookings}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            onEventDrop={handleEventDrop}
            eventTypes={eventTypes}
            onEventResize={handleEventResize}
          />
        )}
        {view === "list" && (
          <ListView
            bookings={bookings}
            onEventClick={handleEventClick}
            onDelete={deleteBooking}
          />
        )}

        <BookingDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          booking={selectedBooking}
          selectedDate={selectedDate}
          onSave={createBooking}
          onUpdate={updateBooking}
          onDelete={deleteBooking}
        />
      </CardContent>
    </Card>
  );
};

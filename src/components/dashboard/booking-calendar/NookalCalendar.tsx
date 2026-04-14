import { useState, useCallback, useMemo } from "react";
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
import { OutOfHoursConfirmDialog } from "./OutOfHoursConfirmDialog";
import { RefreshCw } from "lucide-react";

export const NookalCalendar = () => {
  const { bookings, eventTypes, schedules, isLoading, createBooking, updateBooking, deleteBooking, resizeBooking } = useBookings();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Out-of-hours confirmation state
  const [oohDialogOpen, setOohDialogOpen] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{ eventId: string; newDate: Date } | null>(null);

  const navigate = useCallback((dir: 1 | -1) => {
    setCurrentDate((d) =>
      view === "month" ? (dir === 1 ? addMonths(d, 1) : subMonths(d, 1)) :
      view === "week" ? (dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1)) :
      (dir === 1 ? addDays(d, 1) : subDays(d, 1))
    );
  }, [view]);

  // Check if a date/time falls within Cal.com schedule working hours
  const isWithinWorkingHours = useCallback((date: Date): boolean => {
    if (schedules.length === 0) return true; // No schedules = can't check, allow
    
    // JS getDay: 0=Sun,1=Mon,...,6=Sat — Cal.com uses same convention
    const dayOfWeek = date.getDay();
    const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

    // Check across all schedules — if ANY schedule covers this day+time, it's ok
    for (const schedule of schedules) {
      for (const slot of schedule.availability) {
        if (slot.days.includes(dayOfWeek)) {
          if (timeStr >= slot.startTime && timeStr < slot.endTime) {
            return true;
          }
        }
      }
    }
    return false;
  }, [schedules]);

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

  const handleEventDrop = useCallback((eventId: string, newDate: Date) => {
    const booking = bookings.find((b) => b.id === eventId);
    
    // Only check working hours for Cal.com bookings
    if (booking?.source === "cal" && !isWithinWorkingHours(newDate)) {
      setPendingDrop({ eventId, newDate });
      setOohDialogOpen(true);
      return;
    }
    
    updateBooking(eventId, { appointment_date: newDate.toISOString() });
  }, [bookings, isWithinWorkingHours, updateBooking]);

  const handleOohConfirm = useCallback(() => {
    if (pendingDrop) {
      updateBooking(pendingDrop.eventId, { appointment_date: pendingDrop.newDate.toISOString() });
    }
    setOohDialogOpen(false);
    setPendingDrop(null);
  }, [pendingDrop, updateBooking]);

  const handleOohCancel = useCallback(() => {
    setOohDialogOpen(false);
    setPendingDrop(null);
    // No action — booking stays where it was
  }, []);

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

        <OutOfHoursConfirmDialog
          open={oohDialogOpen}
          targetDate={pendingDrop?.newDate ?? null}
          onConfirm={handleOohConfirm}
          onCancel={handleOohCancel}
        />
      </CardContent>
    </Card>
  );
};

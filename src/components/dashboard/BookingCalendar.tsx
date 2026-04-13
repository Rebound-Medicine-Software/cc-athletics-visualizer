import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Clock, User, Trash2, Edit,
  CalendarDays, List, LayoutGrid
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth,
  isSameDay, addMonths, subMonths, startOfWeek, endOfWeek,
  setHours, setMinutes, isToday, isPast, parseISO, addDays
} from "date-fns";

interface Booking {
  id: string;
  appointment_date: string;
  client_id: string | null;
  therapist_id: string | null;
  team_id: string | null;
  status: string | null;
  notes: string | null;
  created_at: string | null;
  athlete_name?: string;
  therapist_name?: string;
}

interface Athlete {
  id: string;
  name: string;
  cc_athlete_id: string;
}

interface Practitioner {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
}

const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8; // 8am to 5:30pm
  const min = (i % 2) * 30;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
});

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  "no-show": "bg-amber-100 text-amber-800 border-amber-200",
};

type ViewMode = "month" | "week" | "list";

export const BookingCalendar = () => {
  const { profile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // Form states
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [selectedPractitionerId, setSelectedPractitionerId] = useState("");
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedStatus, setSelectedStatus] = useState("scheduled");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchBookings();
    fetchAthletes();
    fetchPractitioners();
  }, [currentDate, profile]);

  const fetchBookings = async () => {
    setLoading(true);
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .gte("appointment_date", start.toISOString())
      .lte("appointment_date", end.toISOString())
      .order("appointment_date", { ascending: true });

    if (error) {
      console.error("Error fetching bookings:", error);
    } else {
      // Enrich with names
      const enriched = await enrichBookings(data || []);
      setBookings(enriched);
    }
    setLoading(false);
  };

  const enrichBookings = async (rawBookings: any[]): Promise<Booking[]> => {
    // Get unique client IDs and therapist IDs
    const clientIds = [...new Set(rawBookings.map(b => b.client_id).filter(Boolean))];
    const therapistIds = [...new Set(rawBookings.map(b => b.therapist_id).filter(Boolean))];

    // Fetch client names from athletes via clients table
    let clientNameMap: Record<string, string> = {};
    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, user_id")
        .in("id", clientIds);
      if (clients) {
        const userIds = clients.map(c => c.user_id).filter(Boolean) as string[];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", userIds);
          if (profiles) {
            for (const client of clients) {
              const p = profiles.find(pr => pr.user_id === client.user_id);
              if (p) clientNameMap[client.id] = p.full_name || p.email;
            }
          }
        }
      }
    }

    // Fetch therapist names
    let therapistNameMap: Record<string, string> = {};
    if (therapistIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", therapistIds);
      if (profiles) {
        for (const p of profiles) {
          therapistNameMap[p.user_id] = p.full_name || p.email;
        }
      }
    }

    return rawBookings.map(b => ({
      ...b,
      athlete_name: b.client_id ? clientNameMap[b.client_id] || "Unknown Client" : "No client",
      therapist_name: b.therapist_id ? therapistNameMap[b.therapist_id] || "Unassigned" : "Unassigned",
    }));
  };

  const fetchAthletes = async () => {
    if (!profile?.team_id) return;
    const { data } = await supabase
      .from("athletes")
      .select("id, name, cc_athlete_id")
      .eq("team_id", profile.team_id)
      .order("name");
    if (data) setAthletes(data);
  };

  const fetchPractitioners = async () => {
    if (!profile?.team_id) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, email")
      .eq("team_id", profile.team_id)
      .in("role", ["practitioner", "organisation"]);
    if (data) setPractitioners(data);
  };

  const resetForm = () => {
    setSelectedAthleteId("");
    setSelectedPractitionerId("");
    setSelectedTime("09:00");
    setSelectedStatus("scheduled");
    setNotes("");
  };

  const handleCreateBooking = async () => {
    if (!selectedDate) return;

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const appointmentDate = setMinutes(setHours(selectedDate, hours), minutes);

    const bookingData: any = {
      appointment_date: appointmentDate.toISOString(),
      team_id: profile?.team_id || null,
      therapist_id: selectedPractitionerId || profile?.user_id || null,
      status: selectedStatus,
      notes: notes || null,
    };

    // If an athlete is selected, we need to find or create a client record
    if (selectedAthleteId) {
      // For simplicity, store the athlete reference in notes if no client record exists
      bookingData.notes = `Athlete: ${athletes.find(a => a.id === selectedAthleteId)?.name || ""}${notes ? `\n${notes}` : ""}`;
    }

    const { error } = await supabase.from("bookings").insert(bookingData);

    if (error) {
      toast.error("Failed to create booking");
      console.error(error);
    } else {
      toast.success("Booking created successfully");
      setShowCreateDialog(false);
      resetForm();
      fetchBookings();
    }
  };

  const handleUpdateBooking = async () => {
    if (!editingBooking) return;

    const updates: any = {
      status: selectedStatus,
      notes: notes || null,
      therapist_id: selectedPractitionerId || editingBooking.therapist_id,
    };

    if (selectedDate && selectedTime) {
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const appointmentDate = setMinutes(setHours(selectedDate, hours), minutes);
      updates.appointment_date = appointmentDate.toISOString();
    }

    const { error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", editingBooking.id);

    if (error) {
      toast.error("Failed to update booking");
    } else {
      toast.success("Booking updated");
      setShowEditDialog(false);
      setEditingBooking(null);
      resetForm();
      fetchBookings();
    }
  };

  const handleDeleteBooking = async (id: string) => {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete booking");
    } else {
      toast.success("Booking deleted");
      fetchBookings();
    }
  };

  const handleCancelBooking = async (id: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) {
      toast.error("Failed to cancel booking");
    } else {
      toast.success("Booking cancelled");
      fetchBookings();
    }
  };

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const getBookingsForDay = (day: Date) =>
    bookings.filter((b) => isSameDay(parseISO(b.appointment_date), day));

  const openCreateForDate = (date: Date) => {
    setSelectedDate(date);
    resetForm();
    setShowCreateDialog(true);
  };

  const openEditBooking = (booking: Booking) => {
    const date = parseISO(booking.appointment_date);
    setEditingBooking(booking);
    setSelectedDate(date);
    setSelectedTime(format(date, "HH:mm"));
    setSelectedStatus(booking.status || "scheduled");
    setNotes(booking.notes || "");
    setSelectedPractitionerId(booking.therapist_id || "");
    setShowEditDialog(true);
  };

  const openDayView = (date: Date) => {
    setSelectedDate(date);
    setShowDayDialog(true);
  };

  const upcomingBookings = useMemo(() =>
    bookings
      .filter(b => !isPast(parseISO(b.appointment_date)) && b.status !== "cancelled")
      .slice(0, 5),
    [bookings]
  );

  const todayBookings = useMemo(() =>
    bookings.filter(b => isSameDay(parseISO(b.appointment_date), new Date())),
    [bookings]
  );

  // Stats
  const totalThisMonth = bookings.length;
  const completedThisMonth = bookings.filter(b => b.status === "completed").length;
  const cancelledThisMonth = bookings.filter(b => b.status === "cancelled").length;
  const scheduledThisMonth = bookings.filter(b => b.status === "scheduled" || b.status === "confirmed").length;

  const BookingCard = ({ booking, compact = false }: { booking: Booking; compact?: boolean }) => (
    <div className={`rounded-lg border p-3 ${STATUS_COLORS[booking.status || "scheduled"]} ${compact ? "text-xs" : "text-sm"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">{format(parseISO(booking.appointment_date), "HH:mm")}</span>
        </div>
        {!compact && (
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditBooking(booking)}>
              <Edit className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => handleCancelBooking(booking.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      {booking.notes && (
        <p className="mt-1 truncate opacity-80">{booking.notes.split('\n')[0]}</p>
      )}
      {booking.therapist_name && !compact && (
        <div className="flex items-center gap-1 mt-1 opacity-70">
          <User className="h-3 w-3" />
          <span className="truncate">{booking.therapist_name}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Bookings</h2>
          <p className="text-muted-foreground text-sm">Manage appointments and schedule athletes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("month")}
              className="rounded-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="rounded-none"
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => openCreateForDate(new Date())} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Booking
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: totalThisMonth, color: "text-foreground" },
          { label: "Scheduled", value: scheduledThisMonth, color: "text-blue-600" },
          { label: "Completed", value: completedThisMonth, color: "text-green-600" },
          { label: "Cancelled", value: cancelledThisMonth, color: "text-red-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-lg">{format(currentDate, "MMMM yyyy")}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            {viewMode === "month" && (
              <div>
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                  ))}
                </div>
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                  {calendarDays.map((day) => {
                    const dayBookings = getBookingsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                    return (
                      <div
                        key={day.toISOString()}
                        className={`min-h-[90px] p-1.5 cursor-pointer transition-colors bg-card hover:bg-accent/30
                          ${!isCurrentMonth ? "opacity-40" : ""}
                          ${isToday(day) ? "ring-2 ring-primary ring-inset" : ""}
                          ${isSelected ? "bg-accent/50" : ""}
                        `}
                        onClick={() => openDayView(day)}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${isToday(day) ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""}`}>
                            {format(day, "d")}
                          </span>
                          {dayBookings.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {dayBookings.length}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {dayBookings.slice(0, 2).map(b => (
                            <div
                              key={b.id}
                              className={`text-[10px] px-1 py-0.5 rounded truncate ${STATUS_COLORS[b.status || "scheduled"]}`}
                              onClick={(e) => { e.stopPropagation(); openEditBooking(b); }}
                            >
                              {format(parseISO(b.appointment_date), "HH:mm")} {b.notes?.split('\n')[0]?.substring(0, 15) || "Booking"}
                            </div>
                          ))}
                          {dayBookings.length > 2 && (
                            <div className="text-[10px] text-muted-foreground pl-1">+{dayBookings.length - 2} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {viewMode === "week" && (
              <div>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map(day => {
                    const dayBookings = getBookingsForDay(day);
                    return (
                      <div key={day.toISOString()} className="space-y-2">
                        <div className={`text-center p-2 rounded-lg ${isToday(day) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <div className="text-xs font-medium">{format(day, "EEE")}</div>
                          <div className="text-lg font-bold">{format(day, "d")}</div>
                        </div>
                        <div className="space-y-1">
                          {dayBookings.map(b => (
                            <BookingCard key={b.id} booking={b} compact />
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs h-7"
                            onClick={() => openCreateForDate(day)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {viewMode === "list" && (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {bookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No bookings this month</p>
                ) : (
                  bookings.map(b => (
                    <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30">
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-[50px]">
                          <div className="text-xs text-muted-foreground">{format(parseISO(b.appointment_date), "EEE")}</div>
                          <div className="text-lg font-bold">{format(parseISO(b.appointment_date), "d")}</div>
                        </div>
                        <div>
                          <div className="font-medium text-sm">{format(parseISO(b.appointment_date), "HH:mm")} - {b.notes?.split('\n')[0] || "Booking"}</div>
                          <div className="text-xs text-muted-foreground">{b.therapist_name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${STATUS_COLORS[b.status || "scheduled"]} text-xs`}>
                          {b.status}
                        </Badge>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditBooking(b)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Mini calendar */}
          <Card>
            <CardContent className="p-2">
              <Calendar
                mode="single"
                selected={selectedDate || undefined}
                onSelect={(d) => { if (d) { setSelectedDate(d); setCurrentDate(d); } }}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Today's bookings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Today ({todayBookings.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
              {todayBookings.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No bookings today</p>
              ) : (
                todayBookings.map(b => <BookingCard key={b.id} booking={b} />)
              )}
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Upcoming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
              {upcomingBookings.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No upcoming bookings</p>
              ) : (
                upcomingBookings.map(b => (
                  <div key={b.id} className="flex items-center gap-2 text-xs border rounded-lg p-2">
                    <div className="text-center min-w-[36px]">
                      <div className="font-bold">{format(parseISO(b.appointment_date), "d")}</div>
                      <div className="text-muted-foreground">{format(parseISO(b.appointment_date), "MMM")}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{format(parseISO(b.appointment_date), "HH:mm")} {b.notes?.split('\n')[0]?.substring(0, 20) || ""}</div>
                      <div className="text-muted-foreground truncate">{b.therapist_name}</div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Day detail dialog */}
      <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {selectedDate && getBookingsForDay(selectedDate).length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No bookings for this day</p>
            ) : (
              selectedDate && getBookingsForDay(selectedDate).map(b => (
                <BookingCard key={b.id} booking={b} />
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowDayDialog(false); if (selectedDate) openCreateForDate(selectedDate); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Booking Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Booking{selectedDate ? ` — ${format(selectedDate, "MMM d, yyyy")}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Date</label>
              <Calendar
                mode="single"
                selected={selectedDate || undefined}
                onSelect={(d) => d && setSelectedDate(d)}
                className="border rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Time</label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {athletes.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Athlete</label>
                <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                  <SelectTrigger><SelectValue placeholder="Select athlete" /></SelectTrigger>
                  <SelectContent>
                    {athletes.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {practitioners.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Practitioner</label>
                <Select value={selectedPractitionerId} onValueChange={setSelectedPractitionerId}>
                  <SelectTrigger><SelectValue placeholder="Select practitioner" /></SelectTrigger>
                  <SelectContent>
                    {practitioners.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateBooking} disabled={!selectedDate}>Create Booking</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Time</label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["scheduled", "confirmed", "completed", "cancelled", "no-show"].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {practitioners.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Practitioner</label>
                <Select value={selectedPractitionerId} onValueChange={setSelectedPractitionerId}>
                  <SelectTrigger><SelectValue placeholder="Select practitioner" /></SelectTrigger>
                  <SelectContent>
                    {practitioners.map(p => (
                      <SelectItem key={p.user_id} value={p.user_id}>{p.full_name || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button variant="destructive" size="sm" onClick={() => { if (editingBooking) handleDeleteBooking(editingBooking.id); setShowEditDialog(false); }}>
              Delete
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdateBooking}>Save Changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

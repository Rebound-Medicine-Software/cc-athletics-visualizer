import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookingEvent } from "./types";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { Trash2, Calendar as CalendarIcon, Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBookingNotes } from "./useBookingNotes";

interface EventType {
  id: number;
  title: string;
  slug: string;
  length: number;
  lengthOptions?: number[];
}

interface BookingDialogProps {
  open: boolean;
  onClose: () => void;
  booking?: BookingEvent | null;
  selectedDate?: Date | null;
  eventTypes?: EventType[];
  fetchSlots?: (eventTypeId: number, startISO: string, endISO: string, durationMinutes?: number) => Promise<string[]>;
  onCreateCal?: (params: {
    eventTypeId: number;
    start: string;
    attendeeName: string;
    attendeeEmail: string;
    notes?: string;
    lengthInMinutes?: number;
  }) => Promise<any>;
  onSave: (date: Date, title: string, notes?: string) => void;
  onUpdate?: (id: string, updates: Partial<BookingEvent>) => void;
  onDelete?: (id: string) => void;
}

export const BookingDialog = ({
  open, onClose, booking, selectedDate, eventTypes = [], fetchSlots, onCreateCal,
  onSave, onUpdate, onDelete,
}: BookingDialogProps) => {
  const isEditing = !!booking;
  const isCal = booking?.source === "cal";
  const { getNote, upsertNote } = useBookingNotes();

  // ---- Edit-mode local state (existing booking) ----
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");

  // ---- Create-mode state (new Cal.com booking) ----
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string>("");
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [pickedDate, setPickedDate] = useState<Date | undefined>(undefined);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [pickedSlot, setPickedSlot] = useState<string>("");
  const [calendarMonth, setCalendarMonth] = useState<Date>(selectedDate || new Date());
  const [availableDays, setAvailableDays] = useState<Set<string>>(new Set());
  const [loadingAvailableDays, setLoadingAvailableDays] = useState(false);
  const [attendeeFirstName, setAttendeeFirstName] = useState("");
  const [attendeeLastName, setAttendeeLastName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedEventType = useMemo(
    () => eventTypes.find((et) => String(et.id) === selectedEventTypeId),
    [eventTypes, selectedEventTypeId]
  );

  // Notes from collaborative table (edit mode, Cal.com bookings only)
  const collaborativeNote = isCal && booking?.uid ? getNote(booking.uid) : undefined;
  const [collabNotes, setCollabNotes] = useState("");

  // Reset state when opening
  useEffect(() => {
    if (!open) return;
    if (booking) {
      setTitle(booking.title || booking.notes || "");
      setNotes(booking.notes || "");
      const d = new Date(booking.appointment_date);
      setDate(format(d, "yyyy-MM-dd"));
      setTime(format(d, "HH:mm"));
      setCollabNotes(collaborativeNote?.notes || "");
    } else {
      // Reset create-mode state
      setSelectedEventTypeId("");
      setSelectedDuration(null);
      setPickedDate(selectedDate || undefined);
      setAvailableSlots([]);
      setPickedSlot("");
      setAttendeeFirstName("");
      setAttendeeLastName("");
      setAttendeeEmail("");
      setCreateNotes("");
    }
  }, [open, booking, selectedDate, collaborativeNote?.notes]);

  // Refresh collab notes when they load
  useEffect(() => {
    if (collaborativeNote) setCollabNotes(collaborativeNote.notes);
  }, [collaborativeNote?.notes]);

  // When event type changes, default the duration to its base length (or first option)
  useEffect(() => {
    if (!selectedEventType) {
      setSelectedDuration(null);
      return;
    }
    const opts = selectedEventType.lengthOptions;
    if (opts && opts.length > 0) {
      setSelectedDuration((prev) => (prev && opts.includes(prev) ? prev : opts[0]));
    } else {
      setSelectedDuration(selectedEventType.length);
    }
  }, [selectedEventType?.id]);

  // Fetch available slots when event type, date, or duration changes (create mode, Cal.com)
  useEffect(() => {
    const load = async () => {
      if (isEditing || !selectedEventType || !pickedDate || !fetchSlots) {
        setAvailableSlots([]);
        return;
      }
      setLoadingSlots(true);
      setPickedSlot("");
      const startISO = startOfDay(pickedDate).toISOString();
      const endISO = endOfDay(pickedDate).toISOString();
      const slots = await fetchSlots(selectedEventType.id, startISO, endISO, selectedDuration || undefined);
      setAvailableSlots(slots);
      setLoadingSlots(false);
    };
    load();
  }, [selectedEventType?.id, pickedDate, isEditing, fetchSlots, selectedDuration]);

  // Fetch which DAYS in the visible month have any availability (so we can disable the rest)
  useEffect(() => {
    const load = async () => {
      if (isEditing || !selectedEventType || !fetchSlots) {
        setAvailableDays(new Set());
        return;
      }
      setLoadingAvailableDays(true);
      const rangeStart = startOfDay(startOfMonth(calendarMonth));
      const rangeEnd = endOfDay(endOfMonth(calendarMonth));
      // Don't probe past dates
      const now = new Date();
      const effectiveStart = rangeStart < now ? now : rangeStart;
      const slots = await fetchSlots(
        selectedEventType.id,
        effectiveStart.toISOString(),
        rangeEnd.toISOString(),
        selectedDuration || undefined,
      );
      const days = new Set<string>();
      slots.forEach((iso) => {
        // Use local-day key (YYYY-MM-DD) so it matches the calendar's day cells
        const d = new Date(iso);
        days.add(format(d, "yyyy-MM-dd"));
      });
      setAvailableDays(days);
      setLoadingAvailableDays(false);
    };
    load();
  }, [selectedEventType?.id, calendarMonth, isEditing, fetchSlots, selectedDuration]);

  const handleEditSave = () => {
    if (!booking) return;
    const dateTime = new Date(`${date}T${time}`);
    onUpdate?.(booking.id, {
      appointment_date: dateTime.toISOString(),
      title,
      notes: notes || title,
      status: booking.status || "scheduled",
    });
    // Save collaborative notes for Cal.com bookings
    if (isCal && booking.uid && collabNotes !== (collaborativeNote?.notes || "")) {
      upsertNote(booking.uid, collabNotes);
    }
    onClose();
  };

  const refreshSlots = async () => {
    if (!selectedEventType || !pickedDate || !fetchSlots) return;
    setLoadingSlots(true);
    setPickedSlot("");
    const slots = await fetchSlots(
      selectedEventType.id,
      startOfDay(pickedDate).toISOString(),
      endOfDay(pickedDate).toISOString(),
      selectedDuration || undefined,
    );
    setAvailableSlots(slots);
    setLoadingSlots(false);
  };

  const handleCreate = async () => {
    const fullName = `${attendeeFirstName.trim()} ${attendeeLastName.trim()}`.trim();
    if (!selectedEventType || !pickedSlot || !fullName || !attendeeEmail || !onCreateCal) return;
    setSubmitting(true);
    try {
      await onCreateCal({
        eventTypeId: selectedEventType.id,
        start: pickedSlot,
        attendeeName: fullName,
        attendeeEmail,
        notes: createNotes || undefined,
        ...(selectedEventType.lengthOptions && selectedEventType.lengthOptions.length > 1 && selectedDuration ? { lengthInMinutes: selectedDuration } : {}),
      });
      onClose();
    } catch (err: any) {
      // On conflict / unavailable, auto-refresh the slot list so stale options disappear
      const msg = String(err?.message || "").toLowerCase();
      if (msg.includes("not available") || msg.includes("already") || msg.includes("400")) {
        await refreshSlots();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate =
    !!selectedEventType &&
    !!pickedSlot &&
    !!attendeeFirstName.trim() &&
    !!attendeeLastName.trim() &&
    /\S+@\S+\.\S+/.test(attendeeEmail);

  const noEventTypes = !isEditing && eventTypes.length === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{isEditing ? "Edit Booking" : "New Booking"}</DialogTitle>
            {isCal && (
              <Badge variant="outline" className="text-xs gap-1 text-blue-600 border-blue-200 bg-blue-50">
                <CalendarIcon className="w-3 h-3" />
                Cal.com
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* ============= CREATE MODE ============= */}
        {!isEditing && (
          <div className="space-y-4 py-2">
            {noEventTypes && (
              <div className="rounded-md bg-muted border border-border p-3 text-sm text-muted-foreground">
                No Cal.com event types found. Create an event type in Cal.com first.
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Event Type</Label>
              <Select value={selectedEventTypeId} onValueChange={setSelectedEventTypeId} disabled={noEventTypes}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event type..." />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((et) => (
                    <SelectItem key={et.id} value={String(et.id)}>
                      {et.title} <span className="text-muted-foreground">· {et.length}m</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEventType?.lengthOptions && selectedEventType.lengthOptions.length > 1 && (
              <div className="space-y-1.5">
                <Label>Session Duration</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedEventType.lengthOptions.map((mins) => {
                    const isPicked = selectedDuration === mins;
                    return (
                      <Button
                        key={mins}
                        type="button"
                        size="sm"
                        variant={isPicked ? "default" : "outline"}
                        onClick={() => setSelectedDuration(mins)}
                      >
                        {mins} min
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !pickedDate && "text-muted-foreground")}
                    disabled={!selectedEventType}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {pickedDate ? format(pickedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[1600] bg-popover" align="start">
                  <Calendar
                    mode="single"
                    selected={pickedDate}
                    onSelect={setPickedDate}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    disabled={(d) => {
                      if (d < startOfDay(new Date())) return true;
                      // If we have any availability data for this month, disable days not in the set
                      if (availableDays.size > 0) {
                        return !availableDays.has(format(d, "yyyy-MM-dd"));
                      }
                      // While loading the first time, allow selection (slots panel will show "no slots")
                      return false;
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                  {loadingAvailableDays && (
                    <div className="px-3 pb-2 text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Checking availability…
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label>Available Time</Label>
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading slots...
                </div>
              ) : !selectedEventType || !pickedDate ? (
                <div className="text-sm text-muted-foreground py-2">
                  Pick an event type and date to see available times.
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  No available slots on this day.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                  {availableSlots.map((slot) => {
                    const t = format(new Date(slot), "HH:mm");
                    const isPicked = slot === pickedSlot;
                    return (
                      <Button
                        key={slot}
                        size="sm"
                        type="button"
                        variant={isPicked ? "default" : "outline"}
                        onClick={() => setPickedSlot(slot)}
                      >
                        {t}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input
                  value={attendeeFirstName}
                  onChange={(e) => setAttendeeFirstName(e.target.value)}
                  placeholder="Jane"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input
                  value={attendeeLastName}
                  onChange={(e) => setAttendeeLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Attendee Email</Label>
              <Input
                type="email"
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder="Visible to your team on hover and in this dialog..."
                rows={2}
              />
            </div>
          </div>
        )}

        {/* ============= EDIT MODE ============= */}
        {isEditing && (
          <div className="space-y-4 py-2">
            {isCal && (booking?.attendeeName || booking?.attendeeEmail) && (
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                {booking.attendeeName && (
                  <div><span className="text-muted-foreground">Attendee:</span> {booking.attendeeName}</div>
                )}
                {booking.attendeeEmail && (
                  <div><span className="text-muted-foreground">Email:</span> {booking.attendeeEmail}</div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CMJ Assessment"
                readOnly={isCal}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            {isCal && (
              <div className="space-y-1.5">
                <Label>Cal.com Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    booking?.status === "accepted" ? "default" :
                    booking?.status === "cancelled" ? "destructive" :
                    "secondary"
                  }>
                    {booking?.status || "unknown"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Lifecycle status — managed by Cal.com</span>
                </div>
              </div>
            )}

            {/* Collaborative notes for Cal.com bookings */}
            {isCal && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                  Team Notes
                  {collaborativeNote?.last_edited_by_name && (
                    <span className="text-xs text-muted-foreground font-normal">
                      · last edited by {collaborativeNote.last_edited_by_name}
                    </span>
                  )}
                </Label>
                <Textarea
                  value={collabNotes}
                  onChange={(e) => setCollabNotes(e.target.value)}
                  placeholder="Shared notes visible to all team practitioners on hover..."
                  rows={3}
                />
              </div>
            )}

            {!isCal && (
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          {isEditing && onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { onDelete(booking!.id); onClose(); }}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isCal ? "Cancel Booking" : "Delete"}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>Close</Button>
            {isEditing ? (
              <Button onClick={handleEditSave} className="gap-1.5">
                <Save className="w-3.5 h-3.5" />
                {isCal ? "Save Notes / Reschedule" : "Save Changes"}
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={!canCreate || submitting} className="gap-1.5">
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create Booking
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

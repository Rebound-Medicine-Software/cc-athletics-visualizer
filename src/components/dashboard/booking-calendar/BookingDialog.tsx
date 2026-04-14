import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingEvent } from "./types";
import { format } from "date-fns";
import { Trash2, Calendar, ExternalLink } from "lucide-react";

interface BookingDialogProps {
  open: boolean;
  onClose: () => void;
  booking?: BookingEvent | null;
  selectedDate?: Date | null;
  onSave: (date: Date, title: string, notes?: string) => void;
  onUpdate?: (id: string, updates: Partial<BookingEvent>) => void;
  onDelete?: (id: string) => void;
}

export const BookingDialog = ({
  open, onClose, booking, selectedDate, onSave, onUpdate, onDelete
}: BookingDialogProps) => {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [status, setStatus] = useState("scheduled");

  const isCal = booking?.source === "cal";

  useEffect(() => {
    if (booking) {
      setTitle(booking.title || booking.notes || "");
      setNotes(booking.notes || "");
      const d = new Date(booking.appointment_date);
      setDate(format(d, "yyyy-MM-dd"));
      setTime(format(d, "HH:mm"));
      setStatus(booking.status || "scheduled");
    } else if (selectedDate) {
      setTitle("");
      setNotes("");
      setDate(format(selectedDate, "yyyy-MM-dd"));
      setTime(format(selectedDate, "HH:mm"));
      setStatus("scheduled");
    }
  }, [booking, selectedDate]);

  const handleSave = () => {
    const dateTime = new Date(`${date}T${time}`);
    if (booking && onUpdate) {
      onUpdate(booking.id, {
        appointment_date: dateTime.toISOString(),
        title,
        notes: notes || title,
        status,
      });
    } else {
      onSave(dateTime, title, notes);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{booking ? "Edit Booking" : "New Booking"}</DialogTitle>
            {isCal && (
              <Badge variant="outline" className="text-xs gap-1 text-blue-600 border-blue-200 bg-blue-50">
                <Calendar className="w-3 h-3" />
                Cal.com
              </Badge>
            )}
          </div>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Cal.com attendee info */}
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
          {!isCal && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no-show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {isCal && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant={
                  booking?.status === "accepted" ? "default" :
                  booking?.status === "cancelled" ? "destructive" :
                  "secondary"
                }>
                  {booking?.status || "unknown"}
                </Badge>
                <span className="text-xs text-muted-foreground">Managed via Cal.com</span>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={3}
              readOnly={isCal}
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          {booking && onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { onDelete(booking.id); onClose(); }}
              className="gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isCal ? "Cancel Booking" : "Delete"}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={handleSave}>
              {isCal ? "Reschedule" : booking ? "Save Changes" : "Create Booking"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

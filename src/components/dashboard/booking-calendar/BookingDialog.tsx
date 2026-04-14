import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingEvent } from "./types";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";

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
          <DialogTitle>{booking ? "Edit Booking" : "New Booking"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. CMJ Assessment" />
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
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={3} />
          </div>
        </div>
        <DialogFooter className="flex justify-between sm:justify-between">
          {booking && onDelete && (
            <Button variant="destructive" size="sm" onClick={() => { onDelete(booking.id); onClose(); }} className="gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>{booking ? "Save Changes" : "Create Booking"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

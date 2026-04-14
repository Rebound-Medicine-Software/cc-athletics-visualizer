export interface BookingEvent {
  id: string;
  uid: string;
  title: string;
  client_id: string | null;
  therapist_id: string | null;
  team_id: string | null;
  appointment_date: string;
  end_date: string;
  status: string | null;
  notes: string | null;
  clientName?: string;
  source: "cal" | "local";
  eventTypeId?: number;
  attendeeName?: string;
  attendeeEmail?: string;
}

export type CalendarView = "month" | "week" | "day" | "list";

export interface CalComBooking {
  id: number;
  uid: string;
  title: string;
  start: string;
  end: string;
  status: string;
  eventTypeId: number;
  attendees: Array<{ name: string; email: string; timeZone: string }>;
  hosts: Array<{ id: number; name: string; email: string }>;
  location?: string;
  description?: string;
  meetingUrl?: string;
}

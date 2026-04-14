export interface BookingEvent {
  id: string;
  title: string;
  client_id: string | null;
  therapist_id: string | null;
  team_id: string | null;
  appointment_date: string;
  end_date: string;
  status: string | null;
  notes: string | null;
  clientName?: string;
}

export type CalendarView = "month" | "week" | "day" | "list";

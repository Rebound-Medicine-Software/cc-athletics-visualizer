export type AssignmentStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  'active',
  'paused',
  'completed',
  'cancelled',
];

export interface Assignment {
  id: string;
  team_id: string;
  athlete_id: string;
  template_id: string;
  assigned_by: string | null;
  start_date: string;
  end_date: string | null;
  status: AssignmentStatus;
  override_payload: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AssignmentRow extends Assignment {
  athlete_name: string | null;
  template_name: string | null;
  template_published: boolean;
}

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
  override_payload: Record<string, ExerciseOverride>;
  created_at: string;
  updated_at: string;
}

export interface AssignmentRow extends Assignment {
  athlete_name: string | null;
  template_name: string | null;
  template_published: boolean;
  assigned_by_name?: string | null;
}

/**
 * Override stored per programming_exercise.id inside
 * athlete_program_assignments.override_payload (jsonb).
 *
 * Shape: { [programming_exercise_id]: ExerciseOverride }
 *
 * Any field left undefined / null falls back to the prescribed value.
 */
export interface ExerciseOverride {
  sets?: number | null;
  reps?: string | null;
  load?: string | null;
  tempo?: string | null;
  rest_seconds?: number | null;
  rpe?: number | null;
  notes?: string | null;
}

export interface CompletionLogInput {
  assignmentId: string;
  programmingExerciseId?: string | null;
  programmingSessionId?: string | null;
  performedOn: string; // YYYY-MM-DD
  setsCompleted?: number | null;
  repsCompleted?: string | null;
  loadUsed?: string | null;
  rpe?: number | null;
  notes?: string | null;
}

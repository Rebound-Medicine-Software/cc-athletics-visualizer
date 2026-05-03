export interface Template {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  goal: string | null;
  duration_weeks: number | null;
  is_published: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Block {
  id: string;
  template_id: string;
  position: number;
  name: string;
  week_number: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrescribedExercise {
  id: string;
  block_id: string;
  exercise_id: string | null;
  position: number;
  sets: number | null;
  reps: string | null;
  load: string | null;
  tempo: string | null;
  rest_seconds: number | null;
  rpe: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateFormValues {
  name: string;
  description: string;
  goal: string;
  duration_weeks: string; // input as string
}

export const TEMPLATE_GOALS = [
  'Strength',
  'Hypertrophy',
  'Power',
  'Speed',
  'Conditioning',
  'Rehab',
  'Pre-season',
  'In-season',
  'Off-season',
  'Other',
] as const;

export interface Exercise {
  id: string;
  team_id: string;
  name: string;
  category: string | null;
  primary_muscles: string[];
  equipment: string[];
  video_url: string | null;
  instructions: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface ExerciseFormValues {
  name: string;
  category: string;
  primary_muscles: string; // comma-separated in UI
  equipment: string; // comma-separated in UI
  video_url: string;
  instructions: string;
}

export const EXERCISE_CATEGORIES = [
  'Strength',
  'Power',
  'Plyometric',
  'Mobility',
  'Conditioning',
  'Rehab',
  'Warm-up',
  'Other',
] as const;

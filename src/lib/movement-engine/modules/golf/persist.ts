import { supabase } from '@/integrations/supabase/client';

/**
 * Golf-module persistence: every write to `metrics.golf` flows through here so
 * we have one merge surface to audit. The DB column is `test_data.metrics`
 * (jsonb); we deep-merge under the `golf` key.
 */
export interface GolfPersistedShape {
  swings?: any[];
  phase_markers?: any;
  session_kpis?: any;
  coach_tags?: string[];
  ai_summary?: string;
  prescription_notes?: string;
  video?: {
    storage_path: string;
    offset_ms: number;
    duration_ms: number;
    synchronised_at: string;
  };
  raw_csv_path?: string;
  last_analysed_at?: string;
  format?: string;
  source_file?: string;
}

/** Read current metrics, shallow-merge golf payload, write back. */
export async function saveGolfMetrics(testDataId: string, partial: GolfPersistedShape) {
  const { data: row, error: readErr } = await supabase
    .from('test_data')
    .select('metrics')
    .eq('id', testDataId)
    .maybeSingle();
  if (readErr) throw readErr;

  const existing = (row?.metrics as any) ?? {};
  const merged = {
    ...existing,
    golf: {
      ...(existing.golf ?? {}),
      ...partial,
      last_analysed_at: new Date().toISOString(),
    },
  };

  const { error: writeErr } = await supabase
    .from('test_data')
    .update({ metrics: merged })
    .eq('id', testDataId);
  if (writeErr) throw writeErr;
  return merged.golf;
}

/** Create a new test_data row for a Quick-mode "Save to Athlete" action. */
export async function createGolfSessionRow(params: {
  athleteId: string;
  athleteName: string;
  teamId: string;
  teamName?: string | null;
  testDate: string; // YYYY-MM-DD
  fileName?: string;
  payload: GolfPersistedShape;
}) {
  const { data, error } = await supabase
    .from('test_data')
    .insert({
      athlete_id: params.athleteId,
      athlete_name: params.athleteName,
      team_id: params.teamId,
      team_name: params.teamName ?? null,
      test_date: params.testDate,
      test_name: 'Golf Swing',
      test_type: 'movement',
      test_subtype: 'golf_swing',
      repetition_number: 1,
      original_file_name: params.fileName ?? null,
      source: 'movement_workspace_quick',
      metrics: {
        golf: { ...params.payload, last_analysed_at: new Date().toISOString() },
      },
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

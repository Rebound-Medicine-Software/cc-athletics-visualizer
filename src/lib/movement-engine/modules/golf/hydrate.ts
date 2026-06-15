import { supabase } from '@/integrations/supabase/client';
import { golfModule } from './index';
import type { MovementSession, MovementEvent } from '../../core/types';
import type { GolfPersistedShape } from './persist';

export interface HydratedGolfSession {
  testDataId: string;
  athleteId: string | null;
  athleteName: string;
  testDate: string;
  fileName: string | null;
  persisted: GolfPersistedShape;
  /** Re-derived from raw_csv_path or stored swings when available. */
  session: MovementSession | null;
  events: MovementEvent[];
}

/**
 * Hydrates a golf session from a saved test_data row.
 *
 * 1. Reads metrics.golf for cached analysis (KPIs, coach tags, AI summary…).
 * 2. If raw trace is available (`metrics.golf.raw_csv_path` or
 *    `metrics.raw_csv_path` from the v1.0 CSV import), downloads it and
 *    re-runs parse → detect → phases so charts & overlays work in-memory.
 *    The backfill is NOT written back unless the caller saves explicitly.
 */
export async function hydrateGolfSession(testDataId: string): Promise<HydratedGolfSession> {
  const { data: row, error } = await supabase
    .from('test_data')
    .select('id, athlete_id, athlete_name, test_date, original_file_name, metrics')
    .eq('id', testDataId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error('Session not found');

  const metrics = (row.metrics as any) ?? {};
  const persisted: GolfPersistedShape = metrics.golf ?? {};
  const rawPath: string | undefined = persisted.raw_csv_path ?? metrics.raw_csv_path;

  let session: MovementSession | null = null;
  let events: MovementEvent[] = [];

  if (rawPath) {
    try {
      const { data: signed } = await supabase.storage
        .from('csv-imports')
        .createSignedUrl(rawPath, 3600);
      if (signed?.signedUrl) {
        const text = await fetch(signed.signedUrl).then((r) => r.text());
        const blob = new File([text], row.original_file_name ?? 'session.csv', { type: 'text/csv' });
        session = await golfModule.parse(blob, blob.name);
        events = golfModule.detectEvents(session);
        events.forEach((e) => { e.phaseMarkers = golfModule.detectPhases(e, session!); });
      }
    } catch (e) {
      console.warn('Raw trace fetch failed — hydration is metadata-only', e);
    }
  }

  return {
    testDataId: row.id,
    athleteId: row.athlete_id,
    athleteName: row.athlete_name ?? '',
    testDate: row.test_date,
    fileName: row.original_file_name,
    persisted,
    session,
    events,
  };
}

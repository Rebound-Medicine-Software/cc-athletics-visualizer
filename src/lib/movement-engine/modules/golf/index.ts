import type { MovementModule, MovementEvent } from '../../core/types';
import { parseGolfFile } from './parse';
import { detectGolfSwings } from './detectSwings';
import { detectGolfPhases } from './phases';
import { computeGolfKpis, type GolfKpis } from './kpis';
import { deriveGolfInsights, type GolfFindings } from './insights';
import { golfFormats } from './detectFormat';
import { GOLF_BENCHMARK_KEYS } from './benchmarks';
import { consistencyScore, bestWorst } from '../../core/scoring';
import { registerModule } from '../../core/moduleRegistry';

export const golfModule: MovementModule<any, MovementEvent, GolfKpis, GolfFindings> = {
  id: 'golf_swing',
  testSubtype: 'golf_swing',
  label: 'Golf Swing',
  formats: golfFormats,
  parse: parseGolfFile,
  detectEvents: detectGolfSwings,
  detectPhases: detectGolfPhases,
  computeKpis: computeGolfKpis,
  scoreEvents: (events, session) => {
    const kpisList = events.map((e) => {
      e.phaseMarkers = detectGolfPhases(e, session);
      return computeGolfKpis(e, session);
    });
    const scores = kpisList.map((k) => {
      // composite 0-100 score
      const lead = Math.min(100, k.lead_load_pct / 80 * 100);
      const transfer = Math.min(100, Math.max(0, k.weight_transfer_pct / 30 * 100));
      const tempoCloseness = 100 - Math.min(100, Math.abs(2.85 - k.tempo_ratio) * 30);
      return Math.round((lead + transfer + tempoCloseness + k.cop_quality * 100) / 4);
    });
    const { best, worst } = bestWorst(scores);
    return { best, worst, consistency: consistencyScore(scores), scores };
  },
  deriveInsights: (session, events) => {
    const kpisList = events.map((e) => computeGolfKpis(e, session));
    return deriveGolfInsights(kpisList);
  },
  benchmarkKeys: GOLF_BENCHMARK_KEYS,
};

// Self-register so consumers only need to import this file.
registerModule(golfModule);

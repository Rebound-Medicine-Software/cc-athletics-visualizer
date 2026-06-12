// Movement Analysis Engine — core, module-agnostic types.
// Golf is the first module; future modules (squat, sts, cmj, dj, pogo, balance,
// running, gait) implement the same `MovementModule` contract.

export interface PhaseMarker {
  name: string;
  /** Time in seconds from the start of the parent session. */
  time: number;
  meta?: Record<string, unknown>;
}

export interface ForceSample {
  t: number;       // seconds
  left: number;    // N
  right: number;   // N
  total: number;   // N
}

export interface MovementSession {
  id: string;
  moduleId: string;
  sourceFile?: string;
  format: string;
  bodyMassKg?: number;
  sampleRateHz: number;
  samples: ForceSample[];
  /** Free-form passthrough so modules can carry vendor-specific data. */
  meta?: Record<string, unknown>;
}

export interface MovementEvent {
  index: number;             // 1-based
  startTime: number;         // seconds
  endTime: number;           // seconds
  impactTime?: number;       // seconds
  phaseMarkers: PhaseMarker[];
  meta?: Record<string, unknown>;
}

export interface FormatDetector {
  id: string;
  label: string;
  matches: (text: string, filename?: string) => boolean;
}

export interface MovementModule<TSession = MovementSession, TEvent = MovementEvent,
                                TKpi = Record<string, number>, TInsight = unknown> {
  id: string;
  testSubtype: string;
  label: string;
  formats: FormatDetector[];
  parse: (file: File | string, filename?: string) => Promise<TSession>;
  detectEvents: (session: TSession) => TEvent[];
  detectPhases: (event: TEvent, session: TSession) => PhaseMarker[];
  computeKpis: (event: TEvent, session: TSession) => TKpi;
  scoreEvents: (events: TEvent[], session: TSession) =>
    { best: number; worst: number; consistency: number; scores: number[] };
  deriveInsights: (session: TSession, events: TEvent[]) => TInsight;
  benchmarkKeys: string[];
}

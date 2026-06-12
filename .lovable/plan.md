
# Movement Workspace v1.0 — Golf Swing as First Module

A reusable **Movement Workspace** with a generic engine and a Golf Swing module as the first implementation. Built natively in React/Tailwind/Supabase. The supplied HTML is used only as algorithm/UX reference; no embedding or iframes.

---

## 1. Navigation & Hierarchy

**Sidebar (Insights group):** add `movement-workspace` item.

```text
Insights
└── Movement Workspace
    ├── Golf Swing            (active)
    ├── Squat                 (Coming Soon)
    ├── Sit to Stand          (Coming Soon)
    ├── Balance               (Coming Soon)
    ├── CMJ / DJ / Pogo       (Coming Soon)
    ├── Single Leg CMJ / DJ   (Coming Soon)
    ├── Running / Gait        (Coming Soon)
```

Also reachable from **Performance Data → Movement → Golf Swing → "Open Golf Dashboard"** (full workspace, not a drawer).

**Test hierarchy preserved:** `test_type = 'movement'`, `test_subtype = 'golf_swing'`. No new `test_type='golf'`.

---

## 2. Movement Analysis Engine

Folder layout:

```text
src/lib/movement-engine/
  core/
    types.ts            // MovementModule<TSession,TEvent,TKpi,TInsight>
    moduleRegistry.ts
    formatRegistry.ts
    phaseEngine.ts      // (extends existing src/lib/movement/phaseEngine.ts)
    syncBus.ts          // pub/sub: time | phase | impact | swingIndex
    scoring.ts          // generic best/worst/consistency helpers
  modules/
    golf/
      parse.ts
      detectFormat.ts
      detectSwings.ts
      phases.ts
      kpis.ts
      cop.ts
      scoring.ts
      insights.ts
      prescription.ts
      benchmarks.ts
      report/
        buildReportData.ts
      index.ts          // export const golfModule: MovementModule
```

`MovementModule` interface — core knows nothing about golf:

```ts
export interface MovementModule<TSession, TEvent, TKpi, TInsight> {
  id: string;                 // 'golf_swing'
  testSubtype: string;        // 'golf_swing'
  label: string;              // 'Golf Swing'
  formats: FormatDetector[];
  parse(file: File | string): Promise<TSession>;
  detectEvents(s: TSession): TEvent[];               // swings / reps
  detectPhases(e: TEvent): PhaseMarker[];
  computeKpis(e: TEvent): TKpi;
  scoreEvents(es: TEvent[]): { best: number; worst: number; consistency: number };
  deriveInsights(s: TSession, es: TEvent[]): TInsight;
  benchmarkKeys: string[];
}
```

Future modules (Squat, STS, CMJ, DJ, Pogo, Balance, Running, Gait) plug into `moduleRegistry` without touching core.

---

## 3. Golf Performance Dashboard

Files (new):

```text
src/components/dashboard/movement-workspace/
  MovementWorkspace.tsx                  // shell + module grid
  ModuleCard.tsx                         // active / coming-soon tile
  golf/
    GolfPerformanceDashboard.tsx         // full workspace
    GolfModeSwitcher.tsx                 // Database | Quick | Batch
    GolfKpiStrip.tsx                     // 9 premium KPI cards
    GolfForceTraceChart.tsx              // L/R/combined + swing windows + phase markers
    GolfSwingSelector.tsx                // 1..N | Avg | Best | Worst | Overlay
    GolfPhaseTimeline.tsx                // interactive markers (click = sync)
    GolfInsightsPanel.tsx                // Technical | Physical | Programming
    GolfCoachTagsPanel.tsx               // tag chips + add/remove
    GolfAiSummaryCard.tsx                // session summary
    GolfBenchmarkPanel.tsx               // percentile bands (club→global)
    GolfRawTraceButton.tsx               // existing rawTraceFetch
    tabs/
      OverviewTab.tsx
      ForceTab.tsx
      WeightDistributionTab.tsx
      CopPathTab.tsx
      TorqueRotationTab.tsx
      ConsistencyTab.tsx
      VideoSyncTab.tsx
      SwingCompareTab.tsx
      BenchmarksTab.tsx
      ReportTab.tsx
    video/
      VideoPlayerSync.tsx
      VideoUploadOrPick.tsx
      PhaseTimelineScrubber.tsx
    cop/
      CopPlayback.tsx                    // play/pause/scrub, arrows, markers
    report/
      GolfReportTemplate.tsx             // luxury template (preview + PDF)
```

Full page (route via `activeSection = 'movement-workspace'` with sub-route state).

---

## 4. Three Analysis Modes

1. **Database Analysis** — reuses existing Performance Data flow (athlete/team filters, `test_data`, `csv_import_*`, API). Filters `test_type='movement'` + `test_subtype='golf_swing'`.
2. **Quick Golf Analysis** — drop a CSV/TXT → `detectFormat` (ForceMate, CC Athletics, Swing Catalyst, Smart2Move, generic) → parse → detect swings → render dashboard. Footer CTA **Save to athlete?** → [Yes opens Batch Import pre-filled] / [No discards].
3. **Batch Import** — multi-file with Team/Athlete assignment, writes `csv_import_batches`, `csv_import_files`, `test_data` (existing duplicate protection from `useCsvImport`).

---

## 5. Storage Model (no schema migration)

All persistence is JSONB on existing `test_data.metrics`:

```json
{
  "golf": {
    "swings": [
      {
        "index": 1,
        "score": 87,
        "phase_markers": { "address": 0.0, "backswing_start": 0.15, "top": 1.04,
                           "transition": 1.18, "impact": 1.49,
                           "follow_through": 1.74, "finish": 2.31 },
        "kpis": { "peak_force": 1820, "lead_load_pct": 62, "trail_load_pct": 38,
                  "weight_transfer_pct": 71, "tempo_ratio": 3.1, "cop_quality": 0.82 },
        "cop": { "path_lead": [...], "path_trail": [...], "path_combined": [...] },
        "insights": { "technical": [...], "physical": [...] }
      }
    ],
    "phase_markers": { ... best swing markers ... },
    "session_kpis": { ... },
    "coach_tags": ["good_pressure_transfer", "late_transition"],
    "ai_summary": "Weight transfer improved... lead loading still below benchmark.",
    "video": { "storage_path": "...", "offset_ms": 0 },
    "raw_csv_path": "..."
  }
}
```

Per-swing persistence avoids future migrations. Phase markers persisted alongside KPIs.

---

## 6. Swing Phase Detection

In `modules/golf/phases.ts`:
- Baseline force window ±5 SD.
- Sustained threshold crossings (configurable hold-time) to avoid noise.
- Segmentation: Address → Backswing Start → Top → Transition → Downswing → Impact → Follow Through → Finish.
- Impact = peak `dF/dt` after Top within ground-contact window.
- Reuses existing `phaseEngine` primitives where possible.

---

## 7. Swing Overlay Mode

`GolfSwingSelector` gains `mode = single | average | best | worst | overlay`.
Overlay sub-options: **Best vs Worst · All · Selected (multi-pick)**.
Charts (`GolfForceTraceChart`, `CopPathTab`, `WeightDistributionTab`) render N traces **aligned at impact (t=0)**, deterministic colour palette (gold = best, red = worst).

---

## 8. Unified syncBus

`core/syncBus.ts` — tiny typed pub/sub:

```ts
syncBus.emit('time', { ms });
syncBus.emit('phase', { name });
syncBus.emit('impact', { swingIndex });
syncBus.emit('swingIndex', { i });
```

Subscribers: video player, force chart cursor, CoP playback, phase timeline. Click anywhere → everything seeks.

---

## 9. Video Sync Tab

- Upload new video **or** pick existing (reuses video upload flow + sanitised filenames per project memory).
- Single `videoOffsetMs` set by dragging video against detected impact marker (snap-to-impact helper).
- Bidirectional sync via `syncBus`.
- Persisted as `metrics.golf.video = { storage_path, offset_ms }`.

---

## 10. CoP Analysis Tab

`CopPlayback` renders lead/trail/combined paths with:
- Play / Pause / Scrub bar wired to `syncBus`.
- Direction arrows, impact starburst, transition + finish markers.
- Trailing ghost trail. Premium telemetry styling.

---

## 11. Benchmark Comparisons

`modules/golf/benchmarks.ts` declares `benchmarkKeys`: `lead_load_pct`, `weight_transfer_pct`, `tempo_ratio`, `consistency`, `cop_efficiency`, `peak_impact_force`, `transition_ms`.

Scopes: **Club · Region · Country · Global · Golf Benchmark** + disabled **Tour Benchmark** placeholder. Future tiers: Amateur / Club / Elite Amateur / Professional / Tour.

Reuses existing comparison primitives (same 3-band percentile component used in Live Data) + `benchmark_data_warehouse` / `elite_athlete_data`. Graceful "insufficient data" state when sparse.

---

## 12. Coach Tags

`GolfCoachTagsPanel`: chip selector with curated catalogue (Early Extension, Poor Transition, Excessive Sway, Loss of Posture, Poor Lead Loading, Good Pressure Transfer, Excellent Sequencing, etc.) + free-text. Persists to `metrics.golf.coach_tags`. Surfaced in reports and future AI prompts.

---

## 13. Practitioner Insights (3 sections)

`modules/golf/insights.ts` + `prescription.ts`. Rule-based, evidence chips show triggering KPI:

- **Technical Findings** — late pressure transfer, poor lead-side loading, poor transition timing, excessive trail loading, inconsistent sequencing.
- **Physical Findings** — lead-leg force deficit, rotational power deficit, balance deficit, thoracic mobility deficit, hip mobility restriction, reactive strength deficit.
- **Programming Focus** — rotational med-ball, lead-leg force, single-leg force, reactive strength, balance, anti-rotation, thoracic mobility, hip mobility.

Suggestions only — no auto-generated programmes.

---

## 14. AI Session Summary

New edge function `supabase/functions/generate-golf-summary/index.ts` (Lovable AI Gateway, no extra secret). Inputs: current session KPIs + previous session deltas + coach tags. Output stored at `metrics.golf.ai_summary`. Surfaced in `GolfAiSummaryCard` and report.

---

## 15. Swing Compare Tab

`SwingCompareTab` — Session A vs Session B selector (athlete + date). Side-by-side force, CoP, weight transfer, tempo, consistency. Built on the same chart primitives as Overlay mode.

---

## 16. Raw Trace Integration

Reuses existing `src/lib/movement/rawTraceFetch.ts` + `supabase/functions/cc-raw-csv`. "Load raw force trace" button on Database rows pulls `path_to_this_jump_raw_csv` / `path_to_raw_csv` securely. Never exposes API keys. Unlocks force curves, CoP, spring-like correlation for movement modules.

---

## 17. Golf Report Generator

`ReportTab` → **Generate Golf Report** → Interactive HTML preview + PDF download.

- Builder: `modules/golf/report/buildReportData.ts`.
- Template: `GolfReportTemplate.tsx` (luxury NEXUS styling, reuses report design tokens).
- PDF: extend existing `generate-interactive-pdf-report` with `module:'golf_swing'` branch, OR thin wrapper `supabase/functions/generate-golf-report` if payload diverges.
- Sections: Session Summary · Best Swing · Average Swing · Force Traces · Weight Distribution · CoP · Swing Phases · Technical Findings · Physical Findings · Programming Focus · AI Summary · Coach Tags.
- Stored in existing reports bucket; signed URL 1hr per project memory.

---

## 18. UX Direction

- framer-motion transitions on mode/swing/tab switches.
- Mono-digit premium KPI cards with sparkline mini-trends, gold/cyan accent rails.
- Interactive phase markers (hover tooltip, click seeks everything).
- Animated CoP playback with ghost trail and impact starburst.
- Dark telemetry canvas — no spreadsheet tables, no clinical chrome.

---

## 19. Files Created (summary)

- `src/lib/movement-engine/core/{types,moduleRegistry,formatRegistry,phaseEngine,syncBus,scoring}.ts`
- `src/lib/movement-engine/modules/golf/{parse,detectFormat,detectSwings,phases,kpis,cop,scoring,insights,prescription,benchmarks,index}.ts`
- `src/lib/movement-engine/modules/golf/report/buildReportData.ts`
- `src/components/dashboard/movement-workspace/MovementWorkspace.tsx` + `ModuleCard.tsx`
- `src/components/dashboard/movement-workspace/golf/*` (dashboard, mode switcher, KPI strip, force chart, swing selector, phase timeline, insights, coach tags, AI summary, benchmark, raw-trace button)
- `src/components/dashboard/movement-workspace/golf/tabs/*` (Overview, Force, Weight, CoP, Torque, Consistency, VideoSync, SwingCompare, Benchmarks, Report)
- `src/components/dashboard/movement-workspace/golf/video/*`
- `src/components/dashboard/movement-workspace/golf/cop/CopPlayback.tsx`
- `src/components/dashboard/movement-workspace/golf/report/GolfReportTemplate.tsx`
- `supabase/functions/generate-golf-summary/index.ts`

## Files Modified

- `src/pages/Dashboard.tsx` — add `movement-workspace` navigation entry under Insights.
- `src/components/dashboard/DashboardContent.tsx` — route `movement-workspace` → `MovementWorkspace`.
- `src/lib/csv/testTypeConfig.ts` — add `golf_swing` subtype under existing `movement` test type.
- `src/lib/tests/testNameMatching.ts` — `golf_swing` matchers under movement family.
- `src/components/dashboard/performance-data/TestAnalysisRouter.tsx` — when subtype is `golf_swing`, render "Open Golf Dashboard" CTA → opens workspace pre-loaded with the row.
- `src/hooks/useCsvImport.ts` — pass through `metrics.golf.*` untouched (verify no stripping).
- `supabase/functions/generate-interactive-pdf-report/index.ts` — optional `module:'golf_swing'` branch (or new wrapper function).

---

## 20. Limitations

- Video A/V alignment is one-time manual (impact-snap helper); no automatic sync in v1.
- Benchmark percentiles depend on golf rows in `benchmark_data_warehouse`; sparse → graceful empty state. Tour Benchmark scope disabled.
- Quick Mode results are in-memory until "Save to athlete?" is confirmed.
- AI summary is a single-paragraph generation; no multi-turn coaching dialogue.
- Format detectors cover the 4 named vendors + generic; unrecognised exports fall back to generic parser.
- Report PDF reuses the existing pipeline — layout polish, not a new rendering engine.
- No new database tables in v1; all data lives in `metrics.golf` JSONB. Future migration path documented (`movement_sessions` / `movement_events` / `movement_phase_metrics`) if cross-module querying becomes a need.

---

## 21. Verification (using uploaded Golf Swing file)

1. **Insights → Movement Workspace → Golf Swing → Quick Golf Analysis** → upload the file.
2. Confirm: format detected, swings segmented, phase markers populated, KPI strip rendered.
3. Switch swing selector → **Overlay → Best vs Worst**: traces and CoP align at impact, colour-coded.
4. Open **Video Sync** tab → upload coach video → drag-to-impact → confirm bidirectional sync (phase marker ↔ force ↔ CoP ↔ video).
5. Open **Benchmarks** tab → confirm percentile bands (or "insufficient data" state).
6. Add **Coach Tags**, generate **AI Summary**.
7. Click **Save to athlete** → row written with `test_type='movement'`, `test_subtype='golf_swing'`, `metrics.golf.swings[]` and `phase_markers` populated.
8. Open **Performance Data → Movement → Golf Swing → Open Golf Dashboard** on the saved row → Database mode loads the same dashboard.
9. Open **Swing Compare** → pick two sessions → confirm side-by-side render.
10. Click **Generate Golf Report** → preview HTML, download PDF, verify all sections.

---

Reply **"go"** to implement, or tell me what to change.

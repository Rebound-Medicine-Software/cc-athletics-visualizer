# Movement Workspace v1.1 — Practitioner Workflow

Transforms the Golf Dashboard from a one-shot analysis tool into a persistent practitioner workspace. Additive only — no rebuild of v1.0.

---

## Priority 1 — Database Hydration

Replace the "redirect to Performance Data" behaviour in `GolfPerformanceDashboard` Database mode with a native loader.

New components under `src/components/dashboard/movement-workspace/golf/database/`:

- `GolfDatabasePicker.tsx` — Team → Athlete → Session (date) → File cascading selectors. Reuses `useWorkspaceTeams`, `useAthletes`, and queries `test_data` filtered by `test_type='movement'` + `test_subtype='golf_swing'`. Joins `csv_import_files` / `csv_import_batches` when source is CSV import.
- `useGolfSessionHydration.ts` — given a `test_data.id`, returns `{ session, swings, phaseMarkers, kpis, coachTags, aiSummary, video, raw_csv_path }` from `metrics.golf`. If `metrics.golf.swings` is missing but `raw_csv_path` exists, calls existing `rawTraceFetch` and re-runs the golf module pipeline in-memory (lazy backfill, not written back unless user clicks Save).
- `GolfDatabaseHeader.tsx` — sticky bar showing Athlete · Session date · File name · last-updated badge.

`GolfPerformanceDashboard` accepts `{ mode: 'quick' | 'database' | 'batch', sessionId? }`. Database mode renders the picker until a session is chosen, then mounts the same KPI strip / force chart / CoP / insights / coach tags / AI summary components against the hydrated session.

Persistence write helper `src/lib/movement-engine/modules/golf/persist.ts` provides `saveGolfMetrics(testDataId, partial)` — merges into `metrics.golf` via a single `update test_data set metrics = metrics || $1`. Used by Coach Tags add/remove, AI Summary generation, Phase Marker edits, and prescription notes.

---

## Priority 2 — Video Synchronisation

New storage bucket `movement-videos` (private) created via storage tool. RLS: authenticated users can read/write objects whose first path segment matches a team they belong to (`team_id/athlete_id/filename`).

Files:

- `src/components/dashboard/movement-workspace/golf/video/VideoSyncTab.tsx` — replaces the v1.0 placeholder. Two entry paths: **Upload Video** (sanitises filename per project memory, uploads to `movement-videos/{teamId}/{athleteId}/{ts}_{name}`) and **Pick Existing** (lists prior videos for the athlete).
- `VideoPlayerSync.tsx` — wraps native `<video>`, publishes `syncBus.emit('time', { ms })` on `timeupdate`, subscribes to `time`/`phase`/`impact`/`swingIndex` events and seeks accordingly. `videoOffsetMs` applied bidirectionally.
- `VideoOffsetCalibrator.tsx` — drag-the-video-to-impact UI; on confirm writes `metrics.golf.video = { storage_path, offset_ms, duration_ms, synchronised_at }` via `saveGolfMetrics`.
- `PhaseTimelineScrubber.tsx` — thin horizontal phase ribbon under the video, clickable phase pills emit `syncBus.emit('phase', ...)`.

`GolfForceTraceChart` and `GolfCopPlayback` already use a cursor index — extend both to subscribe to `syncBus.on('time', ...)` and (already) emit `time` events on click/hover, so any view drives the others.

---

## Priority 3 — Session Compare

`src/components/dashboard/movement-workspace/golf/compare/`:

- `SessionCompareTab.tsx` — replaces v1.0 placeholder. Two `GolfDatabasePicker` instances (Session A / Session B), both feeding `useGolfSessionHydration`.
- `CompareForceOverlay.tsx`, `CompareCopOverlay.tsx`, `CompareKpiDeltas.tsx` — reuse `GolfForceTraceChart` / `GolfCopPlayback` in overlay mode (already supports N traces aligned at impact), and a delta table for Tempo · Weight Transfer · Lead Load · Consistency · Peak Force · Transition (ms) · CoP efficiency.
- `CompareFindingsDiff.tsx` — diffs `insights.technical` / `insights.physical` / `programming` between A and B; tags each finding **Improved · Worsened · Unchanged · New · Resolved** with colour pills.
- `CompareSummary.tsx` — side-by-side AI summary cards, plus a "Generate comparative summary" button calling the existing `generate-golf-summary` edge function with a new `mode: 'compare'` payload (added below).

`supabase/functions/generate-golf-summary/index.ts` — extend payload: `{ mode: 'session' | 'compare', sessionA, sessionB? }`; comparative branch sent to Lovable AI Gateway with a diff-aware prompt. Same graceful local fallback if gateway unreachable.

---

## Priority 4 — Report Generator

`src/components/dashboard/movement-workspace/golf/report/`:

- `buildGolfReportData.ts` — assembles every section from the hydrated session.
- `GolfReportTemplate.tsx` — interactive HTML preview, luxury styling shared with existing report tokens (navy + gold accents, Circular font, framer-motion fade-ins). Sections: Session Summary, Best Swing, Average Swing, Force Traces, CoP, Swing Phases, Coach Tags, Technical Findings, Physical Findings, Programming Focus, AI Summary, Benchmark Comparison.
- `ReportTab.tsx` — replaces v1.0 placeholder. Preview pane + **Download PDF** + **Email to athlete** (reuses existing NotificationAPI flow).

PDF generation: extend `supabase/functions/generate-interactive-pdf-report/index.ts` with a `module: 'golf_swing'` branch that consumes the same `buildGolfReportData` payload server-side and emits a PDF using the existing pipeline (no new edge function unless the payload shape forces it). Output stored in existing reports bucket, signed URL valid 1 hr (per memory).

---

## Priority 5 — Persistence Wiring

Single source of truth: `metrics.golf` JSONB on `test_data`. Shape (additive to v1.0):

```json
{
  "golf": {
    "swings": [ { "index", "score", "phase_markers", "kpis", "cop" } ],
    "phase_markers": { ... best swing ... },
    "session_kpis": { ... },
    "coach_tags": ["good_pressure_transfer", "late_transition"],
    "ai_summary": "...",
    "prescription_notes": "...",
    "video": {
      "storage_path": "movement-videos/{team}/{athlete}/...",
      "offset_ms": 0,
      "duration_ms": 12500,
      "synchronised_at": "2026-06-14T10:22:00Z"
    },
    "raw_csv_path": "...",
    "last_analysed_at": "..."
  }
}
```

Write paths all route through `saveGolfMetrics`:

- **Save Analysis** button in Quick mode → creates a `test_data` row (existing CSV import flow), writes full payload.
- **Save to Athlete** → opens athlete picker, then writes payload to that athlete (no longer routes away).
- **Batch Import** → `useCsvImport` already preserves `metrics` passthrough; verify the golf payload is included when files are detected as `golf_swing`.
- **Database Session Update** → Coach tag toggles, AI summary regenerate, phase marker edits, prescription notes all call `saveGolfMetrics` with a partial.

---

## Files Created

```
src/components/dashboard/movement-workspace/golf/database/
  GolfDatabasePicker.tsx
  GolfDatabaseHeader.tsx
  useGolfSessionHydration.ts
src/components/dashboard/movement-workspace/golf/video/
  VideoSyncTab.tsx
  VideoPlayerSync.tsx
  VideoOffsetCalibrator.tsx
  PhaseTimelineScrubber.tsx
src/components/dashboard/movement-workspace/golf/compare/
  SessionCompareTab.tsx
  CompareForceOverlay.tsx
  CompareCopOverlay.tsx
  CompareKpiDeltas.tsx
  CompareFindingsDiff.tsx
  CompareSummary.tsx
src/components/dashboard/movement-workspace/golf/report/
  ReportTab.tsx
  GolfReportTemplate.tsx
  buildGolfReportData.ts
src/lib/movement-engine/modules/golf/persist.ts
src/lib/movement-engine/modules/golf/hydrate.ts
```

## Files Modified

```
src/components/dashboard/movement-workspace/golf/GolfPerformanceDashboard.tsx   // mode-aware shell, tab wiring
src/components/dashboard/movement-workspace/golf/GolfForceTraceChart.tsx        // syncBus subscribe/emit
src/components/dashboard/movement-workspace/golf/GolfCopPlayback.tsx            // syncBus subscribe/emit
src/components/dashboard/movement-workspace/golf/GolfCoachTagsPanel.tsx         // persist via saveGolfMetrics
src/components/dashboard/movement-workspace/golf/GolfAiSummaryCard.tsx          // persist + compare mode
src/components/dashboard/movement-workspace/golf/GolfInsightsPanel.tsx          // editable prescription notes
src/hooks/useCsvImport.ts                                                       // ensure metrics.golf passthrough
supabase/functions/generate-golf-summary/index.ts                               // session | compare mode
supabase/functions/generate-interactive-pdf-report/index.ts                     // module:'golf_swing' branch
```

## Backend Changes

- New private storage bucket `movement-videos` + RLS on `storage.objects` scoped by `team_id` path prefix.
- No schema changes — all data lives in `metrics.golf` JSONB (existing column).

---

## Limitations

- Video offset calibration is manual (drag-to-impact). No automatic A/V alignment in v1.1.
- Comparative AI summary depends on Lovable AI Gateway availability; local fallback returns a structured diff without narrative.
- PDF rendering reuses the existing interactive-pdf pipeline; layout is luxury but constrained by that engine's primitives.
- Lazy backfill (re-running the golf module on hydration when `swings` are missing) is in-memory only until the user clicks Save.
- Session Compare is two-session only in v1.1; multi-session trend view deferred.
- Report "Email to athlete" reuses existing NotificationAPI templates — no new template designed in v1.1.

---

## Verification

1. **Hydration** — Insights → Movement Workspace → Golf Swing → Database. Pick Team → Athlete → a previously saved session. Confirm KPI strip, force chart, phase markers, CoP playback, coach tags and AI summary load without re-upload.
2. Toggle a Coach Tag → reload the page → tag persists.
3. **Video Sync** — open the Video Sync tab on a hydrated session, upload a swing video, drag to impact, save offset. Click a phase pill on the force chart → video seeks. Scrub the video → force chart cursor and CoP marker follow.
4. **Session Compare** — open Compare tab, pick two sessions for the same athlete. Confirm overlay traces, CoP overlay, KPI delta table, and Improved/Worsened/Unchanged finding pills.
5. Click **Generate comparative summary** → narrative appears (or local fallback structured diff if gateway down).
6. **Report** — open Report tab on a hydrated session → preview renders all sections → Download PDF returns a 1-hour signed URL → Email to Athlete delivers via NotificationAPI.
7. **Quick → Save** — drop a CSV in Quick mode → Save to Athlete → pick athlete → confirm new `test_data` row with `test_type='movement'`, `test_subtype='golf_swing'`, full `metrics.golf` payload.
8. **Batch import** — import a golf CSV via the existing wizard → confirm `metrics.golf.swings[]` and `phase_markers` populated on the resulting row.

---

Reply **"go"** to implement, or tell me what to change.
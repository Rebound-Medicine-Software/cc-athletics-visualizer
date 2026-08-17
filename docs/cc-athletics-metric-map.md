# CC Athletics (ForceMate) — endpoints, payload shape and metric map

Companion to `docs/metric-mapping.md` (VALD side). Same structure so the two can be diffed.

Sources of truth in code:
- Client wrapper: `src/services/ccAthleticsApi.ts`
- Fetch-only path: `supabase/functions/fetch-cc-data/index.ts`
- Sync-to-DB path: `supabase/functions/sync-cc-athletics/index.ts`
- Raw trace proxy: `supabase/functions/cc-raw-csv/index.ts`
- Manual CSV taxonomy + header aliases: `src/lib/csv/testTypeConfig.ts`, `src/lib/csv/mapMetrics.ts`
- Dropdowns / chart keys / KPI tiles: `filterUtils.ts`, `useMetricCaseLogic.ts`, `metricCardConfig.ts`

---

## 1. CC Athletics API endpoints actually used

Base URL: `https://europe-west1-forcemate-desktop.cloudfunctions.net`
Auth: header `X-API-Key: <team API key>` (no OAuth, no token cache, no tenant ID).

| Purpose | Method + path | Notes |
|---|---|---|
| Teams | `GET /get_teams` | → `{ teams: [{ id, name, creation_date }] }` |
| Athletes + all recordings (Jump) | `GET /get_athletes?analysis_type=Jump` | Returns athletes **with nested recordings and metric tables** — one call, no per-test hydration needed. |
| Athletes (Isometric) | `GET /get_athletes?analysis_type=Isometric` | |
| Athletes (Pogo) | `GET /get_athletes?analysis_type=Pogo` | |
| Raw force trace | `GET /get_csv_download_url?path={raw_csv_path}` | Returns `{ download_url }`; we then GET the signed URL and parse CSV. Proxied by `cc-raw-csv` with optional `downsample_factor`. |

Key structural difference vs VALD: **CC has no `/tests` + `/trials` split.** Three `get_athletes` calls return the entire dataset (teams → athletes → recordings → analyses → trials/jumps), values already populated. VALD needs `/tests` (metadata) then `/trials` per test.

### Payload shape
```
teams[]            { id, name, creation_date }
athletes[]         { id, name, team_id, player_info, recordings{} }
player_info        { gender, birth_date, height_cm, weight_kg }
recordings[key]    { date, exercise_name, path_to_raw_csv,
                     jump_analysis[]            // analysis_type=Jump
                     isometric_analysis{trials[]} // analysis_type=Isometric
                     pogo_jump_analysis{avg_metrics, jumps[]} } // analysis_type=Pogo
jump_analysis[i]   { date, sampling_frequency, plot_annotations{jump_type, leg_stance},
                     metric_table{...}, path_to_this_jump_raw_csv }
iso trials[i]      { total_metrics{...}, path_to_raw_csv }
pogo jumps[i]      { jump_height, contact_time, flight_time, rsi, power, ... }
```

### Test-name derivation (CC → `test_data.test_name`)
| Source field | Value | test_name |
|---|---|---|
| `plot_annotations.jump_type` | `CMJ` | `Countermovement Jump` |
| | `SJ` | `Squat Jump` |
| | `DJ` | `Drop Jump` |
| | anything else | `Jump Test` |
| `recording.exercise_name` (isometric) | e.g. `IMTP` | used verbatim (default `Isometric Test`) |
| pogo | — | `Pogo Jump` |

`plot_annotations.leg_stance` (`left_leg` / `right_leg` / else `dual_leg`) drives the **duplicate unilateral row**: a second record is written as `Left Side {testName}` / `Right Side {testName}`. Isometric L/R rows are split from `total_metrics` `*_left` / `*_right` fields. This is why the dropdown has "Left Side …" variants.

---

## 2. Dropdown metric → CC Athletics source field

### Countermovement Jump (and Left/Right Side CMJ)
| Dropdown label | CC key read by charts | CC API source (`metric_table`) |
|---|---|---|
| Jump Height (cm) | `jump_height_ft` → `jump_height` | `metric_table.jump_height_ft` / `jump_height` |
| Peak Power | `peak_power` | `metric_table.peak_power` |
| Relative Peak Power | `peak_power / body_mass` | `peak_power` ÷ `player_info.weight_kg` (injected as `body_mass`) |
| Reactive Strength Index | `rsi` / `avg_rsi` | `metric_table.rsi` |
| Peak Propulsive Power (unilateral) | `peak_propulsive_power`, `avg_propulsive_power` | `metric_table.peak_propulsive_power` |

### Squat Jump (and Left/Right Side SJ)
| Dropdown label | CC key | CC API source |
|---|---|---|
| Jump Height (cm) | `jump_height_ft` | `metric_table.jump_height_ft` |
| Take-off Velocity | `takeoff_velocity`, `peak_velocity` | `metric_table.takeoff_velocity` |
| Average Rate of Force Development | `avg_rfd`, `rate_of_force_development`, `rfd_max` | `metric_table.avg_rfd` |
| Average Propulsive Power | `avg_propulsive_power`, `avg_power` | `metric_table.avg_propulsive_power` |
| Peak Landing Force (unilateral) | `peak_landing_force`, `fp1/fp2_peak_landing_force` | `metric_table.fp1_peak_landing_force` / `fp2_peak_landing_force` |
| Ground Contact Time (s) | `time_to_takeoff`, `contact_time` | `metric_table.time_to_takeoff` |

### Drop Jump (and Left/Right Side DJ)
| Dropdown label | CC key | CC API source |
|---|---|---|
| Jump Height (cm) | `jump_height_ft` | `metric_table.jump_height_ft` |
| Contact Time | `contact_time`, `avg_contact_time` | `metric_table.contact_time` |
| Flight Time | `flight_time`, `avg_flight_time` | `metric_table.flight_time` |
| Reactive Strength Index | `rsi`, `avg_rsi` | `metric_table.rsi` |
| Peak Landing Force | `peak_landing_force`, `fp1/fp2_peak_landing_force` | `metric_table.*_peak_landing_force` |

### Pogo Jump (and Left/Right Side Pogo)
| Dropdown label | CC key | CC API source |
|---|---|---|
| Jump Height (cm) | `avg_jump_height`, `jump_height` | `pogo_jump_analysis.avg_metrics.avg_jump_height` / per-hop `jumps[i].jump_height` |
| Power / Peak Power | `avg_power`, `power`, `peak_power` | `avg_metrics.avg_power` / `jumps[i].power` |
| Contact Time | `avg_contact_time`, `contact_time` | `avg_metrics.avg_contact_time` / `jumps[i].contact_time` |
| Flight Time | `avg_flight_time`, `flight_time` | `avg_metrics.avg_flight_time` / `jumps[i].flight_time` |
| RSI | `avg_rsi`, `rsi` | `avg_metrics.avg_rsi` |
| mRSI | `avg_modified_rsi`, `modified_rsi`, `rsi_modified` | `avg_metrics.avg_modified_rsi` |
| Limb contribution % | `avg_fp1_contribution` / `avg_fp2_contribution` | `avg_metrics.avg_fp1_contribution` / `avg_fp2_contribution` |

Note: CC pogo delivers **both** a session average row (`avg_metrics`) and one row per hop (`jumps[]`) — VALD has no equivalent per-hop breakdown.

### Isometric (IMTP / Iso Squat / Iso Push / Soleus / Gastroc etc.)
Bilateral dropdowns:
| Dropdown label | CC key | CC API source (`trial.total_metrics`) |
|---|---|---|
| Maximum Rate of Force Development | `rfd_max`, `avg_rfd` | `rfd_max` |
| Force at Max Rate of Force Development | `force_150ms` → `force_100ms` → `force_50ms` → `force_peak` | `force_*ms` |
| Peak Force / ISO Peak Force | `peak_force`, `force_peak` | `force_peak` |
| (KPI tiles) Impulse 50ms / 250ms | `impulse_50ms`, `impulse_250ms` | `impulse_50ms`, `impulse_250ms` |

Unilateral (Left/Right Side …) dropdowns:
| Dropdown label | CC key | CC API source |
|---|---|---|
| Early Force Capacity | `force_50ms` | `total_metrics.force_50ms_left` / `_right` |
| Moderate/Late Force Capacity | `force_250ms` | `total_metrics.force_250ms_left` / `_right` |
| Peak Force | `force_peak` | `total_metrics.force_peak_left` / `_right` |
| Stable Force Reading | `steadiness_force_n` | `total_metrics.steadiness_rsme_force × 9.81` (kg → N) |

The full raw isometric analysis is also stored under `metrics.isometric_analysis` on the parent row for trial-level drill-down.

---

## 3. Limb comparison keys (Between-Limb / symmetry UI)

| Test family | Left key | Right key | CC source |
|---|---|---|---|
| CMJ / SJ / jumps | `p1_avg_force`, `fp1_peak_force` | `p2_avg_force`, `fp2_peak_force` | `metric_table.p1_avg_force` / `p2_avg_force` (force-plate 1 = left) |
| Drop Jump | `fp1_peak_landing_force` | `fp2_peak_landing_force` | `metric_table` |
| Isometric | `force_peak_left`, `force_50ms_left`, `force_250ms_left` | `force_peak_right`, `force_50ms_right`, `force_250ms_right` | `trial.total_metrics` |
| Pogo | `avg_fp1_contribution` | `avg_fp2_contribution` | `avg_metrics` |
| Unilateral rows | `leg_stance = 'left_leg'` | `leg_stance = 'right_leg'` | separate `Left/Right Side …` rows |

CC does **not** return an asymmetry index — it is always derived client-side as `(L − R) / max × 100`. VALD does supply `*_Asym` rows, which we prefer when present.

---

## 4. Manual CSV upload (third data source)

Header aliases (`mapRowToMetrics`) normalise headers to the same canonical keys, so CSV, CC API and VALD all land in one shape:

- Jumps: `jump_height`, `rsi`, `rsi_modified`, `contact_time`, `flight_time`, `peak_force`, `peak_power`, `avg_power`, `takeoff_velocity`, `braking_force`, `propulsive_force`, `left/right_contribution`, `left/right_peak_force`
- Isometrics: `force_peak`, `force_{50,100,150,200,250}ms`, `rfd_max`, `rfd_{50,100,150,200}ms`, `impulse_{50..250}ms`, `left_force`, `right_force`
- Balance: `sway`, `stability_score`, `left_balance`, `right_balance`
- Movement: date/rep only (rich metrics come from the movement engine, e.g. `metrics.golf`)

Unknown headers are preserved under `metrics._raw`. `test_type` / `test_subtype` come from `toDbTestType()` (`jump | pogo | isometric | movement | balance`).

---

## 5. CC vs VALD — side-by-side differences that matter

| Aspect | CC Athletics | VALD |
|---|---|---|
| Auth | static `X-API-Key` | OAuth2 client credentials + cached JWT |
| Scoping | API key implies team | `tenantId` + `profileId` required |
| Calls to get values | 3 (`get_athletes` per analysis type) | 2 per test (`/tests` then `/trials`) |
| Metric naming | snake_case fields in `metric_table` / `total_metrics` | UPPER_SNAKE string IDs in `definition.result` |
| Units | already display units (cm, ms, N, W) | `value × resultUnitScaleFactor` |
| Limb encoding | separate rows + `*_left` / `*_right` fields + `leg_stance` | `limb` field: `Trial`/`Both`/`Left`/`Right`/`Asym` |
| Asymmetry | derived only | reported (`*_Asym`) + derived fallback |
| Per-rep data | per-jump / per-hop / per-trial rows | per-trial only |
| Raw trace | `get_csv_download_url` + `raw_csv_path` | not exposed |
| Demographics | `player_info` (gender, birth_date, height_cm, weight_kg) | `/profiles` (sex, dateOfBirth); no height/weight |

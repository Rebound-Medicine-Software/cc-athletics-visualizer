# CC Athletics ⇄ VALD metric map

Sources of truth in code:
- Dropdown options: `src/components/dashboard/filters/filterUtils.ts` (`getMetricTypesForTest`)
- Dropdown → metric key resolution for charts: `src/components/dashboard/chart/useMetricCaseLogic.ts`
- KPI tiles (Performance Insights): `src/components/dashboard/metric-cards/metricCardConfig.ts`
- VALD → CC translation: `src/lib/valdToCCAthletics.ts`
- VALD API calls + metric string IDs: `supabase/functions/vald-bridge/index.ts`

---

## 1. VALD API endpoints actually used

| Purpose | Method + path | Notes |
|---|---|---|
| Auth | `POST https://auth.prd.vald.com/oauth/token` | `client_credentials`, `audience: vald-api-external`. Token cached in `public.vald_token_cache` (shared across isolates). |
| Athletes | `GET {profilesBase}/profiles?tenantId={tenantId}` | Regional host (e.g. `https://prd-euw-api-externalprofile.valdperformance.com`). Fields used: `profileId, givenName, familyName, dateOfBirth, sex, teams[].name, externalId`. |
| Tests (list) | `GET {forcedecksBase}/tests?tenantId=&modifiedFromUtc=&profileId=` | `modifiedFromUtc` is **mandatory** (we default to 10y). Metadata-only — `results` is usually empty. |
| Tests (legacy fallback) | `GET {forcedecksBase}/v2019q3/teams/{tenantId}/tests?athleteId=&modifiedFrom=` | Used if the above fails. |
| Trials (metric values) | `GET {forcedecksBase}/v2019q3/teams/{tenantId}/tests/{testId}/trials` | This is where all real numbers live. `trials[].results[]`. |
| Raw force trace | `POST /get_csv_download_url` (CC API, via `cc-raw-csv`) | Not VALD; used for Pedley phase analysis on CC rows. |

Bridge actions: `?action=athletes | tests | detail | details` (`details` = batched trial fetch for many testIds in one request).

### Result object shape (`trials[].results[]`)
```
{ resultId, value, limb, repeat, definition: { result, name, unit, resultUnitScaleFactor } }
```
- **Display value = `value × definition.resultUnitScaleFactor`**
- `definition.result` = the metric **string ID** (e.g. `JUMP_HEIGHT_IMP_MOM`)
- `limb` ∈ `Trial` | `Both` | `Left` | `Right` | `Asym`
  - Bilateral results come back as **`Trial`** (not `Both`) on ForceDecks — we accept either.
  - `Asym` rows carry VALD's own asymmetry % — preferred over our derived value.

---

## 2. Dropdown metric → CC metric key → VALD metric string ID

### Countermovement Jump (and Left/Right Side CMJ)
| Dropdown label | CC key(s) | VALD result ID(s) | limb |
|---|---|---|---|
| Jump Height (cm) | `jump_height_ft` / `jump_height_cm` | `JUMP_HEIGHT_IMP_MOM`, `JUMP_HEIGHT`, `IMPULSE_JUMP_HEIGHT` | Trial / Left / Right |
| Peak Power | `peak_power` | `PEAK_TAKEOFF_POWER`, `PEAK_PROPULSIVE_POWER` | Trial |
| Relative Peak Power | `peak_power / body_mass` | + `BODY_WEIGHT` / `BODY_MASS` | Trial |
| Reactive Strength Index | `rsi` | `RSI_MODIFIED`, `RSI_MODIFIED_IMP_MOM` | Trial |
| Peak Propulsive Power (unilateral) | `peak_propulsive_power` | `PEAK_PROPULSIVE_POWER` | Left / Right |

### Squat Jump (and Left/Right Side SJ)
| Dropdown label | CC key | VALD result ID(s) | limb |
|---|---|---|---|
| Jump Height (cm) | `jump_height_ft` | `JUMP_HEIGHT_IMP_MOM` | Trial |
| Take-off Velocity | `takeoff_velocity` | `TAKEOFF_VELOCITY`, `PEAK_TAKEOFF_VELOCITY`, `VELOCITY_AT_TAKEOFF` | Trial |
| Average Rate of Force Development | `avg_rfd` | `MEAN_RFD`, `AVG_RFD`, `RFD`, `PEAK_RFD` | Trial |
| Average Propulsive Power | `avg_propulsive_power` | `MEAN_TAKEOFF_POWER`, `AVG_PROPULSIVE_POWER` | Trial |
| Peak Landing Force (unilateral) | `fp1/fp2_peak_landing_force` | `PEAK_LANDING_FORCE` | Left / Right |
| Ground Contact Time (s) | `time_to_takeoff`, `contact_time` | `GROUND_CONTACT_TIME`, `CONTRACTION_TIME` | Trial |

### Drop Jump (and Left/Right Side DJ)
| Dropdown label | CC key | VALD result ID(s) | limb |
|---|---|---|---|
| Jump Height (cm) | `jump_height_ft` | `JUMP_HEIGHT_IMP_MOM` | Trial |
| Contact Time | `contact_time` | `GROUND_CONTACT_TIME`, `CONTRACTION_TIME` | Trial |
| Flight Time | `flight_time` | `FLIGHT_TIME` | Trial |
| Reactive Strength Index | `rsi` | `RSI`, `REACTIVE_STRENGTH_INDEX`, then `RSI_MODIFIED` | Trial |
| Peak Landing Force | `peak_landing_force`, `fp1/fp2_peak_landing_force` | `PEAK_LANDING_FORCE` | Trial / Left / Right |

### Pogo Jump (and Left/Right Side Pogo)
| Dropdown label | CC key(s) | VALD result ID(s) | limb |
|---|---|---|---|
| Jump Height (cm) | `avg_jump_height`, `jump_height` | `JUMP_HEIGHT_IMP_MOM` | Trial |
| Power / Peak Power | `avg_power`, `power` | `PEAK_PROPULSIVE_POWER`, `PEAK_TAKEOFF_POWER` | Trial |
| Contact Time | `avg_contact_time`, `contact_time` | `GROUND_CONTACT_TIME` | Trial |
| Flight Time | `avg_flight_time`, `flight_time` | `FLIGHT_TIME` | Trial |
| RSI | `avg_rsi`, `rsi` | `RSI_MODIFIED` → `RSI` | Trial |
| mRSI | `avg_modified_rsi`, `modified_rsi` | `RSI_MODIFIED`, `RSI_MODIFIED_IMP_MOM` | Trial |
| Limb contribution % | `avg_fp1_contribution` / `avg_fp2_contribution` | derived from `PEAK_VERTICAL_FORCE` / `PEAK_FORCE` / `MEAN_FORCE` | Left / Right |

### Isometric (IMTP / MVC / Soleus / Gastroc / Copenhagen / Adductor)
Bilateral dropdowns:
| Dropdown label | CC key | VALD result ID(s) |
|---|---|---|
| Maximum Rate of Force Development | `rfd_max` | `PEAK_RFD`, `RFD_MAX`, `MAX_RFD` |
| Force at Max Rate of Force Development | `force_at_max_rfd` (falls back to `force_150/100/50ms`) | `FORCE_AT_MAX_RFD` |
| Peak Force / ISO Peak Force | `force_peak`, `peak_force` | `PEAK_FORCE`, `PEAK_VERTICAL_FORCE`, `STABLE_FORCE_READING` |

Unilateral (Left/Right Side …) dropdowns:
| Dropdown label | CC key | VALD result ID(s) | limb |
|---|---|---|---|
| Early Force Capacity | `force_50ms` | `FORCE_AT_50MS`, `FORCE_50MS`, `EARLY_FORCE_CAPACITY` | Left / Right |
| Moderate/Late Force Capacity | `force_250ms` | `FORCE_AT_250MS`, `FORCE_250MS`, `MODERATE_LATE_FORCE` | Left / Right |
| Peak Force | `force_peak_left` / `force_peak_right` | `PEAK_FORCE`, `PEAK_VERTICAL_FORCE` | Left / Right |
| Stable Force Reading | `steadiness_force` | `STABLE_FORCE_READING`, `MEAN_FORCE` | Left / Right |

Also mapped for the report/PDF path: `RFD_AT_{50,100,150,200,250}MS`, `IMPULSE_AT_{50,100,150,200,250}MS`, `FORCE_AT_{100,150,200}MS`.

---

## 3. Limb comparison keys (Between-Limb / symmetry UI)

| Test family | Left key | Right key | VALD source |
|---|---|---|---|
| CMJ / SJ / other jumps | `p1_avg_force`, `fp1_peak_force`, `jump_height_left_cm` | `p2_avg_force`, `fp2_peak_force`, `jump_height_right_cm` | `PEAK_TAKEOFF_FORCE` / `MEAN_TAKEOFF_FORCE`, else `JUMP_HEIGHT_*` |
| Drop Jump | `fp1_peak_landing_force` | `fp2_peak_landing_force` | `PEAK_LANDING_FORCE` Left/Right |
| Isometric | `force_peak_left`, `force_250ms_left` | `force_peak_right`, `force_250ms_right` | `PEAK_FORCE` / `FORCE_AT_250MS` Left/Right |
| Pogo | `avg_fp1_contribution` | `avg_fp2_contribution` | derived from Left/Right `PEAK_VERTICAL_FORCE` |
| Asymmetry % | `asymmetry_index` | — | `*_Asym` rows (`JUMP_HEIGHT_*`, `PEAK_TAKEOFF_FORCE`, `ASYM_INDEX`), else derived `(L−R)/max×100` |

Dominance rule: |asym| < 2% → `Balanced`, positive → Left dominant.

---

## 4. Unit flavours (important when comparing outputs)

| Metric | Dashboard flavour | Report/PDF flavour |
|---|---|---|
| Jump height | `jump_height_ft` in ft + `jump_height_cm` in cm | metres (edge fn ×100) |
| Contact / flight time | milliseconds | seconds (edge fn ×1000) |
| Forces / power | N / W (as VALD returns after scale factor) | same |

## 5. Known gaps to verify against live `/trials` payloads
- `FORCE_AT_*MS` / `IMPULSE_AT_*MS` IDs are candidate lists; ForceDecks may only expose a subset per test type.
- `TAKEOFF_VELOCITY` and `MEAN_RFD` naming needs confirmation for SJ.
- Pogo tests may report per-hop arrays rather than single averages; current mapping treats them as single values.
- Unilateral CMJ/SJ/DJ ("Left Side …") depend on VALD `testType` naming; `classifyTestType`/`mapTestName` currently key off substrings only.

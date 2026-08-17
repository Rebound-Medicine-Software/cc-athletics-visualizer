# NEXUS HUB — Canonical Metric Provider Map

**Version:** 1.0  
**Repository:** `Rebound-Medicine-Software/cc-athletics-visualizer`  
**Status:** Living document — VALD columns require live `/resultdefinitions` + `/trials` verification  

---

## 1. Architecture

```
                    NEXUS CANONICAL METRIC
                             |
              +--------------+--------------+
              |                             |
       CC Athletics                         VALD
       Provider Map                     Provider Map
              |                             |
       CC field/path                   VALD definition.result
       (metric_table,                  + limb resolution
        avg_metrics, etc.)             + scale factor
              |                             |
              +--------------+--------------+
                             |
                    Canonical NEXUS value
                     (canonical metric key,
                      canonical unit)
                             |
                 +-----------+-----------+
                 |           |           |
               Both        Left        Right
                                         |
                                     Asymmetry
```

**Rule:** The NEXUS canonical metric key and dropdown label are the CC Athletics definitions.  
VALD is mapped underneath. Dropdowns are never renamed to VALD terminology.

---

## 2. Resolution types

| Type | Meaning |
|---|---|
| `DIRECT` | Exact semantic equivalent, VALD result ID confirmed |
| `FALLBACK` | Valid alternate result ID for same canonical metric |
| `DERIVED` | Calculated from other results (e.g. relative power = power ÷ body mass) |
| `NO_EQUIVALENT` | Provider does not expose a sufficiently equivalent metric |
| `NEEDS_LIVE_VERIFICATION` | Candidate identified but must be checked against actual VALD trials + resultdefinitions |
| `CC_ONLY` | Metric exists in CC Athletics; VALD has no equivalent |

---

## 3. Limb resolution

| Canonical Limb | CC Representation | VALD `limb` values accepted |
|---|---|---|
| `Both` | `metric_table.*` bilateral fields | `Both` **OR** `Trial` |
| `Left` | `p1_*`, `fp1_*`, `*_left` | `Left` |
| `Right` | `p2_*`, `fp2_*`, `*_right` | `Right` |
| `Asym` | Derived: `(L-R)/max(L,R)×100` | `Asym` (prefer native); derive as fallback |

> `Trial` in VALD means bilateral/default for single-rep bilateral tests.  
> Do not assume every bilateral result is encoded as `Both`. Accept both.

---

## 4. Unit normalization

| Canonical Unit | CC native | VALD native | Conversion required |
|---|---|---|---|
| cm | ft (stored as `jump_height_ft`) → display as cm | cm (resultUnit=Centimeter, scaleFactor=1) | CC: ft×30.48=cm; VALD: value×scaleFactor |
| W | W | W | None |
| N | N | N | None |
| N/s | N/s | N/s | None |
| N·s | N·s | N·s | None |
| m/s | m/s | m/s | None |
| ms | ms | s or ms — **NEEDS_LIVE_VERIFICATION** | If VALD=s: ×1000 |
| unitless | — | — | None |

> **CC jump height:** stored in `jump_height_ft` (feet) but displayed in cm. Always convert to cm before writing to canonical.  
> **VALD jump height:** resultUnit=Centimeter, scaleFactor=1 → already in cm.  
> **Time fields:** the canonical NEXUS unit for contact_time, flight_time is **ms** (confirmed from metricCardConfig.ts). VALD `resultUnit` for these fields must be checked in live resultdefinitions.

---

## 5. Asymmetry rule

```
1. If VALD provides a metric-specific Asym result:
       use VALD Asym (limb='Asym')

2. Else if Left and Right exist for the same canonical metric:
       derive: (L - R) / max(L, R) × 100   [CC convention]

3. Else:
       asymmetry = null
```

---

## 6. CMJ mapping table

| Dropdown / Canonical Name | Canonical Key | CC Field | CC Limb | VALD Result ID | VALD Limb | Unit | Conversion | Resolution | Status |
|---|---|---|---|---|---|---|---|---|---|
| Jump Height (cm) | `jump_height` | `jump_height_ft` | Both | `JUMP_HEIGHT_IMP_MOM` | Both/Trial | cm | CC: ft×30.48; VALD: ×scaleFactor | DIRECT | NEEDS_LIVE_VERIFICATION |
| Jump Height (cm) | `jump_height` | `jump_height_ft` | Both | `JUMP_HEIGHT` | Both/Trial | cm | Same | FALLBACK | DIRECT (confirmed in docs) |
| Jump Height (cm) | `jump_height` | `jump_height_ft` | Both | `IMPULSE_JUMP_HEIGHT` | Both/Trial | cm | Same | FALLBACK | NEEDS_LIVE_VERIFICATION |
| Jump Height Left | `jump_height_left` | `jump_height_ft` (leg_stance=Left) | Left | `JUMP_HEIGHT_IMP_MOM` | Left | cm | Same | DIRECT | NEEDS_LIVE_VERIFICATION |
| Jump Height Right | `jump_height_right` | `jump_height_ft` (leg_stance=Right) | Right | `JUMP_HEIGHT_IMP_MOM` | Right | cm | Same | DIRECT | NEEDS_LIVE_VERIFICATION |
| Peak Power | `peak_power` | `peak_power` | Both | `PEAK_TAKEOFF_POWER` | Both/Trial | W | None | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| Peak Power | `peak_power` | `peak_power` | Both | `PEAK_PROPULSIVE_POWER` | Both/Trial | W | None | FALLBACK | NEEDS_LIVE_VERIFICATION |
| Relative Peak Power | `relative_peak_power` | `peak_power / body_mass` | Both | DERIVED | — | W/kg | peak_power ÷ body_mass | DERIVED | NEEDS_LIVE_VERIFICATION |
| Body Mass | `body_mass` | `player_info.weight_kg` | — | `BODY_WEIGHT` | Both/Trial | kg | None | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| Body Mass | `body_mass` | `player_info.weight_kg` | — | `BODY_MASS` | Both/Trial | kg | None | FALLBACK | NEEDS_LIVE_VERIFICATION |
| Reactive Strength Index | `rsi` | `rsi` | Both | `RSI_MODIFIED` | Both/Trial | — | None | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| Reactive Strength Index | `rsi_modified` | `rsi_modified` | Both | `RSI_MODIFIED_IMP_MOM` | Both/Trial | — | None | FALLBACK | NEEDS_LIVE_VERIFICATION |
| Peak Propulsive Power | `peak_propulsive_power` | `peak_propulsive_power` | Both | `PEAK_PROPULSIVE_POWER` | Both/Trial | W | None | DIRECT | NEEDS_LIVE_VERIFICATION |
| Peak Propulsive Power Left | `peak_propulsive_power_left` | — | Left | `PEAK_PROPULSIVE_POWER` | Left | W | None | DIRECT | NEEDS_LIVE_VERIFICATION |
| Peak Propulsive Power Right | `peak_propulsive_power_right` | — | Right | `PEAK_PROPULSIVE_POWER` | Right | W | None | DIRECT | NEEDS_LIVE_VERIFICATION |
| Average Propulsive Power | `avg_propulsive_power` | `avg_propulsive_power` | Both | `AVG_PROPULSIVE_POWER` | Both/Trial | W | None | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| Braking Force | `braking_force` | `braking_force` | Both | `AVG_BRAKING_FORCE` | Both/Trial | N | None | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| Propulsive Force | `propulsive_force` | `propulsive_force` | Both | `AVG_PROPULSIVE_FORCE` | Both/Trial | N | None | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| Braking Power | `braking_power` | — | Both | `AVG_BRAKING_POWER` | Both/Trial | W | None | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| Net Impulse | `net_impulse` | — | Both | `NET_IMPULSE` | Both/Trial | N·s | None | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| Braking Duration | `braking_duration` | — | Both | `BRAKING_DURATION` | Both/Trial | ms | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| Take-off Velocity | `takeoff_velocity` | `takeoff_velocity` | Both | `TAKEOFF_VELOCITY` | Both/Trial | m/s | None | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| Jump Height Asymmetry | `cmj_asym` | derived | Asym | `JUMP_HEIGHT_IMP_MOM` | Asym | % | Native or derive | DIRECT/DERIVED | NEEDS_LIVE_VERIFICATION |

---

## 7. Squat Jump mapping table

| Dropdown / Canonical Name | Canonical Key | CC Field | VALD Result ID | Unit | Status |
|---|---|---|---|---|---|
| Jump Height (cm) | `jump_height` | `jump_height_ft` | `JUMP_HEIGHT_IMP_MOM` → `JUMP_HEIGHT` | cm | NEEDS_LIVE_VERIFICATION |
| Take-off Velocity | `takeoff_velocity` | `takeoff_velocity` | `TAKEOFF_VELOCITY` | m/s | NEEDS_LIVE_VERIFICATION |
| Average Rate of Force Development | `avg_rfd` | `avg_rfd` | `MEAN_RFD` / `AVG_RFD` candidate | N/s | NEEDS_LIVE_VERIFICATION |
| Average Propulsive Power | `avg_propulsive_power` | `avg_propulsive_power` | `AVG_PROPULSIVE_POWER` | W | NEEDS_LIVE_VERIFICATION |
| Peak Landing Force | `peak_landing_force` | `fp1_peak_landing_force` / `fp2_peak_landing_force` | `PEAK_LANDING_FORCE` | N | NEEDS_LIVE_VERIFICATION |
| Ground Contact Time | `contact_time` | `time_to_takeoff` / `contact_time` | `GROUND_CONTACT_TIME` / `CONTRACTION_TIME` | ms | NEEDS_LIVE_VERIFICATION |

---

## 8. Drop Jump mapping table

| Dropdown / Canonical Name | Canonical Key | CC Field | VALD Result ID | Unit | Status |
|---|---|---|---|---|---|
| Jump Height (cm) | `jump_height` | `jump_height_ft` | `JUMP_HEIGHT_IMP_MOM` → `JUMP_HEIGHT` | cm | NEEDS_LIVE_VERIFICATION |
| Contact Time | `contact_time` | `contact_time` | `GROUND_CONTACT_TIME` / `CONTRACTION_TIME` | ms | NEEDS_LIVE_VERIFICATION |
| Flight Time | `flight_time` | `flight_time` | `FLIGHT_TIME` | ms | NEEDS_LIVE_VERIFICATION |
| Reactive Strength Index | `rsi` | `rsi` | `RSI` / `REACTIVE_STRENGTH_INDEX` | — | NEEDS_LIVE_VERIFICATION |
| Peak Landing Force | `peak_landing_force` | `*_peak_landing_force` | `PEAK_LANDING_FORCE` | N | NEEDS_LIVE_VERIFICATION |
| Jump Height Left | `jump_height_left` | left leg_stance row | `JUMP_HEIGHT` / `JUMP_HEIGHT_IMP_MOM` | cm | NEEDS_LIVE_VERIFICATION |
| Jump Height Right | `jump_height_right` | right leg_stance row | `JUMP_HEIGHT` / `JUMP_HEIGHT_IMP_MOM` | cm | NEEDS_LIVE_VERIFICATION |

---

## 9. Pogo Jump mapping table

| Dropdown / Canonical Name | Canonical Key | CC Field | VALD Result ID | Unit | Resolution | Status |
|---|---|---|---|---|---|---|
| Jump Height (cm) | `avg_jump_height` | `avg_metrics.avg_jump_height` | `JUMP_HEIGHT` | cm | DIRECT | NEEDS_LIVE_VERIFICATION |
| Power | `avg_power` | `avg_metrics.avg_power` | `MEAN_POWER` / `AVG_POWER` | W | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| Contact Time | `avg_contact_time` | `avg_metrics.avg_contact_time` | `MEAN_CONTACT_TIME` / `GROUND_CONTACT_TIME` | ms | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| Flight Time | `avg_flight_time` | `avg_metrics.avg_flight_time` | `MEAN_FLIGHT_TIME` / `FLIGHT_TIME` | ms | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| RSI | `avg_rsi` | `avg_metrics.avg_rsi` | `RSI` / `RSI_MODIFIED` | — | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| mRSI | `avg_modified_rsi` | `avg_metrics.avg_modified_rsi` | `RSI_MODIFIED` / `MODIFIED_RSI` | m/s | NEEDS_LIVE_VERIFICATION | NEEDS_LIVE_VERIFICATION |
| Limb Contribution % Left | `avg_fp1_contribution` | `avg_metrics.avg_fp1_contribution` | — | % | NO_EQUIVALENT | NO_EQUIVALENT |
| Limb Contribution % Right | `avg_fp2_contribution` | `avg_metrics.avg_fp2_contribution` | — | % | NO_EQUIVALENT | NO_EQUIVALENT |
| Per-hop data | `jumps[]` | `pogo_jump_analysis.jumps[]` | — | — | NO_EQUIVALENT | NO_EQUIVALENT (session avg only) |

---

## 10. Isometric mapping table

### Bilateral

| Dropdown / Canonical Name | Canonical Key | CC Field | VALD Result ID | Unit | Status |
|---|---|---|---|---|---|
| Peak Force / ISO Peak Force | `force_peak` | `force_peak` / `peak_force` | `PEAK_FORCE` | N | NEEDS_LIVE_VERIFICATION |
| Maximum Rate of Force Development | `rfd_max` | `rfd_max` | `MAX_RFD` / `PEAK_RFD` | N/s | NEEDS_LIVE_VERIFICATION |
| Force at Max RFD | `force_150ms` | `force_150ms` / `force_100ms` / `force_50ms` | `FORCE_AT_150MS` / `FORCE_150MS` | N | NEEDS_LIVE_VERIFICATION |
| Impulse 50ms | `impulse_50ms` | `impulse_50ms` | `IMPULSE_AT_50MS` / `IMPULSE_50MS` | N·s | NEEDS_LIVE_VERIFICATION |
| Impulse 250ms | `impulse_250ms` | `impulse_250ms` | `IMPULSE_AT_250MS` / `IMPULSE_250MS` | N·s | NEEDS_LIVE_VERIFICATION |
| Force at 50ms | `force_50ms` | `force_50ms` | `FORCE_AT_50MS` / `FORCE_50MS` | N | NEEDS_LIVE_VERIFICATION |
| Force at 100ms | `force_100ms` | `force_100ms` | `FORCE_AT_100MS` / `FORCE_100MS` | N | NEEDS_LIVE_VERIFICATION |
| Force at 150ms | `force_150ms` | `force_150ms` | `FORCE_AT_150MS` / `FORCE_150MS` | N | NEEDS_LIVE_VERIFICATION |
| Force at 200ms | `force_200ms` | `force_200ms` | `FORCE_AT_200MS` / `FORCE_200MS` | N | NEEDS_LIVE_VERIFICATION |
| Force at 250ms | `force_250ms` | `force_250ms` | `FORCE_AT_250MS` / `FORCE_250MS` | N | NEEDS_LIVE_VERIFICATION |
| RFD at 50ms | `rfd_50ms` | `rfd_50ms` | `RFD_AT_50MS` / `RFD_50MS` | N/s | NEEDS_LIVE_VERIFICATION |
| RFD at 100ms | `rfd_100ms` | `rfd_100ms` | `RFD_AT_100MS` / `RFD_100MS` | N/s | NEEDS_LIVE_VERIFICATION |
| Impulse at 100ms | `impulse_100ms` | `impulse_100ms` | `IMPULSE_AT_100MS` / `IMPULSE_100MS` | N·s | NEEDS_LIVE_VERIFICATION |
| Impulse at 150ms | `impulse_150ms` | `impulse_150ms` | `IMPULSE_AT_150MS` / `IMPULSE_150MS` | N·s | NEEDS_LIVE_VERIFICATION |
| Impulse at 200ms | `impulse_200ms` | `impulse_200ms` | `IMPULSE_AT_200MS` / `IMPULSE_200MS` | N·s | NEEDS_LIVE_VERIFICATION |

### Unilateral (Left/Right Side tests)

| Dropdown / Canonical Name | Canonical Key | CC Field | VALD Result ID | VALD Limb | Unit | Status |
|---|---|---|---|---|---|---|
| Early Force Capacity | `force_50ms` | `force_50ms_left` / `force_50ms_right` | `FORCE_AT_50MS` / `FORCE_50MS` | Left / Right | N | NEEDS_LIVE_VERIFICATION |
| Moderate/Late Force Capacity | `force_250ms` | `force_250ms_left` / `force_250ms_right` | `FORCE_AT_250MS` / `FORCE_250MS` | Left / Right | N | NEEDS_LIVE_VERIFICATION |
| Peak Force | `force_peak` | `force_peak_left` / `force_peak_right` | `PEAK_FORCE` | Left / Right | N | NEEDS_LIVE_VERIFICATION |
| Stable Force Reading | `steadiness_force_n` | `steadiness_rsme_force × 9.81` | — | — | N | NO_EQUIVALENT |

---

## 11. CC_ONLY metrics (no VALD equivalent)

| Canonical Name | CC Field | Reason |
|---|---|---|
| Limb Contribution % (Pogo) | `avg_fp1_contribution` / `avg_fp2_contribution` | VALD does not expose bilateral contribution % in ForceDecks trials |
| Per-hop Pogo data | `pogo_jump_analysis.jumps[]` | VALD returns session-level summary, not per-hop breakdown |
| Stable Force Reading | `steadiness_rsme_force × 9.81` | CC-specific metric from isometric steadiness analysis |

---

## 12. Fallback hierarchy for jump height

```
1. JUMP_HEIGHT_IMP_MOM  (impulse-momentum method)
2. JUMP_HEIGHT          (flight-time method — confirmed in VALD resultdefinitions docs)
3. IMPULSE_JUMP_HEIGHT  (candidate)
4. null
```

Record which source was used in `metricProvenance`.

---

## 13. Canonical output object

```typescript
{
  source: "VALD" | "CC_ATHLETICS",
  testId: string,
  athleteId: string,
  testType: string,            // canonical: "Countermovement Jump", "Drop Jump", etc.
  testDate: string,            // ISO date
  trialCount: number,
  limb: string,

  metrics: {
    // Jump (CMJ / SJ / DJ)
    jump_height?: number,      // cm — canonical display unit
    jump_height_left?: number, // cm
    jump_height_right?: number,// cm
    peak_power?: number,       // W
    relative_peak_power?: number, // W/kg (DERIVED)
    body_mass?: number,        // kg
    rsi?: number,
    rsi_modified?: number,
    peak_propulsive_power?: number, // W
    avg_propulsive_power?: number,  // W
    braking_force?: number,    // N
    propulsive_force?: number, // N
    braking_power?: number,    // W
    net_impulse?: number,      // N·s
    braking_duration?: number, // ms
    takeoff_velocity?: number, // m/s
    peak_landing_force?: number, // N
    contact_time?: number,     // ms
    flight_time?: number,      // ms
    avg_rfd?: number,          // N/s
    cmj_asym?: number,         // %

    // Pogo
    avg_jump_height?: number,  // cm
    avg_power?: number,        // W
    avg_contact_time?: number, // ms
    avg_flight_time?: number,  // ms
    avg_rsi?: number,
    avg_modified_rsi?: number,

    // Isometric
    force_peak?: number,       // N
    rfd_max?: number,          // N/s
    force_50ms?: number,       // N
    force_100ms?: number,      // N
    force_150ms?: number,      // N
    force_200ms?: number,      // N
    force_250ms?: number,      // N
    rfd_50ms?: number,         // N/s
    rfd_100ms?: number,        // N/s
    impulse_50ms?: number,     // N·s
    impulse_100ms?: number,    // N·s
    impulse_150ms?: number,    // N·s
    impulse_200ms?: number,    // N·s
    impulse_250ms?: number,    // N·s
  },

  raw: {
    providerPayload: unknown,  // full original provider response
  },

  metricProvenance: {
    [canonicalKey: string]: {
      provider: "VALD" | "CC_ATHLETICS",
      sourceField: string,      // e.g. "JUMP_HEIGHT_IMP_MOM" or "metric_table.jump_height_ft"
      resultId?: string,        // VALD result ID string
      limb?: string,            // VALD limb value used
      unit: string,             // unit after scale factor
      scaleFactor?: number,     // VALD resultUnitScaleFactor applied
      resolutionType: "DIRECT" | "FALLBACK" | "DERIVED" | "NO_EQUIVALENT" | "NEEDS_LIVE_VERIFICATION",
      status: "CONFIRMED" | "NEEDS_LIVE_VERIFICATION" | "NO_EQUIVALENT",
    }
  }
}
```

---

## 14. Required live verification procedure

For every VALD result ID marked `NEEDS_LIVE_VERIFICATION`:

1. Call `GET /resultdefinitions` on the ForceDecks API for the tenant
2. Locate the result by `resultIdString` (= the result ID candidate)
3. Record: `resultIdString`, `resultName`, `resultUnit`, `resultUnitScaleFactor`
4. Call `GET /v2019q3/teams/{tenantId}/tests/{testId}/trials` for a known CMJ, DJ, SJ, Pogo, Isometric test
5. Inspect actual `definition.result` values in the response
6. Confirm or reject each candidate
7. Update status from `NEEDS_LIVE_VERIFICATION` to `DIRECT`, `FALLBACK`, or `NO_EQUIVALENT`

---

## 15. VALD result ID verification gaps (as at implementation)

All VALD result IDs below are candidates requiring live verification except `JUMP_HEIGHT` which is confirmed in VALD's own documentation example.

| Category | Result ID | Status |
|---|---|---|
| Jump | `JUMP_HEIGHT` | CONFIRMED (VALD docs example) |
| Jump | `JUMP_HEIGHT_IMP_MOM` | NEEDS_LIVE_VERIFICATION |
| Jump | `PEAK_TAKEOFF_POWER` | NEEDS_LIVE_VERIFICATION |
| Jump | `PEAK_PROPULSIVE_POWER` | NEEDS_LIVE_VERIFICATION |
| Jump | `RSI_MODIFIED` | NEEDS_LIVE_VERIFICATION |
| Jump | `TAKEOFF_VELOCITY` | NEEDS_LIVE_VERIFICATION |
| Jump | `AVG_BRAKING_FORCE` | NEEDS_LIVE_VERIFICATION |
| Jump | `AVG_PROPULSIVE_FORCE` | NEEDS_LIVE_VERIFICATION |
| Jump | `NET_IMPULSE` | NEEDS_LIVE_VERIFICATION |
| Jump | `BRAKING_DURATION` | NEEDS_LIVE_VERIFICATION |
| Jump | `PEAK_LANDING_FORCE` | NEEDS_LIVE_VERIFICATION |
| Jump | `GROUND_CONTACT_TIME` | NEEDS_LIVE_VERIFICATION |
| Jump | `FLIGHT_TIME` | NEEDS_LIVE_VERIFICATION |
| Pogo | All Pogo result IDs | NEEDS_LIVE_VERIFICATION |
| Isometric | `PEAK_FORCE` | NEEDS_LIVE_VERIFICATION |
| Isometric | `FORCE_AT_*MS` / `FORCE_*MS` variants | NEEDS_LIVE_VERIFICATION |
| Isometric | `RFD_AT_*MS` / `RFD_*MS` variants | NEEDS_LIVE_VERIFICATION |
| Isometric | `IMPULSE_AT_*MS` / `IMPULSE_*MS` variants | NEEDS_LIVE_VERIFICATION |


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1'
import { logActivity } from '../_shared/logActivity.ts'
import { getServiceRoleKey } from '../_shared/supabaseAdmin.ts'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestMetrics {
    [key: string]: any;
}

interface TestRecord {
    test_name: string;
    test_date: string;
    metrics: TestMetrics;
    repetition_number?: number;
    leg_stance?: string;
}

interface GroupedTest {
    testName: string;
    records: TestRecord[];
    latestDate: string;
    latestMetrics: TestMetrics;
    previousValues: { date: string; metrics: TestMetrics }[];
    baseline: TestMetrics | null;
    personalRecord: TestMetrics | null;
}

interface CardConfig {
    icon: string;
    title: string;
    metricKey: string;
    keyOverride?: string;
    fallbackKeys?: string[];
    unit: string;
}

// Get metric card configurations matching dashboard's metricCardConfig.ts
function getCardConfigs(testName: string): CardConfig[] {
    switch (testName) {
      case "Countermovement Jump":
              return [
                { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
                { icon: "⚡", title: "Peak Power", metricKey: "peak_power", unit: "W" },
{ icon: "⚡", title: "Peak Power / Body Mass", metricKey: "relative_peak_power", unit: "W/kg" },
                 { icon: "⚡", title: "Reactive Strength Index", metricKey: "rsi", unit: "" },
                      ];
                case "Squat Jump":
                       return [
                         { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
                         { icon: "⚡", title: "Take-off Velocity", metricKey: "takeoff_velocity", unit: "m/s" },
                 { icon: "⚡", title: "Avg Rate of Force Dev.", metricKey: "avg_rfd", unit: "N/s" },
{ icon: "⚡", title: "Avg Propulsive Power", metricKey: "avg_propulsive_power", unit: "W" },
                        ];
      case "Drop Jump":
        return [
  { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
  { icon: "⏱️", title: "Flight Time", metricKey: "flight_time", unit: "ms" },
          { icon: "⚡", title: "Reactive Strength Index", metricKey: "rsi", unit: "" },
{ icon: "⏱️", title: "Contact Time", metricKey: "contact_time", unit: "ms" },
                               ];
  case "Pogo Jump":
           return [
                { icon: "📏", title: "Jump Height (cm)", metricKey: "avg_jump_height", keyOverride: "avg_jump_height_cm", unit: "cm" },
                         { icon: "⚡", title: "RSI", metricKey: "avg_rsi", fallbackKeys: ["rsi"], unit: "" },
                         { icon: "⚡", title: "mRSI", metricKey: "avg_modified_rsi", fallbackKeys: ["modified_rsi", "rsi_modified"], unit: "m/s" },
  { icon: "⚡", title: "Power", metricKey: "avg_power", fallbackKeys: ["power", "avg_pogo_power"], unit: "W" },
                { icon: "⏱️", title: "Contact Time", metricKey: "avg_contact_time", fallbackKeys: ["contact_time"], unit: "ms" },
                         { icon: "⏱️", title: "Flight Time", metricKey: "avg_flight_time", fallbackKeys: ["flight_time"], unit: "ms" },
      ];
                  case "Left Side Countermovement Jump":
                case "Right Side Countermovement Jump":
                                return [
{ icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
{ icon: "⚡", title: "Peak Propulsive Power", metricKey: "peak_propulsive_power", unit: "W" },
                                  { icon: "⚡", title: "Relative Peak Power", metricKey: "relative_peak_power", unit: "W/kg" },
                                  { icon: "⚡", title: "Reactive Strength Index", metricKey: "rsi", unit: "" },
                                        ];
      case "Left Side Squat Jump":
      case "Right Side Squat Jump":
              return [
                { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
                { icon: "⚡", title: "Peak Landing Force", metricKey: "peak_landing_force", unit: "N" },
                { icon: "⏱️", title: "Ground Contact Time", metricKey: "time_to_takeoff", unit: "s" },
                { icon: "⚡", title: "Reactive Strength Index", metricKey: "rsi", unit: "" },
                      ];
      case "Left Side Drop Jump":
      case "Right Side Drop Jump":
              return [
                { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
                { icon: "⚡", title: "Peak Landing Force", metricKey: "peak_landing_force", unit: "N" },
                { icon: "⏱️", title: "Ground Contact Time", metricKey: "time_to_takeoff", unit: "s" },
                { icon: "⚡", title: "Reactive Strength Index", metricKey: "rsi", unit: "" },
                      ];
      case "Left Side Pogo Jump":
      case "Right Side Pogo Jump":
              return [
                { icon: "📏", title: "Jump Height (cm)", metricKey: "avg_jump_height", keyOverride: "avg_jump_height_cm", unit: "cm" },
                { icon: "⚡", title: "RSI", metricKey: "avg_rsi", fallbackKeys: ["rsi"], unit: "" },
                { icon: "⚡", title: "Power", metricKey: "avg_power", fallbackKeys: ["power", "avg_pogo_power"], unit: "W" },
                { icon: "⏱️", title: "Contact Time", metricKey: "avg_contact_time", fallbackKeys: ["contact_time"], unit: "ms" },
                      ];
            // VALD's Single Leg Jump / Single Leg Drop Jump arrive as ONE combined
      // record (valdToCCAthletics.ts never splits them into "Left Side X" /
      // "Right Side X" pairs - that split only happens for isometric tests
      // that carry a stance field), so these cases are what the report
      // generator actually renders for VALD unilateral jump tests, not a
      // fallback. Limb symmetry for them comes from calculateLimbSymmetry's
      // p1_avg_force / jump_height_left_cm fields on that combined record.
      case "Single Leg Jump":
      case "Left Side Single Leg Jump":
      case "Right Side Single Leg Jump":
              return [
                { icon: "J", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
                { icon: "J", title: "RSI (m/s)", metricKey: "rsi", unit: "" },
                { icon: "J", title: "Contact Time", metricKey: "contact_time", unit: "ms" },
                { icon: "J", title: "Flight Time", metricKey: "flight_time", unit: "ms" },
                      ];
      case "Single Leg Drop Jump":
      case "Left Side Single Leg Drop Jump":
      case "Right Side Single Leg Drop Jump":
              return [
                { icon: "J", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
                { icon: "J", title: "RSI (m/s)", metricKey: "rsi", unit: "" },
                { icon: "J", title: "Contact Time", metricKey: "contact_time", unit: "ms" },
                { icon: "J", title: "Flight Time", metricKey: "flight_time", unit: "ms" },
                      ];
      case "Hop Test":
              return [
                { icon: "H", title: "RSI (m/s)", metricKey: "avg_rsi", fallbackKeys: ["rsi"], unit: "" },
                { icon: "H", title: "Contact Time", metricKey: "avg_contact_time", fallbackKeys: ["contact_time"], unit: "ms" },
                { icon: "H", title: "Flight Time", metricKey: "avg_flight_time", fallbackKeys: ["flight_time"], unit: "ms" },
                { icon: "H", title: "Jump Height (cm)", metricKey: "avg_jump_height", keyOverride: "avg_jump_height_cm", unit: "cm" },
                       ];
                case "Single Leg Hop Test":
              return [
                { icon: "H", title: "RSI (m/s)", metricKey: "avg_rsi", fallbackKeys: ["rsi"], unit: "" },
                { icon: "H", title: "Contact Time", metricKey: "avg_contact_time", fallbackKeys: ["contact_time"], unit: "ms" },
                { icon: "H", title: "Flight Time", metricKey: "avg_flight_time", fallbackKeys: ["flight_time"], unit: "ms" },
                { icon: "H", title: "Jump Height (cm)", metricKey: "avg_jump_height", keyOverride: "avg_jump_height_cm", unit: "cm" },
                      ];
      case "Shoulder ISO-Y":
              return [
                { icon: "I", title: "Peak Force", metricKey: "force_peak", fallbackKeys: ["peak_vertical_force"], unit: "N" },
                { icon: "I", title: "RFD Max", metricKey: "rfd_max", fallbackKeys: ["rfd_at_150ms"], unit: "N/s" },
                { icon: "I", title: "Force @ 50ms", metricKey: "force_50ms", fallbackKeys: ["force_at_50ms"], unit: "N" },
                { icon: "I", title: "Force @ 200ms", metricKey: "force_200ms", fallbackKeys: ["force_at_200ms"], unit: "N" },
                      ];
      default:
              // Check for Left/Right Side isometric tests
        if (testName.startsWith('Left Side') || testName.startsWith('Right Side')) {
                  return [
                    { icon: "⚡", title: "Early Force Capacity (50ms)", metricKey: "force_50ms", unit: "N" },
                    { icon: "⚡", title: "Moderate/Late Force (250ms)", metricKey: "force_250ms", unit: "N" },
                    { icon: "⚡", title: "Peak Force", metricKey: "force_peak", unit: "N" },
                    { icon: "📊", title: "Stable Force Reading", metricKey: "steadiness_force", unit: "N" },
                            ];
        }
              // Isometric tests - dual_leg uses totals, single-leg uses left/right breakdowns
        return [
          { icon: "⚡", title: "Peak Force", metricKey: "force_peak", unit: "N" },
          { icon: "📈", title: "RFD Max", metricKey: "rfd_max", fallbackKeys: ["force_at_max_rfd"], unit: "N/s" },
          { icon: "⚡", title: "Impulse @ 50ms", metricKey: "force_50ms", fallbackKeys: ["impulse_50ms"], unit: "N" },
          { icon: "⚡", title: "Impulse @ 250ms", metricKey: "force_250ms", fallbackKeys: ["impulse_250ms"], unit: "N" },
                ];
    }
}

// Extended limb symmetry return type
interface LimbSymmetryResult {
    leftValue: number;
    rightValue: number;
    asymmetryPercent: number;
    isSymmetryIndex?: boolean;
    dominantSide?: string;
    siValue?: number;
    // What leftValue/rightValue actually represent, e.g. "Peak Force", "Jump
  // Height" - shown in the Limb Symmetry card's sub-label so a kinematic
  // fallback is never mislabeled as a force reading.
  metricLabel?: string;
}

// Extract limb symmetry data. Rather than matching on an exact testName
// string (which only ever covered the handful of bilateral names CC
// Athletics ships natively and silently returned "Not available" for every
// VALD single-leg/jump-family variant - Single Leg Jump, Single Leg Squat
// Jump, Single Leg Drop Jump, Single Leg Hop Test, etc. - this now detects
// which left/right field pair the upstream mapper actually populated and
// uses that, so any test name with real paired data gets a real symmetry
// value. Priority: real force > jump height (kinematic fallback for jump
// tests with no raw per-limb force) > limb contribution % > isometric peak
// force (signed symmetry index).
function calculateLimbSymmetry(testName: string, metrics: TestMetrics): LimbSymmetryResult | null {
    let leftValue = 0;
    let rightValue = 0;
    let metricLabel: string | undefined;

  if (typeof metrics.fp1_peak_landing_force === 'number' || typeof metrics.fp2_peak_landing_force === 'number') {
        // Drop Jump family (Drop Jump, Single Leg Drop Jump, Left/Right Side Drop Jump)
      // Formula: |Left - Right| / Max(Left, Right) × 100
      leftValue = metrics.fp1_peak_landing_force || 0;
        rightValue = metrics.fp2_peak_landing_force || 0;
        metricLabel = 'Peak Landing Force';
  } else if (typeof metrics.p1_avg_force === 'number' || typeof metrics.fp1_peak_force#

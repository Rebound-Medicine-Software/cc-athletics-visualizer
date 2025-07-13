
export interface ForceDataPoint {
  time: number;
  forceX: number;
  forceY: number;
  forceZ: number;
  copX: number;
  copY: number;
}

export interface ForcePlateData {
  id: string;
  timestamp: Date;
  duration: number;
  samplingRate: number;
  dataPoints: ForceDataPoint[];
  metadata?: {
    athlete?: string;
    exercise?: string;
    notes?: string;
  };
}

export interface ForceMetrics {
  peakForce: number;
  averageForce: number;
  rateOfForceDevelopment: number;
  impulse: number;
  timeToWeightBearing: number;
  leftRightImbalance: number;
}

// New interfaces based on your AppScript data structure
export interface Athlete {
  id: string;
  name: string;
  team_id: string;
  gender?: string;
  age?: number;
  height_cm?: number;
  weight_kg?: number;
}

export interface Team {
  id: string;
  name: string;
  creation_date: string;
}

export interface TestData {
  athlete_id: string;
  athlete_name: string;
  team_name: string;
  test_date: string;
  test_name: string;
  repetition_number: number;
  gender?: string;
  metrics: JumpMetrics | IsometricMetrics | PogoMetrics;
}

export interface JumpMetrics {
  avg_braking_force?: number;
  avg_braking_power?: number;
  avg_propulsive_force?: number;
  avg_propulsive_power?: number;
  avg_rfd?: number;
  body_mass?: number;
  braking_duration?: number;
  contact_time?: number;
  flight_time?: number;
  jump_height_ft?: number;
  net_impulse?: number;
  peak_force?: number;
  peak_power?: number;
  peak_velocity?: number;
  takeoff_velocity?: number;
  time_to_peak_force?: number;
  rsi?: number;
}

export interface IsometricMetrics {
  force_50ms?: number;
  force_100ms?: number;
  force_150ms?: number;
  force_200ms?: number;
  force_250ms?: number;
  force_peak?: number;
  rfd_max?: number;
  rfd_50ms?: number;
  rfd_100ms?: number;
  rfd_150ms?: number;
  rfd_200ms?: number;
  rfd_250ms?: number;
  impulse_50ms?: number;
  impulse_100ms?: number;
  impulse_150ms?: number;
  impulse_200ms?: number;
  impulse_250ms?: number;
}

export interface PogoMetrics {
  avg_jump_height?: number;
  avg_contact_time?: number;
  avg_flight_time?: number;
  avg_rsi?: number;
  avg_power?: number;
  jump_height?: number;
  contact_time?: number;
  flight_time?: number;
  power?: number;
}


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

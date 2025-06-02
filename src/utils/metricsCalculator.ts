
import { ForcePlateData, ForceMetrics } from "@/types/forcePlateTypes";

export const calculateMetrics = (data: ForcePlateData): ForceMetrics => {
  const { dataPoints } = data;
  
  // Peak force (maximum vertical force)
  const peakForce = Math.max(...dataPoints.map(point => point.forceZ));
  
  // Average force (mean vertical force)
  const averageForce = dataPoints.reduce((sum, point) => sum + point.forceZ, 0) / dataPoints.length;
  
  // Rate of Force Development (RFD)
  // Calculate the maximum rate of change in force
  let maxRFD = 0;
  const windowSize = Math.floor(data.samplingRate * 0.05); // 50ms window
  
  for (let i = windowSize; i < dataPoints.length; i++) {
    const currentForce = dataPoints[i].forceZ;
    const previousForce = dataPoints[i - windowSize].forceZ;
    const timeWindow = (dataPoints[i].time - dataPoints[i - windowSize].time);
    const rfd = (currentForce - previousForce) / timeWindow;
    maxRFD = Math.max(maxRFD, rfd);
  }
  
  // Impulse (area under the force-time curve)
  let impulse = 0;
  for (let i = 1; i < dataPoints.length; i++) {
    const dt = dataPoints[i].time - dataPoints[i - 1].time;
    const avgForce = (dataPoints[i].forceZ + dataPoints[i - 1].forceZ) / 2;
    impulse += avgForce * dt;
  }
  
  // Time to weight bearing (time to reach body weight)
  const bodyWeight = 700; // Approximate body weight in Newtons
  let timeToWeightBearing = 0;
  for (let i = 0; i < dataPoints.length; i++) {
    if (dataPoints[i].forceZ >= bodyWeight) {
      timeToWeightBearing = dataPoints[i].time;
      break;
    }
  }
  
  // Left-Right Imbalance (based on center of pressure X displacement)
  const copXValues = dataPoints.map(point => point.copX);
  const avgCopX = copXValues.reduce((sum, val) => sum + val, 0) / copXValues.length;
  const maxCopX = Math.max(...copXValues.map(val => Math.abs(val)));
  const leftRightImbalance = Math.abs(avgCopX / maxCopX) * 100;
  
  return {
    peakForce,
    averageForce,
    rateOfForceDevelopment: maxRFD,
    impulse,
    timeToWeightBearing,
    leftRightImbalance,
  };
};

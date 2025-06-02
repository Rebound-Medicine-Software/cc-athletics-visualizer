
import { ForcePlateData, ForceDataPoint } from "@/types/forcePlateTypes";

export const generateSampleData = (): ForcePlateData => {
  const samplingRate = 1000; // 1000 Hz
  const duration = 3.0; // 3 seconds
  const dataPoints: ForceDataPoint[] = [];
  
  // Simulate a jump or landing movement
  for (let i = 0; i < duration * samplingRate; i++) {
    const time = i / samplingRate;
    
    // Create realistic force plate data with phases
    let forceZ = 0;
    let forceX = 0;
    let forceY = 0;
    let copX = 0;
    let copY = 0;
    
    if (time < 0.5) {
      // Quiet standing phase
      forceZ = 700 + Math.random() * 50; // Body weight ~70kg
      forceX = (Math.random() - 0.5) * 20;
      forceY = (Math.random() - 0.5) * 20;
      copX = (Math.random() - 0.5) * 10;
      copY = (Math.random() - 0.5) * 10;
    } else if (time < 1.2) {
      // Loading phase (countermovement)
      const phase = (time - 0.5) / 0.7;
      forceZ = 700 + 500 * Math.sin(phase * Math.PI) + Math.random() * 100;
      forceX = Math.sin(phase * Math.PI * 2) * 100 + (Math.random() - 0.5) * 30;
      forceY = Math.cos(phase * Math.PI * 2) * 80 + (Math.random() - 0.5) * 30;
      copX = Math.sin(phase * Math.PI * 3) * 25;
      copY = Math.cos(phase * Math.PI * 2.5) * 20;
    } else if (time < 1.8) {
      // Peak force phase (takeoff/landing)
      const phase = (time - 1.2) / 0.6;
      forceZ = 1500 + 800 * Math.exp(-phase * 3) + Math.random() * 200;
      forceX = Math.sin(phase * Math.PI * 4) * 150 + (Math.random() - 0.5) * 50;
      forceY = Math.cos(phase * Math.PI * 3) * 120 + (Math.random() - 0.5) * 40;
      copX = Math.sin(phase * Math.PI * 4) * 30;
      copY = Math.cos(phase * Math.PI * 3) * 25;
    } else {
      // Recovery phase
      const phase = (time - 1.8) / 1.2;
      const decay = Math.exp(-phase * 2);
      forceZ = 700 + 300 * decay + Math.random() * 50;
      forceX = Math.sin(phase * Math.PI * 2) * 50 * decay + (Math.random() - 0.5) * 25;
      forceY = Math.cos(phase * Math.PI * 1.5) * 40 * decay + (Math.random() - 0.5) * 20;
      copX = Math.sin(phase * Math.PI * 2) * 15 * decay;
      copY = Math.cos(phase * Math.PI * 1.5) * 12 * decay;
    }
    
    dataPoints.push({
      time,
      forceX,
      forceY,
      forceZ,
      copX,
      copY,
    });
  }
  
  return {
    id: `sample-${Date.now()}`,
    timestamp: new Date(),
    duration,
    samplingRate,
    dataPoints,
    metadata: {
      athlete: "Sample Athlete",
      exercise: "Countermovement Jump",
      notes: "Generated sample data for demonstration",
    },
  };
};

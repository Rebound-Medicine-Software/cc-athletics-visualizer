import { useState } from 'react';
import { MovementWorkspace } from './MovementWorkspace';
import { GolfPerformanceDashboard } from './golf/GolfPerformanceDashboard';

export function MovementWorkspaceRoot() {
  const [moduleId, setModuleId] = useState<string | null>(null);
  if (moduleId === 'golf_swing') return <GolfPerformanceDashboard onBack={() => setModuleId(null)} />;
  return <MovementWorkspace onSelect={setModuleId} />;
}

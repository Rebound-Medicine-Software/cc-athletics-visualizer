/**
 * MovementBattery — wraps the existing MovementWorkspaceRoot (Golf, Sit-to-Stand, etc.).
 * Keeps golf swing analysis accessible from within the Analysis tab.
 */
import { MovementWorkspaceRoot } from '@/components/dashboard/movement-workspace/MovementWorkspaceRoot';

export function MovementBattery() {
  return <MovementWorkspaceRoot />;
}

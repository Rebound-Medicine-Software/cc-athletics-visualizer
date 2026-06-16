/**
 * AnalysisRoot — top-level container for the Analysis tab.
 * Manages which testing battery is active and renders the appropriate view.
 * No data fetching here — each battery handles its own.
 */
import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { BatteryGrid } from './BatteryGrid';
import { ACLRBattery } from './batteries/ACLRBattery';
import { PowerBattery } from './batteries/PowerBattery';
import { AnkleBattery } from './batteries/AnkleBattery';
import { FullAthleteBattery } from './batteries/FullAthleteBattery';
import { FreeModeBattery } from './batteries/FreeModeBattery';
import { MovementBattery } from './batteries/MovementBattery';

type BatteryId = 'power' | 'aclr' | 'ankle' | 'full' | 'free' | 'movement';

export function AnalysisRoot() {
  const [activeBattery, setActiveBattery] = useState<BatteryId | null>(null);
  const [batteryLabel, setBatteryLabel] = useState('');

  const openBattery = (id: BatteryId, label: string) => {
    setActiveBattery(id);
    setBatteryLabel(label);
  };

  const goBack = () => {
    setActiveBattery(null);
    setBatteryLabel('');
  };

  if (!activeBattery) {
    return <BatteryGrid onSelect={openBattery} />;
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <button
        onClick={goBack}
        className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Analysis</span>
        <span className="text-slate-600 mx-1">/</span>
        <span className="text-slate-100 font-medium">{batteryLabel}</span>
      </button>

      {activeBattery === 'aclr'     && <ACLRBattery />}
      {activeBattery === 'power'    && <PowerBattery />}
      {activeBattery === 'ankle'    && <AnkleBattery />}
      {activeBattery === 'full'     && <FullAthleteBattery />}
      {activeBattery === 'free'     && <FreeModeBattery />}
      {activeBattery === 'movement' && <MovementBattery />}
    </div>
  );
}


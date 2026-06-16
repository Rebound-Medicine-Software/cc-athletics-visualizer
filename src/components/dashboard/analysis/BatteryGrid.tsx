/**
 * BatteryGrid — pinned and standard testing battery cards.
 * Clean card grid: icon + name + test summary. No fluff.
 */
import type { ElementType } from 'react';
import { Zap, Shield, Activity, Dumbbell, FlaskConical, Plus, Footprints } from 'lucide-react';

type BatteryId = 'power' | 'aclr' | 'ankle' | 'full' | 'free' | 'movement';

interface Battery {
  id: BatteryId | 'custom';
  label: string;
  Icon: ElementType;
  desc: string;
  pinned: boolean;
  accent: string; // tailwind text colour class
}

const BATTERIES: Battery[] = [
  {
    id: 'power',
    label: 'Power screening',
    Icon: Zap,
    desc: 'CMJ · Drop jump · IMTP · Pogo',
    pinned: true,
    accent: 'text-emerald-400',
  },
  {
    id: 'aclr',
    label: 'ACLR protocol',
    Icon: Shield,
    desc: 'SL CMJ · Drop jump · Balance · IMTP',
    pinned: true,
    accent: 'text-blue-400',
  },
  {
    id: 'ankle',
    label: 'Ankle instability',
    Icon: Footprints,
    desc: 'SL balance · SL pogo · Hop tests',
    pinned: true,
    accent: 'text-violet-400',
  },
  {
    id: 'full',
    label: 'Full athlete testing',
    Icon: Dumbbell,
    desc: 'CMJ · SJ · DJ · IMTP · Pogo',
    pinned: false,
    accent: 'text-emerald-400',
  },
  {
    id: 'free',
    label: 'Free mode',
    Icon: FlaskConical,
    desc: 'Pick any test, any athlete',
    pinned: false,
    accent: 'text-slate-400',
  },
  {
    id: 'movement',
    label: 'Movement workspace',
    Icon: Activity,
    desc: 'Golf swing · Sit-to-stand',
    pinned: false,
    accent: 'text-slate-400',
  },
  {
    id: 'custom',
    label: 'Create battery',
    Icon: Plus,
    desc: 'Build your own protocol',
    pinned: false,
    accent: 'text-slate-500',
  },
];

interface Props {
  onSelect: (id: BatteryId, label: string) => void;
}

function BatteryCard({ battery, onSelect }: { battery: Battery; onSelect: Props['onSelect'] }) {
  const { Icon } = battery;

  const handleClick = () => {
    if (battery.id === 'custom') return; // no-op for now
    onSelect(battery.id as BatteryId, battery.label);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        text-left p-4 rounded-xl border transition-all group
        bg-slate-900 border-slate-800
        hover:border-slate-600 hover:bg-slate-800/60
        ${battery.pinned ? 'border-l-[3px] border-l-emerald-500/40' : ''}
        ${battery.id === 'custom' ? 'opacity-60 cursor-default' : ''}
      `}
    >
      <div
        className={`
          w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center mb-3
          ${battery.id === 'custom' ? 'border border-dashed border-slate-600' : ''}
        `}
      >
        <Icon className={`h-4 w-4 ${battery.accent}`} />
      </div>
      <div className="text-sm font-semibold text-slate-100 mb-1 group-hover:text-white transition-colors">
        {battery.label}
      </div>
      <div className="text-xs text-slate-500">{battery.desc}</div>
    </button>
  );
}

export function BatteryGrid({ onSelect }: Props) {
  const pinned = BATTERIES.filter((b) => b.pinned);
  const more   = BATTERIES.filter((b) => !b.pinned);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">
          Pinned batteries
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pinned.map((b) => (
            <BatteryCard key={b.id} battery={b} onSelect={onSelect} />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-3">More</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {more.map((b) => (
            <BatteryCard key={b.id} battery={b} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}

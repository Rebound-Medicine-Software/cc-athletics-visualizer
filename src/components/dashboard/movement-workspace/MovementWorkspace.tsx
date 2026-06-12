import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity, Wind, ArrowUpDown, Footprints, ChevronsUpDown, Gauge,
  PersonStanding, Move, Waves,
} from 'lucide-react';

interface ModuleDef {
  id: string;
  label: string;
  icon: any;
  description: string;
  status: 'active' | 'soon';
}

const MODULES: ModuleDef[] = [
  { id: 'golf_swing',  label: 'Golf Swing',    icon: Wind,           description: 'Force, CoP, swing phases, video sync',       status: 'active' },
  { id: 'squat',       label: 'Squat',         icon: ChevronsUpDown, description: 'Eccentric/concentric loading and symmetry',  status: 'soon' },
  { id: 'sit_to_stand',label: 'Sit to Stand',  icon: PersonStanding, description: 'Functional rise mechanics + asymmetries',    status: 'soon' },
  { id: 'balance',     label: 'Balance',       icon: Gauge,          description: 'Single/double leg postural sway',            status: 'soon' },
  { id: 'cmj',         label: 'CMJ',           icon: ArrowUpDown,    description: 'Countermovement jump phase analysis',        status: 'soon' },
  { id: 'dj',          label: 'DJ',            icon: Activity,       description: 'Drop jump reactive strength',                status: 'soon' },
  { id: 'pogo',        label: 'Pogo',          icon: Waves,          description: 'Hop reactive ankle stiffness',               status: 'soon' },
  { id: 'running',     label: 'Running',       icon: Move,           description: 'Stride mechanics & ground reaction',          status: 'soon' },
  { id: 'gait',        label: 'Gait',          icon: Footprints,     description: 'Gait cycle, stance, swing phases',           status: 'soon' },
];

interface Props { onSelect: (id: string) => void; }

export function MovementWorkspace({ onSelect }: Props) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Badge variant="outline" className="uppercase tracking-widest text-[10px]">Movement Analysis</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Movement Workspace</h1>
        <p className="text-muted-foreground max-w-2xl">
          Practitioner-grade analysis built on the Movement Engine. Golf Swing is live.
          Additional modules plug into the same engine — coming online soon.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Card
              onClick={() => m.status === 'active' && onSelect(m.id)}
              className={`group relative overflow-hidden p-5 transition-all
                ${m.status === 'active'
                  ? 'cursor-pointer border-primary/40 hover:border-primary hover:shadow-lg hover:-translate-y-0.5'
                  : 'cursor-not-allowed opacity-70'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <m.icon className="h-6 w-6 text-primary" />
                </div>
                {m.status === 'active' ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Active</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold">{m.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
              </div>
              {m.status === 'active' && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

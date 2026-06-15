/**
 * GolfTrainingPrescription — exercise recommendations driven by KPI scores.
 * Only shows exercises relevant to the athlete's weak areas.
 * Mobility work always appears as a base layer.
 */
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Activity, Zap, RotateCcw, Gauge } from 'lucide-react';
import type { GolfKpiScores } from '@/lib/movement-engine/modules/golf/kpis';

interface Exercise {
  name:     string;
  category: string;
  sets:     string;
  reps:     string;
  tip:      string;
  /** Score keys whose weakness (<80) triggers this exercise. Empty = always show. */
  triggers: Array<keyof GolfKpiScores | 'always'>;
}

const EXERCISES: Exercise[] = [
  // Lead Load
  {
    name: 'Single Leg Press (Lead Side)',
    category: 'Lead Leg Power',
    sets: '3', reps: '10',
    tip: 'Drive through heel, keep pelvis level throughout the press.',
    triggers: ['lead_load'],
  },
  {
    name: 'Lead Leg RDL',
    category: 'Lead Leg Power',
    sets: '3', reps: '10',
    tip: 'Hinge at hip, feel tension in lead hamstring — absorb, don\'t collapse.',
    triggers: ['lead_load'],
  },
  {
    name: 'Step-Up to Balance (Lead)',
    category: 'Lead Leg Power',
    sets: '3', reps: '8/side',
    tip: 'Pause at top for 2 seconds. This builds the same demand as impact.',
    triggers: ['lead_load'],
  },

  // Weight Transfer
  {
    name: 'Med Ball Rotational Throw',
    category: 'Rotational Power',
    sets: '3', reps: '8/side',
    tip: 'Initiate with your hips, not your shoulders. Feel the ground → hips → chest → arms.',
    triggers: ['weight_transfer'],
  },
  {
    name: 'Lateral Jump to Hold',
    category: 'Rotational Power',
    sets: '3', reps: '6/side',
    tip: 'Stick the landing for 2 full seconds. No wobble = good transfer mechanics.',
    triggers: ['weight_transfer'],
  },
  {
    name: 'Hip Shift + Pause (Wall Drill)',
    category: 'Rotational Power',
    sets: '3', reps: '10',
    tip: 'Stand side-on to a wall. Shift hips into the wall and pause — this is your downswing initiation.',
    triggers: ['weight_transfer'],
  },

  // Tempo
  {
    name: 'Tempo Squat (3-0-1)',
    category: 'Tempo & Rhythm',
    sets: '3', reps: '10',
    tip: '3 seconds down, no pause, 1 second up. This teaches controlled eccentric → fast concentric.',
    triggers: ['tempo'],
  },
  {
    name: 'Pause Deadlift (Knee Height)',
    category: 'Tempo & Rhythm',
    sets: '3', reps: '6',
    tip: 'Pause 2 seconds at knee height before driving through. Builds the top-of-backswing patience.',
    triggers: ['tempo'],
  },

  // Transition Speed
  {
    name: 'Hip Hinge + Rapid Extension',
    category: 'Transition Speed',
    sets: '4', reps: '6',
    tip: 'Lower slowly (2 sec), then drive up AS FAST AS POSSIBLE. This is your downswing loaded.',
    triggers: ['transition'],
  },
  {
    name: 'Jump Squat',
    category: 'Transition Speed',
    sets: '3', reps: '5',
    tip: 'Fast eccentric absorption, then immediate explosive push. No pause at the bottom.',
    triggers: ['transition'],
  },
  {
    name: 'Broad Jump',
    category: 'Transition Speed',
    sets: '3', reps: '5',
    tip: 'Load fast, jump far. Stick the landing and hold for 2 seconds.',
    triggers: ['transition'],
  },

  // CoP Quality / Balance
  {
    name: 'Single Leg Balance — Eyes Closed',
    category: 'Balance & CoP',
    sets: '3', reps: '30s/side',
    tip: 'Progress from eyes open → eyes closed → add head turns. This trains the real proprioception.',
    triggers: ['cop_quality'],
  },
  {
    name: 'Bosu Half Squat',
    category: 'Balance & CoP',
    sets: '3', reps: '12',
    tip: 'Stay on the unstable side. Keep eyes fixed on one point — your CoP will thank you.',
    triggers: ['cop_quality'],
  },

  // Always shown — mobility base
  {
    name: 'Thoracic Rotation Stretch',
    category: 'Mobility',
    sets: '2', reps: '10/side',
    tip: 'On hands and knees, thread one hand under chest. Follow your hand with your eyes.',
    triggers: ['always'],
  },
  {
    name: 'Hip 90/90 Mobility',
    category: 'Mobility',
    sets: '2', reps: '10/side',
    tip: 'Sit in 90/90 position, stay tall through spine. This is the hip rotation your golf swing needs.',
    triggers: ['always'],
  },
  {
    name: 'Standing Hip CAR',
    category: 'Mobility',
    sets: '2', reps: '5/side',
    tip: 'Slow, controlled full hip circles. This primes the joint before swing work.',
    triggers: ['always'],
  },
];

const CATEGORY_ICONS: Record<string, ReactNode> = {
  'Lead Leg Power':    <Dumbbell className="h-4 w-4" />,
  'Rotational Power':  <RotateCcw className="h-4 w-4" />,
  'Tempo & Rhythm':    <Gauge className="h-4 w-4" />,
  'Transition Speed':  <Zap className="h-4 w-4" />,
  'Balance & CoP':     <Activity className="h-4 w-4" />,
  'Mobility':          <Activity className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  'Lead Leg Power':    'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  'Rotational Power':  'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'Tempo & Rhythm':    'text-violet-400 bg-violet-400/10 border-violet-400/20',
  'Transition Speed':  'text-rose-400 bg-rose-400/10 border-rose-400/20',
  'Balance & CoP':     'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  'Mobility':          'text-slate-400 bg-slate-400/10 border-slate-400/20',
};

interface Props {
  scores: GolfKpiScores;
}

export function GolfTrainingPrescription({ scores }: Props) {
  // Select exercises: include if ANY trigger score is below 80, or trigger is 'always'
  const relevant = EXERCISES.filter((ex) =>
    ex.triggers.includes('always') ||
    ex.triggers.some((key) => key !== 'always' && (scores[key as keyof GolfKpiScores] ?? 100) < 80)
  );

  // Group by category
  const groups = relevant.reduce<Record<string, Exercise[]>>((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category].push(ex);
    return acc;
  }, {});

  if (!relevant.length) {
    return (
      <Card className="bg-slate-950 border-slate-800 p-8 text-center text-slate-400">
        <Dumbbell className="mx-auto h-8 w-8 mb-3 opacity-40" />
        <p className="font-medium text-slate-200">Upload a session to unlock your training plan</p>
        <p className="text-sm mt-1">Exercises are matched to your KPI scores automatically.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Training Prescription</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {relevant.length} exercises matched to your session data
          </p>
        </div>
        <Badge variant="outline" className="text-xs border-slate-700 text-slate-400 uppercase tracking-widest">
          Auto-generated
        </Badge>
      </div>

      {Object.entries(groups).map(([category, exercises], gi) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.07, duration: 0.35 }}
          className="space-y-2"
        >
          {/* Category header */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${CATEGORY_COLORS[category] ?? 'text-slate-400 bg-slate-800 border-slate-700'}`}>
            {CATEGORY_ICONS[category]}
            {category}
          </div>

          {/* Exercise cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {exercises.map((ex, ei) => (
              <motion.div
                key={ex.name}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: gi * 0.07 + ei * 0.04, duration: 0.3 }}
              >
                <Card className="bg-slate-900 border-slate-800 p-4 h-full space-y-2 hover:border-slate-700 transition-colors">
                  <div className="font-semibold text-sm text-slate-100">{ex.name}</div>
                  <div className="flex gap-2">
                    <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                      {ex.sets} × {ex.reps}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed italic">
                    💡 {ex.tip}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

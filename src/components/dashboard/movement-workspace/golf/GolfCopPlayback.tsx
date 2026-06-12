import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import type { GolfCop } from '@/lib/movement-engine/modules/golf/cop';

interface Props { cop: GolfCop; }

export function GolfCopPlayback({ cop }: Props) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const startedAt = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const points = cop.combined;
  const max = points.length - 1;

  useEffect(() => {
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    startedAt.current = performance.now() - (t / max) * 2000;
    const tick = () => {
      const elapsed = (performance.now() - (startedAt.current ?? 0)) / 2000;
      const next = Math.min(max, Math.floor(elapsed * max));
      setT(next);
      if (next >= max) { setPlaying(false); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, max]);

  const W = 600, H = 220;
  const xMin = Math.min(...points.map((p) => p.x), -1);
  const xMax = Math.max(...points.map((p) => p.x), 1);
  const yMin = Math.min(...points.map((p) => p.y), 0);
  const yMax = Math.max(...points.map((p) => p.y), 1);
  const sx = (x: number) => 30 + ((x - xMin) / (xMax - xMin)) * (W - 60);
  const sy = (y: number) => H - 20 - ((y - yMin) / (yMax - yMin)) * (H - 40);

  const trail = points.slice(0, t + 1);
  const head = points[t];

  const path = trail.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ');

  return (
    <Card className="p-3 bg-slate-950 border-slate-800 text-slate-100 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-slate-400">Centre of Pressure</h3>
        <div className="text-xs font-mono text-slate-400">
          t = {head ? head.t.toFixed(3) : '—'}s
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto rounded bg-slate-900">
        {/* axes */}
        <line x1={30} y1={H - 20} x2={W - 30} y2={H - 20} stroke="#334155" />
        <line x1={W / 2} y1={20} x2={W / 2} y2={H - 20} stroke="#334155" strokeDasharray="2 3" />
        <text x={32} y={H - 6} fill="#475569" fontSize={9}>Trail</text>
        <text x={W - 60} y={H - 6} fill="#475569" fontSize={9}>Lead</text>
        {/* trail */}
        <path d={path} stroke="#22d3ee" strokeWidth={1.6} fill="none" opacity={0.8} />
        {/* head */}
        {head && (
          <>
            <circle cx={sx(head.x)} cy={sy(head.y)} r={5} fill="#f59e0b" />
            <circle cx={sx(head.x)} cy={sy(head.y)} r={10} fill="none" stroke="#f59e0b" opacity={0.4} />
          </>
        )}
      </svg>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)} className="border-slate-700">
          {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>
        <input type="range" min={0} max={max} value={t} onChange={(e) => setT(Number(e.target.value))}
          className="flex-1 accent-amber-400" />
        <span className="text-xs font-mono text-slate-400 w-12 text-right">{t}/{max}</span>
      </div>
    </Card>
  );
}

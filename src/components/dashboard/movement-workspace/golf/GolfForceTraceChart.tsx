import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, Legend,
} from 'recharts';
import type { MovementSession, MovementEvent } from '@/lib/movement-engine/core/types';

interface Props {
  session: MovementSession;
  events: MovementEvent[];
  selectedIndex: number;            // 1-based, or 0 for "all"
  overlayIndices?: number[];        // for overlay mode
  height?: number;
}

const COLORS = ['#22d3ee', '#f59e0b', '#a78bfa', '#34d399', '#f472b6', '#60a5fa'];

export function GolfForceTraceChart({ session, events, selectedIndex, overlayIndices, height = 320 }: Props) {
  const overlay = overlayIndices && overlayIndices.length > 0;
  let data: any[] = [];
  if (overlay) {
    // Align each swing on its impact (t=0)
    const series: Record<string, number>[] = [];
    overlayIndices!.forEach((idx) => {
      const ev = events[idx - 1];
      if (!ev) return;
      const impactT = ev.phaseMarkers.find((p) => p.name === 'impact')?.time ?? ev.startTime;
      session.samples
        .filter((s) => s.t >= ev.startTime && s.t <= ev.endTime)
        .forEach((s) => {
          const t = +(s.t - impactT).toFixed(3);
          let row = series.find((r) => r.t === t);
          if (!row) { row = { t } as any; series.push(row); }
          row[`s${idx}`] = s.total;
        });
    });
    data = series.sort((a, b) => a.t - b.t);
  } else if (selectedIndex > 0 && events[selectedIndex - 1]) {
    const ev = events[selectedIndex - 1];
    data = session.samples
      .filter((s) => s.t >= ev.startTime - 0.1 && s.t <= ev.endTime + 0.1)
      .map((s) => ({ t: +s.t.toFixed(3), left: s.left, right: s.right, total: s.total }));
  } else {
    data = session.samples.map((s) => ({ t: +s.t.toFixed(3), left: s.left, right: s.right, total: s.total }));
  }

  const currentEvent = !overlay && selectedIndex > 0 ? events[selectedIndex - 1] : null;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-3" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 5 }}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="t" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v.toFixed(2)}s`} />
          <YAxis stroke="#64748b" fontSize={11} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0' }}
            labelFormatter={(v) => `${Number(v).toFixed(3)}s`}
          />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
          {!overlay && events.map((ev) => (
            <ReferenceArea key={ev.index} x1={ev.startTime} x2={ev.endTime}
              fill="#22d3ee" fillOpacity={0.04} strokeOpacity={0} />
          ))}
          {currentEvent && currentEvent.phaseMarkers.map((m) => (
            <ReferenceLine key={m.name} x={m.time} stroke="#f59e0b" strokeDasharray="2 2"
              label={{ value: m.name.replace(/_/g, ' '), fill: '#f59e0b', fontSize: 10, position: 'top' }}
            />
          ))}
          {overlay ? (
            overlayIndices!.map((idx, i) => (
              <Line key={idx} type="monotone" dataKey={`s${idx}`} stroke={COLORS[i % COLORS.length]}
                dot={false} strokeWidth={1.5} name={`Swing ${idx}`} isAnimationActive={false} />
            ))
          ) : (
            <>
              <Line type="monotone" dataKey="left"  stroke="#22d3ee" dot={false} strokeWidth={1.5} name="Lead (L)" isAnimationActive={false} />
              <Line type="monotone" dataKey="right" stroke="#f472b6" dot={false} strokeWidth={1.5} name="Trail (R)" isAnimationActive={false} />
              <Line type="monotone" dataKey="total" stroke="#f59e0b" dot={false} strokeWidth={1.8} name="Combined" isAnimationActive={false} />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * FullAthleteBattery — Comprehensive athlete testing profile.
 *
 * Tests: CMJ, Squat Jump, Drop Jump, IMTP, Pogo.
 * Purpose: complete athletic capacity snapshot across all CC Athletics test types.
 * Useful pre/post-season and at key periodisation checkpoints.
 *
 * Data source: useCCAthletics hook.
 */
import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Info, Loader2, KeyRound, TrendingUp } from 'lucide-react';
import { useCCAthletics } from '@/hooks/useCCAthletics';
import type { JumpMetrics, IsometricMetrics, PogoMetrics, TestData } from '@/types/forcePlateTypes';

const METRIC_INFO: Record<string, string> = {
  cmj_h:   'CMJ jump height (cm). Primary measure of bilateral explosive lower-body power. The headline number for most athletic profiles.',
  cmj_pf:  'Peak ground reaction force during CMJ push-off (N). Higher values indicate greater force production capacity.',
  cmj_rfd: 'Average rate of force development (N/s). How quickly the athlete generates force through the concentric phase.',
  cmj_pv:  'Peak take-off velocity (m/s). Velocity of the centre of mass at the moment of take-off. Directly linked to jump height.',
  sj_h:    'Squat Jump height (cm). Measures pure concentric power with no countermovement — eliminates the stretch-shortening cycle contribution. CMJ vs SJ difference = SSC utilisation.',
  sj_pf:   'Peak force during the squat jump concentric phase (N). Reflects maximum voluntary force with a static start.',
  dj_rsi:  'Reactive Strength Index = jump height ÷ contact time. Gold standard for reactive/elastic strength. Elite athletes typically score > 2.5.',
  dj_ct:   'Ground contact time during drop jump (ms). Lower = better tendon stiffness and spring mechanics. Target < 250 ms.',
  dj_h:    'Drop jump rebound height (cm). The "output" half of the RSI calculation — how high they get from the reactive effort.',
  imtp_peak:'Peak isometric force (N) from the mid-thigh pull. Maximum voluntary force production — the ceiling of their strength potential.',
  imtp_50:  'Force at 50 ms post-onset (N). Early RFD — how fast the nervous system switches on force production.',
  imtp_250: 'Force at 250 ms (N). Sustained force capacity. Critical for longer high-intensity contacts in field sports.',
  pogo_rsi: 'Average pogo RSI across all reps. Represents the athlete\'s ability to generate repeated reactive ground contacts — underpins speed and COD.',
  pogo_ct:  'Average pogo contact time (ms). Reflects ankle stiffness and tendon elastic properties in repeated fast contacts.',
  pogo_h:   'Average pogo jump height (cm). The flight-phase output of the ankle-driven reactive movement.',
};

const CMJ_NAMES  = ['Countermovement Jump', 'CMJ'];
const SJ_NAMES   = ['Squat Jump'];
const DJ_NAMES   = ['Drop Jump'];
const IMTP_NAMES = ['Isometric Mid-Thigh Pull', 'IMTP'];
const POGO_NAMES = ['Pogo Jump', 'Pogos'];

const ftToCm = (ft: number) => +(ft * 30.48).toFixed(1);

function latest(rows: TestData[], names: string[]): TestData | undefined {
  return rows
    .filter((d) => names.some((n) => d.test_name.toLowerCase().includes(n.toLowerCase())))
    .sort((a, b) => b.test_date.localeCompare(a.test_date))[0];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoTooltip({ id, openTip, setOpenTip }: {
  id: string; openTip: string | null; setOpenTip: (v: string | null) => void;
}) {
  const isOpen = openTip === id;
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpenTip(isOpen ? null : id)}
        className="w-5 h-5 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center"
        aria-label="More info"
      >
        <Info className="h-2.5 w-2.5 text-slate-500" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-6 z-10 w-60 bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 leading-relaxed shadow-xl">
          {METRIC_INFO[id]}
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value, unit, infoKey, highlight, openTip, setOpenTip }: {
  label: string; value: string; unit: string; infoKey: string; highlight?: boolean;
  openTip: string | null; setOpenTip: (v: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-slate-800 last:border-0">
      <span className={`flex-1 text-xs ${highlight ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${highlight ? 'text-cyan-300' : 'text-slate-100'}`}>
        {value}
        {unit && <span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>}
      </span>
      <InfoTooltip id={infoKey} openTip={openTip} setOpenTip={setOpenTip} />
    </div>
  );
}

function TestCard({ title, date, badge, children }: {
  title: string; date?: string; badge?: string; children: ReactNode;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-semibold text-slate-100 flex-1">{title}</span>
        {badge && (
          <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">
            {badge}
          </span>
        )}
        {date && <span className="text-xs text-slate-600">{date}</span>}
      </div>
      {children}
    </div>
  );
}

/** Derived insight: CMJ height minus SJ height = SSC contribution */
function SscInsight({ cmjH, sjH }: { cmjH: number; sjH: number }) {
  if (!cmjH || !sjH) return null;
  const diff   = +(cmjH - sjH).toFixed(1);
  const pct    = +((diff / sjH) * 100).toFixed(0);
  const rating = pct >= 15 ? 'Good SSC utilisation' : pct >= 8 ? 'Moderate SSC' : 'Low SSC — review eccentric loading';
  const color  = pct >= 15 ? 'text-emerald-400' : pct >= 8 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="mt-2 p-3 bg-slate-800/60 rounded-lg flex items-start gap-2">
      <TrendingUp className="h-3.5 w-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-slate-400 leading-relaxed">
        CMJ vs SJ difference: <strong className="text-slate-200">+{diff} cm ({pct}%)</strong>{' '}
        — <span className={color}>{rating}</span>.{' '}
        This gap shows how much the athlete gains from the stretch-shortening cycle.
      </p>
    </div>
  );
}

function ConnectPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <KeyRound className="h-8 w-8 text-slate-600 mb-3" />
      <p className="text-sm font-medium text-slate-300 mb-1">Connect CC Athletics</p>
      <p className="text-xs text-slate-500 max-w-xs">Add your API key in Settings → Integrations.</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16 gap-2 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Loading athlete data…</span>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function FullAthleteBattery() {
  const { data, isLoading, apiKey } = useCCAthletics();
  const [selectedAthlete, setSelectedAthlete] = useState<string>('');
  const [openTip, setOpenTip] = useState<string | null>(null);

  const athletes = useMemo(
    () => (!data ? [] : Array.from(new Set(data.map((d) => d.athlete_name))).sort()),
    [data],
  );
  const activeAthlete = selectedAthlete || athletes[0] || '';

  const tests = useMemo(() => {
    if (!data || !activeAthlete) return null;
    const rows = data.filter((d) => d.athlete_name === activeAthlete);
    return {
      cmj:  latest(rows, CMJ_NAMES),
      sj:   latest(rows, SJ_NAMES),
      dj:   latest(rows, DJ_NAMES),
      imtp: latest(rows, IMTP_NAMES),
      pogo: latest(rows, POGO_NAMES),
    };
  }, [data, activeAthlete]);

  if (!apiKey)   return <ConnectPrompt />;
  if (isLoading) return <LoadingState />;
  if (!data || athletes.length === 0) {
    return (
      <p className="text-xs text-slate-500 text-center py-10">
        No athlete data. Check your CC Athletics API key in Settings.
      </p>
    );
  }

  const cmjM  = tests?.cmj?.metrics  as JumpMetrics     | undefined;
  const sjM   = tests?.sj?.metrics   as JumpMetrics     | undefined;
  const djM   = tests?.dj?.metrics   as JumpMetrics     | undefined;
  const imtpM = tests?.imtp?.metrics as IsometricMetrics| undefined;
  const pogoM = tests?.pogo?.metrics as PogoMetrics     | undefined;

  const cmjH = cmjM?.jump_height_ft ? ftToCm(cmjM.jump_height_ft) : 0;
  const sjH  = sjM?.jump_height_ft  ? ftToCm(sjM.jump_height_ft)  : 0;
  const djH  = djM?.jump_height_ft  ? ftToCm(djM.jump_height_ft)  : 0;
  const pogoH = pogoM?.avg_jump_height ? ftToCm(pogoM.avg_jump_height) : 0;

  const hasAny = cmjM || sjM || djM || imtpM || pogoM;

  return (
    <div className="space-y-3">
      {/* Athlete selector */}
      <div className="flex flex-wrap gap-2">
        {athletes.map((name) => (
          <button
            key={name}
            onClick={() => setSelectedAthlete(name)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${name === activeAthlete
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'}
            `}
          >
            {name}
          </button>
        ))}
      </div>

      {/* CMJ */}
      {cmjM && (
        <TestCard title="Countermovement jump" date={tests?.cmj?.test_date} badge="CMJ">
          <MetricRow label="Jump height"   value={cmjH > 0 ? cmjH.toString() : '—'}                        unit="cm"  infoKey="cmj_h"   highlight openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Peak force"    value={cmjM.peak_force?.toFixed(0)    ?? '—'}                    unit="N"   infoKey="cmj_pf"  openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Avg RFD"       value={cmjM.avg_rfd?.toFixed(0)       ?? '—'}                    unit="N/s" infoKey="cmj_rfd" openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Peak velocity" value={cmjM.peak_velocity?.toFixed(2) ?? '—'}                    unit="m/s" infoKey="cmj_pv"  openTip={openTip} setOpenTip={setOpenTip} />
          {sjH > 0 && <SscInsight cmjH={cmjH} sjH={sjH} />}
        </TestCard>
      )}

      {/* Squat Jump */}
      {sjM && (
        <TestCard title="Squat jump" date={tests?.sj?.test_date} badge="SJ">
          <MetricRow label="Jump height" value={sjH > 0 ? sjH.toString() : '—'}         unit="cm" infoKey="sj_h"  highlight openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Peak force"  value={sjM.peak_force?.toFixed(0) ?? '—'}       unit="N"  infoKey="sj_pf" openTip={openTip} setOpenTip={setOpenTip} />
        </TestCard>
      )}

      {/* Drop Jump */}
      {djM && (
        <TestCard title="Drop jump" date={tests?.dj?.test_date} badge="DJ">
          <MetricRow label="RSI"          value={djM.rsi?.toFixed(2)          ?? '—'} unit=""   infoKey="dj_rsi" highlight openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Contact time" value={djM.contact_time?.toFixed(0) ?? '—'} unit="ms" infoKey="dj_ct"  openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Height"       value={djH > 0 ? djH.toString()     : '—'}  unit="cm" infoKey="dj_h"   openTip={openTip} setOpenTip={setOpenTip} />
        </TestCard>
      )}

      {/* IMTP */}
      {imtpM && (
        <TestCard title="Isometric mid-thigh pull" date={tests?.imtp?.test_date} badge="IMTP">
          <MetricRow label="Peak force"         value={imtpM.force_peak?.toFixed(0)  ?? '—'} unit="N" infoKey="imtp_peak" highlight openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Force at 50 ms"     value={imtpM.force_50ms?.toFixed(0)  ?? '—'} unit="N" infoKey="imtp_50"   openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Force at 250 ms"    value={imtpM.force_250ms?.toFixed(0) ?? '—'} unit="N" infoKey="imtp_250"  openTip={openTip} setOpenTip={setOpenTip} />
        </TestCard>
      )}

      {/* Pogo */}
      {pogoM && (
        <TestCard title="Pogo jumps" date={tests?.pogo?.test_date} badge="Pogo">
          <MetricRow label="Avg RSI"          value={pogoM.avg_rsi?.toFixed(2)          ?? '—'} unit=""   infoKey="pogo_rsi" highlight openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Avg contact time" value={pogoM.avg_contact_time?.toFixed(0) ?? '—'} unit="ms" infoKey="pogo_ct"  openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Avg height"       value={pogoH > 0 ? pogoH.toString()       : '—'}  unit="cm" infoKey="pogo_h"   openTip={openTip} setOpenTip={setOpenTip} />
        </TestCard>
      )}

      {!hasAny && (
        <p className="text-xs text-slate-500 text-center py-10">
          No tests found for <strong className="text-slate-300">{activeAthlete}</strong>.<br />
          Run CMJ, SJ, DJ, IMTP, or Pogo to populate this view.
        </p>
      )}
    </div>
  );
}

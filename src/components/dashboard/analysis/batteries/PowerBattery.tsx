/**
 * PowerBattery — Power Screening protocol.
 *
 * Tests: CMJ (bilateral), Drop Jump, IMTP, Pogo.
 * Focuses on explosive power, reactive strength, and maximum force.
 *
 * Data source: useCCAthletics hook.
 */
import { useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Info, Loader2, KeyRound } from 'lucide-react';
import { useCCAthletics } from '@/hooks/useCCAthletics';
import type { JumpMetrics, IsometricMetrics, PogoMetrics, TestData } from '@/types/forcePlateTypes';

const METRIC_INFO: Record<string, string> = {
  cmj_height:
    'CMJ jump height (cm). The primary measure of bilateral lower-body explosive power. ' +
    'Correlates directly with sprint speed and change-of-direction ability.',
  cmj_peak_force:
    'Peak ground reaction force during the CMJ push-off phase (N). ' +
    'Higher = greater force production capacity.',
  cmj_rfd:
    'Rate of force development (N/s). How fast the athlete builds force from take-off. ' +
    'Critical for explosive sports actions that occur in < 200 ms.',
  dj_rsi:
    'Reactive Strength Index = jump height ÷ contact time. The gold standard reactive ' +
    'strength metric. Elite athletes typically score > 2.5.',
  dj_contact:
    'Ground contact time during the drop jump (ms). Lower = stiffer, more spring-like ' +
    'mechanics. Target: < 250 ms for high-performance athletes.',
  imtp_peak:
    'Peak isometric force (N) from the mid-thigh pull. Reflects maximum neural drive ' +
    'and is strongly correlated with athletic performance.',
  pogo_rsi:
    'Average RSI across all pogo reps. Measures the athlete\'s ability to repeatedly ' +
    'spring off the ground. Underpins speed endurance and change of direction.',
  pogo_contact:
    'Average ground contact time during pogos (ms). Lower = better ankle stiffness ' +
    'and tendon elasticity — key for repeated fast ground contacts.',
};

const CMJ_NAMES   = ['Countermovement Jump', 'CMJ'];
const DJ_NAMES    = ['Drop Jump'];
const IMTP_NAMES  = ['Isometric Mid-Thigh Pull', 'IMTP'];
const POGO_NAMES  = ['Pogo Jump', 'Pogos'];

const ftToCm = (ft: number) => +(ft * 30.48).toFixed(1);

function latest(rows: TestData[], names: string[]): TestData | undefined {
  return rows
    .filter((d) => names.some((n) => d.test_name.toLowerCase().includes(n.toLowerCase())))
    .sort((a, b) => b.test_date.localeCompare(a.test_date))[0];
}

function InfoTooltip({
  id, openTip, setOpenTip,
}: { id: string; openTip: string | null; setOpenTip: (v: string | null) => void }) {
  const isOpen = openTip === id;
  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpenTip(isOpen ? null : id)}
        className="w-5 h-5 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center"
      >
        <Info className="h-2.5 w-2.5 text-slate-500" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-6 z-10 w-56 bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 leading-relaxed shadow-xl">
          {METRIC_INFO[id]}
        </div>
      )}
    </div>
  );
}

function MetricRow({
  label, value, unit, infoKey, openTip, setOpenTip,
}: {
  label: string; value: string; unit: string;
  infoKey: string; openTip: string | null; setOpenTip: (v: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-slate-800 last:border-0">
      <span className="flex-1 text-xs text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-100 tabular-nums">
        {value} <span className="text-xs font-normal text-slate-500">{unit}</span>
      </span>
      <InfoTooltip id={infoKey} openTip={openTip} setOpenTip={setOpenTip} />
    </div>
  );
}

function TestCard({
  title, date, children,
}: { title: string; date?: string; children: ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-slate-100">{title}</span>
        {date && <span className="text-xs text-slate-600">{date}</span>}
      </div>
      {children}
    </div>
  );
}

function ConnectPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <KeyRound className="h-8 w-8 text-slate-600 mb-3" />
      <p className="text-sm font-medium text-slate-300 mb-1">Connect CC Athletics</p>
      <p className="text-xs text-slate-500 max-w-xs">
        Add your CC Athletics API key in Settings → Integrations.
      </p>
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

export function PowerBattery() {
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

  const cmjM  = tests?.cmj?.metrics  as JumpMetrics | undefined;
  const djM   = tests?.dj?.metrics   as JumpMetrics | undefined;
  const imtpM = tests?.imtp?.metrics as IsometricMetrics | undefined;
  const pogoM = tests?.pogo?.metrics as PogoMetrics | undefined;

  const cmjHeight = cmjM?.jump_height_ft ? ftToCm(cmjM.jump_height_ft) : 0;

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
        <TestCard title="Countermovement jump" date={tests?.cmj?.test_date}>
          <MetricRow label="Jump height"       value={cmjHeight > 0 ? cmjHeight.toString() : '—'} unit="cm"   infoKey="cmj_height"    openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Peak force"        value={cmjM.peak_force?.toFixed(0) ?? '—'}          unit="N"    infoKey="cmj_peak_force" openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Avg RFD"           value={cmjM.avg_rfd?.toFixed(0) ?? '—'}             unit="N/s"  infoKey="cmj_rfd"        openTip={openTip} setOpenTip={setOpenTip} />
        </TestCard>
      )}

      {/* Drop Jump */}
      {djM && (
        <TestCard title="Drop jump" date={tests?.dj?.test_date}>
          <MetricRow label="RSI"          value={djM.rsi?.toFixed(2) ?? '—'}          unit=""    infoKey="dj_rsi"     openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Contact time" value={djM.contact_time?.toFixed(0) ?? '—'} unit="ms"  infoKey="dj_contact" openTip={openTip} setOpenTip={setOpenTip} />
        </TestCard>
      )}

      {/* IMTP */}
      {imtpM && (
        <TestCard title="Isometric mid-thigh pull" date={tests?.imtp?.test_date}>
          <MetricRow label="Peak force" value={imtpM.force_peak?.toFixed(0) ?? '—'} unit="N" infoKey="imtp_peak" openTip={openTip} setOpenTip={setOpenTip} />
        </TestCard>
      )}

      {/* Pogo */}
      {pogoM && (
        <TestCard title="Pogo jumps" date={tests?.pogo?.test_date}>
          <MetricRow label="Avg RSI"          value={pogoM.avg_rsi?.toFixed(2) ?? '—'}          unit=""   infoKey="pogo_rsi"     openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Avg contact time" value={pogoM.avg_contact_time?.toFixed(0) ?? '—'} unit="ms" infoKey="pogo_contact" openTip={openTip} setOpenTip={setOpenTip} />
        </TestCard>
      )}

      {!cmjM && !djM && !imtpM && !pogoM && (
        <p className="text-xs text-slate-500 text-center py-10">
          No power screening tests found for <strong className="text-slate-300">{activeAthlete}</strong>.<br />
          Run CMJ, Drop Jump, or IMTP to populate this view.
        </p>
      )}
    </div>
  );
}

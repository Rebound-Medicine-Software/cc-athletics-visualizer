/**
 * AnkleBattery — Chronic Ankle Instability protocol.
 *
 * Tests: SL Pogo left/right (RSI + contact time LSI), SL CMJ left/right (LSI),
 *        Balance note (flagged if balance tests not yet in CC Athletics API feed).
 *
 * Clinical focus: asymmetry in ankle stiffness and reactive power —
 * key markers for chronic ankle instability and lateral sprain recurrence risk.
 *
 * Data source: useCCAthletics hook.
 */
import { useState, useMemo } from 'react';
import { Info, Loader2, KeyRound, AlertCircle } from 'lucide-react';
import { useCCAthletics } from '@/hooks/useCCAthletics';
import type { JumpMetrics, PogoMetrics, TestData } from '@/types/forcePlateTypes';

const METRIC_INFO: Record<string, string> = {
  pogo_rsi_lsi:
    'Pogo RSI limb symmetry index (left vs right). RSI = jump height ÷ contact time. ' +
    'Asymmetry > 10% suggests unilateral ankle stiffness deficit or pain-avoidance compensation.',
  pogo_ct_lsi:
    'Contact time LSI during single leg pogos. Lower contact time = better tendon elasticity. ' +
    'Asymmetric contact time (> 10%) signals the affected side is offloading to avoid discomfort.',
  pogo_rsi_abs:
    'Absolute RSI per limb. Reflects reactive elastic energy storage in the ankle-tendon unit. ' +
    'A score > 1.5 is a solid clinical baseline; > 2.0 is return-to-sport target for most field sports.',
  pogo_ct_abs:
    'Ground contact time per limb (ms). Lower = stiffer, more spring-like ankle mechanics. ' +
    'Target < 220 ms. Elevated values indicate reduced stiffness or protective guarding.',
  sl_cmj:
    'Single leg CMJ jump height (cm). Assesses unilateral explosive leg power. ' +
    'Used here to detect proximal compensation: if CMJ LSI is normal but pogo LSI is impaired, ' +
    'the deficit is ankle-specific rather than whole-limb.',
};

const LEFT_POGO_NAMES  = ['Left Side Pogo Jump', 'Left Pogos'];
const RIGHT_POGO_NAMES = ['Right Side Pogo Jump', 'Right Pogos'];
const LEFT_CMJ_NAMES   = ['Left Side Countermovement Jump', 'Left CMJ'];
const RIGHT_CMJ_NAMES  = ['Right Side Countermovement Jump', 'Right CMJ'];

const ftToCm = (ft: number) => +(ft * 30.48).toFixed(1);

function computeLsi(a: number, b: number): number | null {
  if (!a || !b) return null;
  return +((Math.min(a, b) / Math.max(a, b)) * 100).toFixed(1);
}

function lsiColor(v: number) {
  if (v >= 90) return '#1D9E75';
  if (v >= 80) return '#EF9F27';
  return '#E24B4A';
}

function latest(rows: TestData[], names: string[]): TestData | undefined {
  return rows
    .filter((d) => names.some((n) => d.test_name.toLowerCase().includes(n.toLowerCase())))
    .sort((a, b) => b.test_date.localeCompare(a.test_date))[0];
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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
        <div className="absolute right-0 top-6 z-10 w-56 bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 leading-relaxed shadow-xl">
          {METRIC_INFO[id]}
        </div>
      )}
    </div>
  );
}

function LsiRow({ label, lsi, infoKey, openTip, setOpenTip }: {
  label: string; lsi: number | null; infoKey: string;
  openTip: string | null; setOpenTip: (v: string | null) => void;
}) {
  const color = lsi != null ? lsiColor(lsi) : '#888780';
  return (
    <div className="flex items-center gap-2 py-2 border-b border-slate-800 last:border-0">
      <span className="flex-1 text-xs text-slate-400">{label}</span>
      {lsi != null ? (
        <div className="flex items-center gap-2 flex-1 max-w-[160px]">
          <div className="flex-1 h-1.5 rounded-full bg-slate-800">
            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(lsi, 100)}%`, background: color }} />
          </div>
          <span className="text-xs font-semibold tabular-nums" style={{ color }}>{lsi.toFixed(1)}%</span>
        </div>
      ) : (
        <span className="text-xs text-slate-600 flex-1 max-w-[160px]">No data</span>
      )}
      <InfoTooltip id={infoKey} openTip={openTip} setOpenTip={setOpenTip} />
    </div>
  );
}

function MetricRow({ label, value, unit, infoKey, openTip, setOpenTip }: {
  label: string; value: string; unit: string; infoKey: string;
  openTip: string | null; setOpenTip: (v: string | null) => void;
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

function BiLimbValues({ left, right, unit }: { left: number; right: number; unit: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      {[{ label: 'Left', val: left }, { label: 'Right', val: right }].map(({ label, val }) => (
        <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
          <p className="text-[10px] text-slate-500 mb-1">{label}</p>
          <p className="text-lg font-bold text-slate-100 tabular-nums leading-none">
            {val > 0 ? val : '—'}
            {val > 0 && <span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

function BalanceNote() {
  return (
    <div className="flex items-start gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4">
      <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs font-semibold text-slate-200 mb-1">Balance data</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Single leg balance (CoP sway velocity) is measured via CC Athletics Balance mode.
          Upload a balance session to see sway asymmetry alongside the pogo and CMJ data above.
        </p>
      </div>
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

export function AnkleBattery() {
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
      leftPogo:  latest(rows, LEFT_POGO_NAMES),
      rightPogo: latest(rows, RIGHT_POGO_NAMES),
      leftCmj:   latest(rows, LEFT_CMJ_NAMES),
      rightCmj:  latest(rows, RIGHT_CMJ_NAMES),
    };
  }, [data, activeAthlete]);

  if (!apiKey)   return <ConnectPrompt />;
  if (isLoading) return <LoadingState />;
  if (!data || athletes.length === 0) {
    return <p className="text-xs text-slate-500 text-center py-10">No athlete data. Check your CC Athletics API key in Settings.</p>;
  }

  const leftPogoM  = tests?.leftPogo?.metrics  as PogoMetrics | undefined;
  const rightPogoM = tests?.rightPogo?.metrics as PogoMetrics | undefined;
  const leftCmjH   = tests?.leftCmj  ? ftToCm((tests.leftCmj.metrics  as JumpMetrics).jump_height_ft ?? 0) : 0;
  const rightCmjH  = tests?.rightCmj ? ftToCm((tests.rightCmj.metrics as JumpMetrics).jump_height_ft ?? 0) : 0;

  const leftRsi  = leftPogoM?.avg_rsi ?? 0;
  const rightRsi = rightPogoM?.avg_rsi ?? 0;
  const leftCt   = leftPogoM?.avg_contact_time ?? 0;
  const rightCt  = rightPogoM?.avg_contact_time ?? 0;

  const rsiLsi = computeLsi(leftRsi,  rightRsi);
  // For contact time LSI, higher = worse, so still use min/max for symmetry ratio
  const ctLsi  = computeLsi(leftCt,   rightCt);
  const cmjLsi = computeLsi(leftCmjH, rightCmjH);

  const hasPogoData = leftRsi > 0 || rightRsi > 0;
  const hasCmjData  = leftCmjH > 0 || rightCmjH > 0;

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
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'}
            `}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Pogo section */}
      {hasPogoData && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-100">Single leg pogo</span>
            <span className="text-xs text-slate-600">
              {tests?.leftPogo?.test_date ?? tests?.rightPogo?.test_date ?? ''}
            </span>
          </div>

          {/* Absolute RSI per limb */}
          <BiLimbValues
            left={+leftRsi.toFixed(2)}
            right={+rightRsi.toFixed(2)}
            unit="RSI"
          />

          {/* LSI rows */}
          <LsiRow label="RSI symmetry (LSI)"          lsi={rsiLsi}  infoKey="pogo_rsi_lsi" openTip={openTip} setOpenTip={setOpenTip} />
          <LsiRow label="Contact time symmetry (LSI)" lsi={ctLsi}   infoKey="pogo_ct_lsi"  openTip={openTip} setOpenTip={setOpenTip} />

          {/* Contact time per limb */}
          {(leftCt > 0 || rightCt > 0) && (
            <div className="pt-1">
              <BiLimbValues
                left={leftCt  > 0 ? Math.round(leftCt)  : 0}
                right={rightCt > 0 ? Math.round(rightCt) : 0}
                unit="ms"
              />
            </div>
          )}

          <MetricRow label="Left RSI"           value={leftRsi  > 0 ? leftRsi.toFixed(2)  : '—'} unit="" infoKey="pogo_rsi_abs" openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Right RSI"          value={rightRsi > 0 ? rightRsi.toFixed(2) : '—'} unit="" infoKey="pogo_rsi_abs" openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Left contact time"  value={leftCt   > 0 ? Math.round(leftCt).toString()  : '—'} unit="ms" infoKey="pogo_ct_abs" openTip={openTip} setOpenTip={setOpenTip} />
          <MetricRow label="Right contact time" value={rightCt  > 0 ? Math.round(rightCt).toString() : '—'} unit="ms" infoKey="pogo_ct_abs" openTip={openTip} setOpenTip={setOpenTip} />
        </div>
      )}

      {/* SL CMJ section */}
      {hasCmjData && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-100">Single leg CMJ</span>
            <span className="text-xs text-slate-600">
              {tests?.leftCmj?.test_date ?? tests?.rightCmj?.test_date ?? ''}
            </span>
          </div>
          <BiLimbValues left={leftCmjH} right={rightCmjH} unit="cm" />
          <LsiRow label="CMJ height symmetry (LSI)" lsi={cmjLsi} infoKey="sl_cmj" openTip={openTip} setOpenTip={setOpenTip} />
        </div>
      )}

      {/* Balance note */}
      <BalanceNote />

      {!hasPogoData && !hasCmjData && (
        <p className="text-xs text-slate-500 text-center py-6">
          No ankle instability battery tests found for <strong className="text-slate-300">{activeAthlete}</strong>.<br />
          Run Left/Right Pogo and SL CMJ tests to populate this view.
        </p>
      )}
    </div>
  );
}

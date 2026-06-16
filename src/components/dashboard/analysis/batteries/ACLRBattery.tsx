/**
 * ACLRBattery — Anterior Cruciate Ligament Reconstruction protocol.
 *
 * Tests: SL CMJ left/right (LSI), Drop Jump left/right (LSI), IMTP bilateral.
 * Key return-to-sport metric: Limb Symmetry Index (LSI) ≥ 90% on each test.
 *
 * Data source: useCCAthletics hook (CC Athletics force plate API).
 */
import { useState, useMemo } from 'react';
import { Info, Loader2, KeyRound } from 'lucide-react';
import { useCCAthletics } from '@/hooks/useCCAthletics';
import type { JumpMetrics, IsometricMetrics, TestData } from '@/types/forcePlateTypes';

// ─── Metric explanations (CC Athletics sourced) ────────────────────────────

const METRIC_INFO: Record<string, string> = {
  sl_cmj:
    'Single leg CMJ jump height (cm). Directly measures unilateral explosive leg power. ' +
    'LSI ≥ 90% is the standard return-to-sport threshold post-ACLR.',
  sl_dj:
    'Drop jump RSI (reactive strength index = jump height ÷ contact time). Measures reactive, ' +
    'tendon-driven power. LSI ≥ 90% indicates symmetrical reactive capacity.',
  imtp_peak:
    'Peak isometric force (N) from the mid-thigh pull. Gold standard for maximum neural ' +
    'drive and strength. Used as the bilateral strength baseline in this protocol.',
  imtp_50:
    'Force produced in the first 50 ms — early rate of force development. ' +
    'Often impaired post-ACLR even when peak force has fully recovered.',
  imtp_250:
    'Force at 250 ms bridges early explosive capacity and sustained strength. ' +
    'Key marker for neuromuscular re-education through rehab.',
};

// ─── Test name matching ─────────────────────────────────────────────────────

const LEFT_CMJ  = ['Left Side Countermovement Jump', 'Left CMJ'];
const RIGHT_CMJ = ['Right Side Countermovement Jump', 'Right CMJ'];
const LEFT_DJ   = ['Left Side Drop Jump', 'Left DJ'];
const RIGHT_DJ  = ['Right Side Drop Jump', 'Right DJ'];
const IMTP      = ['Isometric Mid-Thigh Pull', 'IMTP'];

// ─── Helpers ────────────────────────────────────────────────────────────────

const ftToCm = (ft: number) => +(ft * 30.48).toFixed(1);

/** Limb Symmetry Index: smaller ÷ larger × 100 */
function computeLsi(a: number, b: number): number | null {
  if (!a || !b) return null;
  return +((Math.min(a, b) / Math.max(a, b)) * 100).toFixed(1);
}

function lsiColor(v: number) {
  if (v >= 90) return '#22c55e';
  if (v >= 80) return '#f59e0b';
  return '#ef4444';
}

/** Most recent row for a given test name list */
function latest(rows: TestData[], names: string[]): TestData | undefined {
  return rows
    .filter((d) => names.includes(d.test_name))
    .sort((a, b) => b.test_date.localeCompare(a.test_date))[0];
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function InfoTooltip({ id, openTip, setOpenTip }: {
  id: string;
  openTip: string | null;
  setOpenTip: (v: string | null) => void;
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

function LsiBar({ lsi }: { lsi: number | null }) {
  if (lsi === null) return <span className="text-xs text-slate-600">—</span>;
  const color = lsiColor(lsi);
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 rounded-full bg-slate-800">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${Math.min(lsi, 100)}%`, background: color }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums min-w-[40px] text-right" style={{ color }}>
        {lsi.toFixed(1)}%
      </span>
    </div>
  );
}

function BiLimbBlock({
  title,
  date,
  left,
  right,
  unit,
  lsi,
  infoKey,
  openTip,
  setOpenTip,
}: {
  title: string;
  date?: string;
  left: number;
  right: number;
  unit: string;
  lsi: number | null;
  infoKey: string;
  openTip: string | null;
  setOpenTip: (v: string | null) => void;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-100">{title}</span>
          {date && <span className="text-xs text-slate-600">{date}</span>}
        </div>
        <InfoTooltip id={infoKey} openTip={openTip} setOpenTip={setOpenTip} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[{ label: 'Left', val: left }, { label: 'Right', val: right }].map(({ label, val }) => (
          <div key={label} className="bg-slate-800/60 rounded-lg p-3 text-center">
            <p className="text-[10px] text-slate-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-slate-100 tabular-nums leading-none">
              {val > 0 ? val : '—'}
              {val > 0 && <span className="text-xs font-normal text-slate-500 ml-1">{unit}</span>}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider whitespace-nowrap">LSI</span>
        <LsiBar lsi={lsi} />
      </div>
    </div>
  );
}

function ImtpBlock({
  row,
  openTip,
  setOpenTip,
}: {
  row: TestData;
  openTip: string | null;
  setOpenTip: (v: string | null) => void;
}) {
  const m = row.metrics as IsometricMetrics;

  const rows: { label: string; value: string; key: string }[] = [
    { label: 'Peak force',             value: m.force_peak?.toFixed(0)  ?? '—', key: 'imtp_peak' },
    { label: 'Force at 50 ms (early RFD)', value: m.force_50ms?.toFixed(0)  ?? '—', key: 'imtp_50'   },
    { label: 'Force at 250 ms',        value: m.force_250ms?.toFixed(0) ?? '—', key: 'imtp_250'  },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-slate-100">Isometric mid-thigh pull</span>
        <span className="text-xs text-slate-600">{row.test_date}</span>
      </div>
      {rows.map(({ label, value, key }) => (
        <div key={key} className="flex items-center gap-2 py-2 border-b border-slate-800 last:border-0">
          <span className="flex-1 text-xs text-slate-400">{label}</span>
          <span className="text-sm font-semibold text-slate-100 tabular-nums">
            {value} <span className="text-xs font-normal text-slate-500">N</span>
          </span>
          <InfoTooltip id={key} openTip={openTip} setOpenTip={setOpenTip} />
        </div>
      ))}
    </div>
  );
}

// ─── Empty / loading states ──────────────────────────────────────────────────

function ConnectPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <KeyRound className="h-8 w-8 text-slate-600 mb-3" />
      <p className="text-sm font-medium text-slate-300 mb-1">Connect CC Athletics</p>
      <p className="text-xs text-slate-500 max-w-xs">
        Add your CC Athletics API key in Settings → Integrations to load athlete data here.
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

function NoAthlete({ name }: { name: string }) {
  return (
    <p className="text-xs text-slate-500 text-center py-10">
      No ACLR battery tests found for <strong className="text-slate-300">{name}</strong>.<br />
      Run Left/Right CMJ and IMTP tests to populate this view.
    </p>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ACLRBattery() {
  const { data, isLoading, apiKey } = useCCAthletics();
  const [selectedAthlete, setSelectedAthlete] = useState<string>('');
  const [openTip, setOpenTip] = useState<string | null>(null);

  // Unique athlete list
  const athletes = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.map((d) => d.athlete_name))).sort();
  }, [data]);

  const activeAthlete = selectedAthlete || athletes[0] || '';

  // Per-athlete latest rows for each test
  const tests = useMemo(() => {
    if (!data || !activeAthlete) return null;
    const rows = data.filter((d) => d.athlete_name === activeAthlete);
    return {
      leftCmj:  latest(rows, LEFT_CMJ),
      rightCmj: latest(rows, RIGHT_CMJ),
      leftDj:   latest(rows, LEFT_DJ),
      rightDj:  latest(rows, RIGHT_DJ),
      imtp:     latest(rows, IMTP),
    };
  }, [data, activeAthlete]);

  // ── Guards
  if (!apiKey)    return <ConnectPrompt />;
  if (isLoading)  return <LoadingState />;
  if (!data || athletes.length === 0) {
    return (
      <p className="text-xs text-slate-500 text-center py-10">
        No athlete data available. Check your CC Athletics API key in Settings.
      </p>
    );
  }

  // ── Derived values
  const leftCmjH  = tests?.leftCmj  ? ftToCm((tests.leftCmj.metrics  as JumpMetrics).jump_height_ft ?? 0) : 0;
  const rightCmjH = tests?.rightCmj ? ftToCm((tests.rightCmj.metrics as JumpMetrics).jump_height_ft ?? 0) : 0;
  const cmjLsi    = computeLsi(leftCmjH, rightCmjH);

  const leftDjRsi  = tests?.leftDj  ? ((tests.leftDj.metrics  as JumpMetrics).rsi ?? 0) : 0;
  const rightDjRsi = tests?.rightDj ? ((tests.rightDj.metrics as JumpMetrics).rsi ?? 0) : 0;
  const djLsi      = computeLsi(leftDjRsi, rightDjRsi);

  const hasAnyData = leftCmjH > 0 || rightCmjH > 0 || tests?.imtp;

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
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'}
            `}
          >
            {name}
          </button>
        ))}
      </div>

      {!hasAnyData ? (
        <NoAthlete name={activeAthlete} />
      ) : (
        <>
          {/* SL CMJ */}
          {(leftCmjH > 0 || rightCmjH > 0) && (
            <BiLimbBlock
              title="Single leg CMJ"
              date={tests?.leftCmj?.test_date ?? tests?.rightCmj?.test_date}
              left={leftCmjH}
              right={rightCmjH}
              unit="cm"
              lsi={cmjLsi}
              infoKey="sl_cmj"
              openTip={openTip}
              setOpenTip={setOpenTip}
            />
          )}

          {/* Drop Jump */}
          {(leftDjRsi > 0 || rightDjRsi > 0) && (
            <BiLimbBlock
              title="Drop jump (RSI)"
              date={tests?.leftDj?.test_date ?? tests?.rightDj?.test_date}
              left={+leftDjRsi.toFixed(2)}
              right={+rightDjRsi.toFixed(2)}
              unit="RSI"
              lsi={djLsi}
              infoKey="sl_dj"
              openTip={openTip}
              setOpenTip={setOpenTip}
            />
          )}

          {/* IMTP */}
          {tests?.imtp && (
            <ImtpBlock row={tests.imtp} openTip={openTip} setOpenTip={setOpenTip} />
          )}
        </>
      )}
    </div>
  );
}

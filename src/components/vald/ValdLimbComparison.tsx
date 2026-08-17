import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ValdLimbComparison as LimbRow } from "@/lib/valdToCCAthletics";

const fmt = (v: number | null, unit: string) =>
  v == null || Number.isNaN(v) ? "N/A" : `${v.toFixed(2)}${unit ? ` ${unit}` : ""}`;

const asymTone = (pct: number | null) => {
  if (pct == null) return "pr-pill";
  const a = Math.abs(pct);
  if (a <= 10) return "pr-pill pr-pill-positive";
  if (a <= 15) return "pr-pill";
  return "pr-pill pr-pill-negative";
};

interface Props {
  rows: LimbRow[];
  isLoading?: boolean;
  /** Restrict to one mapped test name (e.g. "Countermovement Jump"). */
  testName?: string;
}

/**
 * Left vs Right limb comparison for VALD tests, using the same limb metrics
 * the CC Athletics symmetry logic relies on (peak take-off force, peak landing
 * force, isometric peak force, jump height per limb).
 */
export const ValdLimbComparison = ({ rows, isLoading, testName }: Props) => {
  const filtered = useMemo(
    () => (testName ? rows.filter((r) => r.testName === testName) : rows),
    [rows, testName]
  );

  const latest = filtered[0];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          Left vs Right Comparison
          <Badge variant="secondary">VALD</Badge>
          {latest && <Badge variant="outline">{latest.metricLabel}</Badge>}
        </CardTitle>
        <CardDescription className="text-xs">
          Between-limb values and asymmetry index per test session. Amber above 10%, red above 15%.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading limb detail…</p>}

        {!isLoading && !filtered.length && (
          <p className="text-sm text-muted-foreground">
            No Left/Right limb values were reported for these tests.
          </p>
        )}

        {latest && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="pr-panel p-4">
              <div className="pr-kpi-label">Left</div>
              <div className="pr-kpi-value mt-1">{fmt(latest.left, latest.unit)}</div>
            </div>
            <div className="pr-panel p-4">
              <div className="pr-kpi-label">Right</div>
              <div className="pr-kpi-value mt-1">{fmt(latest.right, latest.unit)}</div>
            </div>
            <div className="pr-panel p-4">
              <div className="pr-kpi-label">Asymmetry</div>
              <div className="pr-kpi-value mt-1">
                {latest.asymmetryPct == null ? "N/A" : `${latest.asymmetryPct.toFixed(1)}%`}
              </div>
              <div className="mt-2">
                <span className={asymTone(latest.asymmetryPct)}>
                  {latest.dominantSide ? `${latest.dominantSide} dominant` : "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((r) => {
              const total = (r.left ?? 0) + (r.right ?? 0);
              const leftPct = total > 0 ? ((r.left ?? 0) / total) * 100 : 50;
              return (
                <div key={`${r.testId}-${r.testDate}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {new Date(r.testDate).toLocaleDateString()} · {r.testName}
                    </span>
                    <span className="font-mono">
                      {fmt(r.left, r.unit)} / {fmt(r.right, r.unit)}
                      {r.asymmetryPct != null && ` · ${r.asymmetryPct.toFixed(1)}%`}
                    </span>
                  </div>
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${leftPct}%` }} />
                    <div className="h-full bg-accent" style={{ width: `${100 - leftPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ValdLimbComparison;

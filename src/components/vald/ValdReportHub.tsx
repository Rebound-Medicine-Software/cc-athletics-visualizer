/**
 * ValdReportHub
 * Main VALD integration component for NEXUS HUB.
 * Drop into any page: <ValdReportHub />
 *
 * Features:
 *  - Athlete dropdown (live from VALD API)
 *  - Test type + date range filter dropdowns
 *  - Test session table (click to select)
 *  - Normative comparison bars (22 sport populations)
 *  - Print to PDF report generation
 */

import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useValdAthletes, useValdTests, useValdTestDetail,
  ValdTest,
} from "@/hooks/useVald";

// ── Normative data (22 sport populations) ────────────────────────────
// Sources: McMahon et al. (2022) Salford UK; Haugen et al. (2020); VALD EFL 2025

interface NormBand { p10?: number; p25: number; p50: number; p75: number; p90?: number }
interface NormEntry { label: string; cmjH: NormBand; rsi: NormBand; djH?: NormBand }

const NORMS: Record<string, NormEntry> = {
  general_male:       { label: "General Athletic — Male",                  cmjH:{p10:26,p25:32,p50:38,p75:45,p90:51},rsi:{p25:0.40,p50:0.55,p75:0.70},djH:{p10:16,p25:20,p50:26,p75:32,p90:37} },
  general_female:     { label: "General Athletic — Female",                cmjH:{p10:18,p25:22,p50:27,p75:33,p90:38},rsi:{p25:0.30,p50:0.42,p75:0.55} },
  football_male:      { label: "Football — Male (Club)",                   cmjH:{p10:28,p25:33,p50:39,p75:45,p90:51},rsi:{p25:0.44,p50:0.60,p75:0.74},djH:{p10:17,p25:21,p50:27,p75:33,p90:38} },
  football_female:    { label: "Football — Female (Club)",                 cmjH:{p10:22,p25:26,p50:31,p75:37,p90:42},rsi:{p25:0.34,p50:0.47,p75:0.60} },
  running_male:       { label: "Running / Athletics — Male",               cmjH:{p10:25,p25:30,p50:36,p75:42,p90:48},rsi:{p25:0.40,p50:0.54,p75:0.68} },
  running_female:     { label: "Running / Athletics — Female",             cmjH:{p10:18,p25:22,p50:27,p75:33,p90:38},rsi:{p25:0.30,p50:0.42,p75:0.54} },
  swimming_male:      { label: "Swimming — Male",                          cmjH:{p10:22,p25:27,p50:32,p75:38,p90:43},rsi:{p25:0.34,p50:0.47,p75:0.60} },
  swimming_female:    { label: "Swimming — Female",                        cmjH:{p10:15,p25:19,p50:23,p75:28,p90:33},rsi:{p25:0.24,p50:0.34,p75:0.46} },
  cycling_male:       { label: "Cycling — Male",                           cmjH:{p10:20,p25:25,p50:30,p75:36,p90:41},rsi:{p25:0.30,p50:0.42,p75:0.54} },
  cycling_female:     { label: "Cycling — Female",                         cmjH:{p10:14,p25:18,p50:22,p75:27,p90:32},rsi:{p25:0.22,p50:0.32,p75:0.44} },
  tennis_male:        { label: "Tennis — Male",                            cmjH:{p10:29,p25:35,p50:42,p75:49,p90:55},rsi:{p25:0.48,p50:0.64,p75:0.78} },
  tennis_female:      { label: "Tennis — Female",                          cmjH:{p10:21,p25:26,p50:32,p75:38,p90:44},rsi:{p25:0.36,p50:0.50,p75:0.64} },
  golf_male:          { label: "Golf — Male (Amateur)",                    cmjH:{p10:20,p25:25,p50:30,p75:36,p90:41},rsi:{p25:0.32,p50:0.44,p75:0.58} },
  golf_female:        { label: "Golf — Female (Amateur)",                  cmjH:{p10:14,p25:17,p50:22,p75:27,p90:31},rsi:{p25:0.24,p50:0.34,p75:0.46} },
  cricket_male:       { label: "Cricket — Male",                           cmjH:{p10:24,p25:29,p50:35,p75:41,p90:47},rsi:{p25:0.38,p50:0.52,p75:0.66} },
  cricket_female:     { label: "Cricket — Female",                         cmjH:{p10:17,p25:21,p50:26,p75:32,p90:37},rsi:{p25:0.28,p50:0.40,p75:0.52} },
  rugby_union_fwd_m:  { label: "Rugby Union — Forwards Male",              cmjH:{p10:30,p25:34,p50:39,p75:45,p90:49},rsi:{p25:0.46,p50:0.60,p75:0.72} },
  rugby_union_bk_m:   { label: "Rugby Union — Backs Male",                 cmjH:{p10:34,p25:39,p50:44,p75:50,p90:54},rsi:{p25:0.52,p50:0.66,p75:0.80} },
  uk_rl_fwd:          { label: "Rugby League — Forwards (McMahon 2022 UK)",cmjH:{p10:28,p25:33,p50:38,p75:43,p90:47},rsi:{p25:0.46,p50:0.58,p75:0.70} },
  uk_rl_bk:           { label: "Rugby League — Backs (McMahon 2022 UK)",   cmjH:{p10:33,p25:38,p50:43,p75:48,p90:52},rsi:{p25:0.52,p50:0.65,p75:0.78} },
  netball_female:     { label: "Netball — Female",                         cmjH:{p10:22,p25:27,p50:33,p75:39,p90:44},rsi:{p25:0.36,p50:0.50,p75:0.64} },
  badminton_male:     { label: "Badminton — Male",                         cmjH:{p10:30,p25:36,p50:43,p75:50,p90:56},rsi:{p25:0.48,p50:0.64,p75:0.78} },
  badminton_female:   { label: "Badminton — Female",                       cmjH:{p10:22,p25:27,p50:33,p75:40,p90:45},rsi:{p25:0.36,p50:0.51,p75:0.65} },
  mma_combat:         { label: "MMA / Combat Sports",                          cmjH:{p10:30,p25:35,p50:41,p75:47,p90:52},rsi:{p25:0.48,p50:0.62,p75:0.76} },
};

// ── Normative bar component ──────────────────────────────────────────────────────

function NormBar({ label, value, band }: { label: string; value: number | null; band: NormBand }) {
  const min = band.p10 ?? band.p25 - (band.p75 - band.p25) * 0.5;
  const max = band.p90 ?? band.p75 + (band.p75 - band.p25) * 0.5;
  const range = max - min;
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / range) * 100));
  const status = value == null ? null : value < band.p25 ? "below" : value > band.p75 ? "above" : "ok";

  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className="flex gap-3 items-baseline">
          {value != null && <span className="text-sm font-bold">{value}</span>}
          {status === "below" && <span className="text-xs text-red-500">Below P25</span>}
          {status === "above" && <span className="text-xs text-green-600">Above P75</span>}
          {status === "ok"    && <span className="text-xs text-teal-600">P25–P75</span>}
          <span className="text-xs text-muted-foreground">P50: {band.p50} | {min.toFixed(2)}–{max.toFixed(2)}</span>
        </div>
      </div>
      <div className="relative h-3 bg-slate-100 rounded-full overflow-visible">
        <div className="absolute top-0 bottom-0 bg-teal-100 rounded-full"
          style={{ left: `${pct(band.p25)}%`, right: `${100 - pct(band.p75)}%` }} />
        <div className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-teal-500"
          style={{ left: `${pct(band.p50)}%` }} />
        {value != null && (
          <div className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md z-10 ${
            status === "below" ? "bg-red-500" : status === "above" ? "bg-green-500" : "bg-slate-700"}`}
            style={{ left: `${pct(value)}%` }} />
        )}
      </div>
    </div>
  );
}

// ── Asymmetry badge ─────────────────────────────────────────────────────────────────

function AsymBadge({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const cls = value > 20 ? "bg-red-100 text-red-700" : value > 10 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
  return <Badge className={`text-xs font-mono ${cls}`}>{value.toFixed(1)}%</Badge>;
}

// ── Main component ──────────────────────────────────────────────────────────────────

export default function ValdReportHub() {
  const [athleteId,  setAthleteId]  = useState<string | null>(null);
  const [testId,     setTestId]     = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("__all__");
  const [dayFilter,  setDayFilter]  = useState(0);
  const [normKey,    setNormKey]    = useState("__none__");

  const { data: athletes,  isLoading: loadingAthletes, error: athleteError } = useValdAthletes();
  const { data: tests,     isLoading: loadingTests  } = useValdTests(athleteId);
  const { data: detail,    isLoading: loadingDetail } = useValdTestDetail(testId);

  const athlete   = useMemo(() => athletes?.find(a => a.id === athleteId) ?? null, [athletes, athleteId]);
  const testTypes = useMemo(() => [...new Set((tests ?? []).map(t => t.type))], [tests]);

  const filteredTests = useMemo(() => {
    let t = tests ?? [];
    if (typeFilter && typeFilter !== "__all__") t = t.filter(x => x.type === typeFilter);
    if (dayFilter)  t = t.filter(x => x.date >= format(subDays(new Date(), dayFilter), "yyyy-MM-dd"));
    return t;
  }, [tests, typeFilter, dayFilter]);

  const norm = normKey && normKey !== "__none__" ? NORMS[normKey] : null;

  const handleAthleteChange = (id: string) => {
    setAthleteId(id);
    setTestId(null);
    setTypeFilter("__all__");
  };

  return (
    <div className="space-y-4 p-4">

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">

        {/* Athlete */}
        <Select onValueChange={handleAthleteChange} disabled={loadingAthletes}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder={loadingAthletes ? "Loading athletes…" : "Select athlete"} />
          </SelectTrigger>
          <SelectContent>
            {(athletes ?? []).map(a => (
              <SelectItem key={a.id} value={a.id}>
                {a.number ? `#${a.number} — ` : ""}{a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Test type */}
        <Select value={typeFilter} onValueChange={setTypeFilter} disabled={!athleteId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All test types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All test types</SelectItem>
            {testTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Date range */}
        <Select value={dayFilter === 0 ? "__all_dates__" : String(dayFilter)} onValueChange={v => setDayFilter(v === "__all_dates__" ? 0 : Number(v))} disabled={!athleteId}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All dates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all_dates__">All dates</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 3 months</SelectItem>
            <SelectItem value="180">Last 6 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>

        {/* Normative comparison */}
        <Select value={normKey} onValueChange={setNormKey}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="No normative comparison" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No comparison</SelectItem>
            <SelectGroup><SelectLabel>General</SelectLabel>
              <SelectItem value="general_male">General Athletic — Male</SelectItem>
              <SelectItem value="general_female">General Athletic — Female</SelectItem>
            </SelectGroup>
            <SelectGroup><SelectLabel>Football</SelectLabel>
              <SelectItem value="football_male">Football — Male</SelectItem>
              <SelectItem value="football_female">Football — Female</SelectItem>
            </SelectGroup>
            <SelectGroup><SelectLabel>Running</SelectLabel>
              <SelectItem value="running_male">Running — Male</SelectItem>
              <SelectItem value="running_female">Running — Female</SelectItem>
            </SelectGroup>
            <SelectGroup><SelectLabel>Swimming</SelectLabel>
              <SelectItem value="swimming_male">Swimming — Male</SelectItem>
              <SelectItem value="swimming_female">Swimming — Female</SelectItem>
            </SelectGroup>
            <SelectGroup><SelectLabel>Cycling</SelectLabel>
              <SelectItem value="cycling_male">Cycling — Male</SelectItem>
              <SelectItem value="cycling_female">Cycling — Female</SelectItem>
            </SelectGroup>
            <SelectGroup><SelectLabel>Tennis</SelectLabel>
              <SelectItem value="tennis_male">Tennis — Male</SelectItem>
              <SelectItem value="tennis_female">Tennis — Female</SelectItem>
            </SelectGroup>
            <SelectGroup><SelectLabel>Golf</SelectLabel>
              <SelectItem value="golf_male">Golf — Male</SelectItem>
              <SelectItem value="golf_female">Golf — Female</SelectItem>
            </SelectGroup>
            <SelectGroup><SelectLabel>Cricket</SelectLabel>
              <SelectItem value="cricket_male">Cricket — Male</SelectItem>
              <SelectItem value="cricket_female">Cricket — Female</SelectItem>
            </SelectGroup>
            <SelectGroup><SelectLabel>Rugby</SelectLabel>
              <SelectItem value="rugby_union_fwd_m">Rugby Union — Forwards</SelectItem>
              <SelectItem value="rugby_union_bk_m">Rugby Union — Backs</SelectItem>
              <SelectItem value="uk_rl_fwd">Rugby League — Forwards (UK)</SelectItem>
              <SelectItem value="uk_rl_bk">Rugby League — Backs (UK)</SelectItem>
            </SelectGroup>
            <SelectGroup><SelectLabel>Netball / Badminton</SelectLabel>
              <SelectItem value="netball_female">Netball — Female</SelectItem>
              <SelectItem value="badminton_male">Badminton — Male</SelectItem>
              <SelectItem value="badminton_female">Badminton — Female</SelectItem>
            </SelectGroup>
            <SelectGroup><SelectLabel>MMA / Combat</SelectLabel>
              <SelectItem value="mma_combat">MMA / Combat Sports</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <Button
          disabled={!testId || loadingDetail}
          onClick={() => window.print()}
          className="ml-auto"
        >
          {loadingDetail ? "Loading…" : "Generate Report"}
        </Button>
      </div>

      {/* Error */}
      {athleteError && (
        <Alert variant="destructive">
          <AlertDescription>
            Could not connect to VALD API. Check the <code>vald-bridge</code> edge function is deployed and Supabase Secrets are set.
          </AlertDescription>
        </Alert>
      )}

      {/* Athlete header */}
      {athlete && (
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="py-3 px-4 flex gap-6 flex-wrap">
            <div>
              {athlete.number && <div className="text-xs font-mono text-teal-600 font-bold tracking-widest">#{athlete.number}</div>}
              <div className="text-lg font-bold">{athlete.name}</div>
              <div className="text-sm text-muted-foreground">
                {[athlete.teams, athlete.sex, athlete.dob ? `b. ${athlete.dob.slice(0,4)}` : ""].filter(Boolean).join(" · ")}
              </div>
            </div>
            {!loadingTests && tests && (
              <div className="text-sm text-muted-foreground self-center">
                {tests.length} sessions · {filteredTests.length} shown
              </div>
            )}
            {loadingTests && <Skeleton className="h-10 w-40 self-center" />}
          </CardContent>
        </Card>
      )}

      {/* Test table */}
      {athleteId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
              Test Sessions {filteredTests.length > 0 && `(${filteredTests.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingTests ? (
              <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : filteredTests.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm italic">No sessions match the current filters</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="w-8 py-2 px-3" />
                      <th className="py-2 px-3 text-left font-mono text-xs text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="py-2 px-3 text-left font-mono text-xs text-muted-foreground uppercase tracking-wide">Type</th>
                      <th className="py-2 px-3 text-right font-mono text-xs text-muted-foreground uppercase tracking-wide">CMJ</th>
                      <th className="py-2 px-3 text-right font-mono text-xs text-muted-foreground uppercase tracking-wide">Asym</th>
                      <th className="py-2 px-3 text-right font-mono text-xs text-muted-foreground uppercase tracking-wide">DJ</th>
                      <th className="py-2 px-3 text-right font-mono text-xs text-muted-foreground uppercase tracking-wide">Pogo</th>
                      <th className="py-2 px-3 text-right font-mono text-xs text-muted-foreground uppercase tracking-wide">RSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTests.map((t: ValdTest) => {
                      const sel = t.id === testId;
                      return (
                        <tr key={t.id} onClick={() => setTestId(sel ? null : t.id)}
                          className={`border-b cursor-pointer hover:bg-slate-50 ${sel ? "bg-teal-50 border-l-2 border-l-teal-500" : ""}`}>
                          <td className="py-2 px-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${sel ? "bg-teal-500 border-teal-500" : "border-teal-400"}`}>
                              {sel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </td>
                          <td className="py-2 px-3 font-medium whitespace-nowrap">
                            {t.date ? format(new Date(t.date + "T12:00:00"), "d MMM yyyy") : "—"}
                          </td>
                          <td className="py-2 px-3 font-semibold">{t.type}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{t.cmjH ?? "—"}</td>
                          <td className="py-2 px-3 text-right"><AsymBadge value={t.cmjAsym} /></td>
                          <td className="py-2 px-3 text-right font-mono">{t.djH ?? "—"}</td>
                          <td className="py-2 px-3 text-right font-mono">{t.pjH ?? "—"}</td>
                          <td className="py-2 px-3 text-right font-mono">{t.cmjRSI ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Normative comparison */}
      {norm && testId && (
        <Card className="border-t-4 border-t-teal-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
              Normative Comparison — {norm.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingDetail ? <Skeleton className="h-32 w-full" /> : (
              <>
                <NormBar label="CMJ Height (cm)" value={detail?.cmjH ?? null}  band={norm.cmjH} />
                <NormBar label="RSI-Modified"    value={detail?.cmjRSI ?? null} band={norm.rsi}  />
                {norm.djH && <NormBar label="Drop Jump (cm)" value={detail?.djH ?? null} band={norm.djH} />}
                <p className="text-xs text-muted-foreground mt-3">
                  Sources: McMahon et al. (2022) Univ. Salford UK · Haugen et al. (2020) · VALD EFL 2025
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected test metric cards */}
      {detail && testId && !loadingDetail && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { label: "CMJ Height",   val: detail.cmjH,   unit: "cm" },
            { label: "Peak Power",   val: detail.cmjPP,  unit: "W"  },
            { label: "RSI-Modified", val: detail.cmjRSI, unit: ""   },
            { label: "Asymmetry",    val: detail.cmjAsym,unit: "%"  },
            { label: "DJ Height",    val: detail.djH,    unit: "cm" },
            { label: "DJ RSI",       val: detail.djRSI,  unit: ""   },
            { label: "Pogo Height",  val: detail.pjH,    unit: "cm" },
            { label: "Pogo RSI",     val: detail.pjRSI,  unit: ""   },
          ] as { label: string; val: number | null; unit: string }[])
            .filter(m => m.val != null)
            .map(m => (
              <Card key={m.label} className="p-3">
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1">{m.label}</div>
                <div className="text-2xl font-bold">
                  {m.val}
                  {m.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{m.unit}</span>}
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* Limb comparison */}
      {detail && detail.cmjHL != null && detail.cmjHR != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-mono uppercase tracking-widest text-muted-foreground">Between-Limb Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="text-blue-600 font-bold">LEFT {detail.cmjHL} cm</span>
              <span className="text-muted-foreground">CMJ Height</span>
              <span className="text-red-600 font-bold">RIGHT {detail.cmjHR} cm</span>
            </div>
            <div className="flex h-3 gap-0.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 rounded-l-full" style={{ flex: detail.cmjHL }} />
              <div className="bg-red-500 rounded-r-full"  style={{ flex: detail.cmjHR }} />
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

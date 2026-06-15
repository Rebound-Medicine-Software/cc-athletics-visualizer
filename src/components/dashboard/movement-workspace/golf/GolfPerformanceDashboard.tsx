import { useMemo, useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, Database, FolderPlus, Save, Sparkles, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import '@/lib/movement-engine/modules/golf'; // self-register
import { getModule } from '@/lib/movement-engine/core/moduleRegistry';
import type { MovementSession, MovementEvent } from '@/lib/movement-engine/core/types';
import { computeGolfKpis, type GolfKpis } from '@/lib/movement-engine/modules/golf/kpis';
import { computeGolfCop } from '@/lib/movement-engine/modules/golf/cop';
import { deriveGolfInsights, type GolfFindings } from '@/lib/movement-engine/modules/golf/insights';
import { saveGolfMetrics, createGolfSessionRow } from '@/lib/movement-engine/modules/golf/persist';
import { useAthletes } from '@/hooks/useAthletes';

import { GolfKpiStrip } from './GolfKpiStrip';
import { GolfForceTraceChart } from './GolfForceTraceChart';
import { GolfSwingSelector } from './GolfSwingSelector';
import { GolfInsightsPanel } from './GolfInsightsPanel';
import { GolfCoachTagsPanel } from './GolfCoachTagsPanel';
import { GolfBenchmarkPanel } from './GolfBenchmarkPanel';
import { GolfAiSummaryCard } from './GolfAiSummaryCard';
import { GolfCopPlayback } from './GolfCopPlayback';
import { ComingSoonTab } from './ComingSoonTab';
import { GolfDatabasePicker } from './database/GolfDatabasePicker';
import { GolfDatabaseHeader } from './database/GolfDatabaseHeader';
import { useGolfHydration } from './useGolfHydration';
import { VideoSyncTab } from './video/VideoSyncTab';
import { SessionCompareTab } from './compare/SessionCompareTab';
import { ReportTab } from './report/ReportTab';

type Mode = 'database' | 'quick' | 'batch';

interface Props { onBack: () => void; }

export function GolfPerformanceDashboard({ onBack }: Props) {
  const [mode, setMode] = useState<Mode>('quick');
  const [session, setSession] = useState<MovementSession | null>(null);
  const [events, setEvents] = useState<MovementEvent[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [overlayMode, setOverlayMode] = useState<'off' | 'best_worst' | 'all'>('off');
  const [overlayIndices, setOverlayIndices] = useState<number[]>([]);
  const [coachTags, setCoachTags] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState<string | undefined>();
  const [aiLoading, setAiLoading] = useState(false);
  const [parsing, setParsing] = useState(false);

  // Database mode state
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>();
  const [sessionMeta, setSessionMeta] = useState<{ athleteName: string; testDate: string; fileName: string | null; teamId: string | null; athleteId: string | null; lastAnalysedAt?: string; videoMeta?: any } | null>(null);
  const hydration = useGolfHydration(selectedSessionId);

  const golf = getModule('golf_swing');
  const { data: athletes = [] } = useAthletes();
  const [saveAthleteId, setSaveAthleteId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // Apply hydrated data
  useEffect(() => {
    const h = hydration.data;
    if (!h) return;
    setSession(h.session);
    setEvents(h.events);
    setSelectedIndex(1);
    setCoachTags(h.persisted.coach_tags ?? []);
    setAiSummary(h.persisted.ai_summary);
    setSessionMeta({
      athleteName: h.athleteName,
      testDate: h.testDate,
      fileName: h.fileName,
      teamId: null,
      athleteId: h.athleteId,
      lastAnalysedAt: h.persisted.last_analysed_at,
      videoMeta: h.persisted.video,
    });
  }, [hydration.data]);

  const handleFile = useCallback(async (file: File) => {
    if (!golf) return;
    setParsing(true);
    try {
      const sess = await golf.parse(file, file.name);
      const ev = golf.detectEvents(sess);
      ev.forEach((e) => { e.phaseMarkers = golf.detectPhases(e, sess); });
      setSession(sess);
      setEvents(ev);
      setSelectedIndex(1);
      setOverlayMode('off');
      setOverlayIndices([]);
      setAiSummary(undefined);
      setCoachTags([]);
      setSelectedSessionId(undefined);
      setSessionMeta(null);
      if (!ev.length) toast.warning('File parsed but no swings detected.');
      else toast.success(`Parsed ${sess.samples.length} samples — detected ${ev.length} swing${ev.length === 1 ? '' : 's'}.`);
    } catch (e: any) {
      toast.error(`Failed to parse: ${e?.message ?? e}`);
    } finally { setParsing(false); }
  }, [golf]);

  const scoring = useMemo(() => {
    if (!golf || !session || !events.length) return null;
    return golf.scoreEvents(events, session);
  }, [golf, session, events]);

  const kpisList: GolfKpis[] = useMemo(() => {
    if (!session || !events.length) return [];
    return events.map((e) => computeGolfKpis(e, session));
  }, [session, events]);

  const currentKpis: GolfKpis = useMemo(() => {
    if (!kpisList.length) {
      return {
        peak_force: 0, lead_load_pct: 0, trail_load_pct: 0, weight_transfer_pct: 0,
        tempo_ratio: 0, cop_quality: 0, transition_ms: 0, peak_impact_force: 0, cop_efficiency: 0,
      };
    }
    return kpisList[Math.max(0, Math.min(selectedIndex - 1, kpisList.length - 1))];
  }, [kpisList, selectedIndex]);

  const findings: GolfFindings = useMemo(() => deriveGolfInsights(kpisList), [kpisList]);

  const cop = useMemo(() => {
    if (!session || !events[selectedIndex - 1]) return null;
    return computeGolfCop(events[selectedIndex - 1], session);
  }, [session, events, selectedIndex]);

  // Persistence wrappers — fire-and-forget if no testDataId yet
  const updateCoachTags = useCallback((next: string[]) => {
    setCoachTags(next);
    if (selectedSessionId) {
      saveGolfMetrics(selectedSessionId, { coach_tags: next })
        .catch((e) => toast.error(`Tag save failed: ${e?.message ?? e}`));
    }
  }, [selectedSessionId]);

  const generateAiSummary = async () => {
    if (!session || !kpisList.length) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-golf-summary', {
        body: { kpis: kpisList, coachTags, findings, mode: 'session' },
      });
      if (error) throw error;
      const text = data?.summary ?? 'Summary unavailable.';
      setAiSummary(text);
      if (selectedSessionId) await saveGolfMetrics(selectedSessionId, { ai_summary: text });
    } catch (e: any) {
      const lead = avg(kpisList.map((k) => k.lead_load_pct));
      const tempo = avg(kpisList.map((k) => k.tempo_ratio));
      const fallback =
        `Session contains ${kpisList.length} swing${kpisList.length === 1 ? '' : 's'}. ` +
        `Average lead-side loading at impact: ${lead.toFixed(0)}%. Average tempo ratio: ${tempo.toFixed(2)}. ` +
        `Key technical findings: ${findings.technical.slice(0, 2).map((t: any) => t.label).join('; ') || 'none flagged'}.`;
      setAiSummary(fallback);
      if (selectedSessionId) await saveGolfMetrics(selectedSessionId, { ai_summary: fallback }).catch(() => {});
      console.warn('AI summary fallback used:', e?.message);
    } finally { setAiLoading(false); }
  };

  const buildPersistPayload = () => ({
    swings: events.map((e, i) => ({ index: e.index, score: scoring?.scores[i], phase_markers: e.phaseMarkers, kpis: kpisList[i] })),
    phase_markers: events[selectedIndex - 1]?.phaseMarkers,
    session_kpis: currentKpis,
    coach_tags: coachTags,
    ai_summary: aiSummary,
    format: session?.format,
    source_file: session?.sourceFile,
  });

  const saveToAthlete = async () => {
    if (!saveAthleteId || !session) return;
    const athlete = athletes.find((a) => a.id === saveAthleteId);
    if (!athlete) return;
    setSaving(true);
    try {
      // Look up team_id for the athlete
      const { data: aRow } = await supabase.from('athletes').select('team_id, name').eq('id', saveAthleteId).maybeSingle();
      if (!aRow?.team_id) throw new Error('Athlete is not assigned to a team.');
      const id = await createGolfSessionRow({
        athleteId: saveAthleteId,
        athleteName: aRow.name ?? athlete.name,
        teamId: aRow.team_id,
        teamName: athlete.team,
        testDate: new Date().toISOString().slice(0, 10),
        fileName: session.sourceFile,
        payload: buildPersistPayload(),
      });
      toast.success('Saved to athlete.');
      setMode('database');
      setSelectedSessionId(id);
    } catch (e: any) {
      toast.error(`Save failed: ${e?.message ?? e}`);
    } finally { setSaving(false); }
  };

  const headerControls = (
    <div className="flex items-center gap-1 rounded-md border bg-card p-1">
      {(['database', 'quick', 'batch'] as Mode[]).map((m) => (
        <Button key={m} size="sm" variant={mode === m ? 'default' : 'ghost'}
          onClick={() => setMode(m)} className="h-7 px-3 text-xs capitalize">
          {m === 'database' && <Database className="h-3 w-3 mr-1" />}
          {m === 'quick' && <Upload className="h-3 w-3 mr-1" />}
          {m === 'batch' && <FolderPlus className="h-3 w-3 mr-1" />}
          {m === 'quick' ? 'Quick Analysis' : m === 'batch' ? 'Batch Import' : 'Database'}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Workspace
          </Button>
          <Badge variant="outline" className="uppercase tracking-widest text-[10px]">Golf Module</Badge>
          <h1 className="text-2xl font-semibold tracking-tight">Golf Performance</h1>
        </div>
        {headerControls}
      </header>

      {mode === 'database' && !selectedSessionId && (
        <GolfDatabasePicker onSelect={(id) => setSelectedSessionId(id)} />
      )}

      {mode === 'database' && selectedSessionId && hydration.isLoading && (
        <Card className="p-8 text-center text-slate-400 bg-slate-950 border-slate-800">
          <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" /> Hydrating session…
        </Card>
      )}

      {mode === 'batch' && (
        <Card className="p-8 text-center text-muted-foreground">
          <FolderPlus className="mx-auto h-8 w-8 mb-3 opacity-40" />
          <p className="font-medium text-foreground">Batch Import</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Use the existing <strong>CSV Import</strong> flow with Test Type = <em>Movement</em> and Subtype =
            <em> Golf Swing</em>. Imported sessions appear in Database mode here.
          </p>
        </Card>
      )}

      {(mode === 'quick' || (mode === 'database' && selectedSessionId && hydration.data)) && (
        <AnimatePresence mode="wait">
          {!session ? (
            mode === 'quick' && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="p-10 border-dashed border-2 text-center cursor-pointer hover:border-primary transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                >
                  <Upload className="mx-auto h-10 w-10 text-primary/60 mb-4" />
                  <h3 className="text-lg font-semibold">Drop a golf force-trace file</h3>
                  <p className="text-sm text-muted-foreground mt-1">CSV or TXT — ForceMate, CC Athletics, Swing Catalyst, Smart2Move or generic.</p>
                  <input id="golf-upload" type="file" accept=".csv,.txt" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  <Button className="mt-4" onClick={() => document.getElementById('golf-upload')?.click()} disabled={parsing}>
                    {parsing ? 'Parsing…' : 'Choose File'}
                  </Button>
                </Card>
              </motion.div>
            )
          ) : (
            <motion.div key="dash" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {mode === 'database' && sessionMeta && (
                <GolfDatabaseHeader
                  athleteName={sessionMeta.athleteName}
                  testDate={sessionMeta.testDate}
                  fileName={sessionMeta.fileName}
                  lastAnalysedAt={sessionMeta.lastAnalysedAt}
                  onChange={() => { setSelectedSessionId(undefined); setSession(null); setEvents([]); setSessionMeta(null); }}
                />
              )}

              <Card className="p-3 flex items-center justify-between flex-wrap gap-2 bg-slate-950 border-slate-800 text-slate-100">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="border-slate-700 text-slate-300">{session.format}</Badge>
                  <span className="text-slate-400">{session.sourceFile}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{session.sampleRateHz} Hz</span>
                  {session.bodyMassKg && <><span className="text-slate-500">·</span>
                    <span className="text-slate-400">{session.bodyMassKg} kg</span></>}
                </div>
                <div className="flex gap-2 items-center">
                  {mode === 'quick' && (
                    <>
                      <Select value={saveAthleteId} onValueChange={setSaveAthleteId}>
                        <SelectTrigger className="h-8 w-44 bg-slate-900 border-slate-700 text-xs">
                          <SelectValue placeholder="Pick athlete…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {athletes.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="default" disabled={!saveAthleteId || saving} onClick={saveToAthlete}>
                        <Save className="h-3 w-3 mr-1" /> {saving ? 'Saving…' : 'Save to Athlete'}
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" onClick={() => { setSession(null); setEvents([]); setSelectedSessionId(undefined); }} className="border-slate-700">
                    New File
                  </Button>
                </div>
              </Card>

              <GolfKpiStrip
                kpis={currentKpis}
                swingCount={events.length}
                bestScore={scoring?.scores[scoring.best] ?? 0}
                consistency={scoring?.consistency ?? 0}
              />

              <Tabs defaultValue="overview">
                <TabsList className="bg-slate-900 border border-slate-800">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="cop">CoP</TabsTrigger>
                  <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="video">Video Sync</TabsTrigger>
                  <TabsTrigger value="compare">Session Compare</TabsTrigger>
                  <TabsTrigger value="report">Report</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-3 mt-3">
                  <GolfSwingSelector
                    count={events.length}
                    selectedIndex={selectedIndex}
                    bestIndex={scoring?.best ?? 0}
                    worstIndex={scoring?.worst ?? 0}
                    overlayIndices={overlayIndices}
                    overlayMode={overlayMode}
                    onSelect={setSelectedIndex}
                    onOverlayChange={(m, custom) => { setOverlayMode(m); setOverlayIndices(custom ?? []); }}
                  />
                  <GolfForceTraceChart
                    session={session}
                    events={events}
                    selectedIndex={overlayMode === 'off' ? selectedIndex : 0}
                    overlayIndices={overlayMode !== 'off' ? overlayIndices : undefined}
                  />
                  <GolfCoachTagsPanel tags={coachTags} onChange={updateCoachTags} />
                </TabsContent>

                <TabsContent value="cop" className="mt-3">
                  {cop ? <GolfCopPlayback cop={cop} /> : <ComingSoonTab title="No CoP data" description="Select a swing to view CoP playback." />}
                </TabsContent>

                <TabsContent value="benchmarks" className="mt-3">
                  <GolfBenchmarkPanel kpis={currentKpis} />
                </TabsContent>

                <TabsContent value="insights" className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Practitioner Insights</h2>
                    <Button size="sm" variant="secondary" onClick={generateAiSummary} disabled={aiLoading}>
                      <Sparkles className="h-3 w-3 mr-1" /> {aiLoading ? 'Generating…' : 'Generate AI Summary'}
                    </Button>
                  </div>
                  <GolfAiSummaryCard summary={aiSummary} loading={aiLoading} />
                  <GolfInsightsPanel findings={findings} />
                </TabsContent>

                <TabsContent value="video" className="mt-3">
                  <VideoSyncTab
                    testDataId={selectedSessionId}
                    teamId={sessionMeta?.teamId}
                    athleteId={sessionMeta?.athleteId}
                    events={events}
                    initialVideo={sessionMeta?.videoMeta}
                  />
                </TabsContent>

                <TabsContent value="compare" className="mt-3">
                  <SessionCompareTab />
                </TabsContent>

                <TabsContent value="report" className="mt-3">
                  <ReportTab
                    athleteName={sessionMeta?.athleteName ?? ''}
                    testDate={sessionMeta?.testDate ?? new Date().toISOString().slice(0, 10)}
                    session={session}
                    events={events}
                    kpis={currentKpis}
                    swingScores={scoring?.scores ?? []}
                    bestIndex={scoring?.best ?? 0}
                    worstIndex={scoring?.worst ?? 0}
                    consistency={scoring?.consistency ?? 0}
                    findings={findings}
                    coachTags={coachTags}
                    aiSummary={aiSummary}
                  />
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function avg(xs: number[]) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Upload, Database, FolderPlus, Save, Sparkles, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

import '@/lib/movement-engine/modules/golf'; // self-register
import { getModule } from '@/lib/movement-engine/core/moduleRegistry';
import type { MovementSession, MovementEvent } from '@/lib/movement-engine/core/types';
import { computeGolfKpis, type GolfKpis } from '@/lib/movement-engine/modules/golf/kpis';
import { computeGolfCop } from '@/lib/movement-engine/modules/golf/cop';
import { detectGolfPhases } from '@/lib/movement-engine/modules/golf/phases';
import { deriveGolfInsights, type GolfFindings } from '@/lib/movement-engine/modules/golf/insights';

import { GolfKpiStrip } from './GolfKpiStrip';
import { GolfForceTraceChart } from './GolfForceTraceChart';
import { GolfSwingSelector } from './GolfSwingSelector';
import { GolfInsightsPanel } from './GolfInsightsPanel';
import { GolfCoachTagsPanel } from './GolfCoachTagsPanel';
import { GolfBenchmarkPanel } from './GolfBenchmarkPanel';
import { GolfAiSummaryCard } from './GolfAiSummaryCard';
import { GolfCopPlayback } from './GolfCopPlayback';
import { ComingSoonTab } from './ComingSoonTab';

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

  const golf = getModule('golf_swing');

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
    if (!kpisList.length) return computeGolfKpis({ index: 0, startTime: 0, endTime: 0, phaseMarkers: [] }, session as any);
    return kpisList[Math.max(0, Math.min(selectedIndex - 1, kpisList.length - 1))];
  }, [kpisList, selectedIndex, session]);

  const findings: GolfFindings = useMemo(() => deriveGolfInsights(kpisList), [kpisList]);

  const cop = useMemo(() => {
    if (!session || !events[selectedIndex - 1]) return null;
    return computeGolfCop(events[selectedIndex - 1], session);
  }, [session, events, selectedIndex]);

  const generateAiSummary = async () => {
    if (!session || !kpisList.length) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-golf-summary', {
        body: { kpis: kpisList, coachTags, findings },
      });
      if (error) throw error;
      setAiSummary(data?.summary ?? 'Summary unavailable.');
    } catch (e: any) {
      // graceful local fallback
      const lead = avg(kpisList.map((k) => k.lead_load_pct));
      const tempo = avg(kpisList.map((k) => k.tempo_ratio));
      setAiSummary(
        `Session contains ${kpisList.length} swing${kpisList.length === 1 ? '' : 's'}. ` +
        `Average lead-side loading at impact: ${lead.toFixed(0)}%. Average tempo ratio: ${tempo.toFixed(2)}. ` +
        `Key technical findings: ${findings.technical.slice(0, 2).map((t) => t.label).join('; ') || 'none flagged'}.`
      );
      console.warn('AI summary fallback used:', e?.message);
    } finally { setAiLoading(false); }
  };

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
      </header>

      {mode === 'database' && (
        <Card className="p-8 text-center text-muted-foreground">
          <Database className="mx-auto h-8 w-8 mb-3 opacity-40" />
          <p className="font-medium text-foreground">Database Analysis</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Open a saved golf session from <strong>Performance Data → Movement → Golf Swing</strong> and click
            "Open Golf Dashboard" to load it here for longitudinal monitoring and reporting.
          </p>
        </Card>
      )}
      {mode === 'batch' && (
        <Card className="p-8 text-center text-muted-foreground">
          <FolderPlus className="mx-auto h-8 w-8 mb-3 opacity-40" />
          <p className="font-medium text-foreground">Batch Import</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Use the existing <strong>CSV Import</strong> flow with Test Type = <em>Movement</em> and Subtype =
            <em> Golf Swing</em>. Imported sessions are auto-routed into this dashboard.
          </p>
        </Card>
      )}

      {mode === 'quick' && (
        <AnimatePresence mode="wait">
          {!session ? (
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
          ) : (
            <motion.div key="dash" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="p-3 flex items-center justify-between flex-wrap gap-2 bg-slate-950 border-slate-800 text-slate-100">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="border-slate-700 text-slate-300">{session.format}</Badge>
                  <span className="text-slate-400">{session.sourceFile}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{session.sampleRateHz} Hz</span>
                  {session.bodyMassKg && <><span className="text-slate-500">·</span>
                    <span className="text-slate-400">{session.bodyMassKg} kg</span></>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setSession(null); setEvents([]); }} className="border-slate-700">
                    New File
                  </Button>
                  <Button size="sm" variant="default" onClick={() => toast.info('Open the CSV Import flow to save this session to an athlete.')}>
                    <Save className="h-3 w-3 mr-1" /> Save to Athlete
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
                  <TabsTrigger value="compare">Swing Compare</TabsTrigger>
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
                  <GolfCoachTagsPanel tags={coachTags} onChange={setCoachTags} />
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
                  <ComingSoonTab
                    title="Video Sync — preview"
                    description="Upload a coach video and snap-to-impact to align with the force trace. Full bidirectional sync ships in the next iteration; the engine and syncBus are already in place."
                  />
                </TabsContent>

                <TabsContent value="compare" className="mt-3">
                  <ComingSoonTab
                    title="Swing Compare"
                    description="Compare Session A vs Session B once a second saved session is available."
                  />
                </TabsContent>

                <TabsContent value="report" className="mt-3">
                  <Card className="p-6 bg-slate-950 border-slate-800 text-slate-100 space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-400" />
                      <h3 className="text-sm uppercase tracking-widest text-amber-300">Golf Report</h3>
                    </div>
                    <p className="text-sm text-slate-400">
                      The report builder packages session summary, best/average swing, force traces,
                      CoP path, swing phases, technical/physical findings, programming focus, AI summary
                      and coach tags into a luxury interactive HTML + PDF.
                    </p>
                    <Button variant="outline" className="border-amber-500/40 text-amber-300"
                      onClick={() => toast.info('Report generation ships in the next iteration. All data is already captured.')}>
                      Generate Golf Report (preview)
                    </Button>
                  </Card>
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

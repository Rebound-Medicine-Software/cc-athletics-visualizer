import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Upload, FileSpreadsheet, Wand2, Trash2, X, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTeamId, useIsViewAsMode } from '@/lib/impersonation/useEffectiveTeamId';
import { useEffectiveTier } from '@/lib/impersonation/useEffectiveTeam';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { VideoPreviewButton, toEmbedUrl } from '../shared/VideoPreviewButton';
import { EXERCISE_CATEGORIES } from './types';

interface Diagnostics {
  byte_length?: number;
  estimated_line_count?: number;
  source_url_used?: string;
  rows_fetched: number;
  rows_parsed: number;
  skipped_empty: number;
  parse_errors: number;
}

type ImportMode = 'create_only' | 'update_by_name' | 'update_by_url' | 'skip_duplicates';
type RowStatus = 'new' | 'duplicate' | 'will_update' | 'invalid';

interface PreviewRow {
  id: string;
  name: string;
  video_url: string;
  start_position: string;
  end_position: string;
  description: string;
  primary_muscles: string;
  equipment: string;
  category: string;
  selected: boolean;
  status: RowStatus;
  error?: string;
  matchedId?: string | null;
  aiApplied?: boolean;
}

// ----- CSV parsing using PapaParse (robust: quoted cells, embedded newlines, commas) -----
const parseCsv = (text: string): { grid: string[][]; skippedEmpty: number; parseErrors: number } => {
  const cleaned = text.replace(/^\uFEFF/, '');
  const result = Papa.parse<string[]>(cleaned, {
    skipEmptyLines: false,
    dynamicTyping: false,
    transform: (v) => (typeof v === 'string' ? v : String(v ?? '')),
  });
  const all = (result.data ?? []) as string[][];
  let skippedEmpty = 0;
  const grid = all.filter((r) => {
    const keep = Array.isArray(r) && r.some((c) => (c ?? '').toString().trim() !== '');
    if (!keep) skippedEmpty++;
    return keep;
  });
  return { grid, skippedEmpty, parseErrors: result.errors?.length ?? 0 };
};

// Strip BOM, zero-width chars, surrounding quotes; lowercase; remove all whitespace/punct
const norm = (s: string) =>
  (s ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\u2060]/g, '')
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .toLowerCase()
    .replace(/[\s_\-./]+/g, '');

const FIELD_ALIASES: Record<string, keyof PreviewRow> = {
  exercise: 'name',
  exercisename: 'name',
  name: 'name',
  movement: 'name',
  movementname: 'name',
  exercisetitle: 'name',
  title: 'name',
  url: 'video_url',
  videourl: 'video_url',
  video: 'video_url',
  videolink: 'video_url',
  link: 'video_url',
  youtube: 'video_url',
  youtubeurl: 'video_url',
  exercisestartposition: 'start_position',
  startposition: 'start_position',
  start: 'start_position',
  exerciseendposition: 'end_position',
  endposition: 'end_position',
  end: 'end_position',
  description: 'description',
  instructions: 'description',
  notes: 'description',
  cues: 'description',
  category: 'category',
  type: 'category',
  primarymuscles: 'primary_muscles',
  muscles: 'primary_muscles',
  muscle: 'primary_muscles',
  musclegroup: 'primary_muscles',
  equipment: 'equipment',
  gear: 'equipment',
};

// Find the first row that contains a column mapping to "name" (Exercise-like)
const detectHeaderRow = (grid: string[][]): { headerIndex: number; headers: string[]; idxMap: Record<string, number> } | null => {
  const maxScan = Math.min(grid.length, 15);
  for (let i = 0; i < maxScan; i++) {
    const row = grid[i];
    if (!row || row.every((c) => !c || !c.trim())) continue;
    const idxMap: Record<string, number> = {};
    row.forEach((h, idx) => {
      const key = FIELD_ALIASES[norm(h)];
      if (key && idxMap[key] === undefined) idxMap[key] = idx;
    });
    if (idxMap.name !== undefined) {
      return { headerIndex: i, headers: row.map((h) => (h ?? '').trim()), idxMap };
    }
  }
  return null;
};

const isValidUrl = (u: string) => {
  if (!u) return true;
  try { const x = new URL(u); return x.protocol === 'https:' || x.protocol === 'http:'; }
  catch { return false; }
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const BulkUploadDialog = ({ open, onOpenChange }: Props) => {
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  const { hasPermission } = useEffectiveTier();
  const canEdit = hasPermission('can_edit_programming');
  const isViewAs = useIsViewAsMode();
  const guardWrite = useViewAsWriteGuard();
  const qc = useQueryClient();

  const [tab, setTab] = useState<'csv' | 'sheets'>('csv');
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [mode, setMode] = useState<ImportMode>('create_only');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  const reset = () => { setRows([]); setSheetUrl(''); setDiagnostics(null); };

  // Build status given existing exercises
  const classify = async (parsed: PreviewRow[]) => {
    if (!teamId) return parsed;
    const { data: existing } = await supabase
      .from('exercises')
      .select('id,name,video_url')
      .eq('team_id', teamId)
      .eq('is_archived', false);
    const byName = new Map<string, string>();
    const byUrl = new Map<string, string>();
    (existing ?? []).forEach((e: any) => {
      if (e.name) byName.set(e.name.toLowerCase().trim(), e.id);
      if (e.video_url) byUrl.set(e.video_url.trim(), e.id);
    });
    return parsed.map((r) => {
      const errs: string[] = [];
      if (!r.name.trim()) errs.push('Name required');
      if (r.video_url && !isValidUrl(r.video_url)) errs.push('Bad URL');
      if (errs.length) return { ...r, status: 'invalid' as RowStatus, error: errs.join(', ') };
      const matchedId =
        byName.get(r.name.toLowerCase().trim()) ??
        (r.video_url ? byUrl.get(r.video_url.trim()) : undefined) ?? null;
      if (matchedId) {
        const status: RowStatus =
          mode === 'update_by_name' || mode === 'update_by_url' ? 'will_update' : 'duplicate';
        return { ...r, status, matchedId };
      }
      return { ...r, status: 'new' as RowStatus };
    });
  };

  const ingestCsvText = async (text: string, sourceMeta?: Partial<Diagnostics>) => {
    const { grid, skippedEmpty, parseErrors } = parseCsv(text);
    if (grid.length < 2) {
      toast.error('CSV is empty or only has a header.');
      setDiagnostics({
        ...sourceMeta,
        rows_fetched: grid.length,
        rows_parsed: 0,
        skipped_empty: skippedEmpty,
        parse_errors: parseErrors,
      } as Diagnostics);
      return;
    }
    const detected = detectHeaderRow(grid);
    if (!detected) {
      const preview = grid.slice(0, 3).map((r, i) => `Row ${i + 1}: ${r.slice(0, 6).join(' | ')}`).join('\n');
      const firstHeaders = (grid[0] ?? []).map((h) => (h ?? '').trim()).filter(Boolean).join(', ');
      toast.error(
        `Missing required "Exercise" column. Detected headers: ${firstHeaders || '(none)'}\n\nFirst rows:\n${preview}`,
        { duration: 12000 },
      );
      return;
    }
    const { headerIndex, headers, idxMap } = detected;
    const dataRows = grid.slice(headerIndex + 1);
    const parsed: PreviewRow[] = dataRows.map((cells, i) => ({
      id: `r-${i}-${Math.random().toString(36).slice(2, 8)}`,
      name: (cells[idxMap.name] ?? '').trim(),
      video_url: idxMap.video_url !== undefined ? (cells[idxMap.video_url] ?? '').trim() : '',
      start_position: idxMap.start_position !== undefined ? cells[idxMap.start_position] ?? '' : '',
      end_position: idxMap.end_position !== undefined ? cells[idxMap.end_position] ?? '' : '',
      description: idxMap.description !== undefined ? cells[idxMap.description] ?? '' : '',
      category: idxMap.category !== undefined ? (cells[idxMap.category] ?? '').trim() : '',
      primary_muscles: idxMap.primary_muscles !== undefined ? cells[idxMap.primary_muscles] ?? '' : '',
      equipment: idxMap.equipment !== undefined ? cells[idxMap.equipment] ?? '' : '',
      selected: true,
      status: 'new',
    }));
    const classified = await classify(parsed);
    setRows(classified);
    setDiagnostics({
      ...sourceMeta,
      rows_fetched: grid.length,
      rows_parsed: classified.length,
      skipped_empty: skippedEmpty,
      parse_errors: parseErrors,
    } as Diagnostics);
    toast.success(
      `Loaded ${classified.length} rows (header row ${headerIndex + 1}). Skipped ${skippedEmpty} empty.`,
      { duration: 6000 },
    );
  };

  const onFile = async (f: File) => {
    if (f.size > 10_000_000) { toast.error('File too large (max 10MB)'); return; }
    setLoading(true);
    try {
      const text = await f.text();
      await ingestCsvText(text, {
        byte_length: f.size,
        source_url_used: f.name,
      });
    } finally { setLoading(false); }
  };

  const onLoadSheet = async () => {
    if (!sheetUrl.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-google-sheet-csv', {
        body: { url: sheetUrl.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = data as any;
      await ingestCsvText(d.csv, {
        byte_length: d.byte_length,
        estimated_line_count: d.estimated_line_count,
        source_url_used: d.source_url_used,
      });
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to fetch sheet');
    } finally { setLoading(false); }
  };

  // Re-classify when mode changes
  const reclassify = async () => {
    if (!rows.length) return;
    setRows(await classify(rows));
  };

  const updateRow = (id: string, patch: Partial<PreviewRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const setSelected = (filter?: (r: PreviewRow) => boolean, value = true) => {
    setRows((rs) => rs.map((r) => (filter && !filter(r) ? r : { ...r, selected: value })));
  };

  const stats = useMemo(() => {
    const s = { total: rows.length, selected: 0, new: 0, dup: 0, upd: 0, inv: 0 };
    rows.forEach((r) => {
      if (r.selected) s.selected++;
      if (r.status === 'new') s.new++;
      else if (r.status === 'duplicate') s.dup++;
      else if (r.status === 'will_update') s.upd++;
      else s.inv++;
    });
    return s;
  }, [rows]);

  const allSelected = rows.length > 0 && rows.every((r) => r.selected);

  const removeSelected = () => setRows((rs) => rs.filter((r) => !r.selected));

  const aiEnrich = async () => {
    const targets = rows.filter((r) => r.selected && r.status !== 'invalid').slice(0, 25);
    if (!targets.length) { toast.info('Select up to 25 valid rows.'); return; }
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-exercise', {
        body: {
          items: targets.map((t) => ({ id: t.id, name: t.name, description: t.description })),
        },
      });
      if (error) throw error;
      const results: any[] = (data as any)?.results ?? [];
      setRows((rs) =>
        rs.map((r) => {
          const hit = results.find((x) => x.id === r.id);
          if (!hit) return r;
          return {
            ...r,
            primary_muscles:
              r.primary_muscles?.trim()
                ? r.primary_muscles
                : Array.isArray(hit.primary_muscles) ? hit.primary_muscles.join(', ') : r.primary_muscles,
            equipment:
              r.equipment?.trim()
                ? r.equipment
                : Array.isArray(hit.equipment) ? hit.equipment.join(', ') : r.equipment,
            category: r.category?.trim() ? r.category : hit.category ?? r.category,
            description: r.description?.trim() ? r.description : hit.instructions ?? r.description,
            aiApplied: true,
          };
        }),
      );
      toast.success(`Enriched ${results.length} rows`);
    } catch (e: any) {
      toast.error(e.message ?? 'AI enrichment failed');
    } finally { setEnriching(false); }
  };

  const buildInstructions = (r: PreviewRow) => {
    const parts: string[] = [];
    if (r.description?.trim()) parts.push(r.description.trim());
    if (r.start_position?.trim()) parts.push(`Start: ${r.start_position.trim()}`);
    if (r.end_position?.trim()) parts.push(`End: ${r.end_position.trim()}`);
    return parts.join('\n').slice(0, 2000) || null;
  };

  const splitCsv = (s: string) =>
    s.split(',').map((x) => x.trim()).filter(Boolean);

  const logActivity = async (eventType: string, metadata: any) => {
    try {
      await supabase.from('platform_activity_logs').insert({
        event_type: eventType,
        event_source: 'programming.exercise_library.bulk_import',
        team_id: teamId,
        user_id: user?.id ?? null,
        severity: 'info',
        metadata,
      });
    } catch { /* non-fatal */ }
  };

  const doImport = async () => {
    if (!canEdit) { toast.warning('Your tier does not allow editing programming.'); return; }
    if (guardWrite('Bulk importing exercises')) return;
    if (!teamId) return;
    const targets = rows.filter((r) => r.selected && r.status !== 'invalid');
    if (!targets.length) { toast.info('No valid rows selected.'); return; }
    setImporting(true);
    await logActivity('exercise_import_started', { count: targets.length, mode });
    let created = 0, updated = 0, skipped = 0, failed = 0;
    try {
      for (const r of targets) {
        const payload = {
          name: r.name.trim(),
          category: r.category.trim() || null,
          primary_muscles: splitCsv(r.primary_muscles),
          equipment: splitCsv(r.equipment),
          video_url: r.video_url.trim() || null,
          instructions: buildInstructions(r),
        };
        try {
          if (r.matchedId && (mode === 'update_by_name' || mode === 'update_by_url')) {
            const { error } = await supabase
              .from('exercises')
              .update({ ...payload, updated_by: user?.id ?? null })
              .eq('id', r.matchedId);
            if (error) throw error;
            updated++;
          } else if (r.matchedId && (mode === 'skip_duplicates' || mode === 'create_only')) {
            skipped++;
          } else {
            const { error } = await supabase.from('exercises').insert({
              ...payload,
              team_id: teamId,
              created_by: user?.id ?? null,
              updated_by: user?.id ?? null,
            });
            if (error) throw error;
            created++;
          }
        } catch {
          failed++;
        }
      }
      await logActivity('exercise_import_completed', { created, updated, skipped, failed, mode });
      toast.success(`Import done — ${created} new, ${updated} updated, ${skipped} skipped, ${failed} failed`);
      qc.invalidateQueries({ queryKey: ['exercises'] });
      qc.invalidateQueries({ queryKey: ['exercises-facets'] });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      await logActivity('exercise_import_failed', { error: e.message });
      toast.error(e.message ?? 'Import failed');
    } finally { setImporting(false); }
  };

  const writeBlocked = !canEdit || isViewAs;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk import exercises</DialogTitle>
          <DialogDescription>
            Upload a CSV or load a published Google Sheet, preview & edit, then import selected rows.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="csv"><Upload className="h-4 w-4 mr-1.5" /> CSV file</TabsTrigger>
                <TabsTrigger value="sheets"><FileSpreadsheet className="h-4 w-4 mr-1.5" /> Google Sheet</TabsTrigger>
              </TabsList>
              <TabsContent value="csv" className="pt-3">
                <Label>Upload CSV (max 5MB)</Label>
                <Input
                  type="file"
                  accept=".csv,text/csv"
                  className="mt-1"
                  disabled={loading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
                />
              </TabsContent>
              <TabsContent value="sheets" className="pt-3 space-y-2">
                <Label>Published Google Sheet URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                    disabled={loading}
                  />
                  <Button onClick={onLoadSheet} disabled={loading || !sheetUrl.trim()}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only public/published Google Sheets links from <code>docs.google.com</code> are accepted.
                </p>
              </TabsContent>
            </Tabs>

            <Accordion type="single" collapsible>
              <AccordionItem value="howto">
                <AccordionTrigger className="text-sm">
                  <span className="flex items-center gap-2"><Info className="h-4 w-4" /> How to use Google Sheets</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground space-y-2">
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Create a Google Sheet with columns: <strong>Exercise, URL, Exercise Start Position, Exercise End Position, Description</strong>.</li>
                    <li>Go to <em>File → Share → Publish to web → CSV</em>, then copy the link.</li>
                    <li>Paste the link above and click <strong>Load</strong>.</li>
                    <li>Review the preview, edit rows inline, select which to import, then click <strong>Import selected</strong>.</li>
                  </ol>
                  <p className="text-amber-600 dark:text-amber-400">
                    ⚠ Do not publish private athlete data. Keep column names consistent.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        ) : (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 sticky top-0 bg-background z-10 pb-2 border-b">
              <Badge variant="secondary">{stats.total} rows</Badge>
              <Badge variant="outline">{stats.selected} selected</Badge>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">{stats.new} new</Badge>
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">{stats.dup} duplicate</Badge>
              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400">{stats.upd} update</Badge>
              <Badge className="bg-destructive/15 text-destructive">{stats.inv} invalid</Badge>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelected(undefined, true)}>Select all</Button>
                <Button size="sm" variant="outline" onClick={() => setSelected(undefined, false)}>Unselect all</Button>
                <Button size="sm" variant="outline" onClick={() => { setSelected(() => false, false); setSelected((r) => r.status === 'new', true); }}>Only new</Button>
                <Button size="sm" variant="outline" onClick={() => { setSelected(() => false, false); setSelected((r) => r.status === 'duplicate' || r.status === 'will_update', true); }}>Only duplicates</Button>
                <Button size="sm" variant="outline" onClick={() => { setSelected(() => false, false); setSelected((r) => r.status === 'invalid', true); }}>Only errors</Button>
              </div>
            </div>

            {diagnostics && (
              <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 px-1">
                {diagnostics.byte_length !== undefined && <span>Bytes: {diagnostics.byte_length.toLocaleString()}</span>}
                {diagnostics.estimated_line_count !== undefined && <span>~Lines: {diagnostics.estimated_line_count.toLocaleString()}</span>}
                <span>Fetched: {diagnostics.rows_fetched}</span>
                <span>Parsed: {diagnostics.rows_parsed}</span>
                <span>Skipped empty: {diagnostics.skipped_empty}</span>
                <span>Parser warnings: {diagnostics.parse_errors}</span>
                <span>Valid: {stats.new + stats.upd}</span>
                <span>Invalid: {stats.inv}</span>
                <span>Selected: {stats.selected}</span>
                {diagnostics.source_url_used && (
                  <span className="truncate max-w-[420px]" title={diagnostics.source_url_used}>
                    Source: {diagnostics.source_url_used}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-xs">Mode</Label>
              <Select value={mode} onValueChange={async (v) => { setMode(v as ImportMode); setTimeout(reclassify, 0); }}>
                <SelectTrigger className="w-56 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="create_only">Create new only</SelectItem>
                  <SelectItem value="update_by_name">Update existing by name</SelectItem>
                  <SelectItem value="update_by_url">Update existing by video URL</SelectItem>
                  <SelectItem value="skip_duplicates">Skip duplicates</SelectItem>
                </SelectContent>
              </Select>

              <Button size="sm" variant="outline" onClick={aiEnrich} disabled={enriching || writeBlocked}>
                {enriching ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Wand2 className="h-3.5 w-3.5 mr-1.5" />}
                AI enrich selected
              </Button>
              <Button size="sm" variant="outline" onClick={removeSelected}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove selected
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                <X className="h-3.5 w-3.5 mr-1.5" /> Start over
              </Button>
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 overflow-auto border rounded-md">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/60 backdrop-blur z-10">
                  <tr className="text-xs uppercase tracking-wide">
                    <th className="p-2 w-8">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(v) => setSelected(undefined, !!v)}
                      />
                    </th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left min-w-[180px]">Name</th>
                    <th className="p-2 text-left min-w-[200px]">Video URL</th>
                    <th className="p-2 text-left min-w-[140px]">Start</th>
                    <th className="p-2 text-left min-w-[140px]">End</th>
                    <th className="p-2 text-left min-w-[200px]">Description</th>
                    <th className="p-2 text-left min-w-[140px]">Muscles</th>
                    <th className="p-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className={
                        r.status === 'invalid'
                          ? 'bg-destructive/5 border-t border-destructive/20'
                          : r.status === 'duplicate'
                          ? 'bg-amber-500/5 border-t'
                          : 'border-t'
                      }
                    >
                      <td className="p-2">
                        <Checkbox checked={r.selected} onCheckedChange={(v) => updateRow(r.id, { selected: !!v })} />
                      </td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-[10px]">
                          {r.status === 'new' && 'New'}
                          {r.status === 'duplicate' && 'Duplicate'}
                          {r.status === 'will_update' && 'Update'}
                          {r.status === 'invalid' && 'Invalid'}
                        </Badge>
                        {r.aiApplied && <Badge variant="secondary" className="ml-1 text-[10px]">AI</Badge>}
                        {r.error && <div className="text-[10px] text-destructive mt-1">{r.error}</div>}
                      </td>
                      <td className="p-2"><Input value={r.name} onChange={(e) => updateRow(r.id, { name: e.target.value })} className="h-8" /></td>
                      <td className="p-2">
                        <Input value={r.video_url} onChange={(e) => updateRow(r.id, { video_url: e.target.value })} className="h-8" />
                      </td>
                      <td className="p-2"><Input value={r.start_position} onChange={(e) => updateRow(r.id, { start_position: e.target.value })} className="h-8" /></td>
                      <td className="p-2"><Input value={r.end_position} onChange={(e) => updateRow(r.id, { end_position: e.target.value })} className="h-8" /></td>
                      <td className="p-2"><Input value={r.description} onChange={(e) => updateRow(r.id, { description: e.target.value })} className="h-8" /></td>
                      <td className="p-2"><Input value={r.primary_muscles} onChange={(e) => updateRow(r.id, { primary_muscles: e.target.value })} className="h-8" placeholder="csv" /></td>
                      <td className="p-2">
                        {r.video_url && toEmbedUrl(r.video_url) && <VideoPreviewButton url={r.video_url} size="icon" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={doImport} disabled={importing || writeBlocked || stats.selected === 0}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Import {stats.selected} selected
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles, TrendingUp, AlertCircle, History, MessageSquare, Target, Presentation,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAthlete } from '@/components/programming/client/useClientAthlete';
import { useClientMetrics, useClientRankings } from './useClientMetrics';
import { interpretMetric, tierStyles } from '@/utils/metricInterpretation';
import { PresentationMode, type InterpretedSnapshot, type PresentationRanking } from './PresentationMode';
import { sportComparisonLabel } from '@/lib/sports/comparisonContext';
import { EliteBenchmarkCard } from './EliteBenchmarkCard';

interface Props {
  /** When true, allow practitioners to edit & save coach notes. */
  practitionerMode?: boolean;
  /** Optional explicit test date to anchor the report on (defaults to latest). */
  testDate?: string | null;
}

/**
 * Beautiful athlete-facing report.
 *
 * Sections (PDF-ready ordering):
 *  1. Performance Summary
 *  2. What's Going Well
 *  3. Areas To Improve
 *  4. Compared To Previous Testing
 *  5. Coach Notes
 *  6. Next Focus
 */
export const AthleteReportView = ({ practitionerMode = false }: Props) => {
  const { data: athlete, isLoading: aLoading } = useClientAthlete();
  const { data: metrics, isLoading: mLoading } = useClientMetrics({
    athleteId: athlete?.id ?? null,
    athleteName: athlete?.name ?? null,
    teamName: null,
  });
  const { data: rankings } = useClientRankings({
    athleteId: athlete?.id ?? null,
    athleteName: athlete?.name ?? null,
    teamName: null,
  });
  const [presenting, setPresenting] = useState(false);

  const presentationRankings: PresentationRanking[] = useMemo(() => {
    if (!rankings) return [];
    // Prefer club scope per metric; fall back to global.
    const bestPerMetric = new Map<string, PresentationRanking>();
    for (const r of rankings) {
      if (r.totalAthletes < 5 || r.rank == null) continue;
      const pct = Math.max(1, Math.round((r.rank / r.totalAthletes) * 100));
      const candidate: PresentationRanking = {
        label: r.spec.label,
        scopeLabel: r.scopeLabel,
        rank: r.rank,
        totalAthletes: r.totalAthletes,
        percentile: pct,
      };
      const existing = bestPerMetric.get(r.spec.short);
      const priority = (s: string) => (s === 'club' ? 0 : s === 'region' ? 1 : 2);
      if (!existing || priority(r.scope) < priority((existing as any).scope ?? 'global')) {
        bestPerMetric.set(r.spec.short, { ...candidate, ...{ scope: r.scope } as any });
      }
    }
    return Array.from(bestPerMetric.values());
  }, [rankings]);

  const interpreted: InterpretedSnapshot[] = useMemo(() => {
    if (!metrics) return [];
    return metrics
      .map((m) => {
        const value = m.latest?.value ?? null;
        const interp = interpretMetric({
          testName: m.spec.testName,
          metricKey: m.spec.key,
          value,
        });
        if (!interp) return null;
        return {
          spec: { testName: m.spec.testName, metricKey: m.spec.key, label: m.spec.label },
          interpretation: interp,
          changePct: m.changePct,
          isImprovement: m.isImprovement,
          baselineDisplay: m.baseline ? `${m.baseline.value.toFixed(2)} ${m.spec.unit}` : null,
          latestDisplay: m.latest ? `${m.latest.value.toFixed(2)} ${m.spec.unit}` : null,
        } as InterpretedSnapshot;
      })
      .filter((x): x is InterpretedSnapshot => !!x);
  }, [metrics]);

  const goingWell = interpreted.filter((i) => i.interpretation.tier === 'excellent' || i.interpretation.tier === 'good');
  const focusAreas = interpreted.filter((i) => i.interpretation.tier === 'needs_focus' || i.interpretation.tier === 'developing');

  // Coach notes — stored on athletes table via metadata? Keep client-local for now;
  // practitioner can persist via existing programming notes elsewhere.
  const { data: coachNote } = useQuery({
    queryKey: ['coach-note-latest', athlete?.id],
    enabled: !!athlete?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_in_app_notifications')
        .select('message, created_at')
        .eq('recipient_user_id', athlete!.user_id ?? '00000000-0000-0000-0000-000000000000')
        .contains('metadata', { notification_type: 'coach_note' })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });
  const [noteDraft, setNoteDraft] = useState('');

  if (aLoading || mLoading) return <Skeleton className="h-96 w-full" />;
  if (!athlete) return <p className="text-sm text-muted-foreground">No athlete profile linked.</p>;

  const athleteSports: string[] = (athlete as any)?.sports ?? [];
  const sportContext = sportComparisonLabel(athleteSports, '');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Your Report</h2>
          <p className="text-sm text-muted-foreground mt-1">
            A simple summary of where you are right now and what's next.
          </p>
          {sportContext && (
            <Badge variant="outline" className="mt-2">{sportContext}</Badge>
          )}
        </div>
        <Button onClick={() => setPresenting(true)} className="gap-2">
          <Presentation className="h-4 w-4" /> Present Results
        </Button>
      </div>

      <EliteBenchmarkCard sports={athleteSports} />

      {/* 1. Performance Summary */}
      <section>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Performance Summary
        </h3>
        {interpreted.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No test results yet to summarise.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {interpreted.map((i) => {
              const styles = tierStyles[i.interpretation.tier];
              return (
                <Card key={i.spec.label} className={`ring-1 ${styles.ring}`}>
                  <CardContent className="p-5">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {i.interpretation.category}
                    </div>
                    <div className="text-xl font-semibold mt-0.5">{i.interpretation.title}</div>
                    <div className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles.badge}`}>
                      {i.interpretation.ratingLabel}
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">{i.interpretation.explanation}</p>
                    <div className="text-xs text-muted-foreground mt-3">
                      Latest: <span className="font-medium text-foreground">{i.interpretation.display}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. What's Going Well */}
      <section>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" /> What's Going Well
        </h3>
        <Card>
          <CardContent className="p-5">
            {goingWell.length === 0 ? (
              <p className="text-sm text-muted-foreground">Plenty to build on — let's keep stacking quality sessions.</p>
            ) : (
              <ul className="space-y-2">
                {goingWell.map((g) => (
                  <li key={g.spec.label} className="text-sm">
                    <span className="font-medium">{g.interpretation.title}:</span>{' '}
                    <span className="text-muted-foreground">{g.interpretation.explanation}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 3. Areas To Improve */}
      <section>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" /> Areas To Improve
        </h3>
        <Card>
          <CardContent className="p-5">
            {focusAreas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No standout focus areas right now — keep up the work.</p>
            ) : (
              <ul className="space-y-2">
                {focusAreas.map((f) => (
                  <li key={f.spec.label} className="text-sm">
                    <span className="font-medium">{f.interpretation.title}:</span>{' '}
                    <span className="text-muted-foreground">{f.interpretation.focusSuggestion}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 4. Compared To Previous Testing */}
      <section>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Compared To Previous Testing
        </h3>
        <Card>
          <CardContent className="p-5">
            {interpreted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No previous tests yet to compare against.</p>
            ) : (
              <ul className="divide-y">
                {interpreted.map((i) => (
                  <li key={i.spec.label} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{i.interpretation.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {i.baselineDisplay ?? '—'} → {i.latestDisplay ?? '—'}
                      </div>
                    </div>
                    {i.changePct == null ? (
                      <Badge variant="secondary">—</Badge>
                    ) : (
                      <Badge variant={i.isImprovement ? 'default' : 'secondary'}>
                        {i.changePct > 0 ? '+' : ''}{i.changePct.toFixed(1)}%
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 5. Coach Notes */}
      <section>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" /> Coach Notes
        </h3>
        <Card>
          <CardContent className="p-5 space-y-3">
            {coachNote?.message ? (
              <p className="text-sm whitespace-pre-wrap">{coachNote.message}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No coach notes yet.</p>
            )}
            {practitionerMode && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a short note for this athlete…"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  disabled={!noteDraft.trim() || !athlete.user_id}
                  onClick={async () => {
                    if (!athlete.user_id) return;
                    await supabase.from('platform_in_app_notifications').insert({
                      recipient_user_id: athlete.user_id,
                      team_id: athlete.team_id,
                      title: '📝 Note from your coach',
                      message: noteDraft.trim(),
                      severity: 'info',
                      metadata: { notification_type: 'coach_note' },
                    });
                    setNoteDraft('');
                  }}
                >
                  Save note
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 6. Next Focus */}
      <section>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> Next Focus
        </h3>
        <Card>
          <CardContent className="p-5">
            <ul className="space-y-2 text-sm">
              {(focusAreas.length ? focusAreas : interpreted.slice(0, 2)).map((i) => (
                <li key={i.spec.label} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{i.interpretation.focusSuggestion || `Continue working on ${i.interpretation.title.toLowerCase()}.`}</span>
                </li>
              ))}
              {interpreted.length === 0 && (
                <li className="text-muted-foreground">Complete a baseline test to unlock targeted focus areas.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </section>

      {presenting && (
        <PresentationMode
          athleteName={athlete.name}
          snapshots={interpreted}
          athleteSports={(athlete as any)?.sports}
          onClose={() => setPresenting(false)}
        />
      )}
    </div>
  );
};

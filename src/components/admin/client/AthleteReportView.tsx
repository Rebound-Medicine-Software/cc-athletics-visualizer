import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles, TrendingUp, Trophy, History, MessageSquare, Target, Presentation,
  Compass, ArrowUpRight, Flame,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientAthlete } from '@/components/programming/client/useClientAthlete';
import { useClientMetrics, useClientRankings } from './useClientMetrics';
import { interpretMetric, tierStyles } from '@/utils/metricInterpretation';
import { PresentationMode, type InterpretedSnapshot, type PresentationRanking } from './PresentationMode';
import { sportComparisonLabel } from '@/lib/sports/comparisonContext';
import { EliteBenchmarkCard } from './EliteBenchmarkCard';
import { listContainer, listItem, useReducedMotionVariants } from '@/lib/motion';

interface Props {
  /** When true, allow practitioners to edit & save coach notes. */
  practitionerMode?: boolean;
  /** Optional explicit test date to anchor the report on (defaults to latest). */
  testDate?: string | null;
}

/** Soften clinical wording for athlete-facing copy. */
const tonedRating = (rating: string, tier: InterpretedSnapshot['interpretation']['tier']) => {
  if (tier === 'needs_focus') return 'Big opportunity';
  if (tier === 'developing') return 'Developing';
  return rating;
};

/**
 * Premium athlete-facing report (C5.5).
 *
 * Story-style structure — feels share-friendly and screenshot-ready:
 *   1. Hero summary
 *   2. Your biggest wins
 *   3. Big opportunities
 *   4. How you compare
 *   5. Progress since last test
 *   6. Coach note
 *   7. Next focus / what happens next
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
  const containerVariants = useReducedMotionVariants(listContainer);
  const itemVariants = useReducedMotionVariants(listItem);

  const presentationRankings: PresentationRanking[] = useMemo(() => {
    if (!rankings) return [];
    const bestPerMetric = new Map<string, PresentationRanking & { scope?: string }>();
    for (const r of rankings) {
      if (r.totalAthletes < 5 || r.rank == null) continue;
      const pct = Math.max(1, Math.round((r.rank / r.totalAthletes) * 100));
      const candidate = {
        label: r.spec.label,
        scopeLabel: r.scopeLabel,
        rank: r.rank,
        totalAthletes: r.totalAthletes,
        percentile: pct,
        scope: r.scope,
      };
      const existing = bestPerMetric.get(r.spec.short);
      const priority = (s: string) => (s === 'club' ? 0 : s === 'region' ? 1 : 2);
      if (!existing || priority(r.scope) < priority(existing.scope ?? 'global')) {
        bestPerMetric.set(r.spec.short, candidate);
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

  const goingWell = interpreted.filter(
    (i) => i.interpretation.tier === 'excellent' || i.interpretation.tier === 'good',
  );
  const focusAreas = interpreted.filter(
    (i) => i.interpretation.tier === 'needs_focus' || i.interpretation.tier === 'developing',
  );
  const progress = interpreted.filter((i) => i.changePct != null && i.baselineDisplay && i.latestDisplay);
  const improvements = progress.filter((i) => i.isImprovement);
  const topRank = presentationRankings.find((r) => r.percentile != null && r.percentile <= 25) ?? presentationRankings[0];

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
  const firstName = athlete.name.split(' ')[0];

  return (
    <motion.div
      className="space-y-6 pb-12"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── 1. Hero summary ──────────────────────────────────────── */}
      <motion.section variants={itemVariants}>
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/15 via-primary/5 to-background ring-1 ring-primary/20">
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                  Performance Story
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
                  {firstName}'s report
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-md">
                  Where you are right now — and what comes next.
                </p>
                {sportContext && (
                  <Badge variant="outline" className="mt-4 rounded-full bg-background/60 backdrop-blur">
                    <Compass className="h-3 w-3 mr-1.5" /> {sportContext}
                  </Badge>
                )}
              </div>
              <Button onClick={() => setPresenting(true)} className="gap-2 rounded-full shrink-0">
                <Presentation className="h-4 w-4" /> Present
              </Button>
            </div>

            {/* At-a-glance stats */}
            {interpreted.length > 0 && (
              <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl bg-background/70 backdrop-blur p-3 sm:p-4 border">
                  <div className="text-2xl sm:text-3xl font-bold tabular-nums text-emerald-600">
                    {goingWell.length}
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                    Wins
                  </div>
                </div>
                <div className="rounded-2xl bg-background/70 backdrop-blur p-3 sm:p-4 border">
                  <div className="text-2xl sm:text-3xl font-bold tabular-nums text-amber-600">
                    {focusAreas.length}
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                    To improve
                  </div>
                </div>
                <div className="rounded-2xl bg-background/70 backdrop-blur p-3 sm:p-4 border">
                  <div className="text-2xl sm:text-3xl font-bold tabular-nums text-primary">
                    {improvements.length}
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground mt-1 uppercase tracking-wide">
                    Improving
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* Optional sport benchmark */}
      {athleteSports.length > 0 && (
        <motion.section variants={itemVariants}>
          <EliteBenchmarkCard sports={athleteSports} />
        </motion.section>
      )}

      {/* ── 2. Biggest wins ──────────────────────────────────────── */}
      {goingWell.length > 0 && (
        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Trophy className="h-4 w-4 text-emerald-600" />
            <h3 className="text-base font-semibold tracking-tight">Your biggest wins</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {goingWell.map((g) => {
              const styles = tierStyles[g.interpretation.tier];
              return (
                <Card key={g.spec.label} className="overflow-hidden hover:shadow-md transition-shadow active:scale-[0.99] transition-transform">
                  <CardContent className="p-5">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {g.interpretation.category}
                    </div>
                    <div className="text-lg font-semibold mt-1">{g.interpretation.title}</div>
                    {g.latestDisplay && (
                      <div className="text-2xl font-bold tabular-nums mt-3 text-primary">
                        {g.latestDisplay}
                      </div>
                    )}
                    <div className={`mt-3 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${styles.badge}`}>
                      {tonedRating(g.interpretation.ratingLabel, g.interpretation.tier)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                      {g.interpretation.explanation}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* ── 3. Big opportunities ─────────────────────────────────── */}
      {focusAreas.length > 0 && (
        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Target className="h-4 w-4 text-amber-600" />
            <h3 className="text-base font-semibold tracking-tight">Big opportunities</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {focusAreas.map((f) => (
              <Card key={f.spec.label} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {f.interpretation.category}
                  </div>
                  <div className="text-lg font-semibold mt-1">{f.interpretation.title}</div>
                  <div className="mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-700 border-amber-500/30">
                    Big opportunity
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                    {f.interpretation.focusSuggestion}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>
      )}

      {/* ── 4. How you compare ───────────────────────────────────── */}
      {presentationRankings.length > 0 && (
        <motion.section variants={itemVariants}>
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold tracking-tight">How you compare</h3>
            </div>
            {topRank?.percentile != null && topRank.percentile <= 25 && (
              <Badge className="rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/30 hover:bg-amber-500/20">
                Top {topRank.percentile}%
              </Badge>
            )}
          </div>
          <Card>
            <CardContent className="p-2 sm:p-3">
              <ul className="divide-y">
                {presentationRankings.slice(0, 5).map((r) => {
                  const pct = r.percentile;
                  const elite = pct != null && pct <= 10;
                  const headline =
                    pct != null
                      ? pct <= 50 ? `Top ${pct}% in ${r.scopeLabel}` : `Above ${100 - pct}% in ${r.scopeLabel}`
                      : `#${r.rank} in ${r.scopeLabel}`;
                  return (
                    <li key={r.label} className="px-3 py-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.label}</div>
                        <div className={`text-xs mt-0.5 ${elite ? 'text-amber-700 font-medium' : 'text-muted-foreground'}`}>
                          {elite && '✨ '}{headline}
                        </div>
                      </div>
                      <div className="text-right tabular-nums shrink-0">
                        <div className="text-base font-bold">#{r.rank}</div>
                        <div className="text-[10px] text-muted-foreground">of {r.totalAthletes}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[10px] text-muted-foreground text-center px-3 py-2">
                Anonymised — we never show other athletes' names.
              </p>
            </CardContent>
          </Card>
        </motion.section>
      )}

      {/* ── 5. Progress since last test ──────────────────────────── */}
      {progress.length > 0 && (
        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <History className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold tracking-tight">Since last test</h3>
          </div>
          <Card>
            <CardContent className="p-2 sm:p-3">
              <ul className="divide-y">
                {progress.map((i) => (
                  <li key={i.spec.label} className="px-3 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{i.interpretation.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                        {i.baselineDisplay} → <span className="text-foreground font-medium">{i.latestDisplay}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {i.isImprovement && <Flame className="h-3.5 w-3.5 text-emerald-600" />}
                      <span className={`text-sm font-bold tabular-nums ${
                        i.isImprovement ? 'text-emerald-600' : 'text-muted-foreground'
                      }`}>
                        {i.changePct! > 0 ? '+' : ''}{i.changePct!.toFixed(1)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.section>
      )}

      {/* ── 6. Coach note ────────────────────────────────────────── */}
      {(coachNote?.message || practitionerMode) && (
        <motion.section variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold tracking-tight">From your coach</h3>
          </div>
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-5 space-y-3">
              {coachNote?.message ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{coachNote.message}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No coach notes yet.</p>
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
        </motion.section>
      )}

      {/* ── 7. What happens next ─────────────────────────────────── */}
      <motion.section variants={itemVariants}>
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 to-background ring-1 ring-primary/15">
          <CardContent className="p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight className="h-4 w-4 text-primary" />
              <h3 className="text-base font-semibold tracking-tight">What happens next</h3>
            </div>
            <p className="text-sm sm:text-base text-foreground/90 leading-relaxed">
              Your programme is tailored to these focus areas. Stay consistent, log your sessions,
              and we'll retest soon to see how far you've come.
            </p>
            {focusAreas.length > 0 && (
              <ul className="space-y-2 mt-4">
                {focusAreas.slice(0, 3).map((f) => (
                  <li key={f.spec.label} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span className="text-foreground/90">
                      {f.interpretation.focusSuggestion || `Continue working on ${f.interpretation.title.toLowerCase()}.`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 flex items-center gap-2 text-xs text-primary">
              <Flame className="h-3.5 w-3.5" />
              <span className="font-medium">Keep showing up.</span>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {interpreted.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground text-center">
            Complete a baseline test to unlock your performance story.
          </CardContent>
        </Card>
      )}

      {presenting && (
        <PresentationMode
          athleteName={athlete.name}
          snapshots={interpreted}
          athleteSports={athleteSports}
          rankings={presentationRankings}
          onClose={() => setPresenting(false)}
        />
      )}
    </motion.div>
  );
};

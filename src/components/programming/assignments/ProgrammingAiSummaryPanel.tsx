import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Copy, AlertCircle, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useEffectiveTier } from '@/lib/impersonation/useEffectiveTeam';
import { useIsViewAsMode, useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { useAssignmentOutcomes } from './useOutcomes';
import type { AdherenceMetrics } from './adherence';

interface Props {
  assignmentId: string;
  athleteId: string | null | undefined;
  athleteName?: string | null;
  programmeName?: string | null;
  programmeGoal?: string | null;
  startDate: string | null | undefined;
  endDate?: string | null;
  status?: string | null;
  adherence: AdherenceMetrics;
  recentLogs: Array<{
    performed_on: string;
    sets_completed?: number | null;
    reps_completed?: string | null;
    load_used?: string | null;
    rpe?: number | null;
    notes?: string | null;
  }>;
}

interface SummaryShape {
  summary: string;
  goingWell: string[];
  needsAttention: string[];
  talkingPoints: string[];
  nextSessionCues: string[];
}

const Section = ({ title, items }: { title: string; items: string[] }) => {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
};

export const ProgrammingAiSummaryPanel = ({
  assignmentId,
  athleteId,
  athleteName,
  programmeName,
  programmeGoal,
  startDate,
  endDate,
  status,
  adherence,
  recentLogs,
}: Props) => {
  const { hasPermission } = useEffectiveTier();
  const isViewAs = useIsViewAsMode();
  const { teamId } = useEffectiveTeamId();
  const canUseAi = hasPermission('can_use_ai_coach');

  const { data: outcomes } = useAssignmentOutcomes({ athleteId, startDate });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryShape | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const generate = async () => {
    if (!canUseAi) {
      toast.error('You do not have access to AI coach features.');
      return;
    }
    if (isViewAs) {
      toast.error('AI generation is disabled in View-As mode.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'generate-programming-ai-summary',
        {
          body: {
            team_id: teamId,
            athlete_id: athleteId,
            athlete_name: athleteName,
            assignment_id: assignmentId,
            programme_name: programmeName,
            programme_goal: programmeGoal,
            start_date: startDate,
            end_date: endDate,
            status,
            adherence: {
              adherencePercentage: adherence.adherencePercentage,
              completedSessions: adherence.completedSessions,
              missedSessions: adherence.missedSessions,
              totalSessionsToDate: adherence.totalSessionsToDate,
              totalSessionsAll: adherence.totalSessionsAll,
              currentStreak: adherence.currentStreak,
              lastCompletedDate: adherence.lastCompletedDate,
              weekAdherence: adherence.weekAdherence,
            },
            outcomes: (outcomes ?? [])
              .filter((o) => o.before && o.after)
              .map((o) => ({
                label: o.metric.label,
                unit: o.metric.unit,
                before: o.before,
                after: o.after,
                changePct: o.changePct,
              })),
            recentLogs: (recentLogs ?? []).slice(0, 10),
          },
        }
      );
      if (fnError) throw fnError;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSummary((data as any)?.summary ?? null);
      setGeneratedAt((data as any)?.generated_at ?? new Date().toISOString());
    } catch (e: any) {
      console.error(e);
      const msg = e?.message ?? 'Failed to generate summary';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    if (!summary) return;
    const text = [
      summary.summary,
      '',
      summary.goingWell?.length ? `Going well:\n${summary.goingWell.map((s) => `• ${s}`).join('\n')}` : '',
      summary.needsAttention?.length ? `\nMay need attention:\n${summary.needsAttention.map((s) => `• ${s}`).join('\n')}` : '',
      summary.talkingPoints?.length ? `\nTalking points:\n${summary.talkingPoints.map((s) => `• ${s}`).join('\n')}` : '',
      summary.nextSessionCues?.length ? `\nNext session cues:\n${summary.nextSessionCues.map((s) => `• ${s}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Summary copied');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> AI Coach Summary
          </span>
          {summary && (
            <Button size="sm" variant="ghost" onClick={copyAll}>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy
            </Button>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          AI-generated coaching support. Review clinically before applying.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canUseAi ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Requires <code>can_use_ai_coach</code> permission.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={generate} disabled={loading || isViewAs}>
                <Sparkles className="mr-1 h-4 w-4" />
                {loading ? 'Generating…' : summary ? 'Regenerate' : 'Generate Summary'}
              </Button>
              {isViewAs && (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" /> View-As (read-only)
                </Badge>
              )}
              {generatedAt && (
                <span className="text-[11px] text-muted-foreground">
                  Generated {new Date(generatedAt).toLocaleString()}
                </span>
              )}
            </div>

            {loading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}

            {error && !loading && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {summary && !loading && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                <p className="text-sm leading-relaxed">{summary.summary}</p>
                <Section title="Going well" items={summary.goingWell ?? []} />
                <Section title="May need attention" items={summary.needsAttention ?? []} />
                <Section title="Practitioner talking points" items={summary.talkingPoints ?? []} />
                <Section title="Next-session cues" items={summary.nextSessionCues ?? []} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

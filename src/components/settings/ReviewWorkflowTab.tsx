import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardCheck, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';
import { useReviewWorkflowEnabled, useUpdateReviewWorkflowEnabled } from '@/hooks/useReviewWorkflow';
import { usePendingReviewQueue, useReviewDecision } from '@/hooks/useReviewQueue';

// Org admin toggle for Section 4 Item 1's "Submit for review" workflow (fully specced
// 29 July 2026). Schema landed in PR #62 with review_workflow_enabled defaulting to
// false on every team, so this screen is purely additive - flipping it on is the only
// way anything changes for a clinic. Practitioner-side submit action landed in PR #64.
// This file now also owns the admin approve/reject queue - still to come: filtering
// the athlete-facing progress view by review_status.
export const ReviewWorkflowTab = () => {
  const { profile, isRole } = useAuth();
  const { teamId } = useEffectiveTeamId();
  const guardWrite = useViewAsWriteGuard();
  const { data: enabled, isLoading } = useReviewWorkflowEnabled(teamId);
  const update = useUpdateReviewWorkflowEnabled(teamId);
  const { data: pending, isLoading: pendingLoading } = usePendingReviewQueue(teamId);
  const decide = useReviewDecision(teamId);

  if (!profile || (!isRole('organisation') && !isRole('super_admin'))) {
    return (
      <Card>
      <CardContent className="p-6">
      <p className="text-muted-foreground text-center">
      This section is only available to the organisation owner/admin.
      </p>
      </CardContent>
      </Card>
      );
  }
  
  const toggle = (checked: boolean) => {
    if (guardWrite('Update review workflow setting')) return;
    update.mutate(checked, {
      onSuccess: () => toast.success(checked ? 'Submit for review is now on' : 'Submit for review is now off'),
      onError: (e: any) => toast.error(e.message ?? 'Could not update'),
    });
  };

  const handleDecision = (row: { id: string; athlete_name: string; test_name: string; test_date: string }, decision: 'approved' | 'rejected') => {
    if (guardWrite(decision === 'approved' ? 'Approve test result' : 'Reject test result')) return;
    decide.mutate(
      { id: row.id, decision, athleteName: row.athlete_name, testName: row.test_name, testDate: row.test_date },
      {
        onSuccess: () => toast.success(decision === 'approved' ? 'Result approved' : 'Result rejected'),
        onError: (e: any) => toast.error(e.message ?? 'Could not update'),
      },
    );
  };
  
  return (
    <div className="space-y-4">
    <Card>
    <CardHeader>
    <CardTitle className="text-base flex items-center gap-2">
    <ClipboardCheck className="h-4 w-4 text-primary" /> Submit for review
    </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
    <p className="text-sm text-muted-foreground">
    When on, a practitioner's test result needs your approval before it reaches the athlete's
    progress view. When off (the default), results appear to athletes as soon as they're
    recorded, same as today.
    </p>
    
    <div className="flex items-center gap-3">
    <Switch
      id="review-workflow-enabled"
      checked={!!enabled}
      onCheckedChange={toggle}
      disabled={isLoading || update.isPending}
      />
    <Label htmlFor="review-workflow-enabled">
      {enabled ? 'On - new results need your approval' : 'Off - results are visible immediately'}
    </Label>
    </div>
    
    <p className="text-xs text-muted-foreground">
    Existing results are never retroactively hidden. There's a single admin per organisation, so
    there's no routing to configure. Rejections don't include a reason field, just an in-app
    notification.
    </p>
    </CardContent>
    </Card>

    <Card>
    <CardHeader>
    <CardTitle className="text-base flex items-center gap-2">
    <ClipboardCheck className="h-4 w-4 text-primary" /> Pending review
    {!pendingLoading && !!pending?.length && (
      <Badge variant="secondary">{pending.length}</Badge>
    )}
    </CardTitle>
    </CardHeader>
    <CardContent>
    {pendingLoading ? (
      <Skeleton className="h-16" />
    ) : !pending || pending.length === 0 ? (
      <p className="text-sm text-muted-foreground">
      Nothing waiting on you right now. Results a practitioner submits will show up here.
      </p>
    ) : (
      <ul className="divide-y">
      {pending.map((row) => (
        <li key={row.id} className="py-3 flex items-center justify-between gap-3">
        <div>
        <div className="font-medium text-sm">{row.athlete_name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
        {row.test_name} · {new Date(row.test_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
        </div>
        <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => handleDecision(row, 'approved')}
          disabled={decide.isPending}
          >
          <Check className="h-3.5 w-3.5" /> Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-destructive hover:text-destructive"
          onClick={() => handleDecision(row, 'rejected')}
          disabled={decide.isPending}
          >
          <X className="h-3.5 w-3.5" /> Reject
        </Button>
        </div>
        </li>
      ))}
      </ul>
    )}
    </CardContent>
    </Card>
    </div>
    );
};

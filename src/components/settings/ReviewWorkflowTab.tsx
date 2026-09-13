import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { useViewAsWriteGuard } from '@/lib/impersonation/useViewAsWriteGuard';
import { useReviewWorkflowEnabled, useUpdateReviewWorkflowEnabled } from '@/hooks/useReviewWorkflow';

// Org admin toggle for Section 4 Item 1's "Submit for review" workflow (fully specced
// 29 July 2026). Schema landed in PR #62 with review_workflow_enabled defaulting to
// false on every team, so this screen is purely additive - flipping it on is the only
// way anything changes for a clinic. Still to come: the practitioner-side "Submit for
// review" action, the admin approve/reject queue plus notification, and filtering the
// athlete-facing progress view by review_status.
export const ReviewWorkflowTab = () => {
  const { profile, isRole } = useAuth();
  const { teamId } = useEffectiveTeamId();
  const guardWrite = useViewAsWriteGuard();
  const { data: enabled, isLoading } = useReviewWorkflowEnabled(teamId);
  const update = useUpdateReviewWorkflowEnabled(teamId);

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
  
  return (
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
    );
};
      

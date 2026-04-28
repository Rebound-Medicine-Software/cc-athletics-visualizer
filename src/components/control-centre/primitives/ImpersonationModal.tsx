import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/lib/impersonation/ImpersonationContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  teamId: string | null;
  teamName: string | null;
}

export const ImpersonationModal: React.FC<Props> = ({ open, onClose, teamId, teamName }) => {
  const { user } = useAuth();
  const { startImpersonation } = useImpersonation();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleStart = async () => {
    if (!teamId || !teamName || !user) return;
    if (reason.trim().length < 5) {
      toast.error('Please provide a reason (min 5 characters).');
      return;
    }
    setSubmitting(true);
    const { error } = await startImpersonation({
      teamId,
      teamName,
      reason: reason.trim(),
      superAdminId: user.id,
    });
    setSubmitting(false);
    if (error) {
      toast.error(`Failed to start impersonation: ${error}`);
      return;
    }
    toast.success(`Impersonating ${teamName}`);
    setReason('');
    onClose();
    navigate('/dashboard');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Impersonate {teamName || 'Organisation'}
          </DialogTitle>
          <DialogDescription>
            This is a read-only "view-as" session. Your super admin auth session is preserved. All
            access while impersonating is logged in <code>super_admin_impersonation_logs</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="impersonation-reason">Reason for impersonation *</Label>
          <Textarea
            id="impersonation-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Investigating booking sync failure reported by support ticket #1234"
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleStart} disabled={submitting || reason.trim().length < 5}>
            {submitting ? 'Starting…' : 'Start Impersonation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

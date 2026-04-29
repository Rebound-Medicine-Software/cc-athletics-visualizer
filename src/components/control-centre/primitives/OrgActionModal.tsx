import React, { useEffect, useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type OrgActionKind = 'suspend' | 'reactivate' | 'upgrade' | 'message';

interface Props {
  open: boolean;
  kind: OrgActionKind | null;
  organisationName: string;
  currentTier?: string | null;
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: (payload: { reason?: string; tier?: string; subject?: string; message?: string }) => void;
}

const TIERS = ['Basic', 'Premium', 'Elite'];

const META: Record<OrgActionKind, { title: (n: string) => string; desc: string; cta: string; danger?: boolean }> = {
  suspend: {
    title: (n) => `Suspend ${n}?`,
    desc: 'Suspending will block subscription access. The organisation owner will not be billed but practitioners will lose access. This is recorded in the platform audit log.',
    cta: 'Suspend Organisation',
    danger: true,
  },
  reactivate: {
    title: (n) => `Reactivate ${n}?`,
    desc: 'Reactivating restores organisation access. If they previously had an active billing subscription, status returns to active; otherwise to trial.',
    cta: 'Reactivate Organisation',
  },
  upgrade: {
    title: (n) => `Change tier for ${n}`,
    desc: 'Updates the organisation tier locally and mirrors the tier name onto its subscription record. Stripe is NOT contacted — actual plan migration must be performed in Stripe separately.',
    cta: 'Update Tier',
  },
  message: {
    title: (n) => `Message ${n}`,
    desc: 'Sends an in-app message to the organisation owner. The send is recorded in the platform audit log.',
    cta: 'Send Message',
  },
};

export const OrgActionModal: React.FC<Props> = ({
  open, kind, organisationName, currentTier, submitting, onCancel, onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [tier, setTier] = useState<string>(currentTier || 'Basic');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      setReason(''); setSubject(''); setMessage('');
      setTier(currentTier || 'Basic');
    }
  }, [open, currentTier]);

  if (!kind) return null;
  const meta = META[kind];

  const isMessage = kind === 'message';
  const isUpgrade = kind === 'upgrade';

  const canSubmit = (() => {
    if (submitting) return false;
    if (isMessage) return subject.trim().length > 0 && message.trim().length >= 3;
    if (isUpgrade) return tier.trim().length > 0 && reason.trim().length >= 3;
    return reason.trim().length >= 3;
  })();

  const handleConfirm = () => {
    if (!canSubmit) return;
    if (isMessage) onConfirm({ subject: subject.trim(), message: message.trim() });
    else if (isUpgrade) onConfirm({ tier, reason: reason.trim() });
    else onConfirm({ reason: reason.trim() });
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{meta.title(organisationName)}</AlertDialogTitle>
          <AlertDialogDescription>{meta.desc}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-1">
          {isUpgrade && (
            <div>
              <label className="text-[11px] uppercase tracking-wider block mb-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                Target Tier {currentTier ? <span className="ml-1">(current: {currentTier})</span> : null}
              </label>
              <select
                className="cc-input w-full" style={{ paddingLeft: 12 }}
                value={tier} onChange={(e) => setTier(e.target.value)}
              >
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {isMessage && (
            <>
              <div>
                <label className="text-[11px] uppercase tracking-wider block mb-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Subject</label>
                <input
                  className="cc-input w-full" style={{ paddingLeft: 12 }}
                  placeholder="Subject…"
                  value={subject} onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider block mb-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Message</label>
                <textarea
                  rows={5}
                  className="w-full p-3 rounded-lg text-[13px] resize-none"
                  style={{ background: 'hsl(var(--cc-surface) / 0.6)', border: '1px solid hsl(var(--cc-border))', color: 'hsl(var(--cc-fg))' }}
                  placeholder="Write your message to the organisation owner…"
                  value={message} onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </>
          )}

          {!isMessage && (
            <div>
              <label className="text-[11px] uppercase tracking-wider block mb-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                Reason {kind === 'suspend' && <span style={{ color: 'hsl(var(--cc-danger))' }}>*</span>}
              </label>
              <textarea
                rows={3}
                className="w-full p-3 rounded-lg text-[13px] resize-none"
                style={{ background: 'hsl(var(--cc-surface) / 0.6)', border: '1px solid hsl(var(--cc-border))', color: 'hsl(var(--cc-fg))' }}
                placeholder="Why is this action being taken? (recorded in audit log)"
                value={reason} onChange={(e) => setReason(e.target.value)}
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            disabled={!canSubmit}
            style={meta.danger ? { background: 'hsl(var(--cc-danger))', color: 'white' } : undefined}
          >
            {submitting ? 'Working…' : meta.cta}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

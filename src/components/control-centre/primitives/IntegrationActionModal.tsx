import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy?: boolean;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  requireReason?: boolean;
}

export const IntegrationActionModal: React.FC<Props> = ({
  open, title, description, confirmLabel, busy, destructive,
  onCancel, onConfirm, requireReason = true,
}) => {
  const [reason, setReason] = useState('');
  if (!open) return null;
  const reasonOk = !requireReason || reason.trim().length >= 3;

  return (
    <>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" style={{ zIndex: 1600 }} onClick={() => !busy && onCancel()} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md cc-glass-strong p-5 rounded-xl"
           style={{ zIndex: 1700, background: 'hsl(var(--cc-bg))' }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: destructive ? 'hsl(var(--cc-danger))' : 'hsl(var(--cc-warning))' }} />
            <div className="text-[15px] font-semibold">{title}</div>
          </div>
          <button onClick={onCancel} disabled={busy} className="cc-btn"><X className="w-4 h-4" /></button>
        </div>
        <div className="text-[12px] mb-3" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{description}</div>
        {requireReason && (
          <div className="mb-3">
            <label className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full mt-1 p-2 text-[13px] rounded bg-transparent border"
              style={{ borderColor: 'hsl(var(--cc-border))', color: 'hsl(var(--cc-fg))' }}
              placeholder="Document why this action is being performed (audit trail)…"
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button className="cc-btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button
            className="cc-btn"
            style={{
              background: destructive ? 'hsl(var(--cc-danger) / 0.15)' : 'hsl(var(--cc-navy-glow) / 0.2)',
              borderColor: destructive ? 'hsl(var(--cc-danger))' : 'hsl(var(--cc-navy-glow))',
            }}
            onClick={() => onConfirm(reason.trim())}
            disabled={busy || !reasonOk}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
};

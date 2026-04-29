import React, { useEffect, useState, useCallback } from 'react';
import { X, AlertTriangle, Activity, Building2, RefreshCw, ShieldCheck, Stethoscope } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from './StatusBadge';
import { IntegrationActionModal } from './IntegrationActionModal';
import { toast } from 'sonner';

type ActionKind = 'recheck_global' | 'recheck_team' | 'retry_cc' | 'ack_team';
interface PendingAction { kind: ActionKind; teamId?: string | null; teamName?: string | null; }

interface Props {
  integrationName: string | null;
  displayName?: string;
  onClose: () => void;
}

interface RecentLog {
  id: string;
  status: string | null;
  latency_ms: number | null;
  failure_reason: string | null;
  logged_at: string;
  team_id: string | null;
  organisation_name: string | null;
  payload: any;
}

interface FailureReason {
  failure_reason: string;
  occurrences: number;
  last_seen: string;
}

interface AffectedOrg {
  team_id: string | null;
  organisation_name: string | null;
  failure_count: number;
  last_failure_at: string;
  last_failure_reason: string | null;
}

interface Detail {
  integration_name: string;
  recent_logs: RecentLog[];
  failure_reasons: FailureReason[];
  affected_organisations: AffectedOrg[];
  summary_24h: {
    success: number;
    failed: number;
    avg_latency_ms: number | null;
    p95_latency_ms: number | null;
  };
}

const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

const statusVariant = (s: string | null) =>
  s === 'success' ? 'success' : s === 'failed' ? 'danger' : 'muted';

export const IntegrationDetailDrawer: React.FC<Props> = ({ integrationName, displayName, onClose }) => {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const open = !!integrationName;

  const reload = useCallback(() => {
    if (!integrationName) return;
    setLoading(true);
    supabase
      .rpc('get_integration_detail', { integration_name_in: integrationName })
      .then(({ data, error }) => {
        setLoading(false);
        if (error) { toast.error(error.message); return; }
        setDetail(data as unknown as Detail);
      });
  }, [integrationName]);

  useEffect(() => {
    if (!integrationName) { setDetail(null); return; }
    reload();
  }, [integrationName, reload]);

  if (!open) return null;

  const summary = detail?.summary_24h;
  const isCcAthletics = integrationName === 'cc_athletics';

  const runAction = async (reason: string) => {
    if (!pending || !integrationName) return;
    setBusy(true);
    try {
      if (pending.kind === 'recheck_global') {
        const { error } = await supabase.rpc('run_integration_health_check', { p_integration_name: integrationName, p_team_uuid: null });
        if (error) throw error;
        toast.success('Global health check recorded');
      } else if (pending.kind === 'recheck_team') {
        const { error } = await supabase.rpc('run_integration_health_check', { p_integration_name: integrationName, p_team_uuid: pending.teamId });
        if (error) throw error;
        toast.success('Team health check recorded');
      } else if (pending.kind === 'ack_team') {
        const { error } = await supabase.rpc('acknowledge_integration_issue', { p_integration_name: integrationName, p_team_uuid: pending.teamId, p_reason: reason });
        if (error) throw error;
        toast.success('Issue acknowledged');
      } else if (pending.kind === 'retry_cc') {
        const { data, error } = await supabase.functions.invoke('cc-retry-sync', { body: { team_uuid: pending.teamId, reason } });
        if (error) throw error;
        if ((data as any)?.status === 'success') toast.success(`Retry succeeded (${(data as any).latency_ms}ms)`);
        else toast.error(`Retry failed: ${(data as any)?.failure_reason || 'unknown'}`);
      }
      setPending(null);
      reload();
    } catch (e: any) {
      toast.error(e?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };


  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        style={{ zIndex: 1400 }}
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 h-full w-full max-w-3xl overflow-y-auto cc-glass-strong"
        style={{ zIndex: 1500, background: 'hsl(var(--cc-bg))' }}
      >
        <div className="sticky top-0 flex items-center justify-between p-5 border-b" style={{ background: 'hsl(var(--cc-bg))', borderColor: 'hsl(var(--cc-border))' }}>
          <div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Integration</div>
            <div className="text-[18px] font-semibold">{displayName || integrationName}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="cc-btn" onClick={() => setPending({ kind: 'recheck_global' })} title="Record a manual global health check">
              <Stethoscope className="w-4 h-4" /> Recheck health
            </button>
            <button className="cc-btn" onClick={reload} title="Refresh"><RefreshCw className="w-4 h-4" /></button>
            <button onClick={onClose} className="cc-btn"><X className="w-4 h-4" /></button>
          </div>
        </div>


        {loading && <div className="p-6 text-sm" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Loading…</div>}

        {detail && (
          <div className="p-5 space-y-5">
            {/* 24h summary */}
            <div className="grid grid-cols-4 gap-3">
              <div className="cc-glass p-3">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Success 24h</div>
                <div className="text-[18px] font-bold mt-1" style={{ color: 'hsl(var(--cc-success))' }}>{summary?.success ?? 0}</div>
              </div>
              <div className="cc-glass p-3">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Failed 24h</div>
                <div className="text-[18px] font-bold mt-1" style={{ color: 'hsl(var(--cc-danger))' }}>{summary?.failed ?? 0}</div>
              </div>
              <div className="cc-glass p-3">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Avg latency</div>
                <div className="text-[18px] font-bold mt-1">{summary?.avg_latency_ms ?? 0}<span className="text-[11px] ml-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>ms</span></div>
              </div>
              <div className="cc-glass p-3">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(var(--cc-fg-dim))' }}>p95 latency</div>
                <div className="text-[18px] font-bold mt-1">{summary?.p95_latency_ms ?? 0}<span className="text-[11px] ml-1" style={{ color: 'hsl(var(--cc-fg-dim))' }}>ms</span></div>
              </div>
            </div>

            {/* Failure reasons */}
            <div className="cc-glass p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" style={{ color: 'hsl(var(--cc-warning))' }} />
                <div className="text-[13px] font-semibold">Top failure reasons (7d)</div>
              </div>
              {detail.failure_reasons.length === 0 ? (
                <div className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>No failures in the last 7 days.</div>
              ) : (
                <div className="space-y-2">
                  {detail.failure_reasons.map((r, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 text-[12px]">
                      <div className="flex-1 break-words">{r.failure_reason}</div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono">{r.occurrences}×</span>
                        <span style={{ color: 'hsl(var(--cc-fg-dim))' }}>{fmtDate(r.last_seen)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Affected organisations */}
            <div className="cc-glass p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4" style={{ color: 'hsl(var(--cc-navy-glow))' }} />
                <div className="text-[13px] font-semibold">Affected organisations (24h)</div>
              </div>
              {detail.affected_organisations.length === 0 ? (
                <div className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>No affected organisations in the last 24 hours.</div>
              ) : (
                <div className="space-y-2">
                  {detail.affected_organisations.map((o, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 text-[12px] py-2 border-b" style={{ borderColor: 'hsl(var(--cc-border) / 0.4)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{o.organisation_name || o.team_id || '—'}</div>
                        <div className="truncate" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{o.last_failure_reason || '—'}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono">{o.failure_count} fails</span>
                        <span style={{ color: 'hsl(var(--cc-fg-dim))' }}>{fmtDate(o.last_failure_at)}</span>
                        {o.team_id && (
                          <>
                            {isCcAthletics && (
                              <button className="cc-btn" title="Retry CC Athletics sync"
                                onClick={() => setPending({ kind: 'retry_cc', teamId: o.team_id, teamName: o.organisation_name })}>
                                <RefreshCw className="w-3.5 h-3.5" /> Retry
                              </button>
                            )}
                            <button className="cc-btn" title="Recheck health for this org"
                              onClick={() => setPending({ kind: 'recheck_team', teamId: o.team_id, teamName: o.organisation_name })}>
                              <Stethoscope className="w-3.5 h-3.5" />
                            </button>
                            <button className="cc-btn" title="Acknowledge issue"
                              onClick={() => setPending({ kind: 'ack_team', teamId: o.team_id, teamName: o.organisation_name })}>
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>


            {/* Recent logs */}
            <div className="cc-glass p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4" style={{ color: 'hsl(var(--cc-navy-glow))' }} />
                <div className="text-[13px] font-semibold">Recent log entries</div>
              </div>
              {detail.recent_logs.length === 0 ? (
                <div className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>No log entries yet.</div>
              ) : (
                <div className="space-y-2">
                  {detail.recent_logs.map((l) => (
                    <div key={l.id} className="text-[12px] py-2 border-b" style={{ borderColor: 'hsl(var(--cc-border) / 0.4)' }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge variant={statusVariant(l.status) as any} dot>{l.status || '—'}</StatusBadge>
                          <span className="font-semibold">{l.organisation_name || '—'}</span>
                        </div>
                        <div className="flex items-center gap-3" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                          {l.latency_ms != null && <span className="font-mono">{l.latency_ms}ms</span>}
                          <span>{fmtDate(l.logged_at)}</span>
                        </div>
                      </div>
                      {l.failure_reason && (
                        <div className="mt-1" style={{ color: 'hsl(var(--cc-danger))' }}>{l.failure_reason}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <IntegrationActionModal
        open={!!pending}
        busy={busy}
        title={
          pending?.kind === 'recheck_global' ? 'Recheck integration health (global)' :
          pending?.kind === 'recheck_team' ? `Recheck health for ${pending?.teamName || 'organisation'}` :
          pending?.kind === 'retry_cc' ? `Retry CC Athletics sync for ${pending?.teamName || 'organisation'}` :
          pending?.kind === 'ack_team' ? `Acknowledge issue for ${pending?.teamName || 'organisation'}` : ''
        }
        description={
          pending?.kind === 'recheck_global' ? 'Records a manual health check entry. No credentials are touched.' :
          pending?.kind === 'recheck_team' ? 'Records a manual health check entry for this organisation.' :
          pending?.kind === 'retry_cc' ? 'Triggers a one-off CC Athletics sync for this organisation. Outcome will be logged.' :
          'Marks unresolved alerts for this integration / organisation as acknowledged.'
        }
        confirmLabel={pending?.kind === 'retry_cc' ? 'Run retry' : 'Confirm'}
        requireReason={pending?.kind === 'retry_cc' || pending?.kind === 'ack_team'}
        destructive={pending?.kind === 'retry_cc'}
        onCancel={() => { if (!busy) setPending(null); }}
        onConfirm={runAction}
      />
    </>
  );
};

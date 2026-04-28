import React from 'react';
import { X, Building2, Users, UserCircle, Activity, CalendarRange, FileText, DollarSign, AlertTriangle, Sparkles, Zap, CheckCircle2, UserCog } from 'lucide-react';
import { useOrganisationDetail } from '../hooks/useOrganisationDetail';
import { StatusBadge } from './StatusBadge';

interface Props {
  teamId: string | null;
  onClose: () => void;
}

const fmt = (n: number | undefined | null) => (n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n)));
const fmtCurrency = (n: number | undefined | null) => (n == null ? '—' : `$${Math.round(Number(n))}`);
const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString() : '—');
const relTime = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};

const Stat: React.FC<{ icon: any; label: string; value: React.ReactNode; hint?: string }> = ({ icon: Icon, label, value, hint }) => (
  <div className="cc-glass p-3">
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-3.5 h-3.5" style={{ color: 'hsl(var(--cc-fg-muted))' }} />
      <span className="text-[11px] uppercase tracking-wide" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{label}</span>
    </div>
    <div className="text-lg font-semibold" style={{ color: 'hsl(var(--cc-fg))' }}>{value}</div>
    {hint && <div className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{hint}</div>}
  </div>
);

export const OrganisationDetailDrawer: React.FC<Props> = ({ teamId, onClose }) => {
  const { data, loading, error } = useOrganisationDetail(teamId);
  const open = !!teamId;

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1400 }}
        />
      )}
      <aside
        style={{
          position: 'fixed', top: 0, right: 0, height: '100vh',
          width: 'min(640px, 96vw)',
          background: 'hsl(var(--cc-bg))',
          borderLeft: '1px solid hsl(var(--cc-border))',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          zIndex: 1500, overflowY: 'auto',
        }}
      >
        {open && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between sticky top-0 py-2" style={{ background: 'hsl(var(--cc-bg))', zIndex: 10 }}>
              <h2 className="cc-h2 flex items-center gap-2"><Building2 className="w-4 h-4" /> Organisation Detail</h2>
              <button onClick={onClose} className="cc-btn p-1.5"><X className="w-3.5 h-3.5" /></button>
            </div>

            {loading && <p className="cc-subtle">Loading organisation…</p>}
            {error && <p className="cc-subtle" style={{ color: 'hsl(var(--cc-danger))' }}>Error: {error}</p>}

            {data?.organisation && (
              <>
                {/* Profile */}
                <div className="cc-glass p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-md flex items-center justify-center font-bold"
                      style={{
                        background: `${data.organisation.primary_color || '#1e3a6e'}33`,
                        color: data.organisation.primary_color || '#5b8def',
                        border: `1px solid ${data.organisation.primary_color || '#1e3a6e'}66`,
                      }}
                    >
                      {data.organisation.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-semibold" style={{ color: 'hsl(var(--cc-fg))' }}>{data.organisation.name}</div>
                      <div className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                        {[data.organisation.city, data.organisation.region, data.organisation.country].filter(Boolean).join(' · ') || '—'}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <StatusBadge variant={data.organisation.subscription_status === 'active' ? 'success' : 'muted'}>
                          {data.organisation.subscription_status ?? 'unknown'}
                        </StatusBadge>
                        {data.organisation.tier_name && (
                          <StatusBadge variant={data.organisation.tier_name === 'Elite' ? 'gold' : data.organisation.tier_name === 'Premium' ? 'info' : 'muted'}>
                            {data.organisation.tier_name}
                          </StatusBadge>
                        )}
                        {data.organisation.organisation_status && (
                          <StatusBadge variant={data.organisation.organisation_status === 'active' ? 'success' : 'warning'}>
                            {data.organisation.organisation_status}
                          </StatusBadge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
                    <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Owner:</span> {data.organisation.owner_full_name || data.organisation.owner_email || '—'}</div>
                    <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Email:</span> {data.organisation.owner_email || '—'}</div>
                    <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Created:</span> {fmtDate(data.organisation.created_at)}</div>
                    <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Last activity:</span> {data.organisation.last_activity_at ? relTime(data.organisation.last_activity_at) : '—'}</div>
                    <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Team ID:</span> <code className="text-[11px]">{data.organisation.cc_team_id?.slice(0, 14)}…</code></div>
                    <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Churn risk:</span> {data.organisation.churn_risk_score ?? 0}</div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <Stat icon={Users} label="Practitioners" value={fmt(data.practitioner_count)} />
                  <Stat icon={UserCircle} label="Athletes" value={fmt(data.athlete_count)} />
                  <Stat icon={Activity} label="Tests (MTD)" value={fmt(data.tests_this_month)} />
                  <Stat icon={CalendarRange} label="Bookings (MTD)" value={fmt(data.bookings_this_month)} />
                  <Stat icon={FileText} label="Reports Sent" value={fmt(data.reports_sent_total)} hint="all-time" />
                  <Stat icon={DollarSign} label="Monthly Revenue" value={fmtCurrency(data.monthly_revenue)} />
                </div>

                {/* Subscription */}
                {data.subscription && (
                  <div className="cc-glass p-3">
                    <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--cc-fg-dim))' }}>Subscription</div>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Tier:</span> {data.subscription.tier_name ?? '—'}</div>
                      <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Status:</span> {data.subscription.status ?? '—'}</div>
                      <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Payment:</span> {data.subscription.payment_status ?? '—'}</div>
                      <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Seats:</span> {data.subscription.seat_count ?? '—'}</div>
                      <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Monthly value:</span> {fmtCurrency(data.subscription.monthly_value)}</div>
                      <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Renewal:</span> {fmtDate(data.subscription.renewal_date)}</div>
                    </div>
                  </div>
                )}

                {/* Latest health snapshot */}
                {data.latest_health && (
                  <div className="cc-glass p-3">
                    <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                      Latest Health Snapshot · {fmtDate(data.latest_health.snapshot_date)}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[12px]">
                      <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Engagement:</span> {data.latest_health.engagement_score ?? 0}</div>
                      <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Churn risk:</span> {data.latest_health.churn_risk_score ?? 0}</div>
                      <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Logins:</span> {data.latest_health.login_count ?? 0}</div>
                      <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>AI requests:</span> {data.latest_health.ai_requests ?? 0}</div>
                      <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Reports:</span> {data.latest_health.reports_generated ?? 0}</div>
                      <div><span style={{ color: 'hsl(var(--cc-fg-dim))' }}>Consent rate:</span> {data.latest_health.consent_completion_rate ?? 0}%</div>
                    </div>
                  </div>
                )}

                {/* Integration health */}
                <div className="cc-glass p-3">
                  <div className="text-[11px] uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                    <Zap className="w-3 h-3" /> Integration Health (24h)
                  </div>
                  {data.integration_health.length === 0 ? (
                    <p className="cc-subtle">No integration events in the last 24 hours.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {data.integration_health.map((i) => (
                        <div key={i.integration_name} className="flex items-center justify-between text-[12px]">
                          <span className="font-medium">{i.integration_name}</span>
                          <div className="flex items-center gap-2">
                            <StatusBadge variant={i.failure_count > 0 ? 'danger' : 'success'} dot>
                              {i.failure_count > 0 ? `${i.failure_count} failed` : 'healthy'}
                            </StatusBadge>
                            <span style={{ color: 'hsl(var(--cc-fg-dim))' }}>{i.success_count} ok</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unresolved alerts */}
                <div className="cc-glass p-3">
                  <div className="text-[11px] uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                    <AlertTriangle className="w-3 h-3" /> Unresolved Alerts
                  </div>
                  {data.unresolved_alerts.length === 0 ? (
                    <p className="cc-subtle">No active alerts.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {data.unresolved_alerts.map((a) => (
                        <div key={a.id} className="flex items-start gap-2 text-[12px]">
                          <StatusBadge variant={a.severity === 'critical' ? 'danger' : a.severity === 'warning' ? 'warning' : 'info'}>
                            {a.severity}
                          </StatusBadge>
                          <div className="flex-1">
                            <div className="font-medium">{a.title || a.alert_type}</div>
                            {a.description && <div style={{ color: 'hsl(var(--cc-fg-dim))' }}>{a.description}</div>}
                          </div>
                          <span style={{ color: 'hsl(var(--cc-fg-dim))' }}>{relTime(a.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent activity */}
                <div className="cc-glass p-3">
                  <div className="text-[11px] uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
                    <Activity className="w-3 h-3" /> Recent Activity
                  </div>
                  {data.recent_activity.length === 0 ? (
                    <p className="cc-subtle">No recent activity logged.</p>
                  ) : (
                    <div className="space-y-1">
                      {data.recent_activity.map((r) => (
                        <div key={r.id} className="flex items-center justify-between text-[12px] py-1">
                          <span>{r.event_type.replace(/_/g, ' ')}</span>
                          <span style={{ color: 'hsl(var(--cc-fg-dim))' }}>{relTime(r.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                <div className="flex items-center gap-2 pt-2">
                  <button className="cc-btn opacity-60 cursor-not-allowed" disabled title="Coming next">
                    <UserCog className="w-3.5 h-3.5" /> Impersonate (coming next)
                  </button>
                  <button className="cc-btn opacity-60 cursor-not-allowed" disabled title="Coming next">
                    <Sparkles className="w-3.5 h-3.5" /> Upgrade (coming next)
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  );
};

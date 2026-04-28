import React from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { TrendArea, TrendLine, TrendBars } from '../primitives/Charts';
import { AlertPanel, AlertItem } from '../primitives/AlertPanel';
import { usePlatformKpis } from '../hooks/usePlatformKpis';
import { useGlobalActivityFeed } from '../hooks/useGlobalActivityFeed';
import { usePlatformAlerts } from '../hooks/usePlatformAlerts';
import { useRevenueTrend } from '../hooks/useRevenueTrend';
import { useTestsTrend } from '../hooks/useTestsTrend';
import { usePractitionerEngagementTrend } from '../hooks/usePractitionerEngagementTrend';
import { useChurnRiskTrend } from '../hooks/useChurnRiskTrend';
import {
  Building2, Users, UserCircle, Activity, Sparkles, FileText, DollarSign,
  AlertTriangle, CalendarRange, ArrowRight, UserPlus, CheckCircle2,
  ClipboardList, Send, Zap, TrendingUp, TrendingDown,
} from 'lucide-react';

// ---- helpers ----------------------------------------------------------------

const fmt = (n: number | undefined): string => {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
};

const fmtCurrency = (n: number | undefined): string => {
  if (n === undefined || n === null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
};

// Lightweight delta pill rendered next to chart titles. Positive = up arrow.
// `inverted` flips the colour semantic — used for churn risk where down is good.
const DeltaPill: React.FC<{ delta: number | null; inverted?: boolean }> = ({ delta, inverted }) => {
  if (delta === null || delta === undefined) return null;
  const isUp = delta > 0;
  const isFlat = delta === 0;
  const positive = inverted ? !isUp : isUp;
  const color = isFlat
    ? 'hsl(var(--cc-fg-dim))'
    : positive
      ? 'hsl(var(--cc-success))'
      : 'hsl(var(--cc-danger))';
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: `${color.replace(')', ' / 0.12)')}`, color, border: `1px solid ${color.replace(')', ' / 0.3)')}` }}
    >
      {!isFlat && <Icon className="w-3 h-3" />}
      {delta > 0 ? '+' : ''}{delta}%
    </span>
  );
};

const iconForEvent = (eventType: string, severity: string | null) => {
  if (eventType.startsWith('organisation_signup')) return { Icon: UserPlus, color: 'hsl(var(--cc-success))' };
  if (eventType.startsWith('practitioner_invite')) return { Icon: Users, color: 'hsl(var(--cc-navy-glow))' };
  if (eventType.startsWith('report_generated') || eventType.startsWith('report_email')) return { Icon: FileText, color: 'hsl(var(--cc-gold))' };
  if (eventType.startsWith('consent_email')) return { Icon: CheckCircle2, color: 'hsl(var(--cc-success))' };
  if (eventType.startsWith('ai_coach')) return { Icon: Sparkles, color: 'hsl(var(--cc-gold))' };
  if (eventType.startsWith('booking') || eventType.includes('cal')) return { Icon: CalendarRange, color: 'hsl(var(--cc-info))' };
  if (severity === 'critical') return { Icon: AlertTriangle, color: 'hsl(var(--cc-danger))' };
  return { Icon: Activity, color: 'hsl(var(--cc-fg-muted))' };
};

const iconForAlert = (alertType: string, severity: string) => {
  if (alertType.includes('integration_failure')) return Zap;
  if (alertType.includes('org_at_risk')) return AlertTriangle;
  if (alertType.includes('critical_event')) return AlertTriangle;
  if (severity === 'info') return ClipboardList;
  return Send;
};

const humanEvent = (row: { event_type: string; organisation_name: string | null; metadata: any }): string => {
  const org = row.organisation_name ? ` — ${row.organisation_name}` : '';
  const meta = row.metadata ?? {};
  switch (row.event_type) {
    case 'organisation_signup':       return `New organisation signed up${org}`;
    case 'organisation_signup_failed': return `Organisation signup failed${org}`;
    case 'practitioner_invite_sent':  return `Practitioner invite sent to ${meta.email ?? ''}${org}`;
    case 'practitioner_invite_resent':return `Practitioner credentials re-issued to ${meta.email ?? ''}${org}`;
    case 'consent_email_sent':        return `Consent email sent to ${meta.athleteName ?? meta.email ?? 'athlete'}${org}`;
    case 'consent_email_failed':      return `Consent email FAILED for ${meta.email ?? 'athlete'}${org}`;
    case 'report_generated':          return `PDF report generated for ${meta.athlete_name ?? 'athlete'}`;
    case 'report_generation_failed':  return `Report generation failed`;
    case 'report_email_sent':         return `Report emailed to ${meta.athlete_name ?? meta.email ?? 'athlete'}${org}`;
    case 'report_email_failed':       return `Report email FAILED to ${meta.email ?? 'athlete'}${org}`;
    case 'ai_coach_insight_generated': return `AI Coach insight generated (${meta.test_name ?? 'test'})`;
    case 'ai_coach_insight_failed':   return `AI Coach insight failed`;
    default:                          return `${row.event_type.replace(/_/g, ' ')}${org}`;
  }
};

const relTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
};

// ---- component --------------------------------------------------------------

export const GlobalDashboard: React.FC = () => {
  const { kpis, reportsTotal, loading: kpisLoading } = usePlatformKpis();
  const { rows: activityRows, loading: activityLoading } = useGlobalActivityFeed(8);
  const { alerts: alertRows, loading: alertsLoading } = usePlatformAlerts();

  // Trend windows (default 90 days). Range buttons could later wire into these.
  const [revenueDays, setRevenueDays] = React.useState(90);
  const { data: revenueData, delta: revenueDelta, loading: revenueLoading } = useRevenueTrend(revenueDays);
  const { data: testsData, delta: testsDelta, loading: testsLoading } = useTestsTrend(90);
  const { data: engagementData, delta: engagementDelta, loading: engagementLoading } = usePractitionerEngagementTrend(90);
  const { data: churnData, delta: churnDelta, loading: churnLoading } = useChurnRiskTrend(90);

  const alerts: AlertItem[] = alertRows.map((a) => ({
    id: a.id,
    title: a.title ?? a.alert_type,
    detail: a.description ?? '',
    severity: (a.severity === 'info' || a.severity === 'warning' || a.severity === 'critical')
      ? a.severity : 'info',
    icon: iconForAlert(a.alert_type, a.severity),
    time: relTime(a.created_at),
  }));

  const ranges: Array<{ label: string; days: number }> = [
    { label: '1M', days: 30 },
    { label: '3M', days: 90 },
    { label: '6M', days: 180 },
    { label: '12M', days: 365 },
  ];

  return (
    <>
      <PageHeader
        title="Global Dashboard"
        subtitle="Cross-tenant platform health, revenue & engagement at a glance."
        actions={
          <>
            <button className="cc-btn">Export</button>
            <button className="cc-btn cc-btn-primary">New Report</button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Total Organisations" value={kpisLoading ? '—' : fmt(kpis?.total_organisations)} icon={Building2} accent="navy" />
        <KpiCard label="Active Orgs (30d)"   value={kpisLoading ? '—' : fmt(kpis?.active_organisations)} icon={Activity} accent="success" />
        <KpiCard label="Practitioners"       value={kpisLoading ? '—' : fmt(kpis?.total_practitioners)} icon={Users} accent="navy" />
        <KpiCard label="Athletes"            value={kpisLoading ? '—' : fmt(kpis?.total_athletes)} icon={UserCircle} accent="info" />
        <KpiCard label="Tests Logged (MTD)"  value={kpisLoading ? '—' : fmt(kpis?.monthly_tests_logged)} icon={Activity} accent="gold" hint="month to date" />
        <KpiCard label="AI Coach Requests"   value={kpisLoading ? '—' : fmt(kpis?.monthly_ai_requests)} icon={Sparkles} accent="gold" hint="MTD" />
        <KpiCard label="Reports Generated"   value={kpisLoading ? '—' : fmt(reportsTotal)} icon={FileText} accent="navy" hint="all-time" />
        <KpiCard label="Monthly Revenue"     value={kpisLoading ? '—' : fmtCurrency(kpis?.monthly_revenue)} icon={DollarSign} accent="success" />
        <KpiCard label="Failed Integrations" value={kpisLoading ? '—' : fmt(kpis?.failed_integrations)} icon={AlertTriangle} accent="danger" hint="last 24h" />
        <KpiCard
          label="Booking Utilisation"
          value={
            kpisLoading
              ? '—'
              : kpis?.booking_utilisation_percent != null
                ? `${kpis.booking_utilisation_percent}%`
                : fmt(kpis?.monthly_bookings_count)
          }
          icon={CalendarRange}
          accent="info"
          hint={
            kpis?.booking_utilisation_percent != null
              ? `${fmt(kpis?.monthly_bookings_count)} bookings MTD`
              : 'bookings MTD'
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="cc-glass p-4 xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="cc-h2">Monthly Revenue Growth</h3>
                <DeltaPill delta={revenueDelta} />
              </div>
              <p className="cc-subtle">Recurring + one-off across all tenants</p>
            </div>
            <div className="flex gap-1">
              {ranges.map((r) => (
                <button
                  key={r.label}
                  className="cc-btn"
                  onClick={() => setRevenueDays(r.days)}
                  style={revenueDays === r.days
                    ? { background: 'hsl(var(--cc-navy) / 0.4)', color: 'hsl(var(--cc-gold))' }
                    : {}}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {revenueLoading
            ? <p className="cc-subtle">Loading revenue trend…</p>
            : <TrendArea data={revenueData} dataKey="value" color="hsl(var(--cc-gold))" height={260} />}
        </div>

        <AlertPanel
          title="System Alerts"
          alerts={alertsLoading ? [] : alerts}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="cc-glass p-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="cc-h2">Tests Logged / Day</h3>
            <DeltaPill delta={testsDelta} />
          </div>
          <p className="cc-subtle mb-2">All organisations combined (90d)</p>
          {testsLoading
            ? <p className="cc-subtle">Loading…</p>
            : <TrendBars data={testsData} dataKey="value" highlightIndex={Math.max(0, testsData.length - 1)} />}
        </div>
        <div className="cc-glass p-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="cc-h2">Practitioner Engagement</h3>
            <DeltaPill delta={engagementDelta} />
          </div>
          <p className="cc-subtle mb-2">Avg score vs target threshold (90d)</p>
          {engagementLoading
            ? <p className="cc-subtle">Loading…</p>
            : <TrendLine data={engagementData} dataKey="active" dataKey2="target" />}
        </div>
        <div className="cc-glass p-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="cc-h2">Org Churn Risk</h3>
            <DeltaPill delta={churnDelta} inverted />
          </div>
          <p className="cc-subtle mb-2">Avg churn risk score across all orgs (90d)</p>
          {churnLoading
            ? <p className="cc-subtle">Loading…</p>
            : <TrendArea data={churnData} dataKey="value" color="hsl(var(--cc-danger))" />}
        </div>
      </div>

      <div className="cc-glass p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="cc-h2">Recent Platform Activity</h3>
          <button className="cc-btn">View all <ArrowRight className="w-3 h-3" /></button>
        </div>
        <div className="space-y-1.5">
          {activityLoading && (
            <p className="cc-subtle">Loading activity…</p>
          )}
          {!activityLoading && activityRows.length === 0 && (
            <p className="cc-subtle">No activity yet — events will appear here as edge functions are invoked.</p>
          )}
          {activityRows.map((row) => {
            const { Icon, color } = iconForEvent(row.event_type, row.severity);
            return (
              <div key={row.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'hsl(var(--cc-surface) / 0.4)' }}>
                <div className="w-7 h-7 rounded-md flex items-center justify-center"
                     style={{ background: `${color.replace(')', ' / 0.12)')}` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                </div>
                <span className="text-[13px] flex-1" style={{ color: 'hsl(var(--cc-fg))' }}>{humanEvent(row)}</span>
                <span className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{relTime(row.created_at)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

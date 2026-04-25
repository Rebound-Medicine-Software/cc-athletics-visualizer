import React from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { KpiCard } from '../primitives/KpiCard';
import { TrendArea, TrendLine, TrendBars } from '../primitives/Charts';
import { AlertPanel, AlertItem } from '../primitives/AlertPanel';
import { usePlatformStats } from '../hooks/usePlatformStats';
import {
  Building2, Users, UserCircle, Activity, Sparkles, FileText, DollarSign,
  AlertTriangle, CalendarRange, Plug, ArrowRight, UserPlus, CheckCircle2,
  ClipboardList, Send, Zap,
} from 'lucide-react';

const monthlyRevenue = [
  { name: 'May', value: 18400 }, { name: 'Jun', value: 21200 }, { name: 'Jul', value: 24800 },
  { name: 'Aug', value: 27300 }, { name: 'Sep', value: 31100 }, { name: 'Oct', value: 35600 },
  { name: 'Nov', value: 38900 }, { name: 'Dec', value: 42100 }, { name: 'Jan', value: 46800 },
  { name: 'Feb', value: 51200 }, { name: 'Mar', value: 55400 }, { name: 'Apr', value: 61200 },
];
const testsLogged = monthlyRevenue.map((m, i) => ({ name: m.name, value: 320 + i * 65 + Math.round(Math.sin(i) * 40) }));
const engagement = monthlyRevenue.map((m, i) => ({ name: m.name, active: 60 + i * 2.5, target: 80 }));
const churnRisk = monthlyRevenue.map((m, i) => ({ name: m.name, value: Math.max(2, 12 - i * 0.6 + Math.sin(i) * 2) }));

const alerts: AlertItem[] = [
  { id: '1', title: '3 organisations below engagement threshold', detail: 'Apex Performance, Velocity Lab, Stride Labs — < 5 logins this week', severity: 'warning', icon: AlertTriangle, time: '2h' },
  { id: '2', title: 'Edge function failure: send-consent-email', detail: '6 failures in last 24h. NotificationAPI auth response 401.', severity: 'critical', icon: Zap, time: '14m' },
  { id: '3', title: '4 unread support tickets', detail: '2 high priority, 1 escalated to engineering', severity: 'info', icon: ClipboardList, time: '38m' },
  { id: '4', title: 'Failed report send to athlete@northstrength.io', detail: 'SMTP rejected — invalid mailbox', severity: 'warning', icon: Send, time: '1h' },
  { id: '5', title: '2 payments in dispute', detail: 'Stripe chargebacks pending review', severity: 'critical', icon: DollarSign, time: '5h' },
];

const activity = [
  { icon: UserPlus, color: 'hsl(var(--cc-success))', text: 'Northgate Athletics signed up', time: '6m ago' },
  { icon: Users, color: 'hsl(var(--cc-navy-glow))', text: 'Practitioner invite sent to dr.lopez@elitepf.com', time: '22m ago' },
  { icon: FileText, color: 'hsl(var(--cc-gold))', text: 'PDF report generated for Athlete #A-2381', time: '38m ago' },
  { icon: CalendarRange, color: 'hsl(var(--cc-info))', text: 'Booking created via Cal.com — Stride Labs', time: '54m ago' },
  { icon: CheckCircle2, color: 'hsl(var(--cc-success))', text: 'Consent signed by 4 athletes (Velocity Lab)', time: '1h ago' },
  { icon: Sparkles, color: 'hsl(var(--cc-gold))', text: 'AI Coach insight generated for CMJ session', time: '2h ago' },
];

export const GlobalDashboard: React.FC = () => {
  const { stats } = usePlatformStats();

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
        <KpiCard label="Total Organisations" value={stats?.totalOrganisations ?? '—'} delta={8.4} icon={Building2} accent="navy" />
        <KpiCard label="Active Orgs (30d)"   value={stats?.activeOrganisations ?? '—'} delta={4.1} icon={Activity} accent="success" />
        <KpiCard label="Practitioners"       value={stats?.totalPractitioners ?? '—'} delta={12.3} icon={Users} accent="navy" />
        <KpiCard label="Athletes"            value={stats?.totalAthletes ?? '—'} delta={6.7} icon={UserCircle} accent="info" />
        <KpiCard label="Tests Logged (30d)"  value={stats?.monthlyTests ?? '—'} delta={18.2} icon={Activity} accent="gold" hint="all force plate tests" />
        <KpiCard label="AI Coach Requests"   value="1,284" delta={42.1} icon={Sparkles} accent="gold" />
        <KpiCard label="Reports Generated"   value="3,612" delta={9.8} icon={FileText} accent="navy" />
        <KpiCard label="Monthly Revenue"     value="$61.2k" delta={10.5} icon={DollarSign} accent="success" />
        <KpiCard label="Failed Integrations" value="12"     delta={-22.0} icon={AlertTriangle} accent="danger" hint="last 24h" />
        <KpiCard label="Booking Utilisation" value="74%"    delta={3.4} icon={CalendarRange} accent="info" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="cc-glass p-4 xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="cc-h2">Monthly Revenue Growth</h3>
              <p className="cc-subtle">Recurring + one-off across all tenants</p>
            </div>
            <div className="flex gap-1">
              {['1M', '3M', '12M', 'YTD'].map((t, i) => (
                <button key={t} className="cc-btn" style={i === 2 ? { background: 'hsl(var(--cc-navy) / 0.4)', color: 'hsl(var(--cc-gold))' } : {}}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <TrendArea data={monthlyRevenue} dataKey="value" color="hsl(var(--cc-gold))" height={260} />
        </div>

        <AlertPanel title="System Alerts" alerts={alerts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="cc-glass p-4">
          <h3 className="cc-h2 mb-1">Tests Logged / Month</h3>
          <p className="cc-subtle mb-2">All organisations combined</p>
          <TrendBars data={testsLogged} dataKey="value" highlightIndex={11} />
        </div>
        <div className="cc-glass p-4">
          <h3 className="cc-h2 mb-1">Practitioner Engagement</h3>
          <p className="cc-subtle mb-2">Active vs target threshold</p>
          <TrendLine data={engagement} dataKey="active" dataKey2="target" />
        </div>
        <div className="cc-glass p-4">
          <h3 className="cc-h2 mb-1">Org Churn Risk</h3>
          <p className="cc-subtle mb-2">% of orgs flagged at risk</p>
          <TrendArea data={churnRisk} dataKey="value" color="hsl(var(--cc-danger))" />
        </div>
      </div>

      <div className="cc-glass p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="cc-h2">Recent Platform Activity</h3>
          <button className="cc-btn">View all <ArrowRight className="w-3 h-3" /></button>
        </div>
        <div className="space-y-1.5">
          {activity.map((a, i) => {
            const Icon = a.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'hsl(var(--cc-surface) / 0.4)' }}>
                <div className="w-7 h-7 rounded-md flex items-center justify-center"
                     style={{ background: `${a.color.replace(')', ' / 0.12)')}` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: a.color }} />
                </div>
                <span className="text-[13px] flex-1" style={{ color: 'hsl(var(--cc-fg))' }}>{a.text}</span>
                <span className="text-[11px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{a.time}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

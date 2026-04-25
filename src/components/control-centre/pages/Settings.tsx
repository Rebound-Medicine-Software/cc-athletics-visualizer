import React from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { Flag, Layers, Sparkles, ShieldCheck, Database, Palette, FileText } from 'lucide-react';
import { StatusBadge } from '../primitives/StatusBadge';
import { toast } from 'sonner';

const flags = [
  { key: 'ai_coach_v2',         label: 'AI Coach v2 (GPT-4o)',  on: true,  desc: 'Use latest model for insights' },
  { key: 'cal_com_v2',          label: 'Cal.com API v2',        on: true,  desc: 'Routed via cal-com-proxy' },
  { key: 'pingram_emails',      label: 'Pingram Email Channel', on: false, desc: 'Backup notification provider' },
  { key: 'elite_benchmark_gen', label: 'Elite Benchmark Gen.',  on: true,  desc: 'Top-decile aggregation jobs' },
  { key: 'public_signup',       label: 'Public Org Signup',     on: false, desc: 'Open signup vs invite-only' },
  { key: 'experimental_3d',     label: '3D Force Visualisation',on: true,  desc: 'WebGL chart for force plates' },
];

const sections = [
  { icon: Layers,     title: 'Tier Templates',          desc: 'Default Basic / Premium / Elite pricing & permissions' },
  { icon: Sparkles,   title: 'AI Prompt Controls',      desc: 'System prompts for AI Coach insight generation' },
  { icon: ShieldCheck,title: 'Global Permissions',      desc: 'Role-based access matrix' },
  { icon: Database,   title: 'Benchmark Data Controls', desc: 'Manage Elite Athlete dataset & filters' },
  { icon: Palette,    title: 'Default Branding',        desc: 'Fallback colours, logo placeholder, font stack' },
  { icon: FileText,   title: 'Legal Documents',         desc: 'Terms, Privacy, Athlete Consent template' },
];

export const Settings: React.FC = () => (
  <>
    <PageHeader title="Platform Settings" subtitle="Feature flags, templates and global controls." />

    <div className="cc-glass p-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Flag className="w-4 h-4" style={{ color: 'hsl(var(--cc-gold))' }} />
        <h3 className="cc-h2">Feature Flags</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {flags.map((f) => (
          <div key={f.key} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'hsl(var(--cc-surface) / 0.5)', border: '1px solid hsl(var(--cc-border))' }}>
            <div>
              <div className="text-[13px] font-semibold">{f.label}</div>
              <div className="text-[11.5px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{f.desc}</div>
            </div>
            <button
              onClick={() => toast(`${f.label} ${f.on ? 'disabled' : 'enabled'}`)}
              className="relative w-11 h-6 rounded-full transition-all"
              style={{
                background: f.on ? 'hsl(var(--cc-gold))' : 'hsl(var(--cc-surface-2))',
                border: '1px solid ' + (f.on ? 'hsl(var(--cc-gold))' : 'hsl(var(--cc-border-strong))'),
              }}
            >
              <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.on ? 22 : 2 }} />
            </button>
          </div>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {sections.map((s) => {
        const Icon = s.icon;
        return (
          <button key={s.title} onClick={() => toast(s.title, { description: 'Manager opens here.' })} className="cc-glass p-4 text-left">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--cc-navy) / 0.25)', border: '1px solid hsl(var(--cc-navy-glow) / 0.4)' }}>
                <Icon className="w-5 h-5" style={{ color: 'hsl(var(--cc-navy-glow))' }} />
              </div>
              <StatusBadge variant="gold">Manage</StatusBadge>
            </div>
            <div className="text-[14px] font-semibold mb-1">{s.title}</div>
            <div className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{s.desc}</div>
          </button>
        );
      })}
    </div>
  </>
);

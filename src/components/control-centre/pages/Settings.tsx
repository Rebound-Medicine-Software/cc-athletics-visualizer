import React, { useState } from 'react';
import { PageHeader } from '../primitives/PageHeader';
import { Flag, Sparkles, ShieldCheck, Database, FileText, Loader2 } from 'lucide-react';
import { StatusBadge } from '../primitives/StatusBadge';
import { TierTemplatesEditor } from '../primitives/TierTemplatesEditor';
import { DefaultBrandingEditor } from '../primitives/DefaultBrandingEditor';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type FeatureFlag = {
  id: string;
  key: string;
  description: string | null;
  is_enabled: boolean;
  updated_at: string;
};

const placeholderSections = [
  { icon: Sparkles,   title: 'AI Prompt Controls',      desc: 'System prompts for AI Coach insight generation',
    note: 'No canonical prompt store yet. Reserved for a future phase.' },
  { icon: ShieldCheck,title: 'Global Permissions',      desc: 'Role-based access matrix',
    note: 'Permissions are enforced via RLS + Super Admin gate. No matrix editor yet.' },
  { icon: Database,   title: 'Benchmark Data Controls', desc: 'Manage Elite Athlete dataset & filters',
    note: 'Dataset managed in Settings > Data Housing. This panel reserved for global toggles.' },
  { icon: FileText,   title: 'Legal Documents',         desc: 'Terms, Privacy, Athlete Consent template',
    note: 'No canonical legal-doc table yet. Reserved for a future phase.' },
];

export const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const [pendingFlag, setPendingFlag] = useState<FeatureFlag | null>(null);

  const { data: flags = [], isLoading, error } = useQuery({
    queryKey: ['cc', 'feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_feature_flags');
      if (error) throw error;
      return (data ?? []) as FeatureFlag[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
      const { data, error } = await supabase.rpc('set_feature_flag', { p_key: key, p_enabled: enabled });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      toast.success(`${prettyLabel(vars.key)} ${vars.enabled ? 'enabled' : 'disabled'}`);
      queryClient.invalidateQueries({ queryKey: ['cc', 'feature-flags'] });
    },
    onError: (e: any) => toast.error('Failed to update flag', { description: e?.message }),
  });

  const prettyLabel = (key: string) =>
    key.replace(/^feature_flag\./, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const confirmToggle = () => {
    if (!pendingFlag) return;
    toggleMutation.mutate({ key: pendingFlag.key, enabled: !pendingFlag.is_enabled });
    setPendingFlag(null);
  };

  return (
    <>
      <PageHeader title="Platform Settings" subtitle="Feature flags, templates and global controls." />

      <div className="cc-glass p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Flag className="w-4 h-4" style={{ color: 'hsl(var(--cc-gold))' }} />
          <h3 className="cc-h2">Feature Flags</h3>
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'hsl(var(--cc-fg-dim))' }} />}
        </div>

        {error && (
          <div className="text-[12px] p-3 rounded-lg" style={{ color: 'hsl(var(--cc-red))', background: 'hsl(var(--cc-red) / 0.08)' }}>
            Failed to load feature flags: {(error as any)?.message ?? 'unknown error'}
          </div>
        )}

        {!error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {flags.length === 0 && !isLoading && (
              <div className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>No feature flags configured.</div>
            )}
            {flags.map((f) => (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'hsl(var(--cc-surface) / 0.5)', border: '1px solid hsl(var(--cc-border))' }}>
                <div className="min-w-0 pr-3">
                  <div className="text-[13px] font-semibold truncate">{prettyLabel(f.key)}</div>
                  <div className="text-[11.5px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{f.description ?? f.key}</div>
                </div>
                <button
                  disabled={toggleMutation.isPending}
                  onClick={() => setPendingFlag(f)}
                  className="relative w-11 h-6 rounded-full transition-all shrink-0 disabled:opacity-50"
                  style={{
                    background: f.is_enabled ? 'hsl(var(--cc-gold))' : 'hsl(var(--cc-surface-2))',
                    border: '1px solid ' + (f.is_enabled ? 'hsl(var(--cc-gold))' : 'hsl(var(--cc-border-strong))'),
                  }}
                  aria-label={`Toggle ${prettyLabel(f.key)}`}
                >
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: f.is_enabled ? 22 : 2 }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <TierTemplatesEditor />
        <DefaultBrandingEditor />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {placeholderSections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.title}
              onClick={() => toast(s.title, { description: s.note })}
              className="cc-glass p-4 text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'hsl(var(--cc-navy) / 0.25)', border: '1px solid hsl(var(--cc-navy-glow) / 0.4)' }}>
                  <Icon className="w-5 h-5" style={{ color: 'hsl(var(--cc-navy-glow))' }} />
                </div>
                <StatusBadge variant="muted">Placeholder</StatusBadge>
              </div>
              <div className="text-[14px] font-semibold mb-1">{s.title}</div>
              <div className="text-[12px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>{s.desc}</div>
            </button>
          );
        })}
      </div>

      <AlertDialog open={!!pendingFlag} onOpenChange={(o) => !o && setPendingFlag(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingFlag?.is_enabled ? 'Disable' : 'Enable'} {pendingFlag ? prettyLabel(pendingFlag.key) : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingFlag?.description}
              <br /><br />
              This change is platform-wide and will be recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>
              {pendingFlag?.is_enabled ? 'Disable' : 'Enable'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type TierTemplate = {
  id: string;
  name: string;
  description: string | null;
  monthly_price: number;
  max_bookings_per_month: number;
  permissions: Record<string, boolean>;
  is_active: boolean;
  updated_at: string;
};

type FormState = {
  id: string | null;
  name: string;
  description: string;
  monthly_price: string;
  max_bookings_per_month: string;
  can_view_analytics: boolean;
  can_export_reports: boolean;
  can_edit_programming: boolean;
  can_adjust_sets_reps: boolean;
  is_active: boolean;
};

const blankForm: FormState = {
  id: null, name: '', description: '', monthly_price: '0', max_bookings_per_month: '0',
  can_view_analytics: false, can_export_reports: false, can_edit_programming: false, can_adjust_sets_reps: false,
  is_active: true,
};

export const TierTemplatesEditor: React.FC = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm);
  const [pendingDelete, setPendingDelete] = useState<TierTemplate | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['cc', 'tier-templates'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_platform_tier_templates');
      if (error) throw error;
      return (data ?? []) as TierTemplate[];
    },
  });

  const upsertMut = useMutation({
    mutationFn: async (f: FormState) => {
      const { data, error } = await supabase.rpc('upsert_platform_tier_template', {
        p_id: f.id,
        p_name: f.name.trim(),
        p_description: f.description || null,
        p_monthly_price: Number(f.monthly_price) || 0,
        p_max_bookings_per_month: parseInt(f.max_bookings_per_month, 10) || 0,
        p_permissions: {
          can_view_analytics: f.can_view_analytics,
          can_export_reports: f.can_export_reports,
          can_edit_programming: f.can_edit_programming,
          can_adjust_sets_reps: f.can_adjust_sets_reps,
        },
        p_is_active: f.is_active,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success(form.id ? 'Tier template updated' : 'Tier template created');
      qc.invalidateQueries({ queryKey: ['cc', 'tier-templates'] });
      setOpen(false); setForm(blankForm);
    },
    onError: (e: any) => toast.error('Save failed', { description: e?.message }),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.rpc('toggle_platform_tier_template', { p_id: id, p_is_active: active });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cc', 'tier-templates'] }),
    onError: (e: any) => toast.error('Toggle failed', { description: e?.message }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_platform_tier_template', { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Template deleted');
      qc.invalidateQueries({ queryKey: ['cc', 'tier-templates'] });
      setPendingDelete(null);
    },
    onError: (e: any) => toast.error('Delete failed', { description: e?.message }),
  });

  const openEdit = (r: TierTemplate) => {
    const p = r.permissions || {};
    setForm({
      id: r.id, name: r.name, description: r.description ?? '',
      monthly_price: String(r.monthly_price), max_bookings_per_month: String(r.max_bookings_per_month),
      can_view_analytics: !!p.can_view_analytics,
      can_export_reports: !!p.can_export_reports,
      can_edit_programming: !!p.can_edit_programming,
      can_adjust_sets_reps: !!p.can_adjust_sets_reps,
      is_active: r.is_active,
    });
    setOpen(true);
  };

  return (
    <div className="cc-glass p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="cc-h2">Tier Templates</h3>
          <p className="cc-subtle">Global defaults used when provisioning new organisations.</p>
        </div>
        <Button size="sm" onClick={() => { setForm(blankForm); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> New template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-[12px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <p className="cc-subtle text-center py-6 text-xs">No tier templates yet — create your first.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rows.map((r) => (
            <div key={r.id} className="p-3 rounded-lg" style={{ background: 'hsl(var(--cc-surface) / 0.5)', border: '1px solid hsl(var(--cc-border))' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-[13px] font-semibold">{r.name}</div>
                <StatusBadge variant={r.is_active ? 'success' : 'muted'}>{r.is_active ? 'Active' : 'Disabled'}</StatusBadge>
              </div>
              <div className="text-[11.5px]" style={{ color: 'hsl(var(--cc-fg-dim))' }}>{r.description || '—'}</div>
              <div className="flex items-center gap-3 mt-2 text-[11px]" style={{ color: 'hsl(var(--cc-fg-muted))' }}>
                <span>£{Number(r.monthly_price).toFixed(2)}/mo</span>
                <span>·</span>
                <span>{r.max_bookings_per_month} bookings/mo</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline"
                  onClick={() => toggleMut.mutate({ id: r.id, active: !r.is_active })}
                  disabled={toggleMut.isPending}>
                  {r.is_active ? 'Disable' : 'Enable'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPendingDelete(r)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit' : 'New'} tier template</DialogTitle>
            <DialogDescription>Global template — does not change existing organisation tiers.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Premium" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monthly price</Label>
                <Input type="number" step="0.01" value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: e.target.value })} />
              </div>
              <div>
                <Label>Max bookings / month</Label>
                <Input type="number" value={form.max_bookings_per_month} onChange={(e) => setForm({ ...form, max_bookings_per_month: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <Label>Permissions</Label>
              {([
                ['can_view_analytics', 'View analytics'],
                ['can_export_reports', 'Export reports'],
                ['can_edit_programming', 'Edit programming'],
                ['can_adjust_sets_reps', 'Adjust sets / reps'],
              ] as const).map(([k, lbl]) => (
                <label key={k} className="flex items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked } as any)} />
                  {lbl}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[13px] pt-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => upsertMut.mutate(form)} disabled={upsertMut.isPending || !form.name.trim()}>
              {upsertMut.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the global template only. Existing organisation tiers are untouched. This action is recorded in the audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDelete && deleteMut.mutate(pendingDelete.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

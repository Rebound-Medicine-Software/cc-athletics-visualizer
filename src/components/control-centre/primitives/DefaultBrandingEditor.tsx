import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type Branding = {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  logo_url: string | null;
};

const DEFAULTS: Branding = {
  primary_color: '#3B82F6',
  secondary_color: '#1E40AF',
  accent_color: '#F59E0B',
  font_family: 'Inter',
  logo_url: null,
};

export const DefaultBrandingEditor: React.FC = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState<Branding>(DEFAULTS);

  const { data, isLoading } = useQuery({
    queryKey: ['cc', 'default-branding'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_default_branding_settings');
      if (error) throw error;
      return (data ?? DEFAULTS) as Branding;
    },
  });

  useEffect(() => { if (data) setForm({ ...DEFAULTS, ...data }); }, [data]);

  const saveMut = useMutation({
    mutationFn: async (v: Branding) => {
      const { error } = await supabase.rpc('update_default_branding_settings', { p_value: v as any });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Default branding updated');
      qc.invalidateQueries({ queryKey: ['cc', 'default-branding'] });
    },
    onError: (e: any) => toast.error('Save failed', { description: e?.message }),
  });

  return (
    <div className="cc-glass p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="cc-h2">Default Branding</h3>
          <p className="cc-subtle">Fallback colours / font used for new organisations.</p>
        </div>
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'hsl(var(--cc-fg-dim))' }} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(['primary_color','secondary_color','accent_color'] as const).map((k) => (
          <div key={k}>
            <Label className="capitalize">{k.replace('_color',' colour').replace('_',' ')}</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="w-10 h-10 rounded border" />
              <Input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </div>
          </div>
        ))}
        <div>
          <Label>Font family</Label>
          <Input value={form.font_family} onChange={(e) => setForm({ ...form, font_family: e.target.value })} placeholder="Inter" />
        </div>
        <div className="md:col-span-2">
          <Label>Logo URL (optional)</Label>
          <Input value={form.logo_url ?? ''} onChange={(e) => setForm({ ...form, logo_url: e.target.value || null })} placeholder="https://…" />
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>
          {saveMut.isPending ? 'Saving…' : 'Save defaults'}
        </Button>
      </div>
    </div>
  );
};

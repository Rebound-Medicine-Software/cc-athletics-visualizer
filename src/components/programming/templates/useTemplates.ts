import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveTeamId } from '@/lib/impersonation/useEffectiveTeamId';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Template, Block, PrescribedExercise, TemplateFormValues } from './types';

const logActivity = async (params: {
  teamId: string | null;
  userId: string | null;
  eventType: string;
  metadata?: Record<string, any>;
}) => {
  if (!params.teamId) return;
  try {
    await supabase.from('platform_activity_logs').insert({
      event_type: params.eventType,
      event_source: 'programming.templates',
      team_id: params.teamId,
      user_id: params.userId,
      severity: 'info',
      metadata: params.metadata ?? {},
    });
  } catch {
    /* non-fatal */
  }
};

const buildTemplatePayload = (v: TemplateFormValues) => ({
  name: v.name.trim(),
  description: v.description.trim() || null,
  goal: v.goal.trim() || null,
  duration_weeks: v.duration_weeks ? Math.max(1, parseInt(v.duration_weeks, 10) || 1) : null,
});

/* ---------------- Templates ---------------- */

export const useTemplates = (filters: { search: string; goal: string; status: string }) => {
  const { teamId } = useEffectiveTeamId();
  return useQuery({
    queryKey: ['programming-templates', teamId, filters],
    enabled: !!teamId,
    queryFn: async (): Promise<Template[]> => {
      let q = supabase
        .from('programming_templates')
        .select('*')
        .eq('team_id', teamId!)
        .order('updated_at', { ascending: false });

      if (filters.status === 'active') q = q.is('archived_at', null);
      else if (filters.status === 'archived') q = q.not('archived_at', 'is', null);
      else if (filters.status === 'published') q = q.is('archived_at', null).eq('is_published', true);
      else if (filters.status === 'draft') q = q.is('archived_at', null).eq('is_published', false);

      if (filters.search.trim()) q = q.ilike('name', `%${filters.search.trim()}%`);
      if (filters.goal && filters.goal !== 'all') q = q.eq('goal', filters.goal);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });
};

export const useTemplate = (id: string | null) => {
  return useQuery({
    queryKey: ['programming-template', id],
    enabled: !!id,
    queryFn: async (): Promise<Template | null> => {
      const { data, error } = await supabase
        .from('programming_templates')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as Template) ?? null;
    },
  });
};

export const useCreateTemplate = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: TemplateFormValues) => {
      if (!teamId) throw new Error('No team context');
      const payload = {
        ...buildTemplatePayload(values),
        team_id: teamId,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      };
      const { data, error } = await supabase
        .from('programming_templates')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        eventType: 'programming_template_created',
        metadata: { template_id: data.id, template_name: data.name },
      });
      return data as Template;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programming-templates'] });
      toast.success('Template created');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to create template'),
  });
};

export const useUpdateTemplate = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TemplateFormValues }) => {
      const { data, error } = await supabase
        .from('programming_templates')
        .update({ ...buildTemplatePayload(values), updated_by: user?.id ?? null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        eventType: 'programming_template_updated',
        metadata: { template_id: data.id, template_name: data.name },
      });
      return data as Template;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['programming-templates'] });
      qc.invalidateQueries({ queryKey: ['programming-template', data.id] });
      toast.success('Template updated');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to update template'),
  });
};

export const useArchiveTemplate = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (t: Template) => {
      const archive = !t.archived_at;
      const { data, error } = await supabase
        .from('programming_templates')
        .update({ archived_at: archive ? new Date().toISOString() : null, updated_by: user?.id ?? null })
        .eq('id', t.id)
        .select()
        .single();
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        eventType: 'programming_template_archived',
        metadata: { template_id: t.id, template_name: t.name, archived: archive },
      });
      return data as Template;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['programming-templates'] });
      qc.invalidateQueries({ queryKey: ['programming-template', data.id] });
      toast.success(data.archived_at ? 'Template archived' : 'Template restored');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to update template'),
  });
};

export const useTogglePublishTemplate = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (t: Template) => {
      const next = !t.is_published;
      const { data, error } = await supabase
        .from('programming_templates')
        .update({ is_published: next, updated_by: user?.id ?? null })
        .eq('id', t.id)
        .select()
        .single();
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        eventType: 'programming_template_published',
        metadata: { template_id: t.id, template_name: t.name, is_published: next },
      });
      return data as Template;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['programming-templates'] });
      qc.invalidateQueries({ queryKey: ['programming-template', data.id] });
      toast.success(data.is_published ? 'Template published' : 'Template unpublished');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to update template'),
  });
};

/* ---------------- Blocks ---------------- */

export const useBlocks = (templateId: string | null) => {
  return useQuery({
    queryKey: ['programming-blocks', templateId],
    enabled: !!templateId,
    queryFn: async (): Promise<Block[]> => {
      const { data, error } = await supabase
        .from('programming_blocks')
        .select('*')
        .eq('template_id', templateId!)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Block[];
    },
  });
};

export const useCreateBlock = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ templateId, position }: { templateId: string; position: number }) => {
      const { data, error } = await supabase
        .from('programming_blocks')
        .insert({ template_id: templateId, position, name: `Block ${position + 1}` })
        .select()
        .single();
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        eventType: 'programming_block_updated',
        metadata: { template_id: templateId, block_id: data.id, action: 'created' },
      });
      return data as Block;
    },
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ['programming-blocks', b.template_id] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to create block'),
  });
};

export const useUpdateBlock = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<Block> & { id: string }) => {
      const { id, ...rest } = patch;
      const { data, error } = await supabase
        .from('programming_blocks')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        eventType: 'programming_block_updated',
        metadata: { block_id: id, action: 'updated' },
      });
      return data as Block;
    },
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ['programming-blocks', b.template_id] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to update block'),
  });
};

export const useDeleteBlock = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (block: Block) => {
      const { error } = await supabase.from('programming_blocks').delete().eq('id', block.id);
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        eventType: 'programming_block_updated',
        metadata: { block_id: block.id, template_id: block.template_id, action: 'deleted' },
      });
      return block;
    },
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ['programming-blocks', b.template_id] });
      qc.invalidateQueries({ queryKey: ['programming-prescribed', b.id] });
      toast.success('Block deleted');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to delete block'),
  });
};

export const useReorderBlocks = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, ordered }: { templateId: string; ordered: Block[] }) => {
      // Sequential updates to avoid races
      for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].position !== i) {
          const { error } = await supabase
            .from('programming_blocks')
            .update({ position: i })
            .eq('id', ordered[i].id);
          if (error) throw error;
        }
      }
      return templateId;
    },
    onSuccess: (templateId) => {
      qc.invalidateQueries({ queryKey: ['programming-blocks', templateId] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to reorder blocks'),
  });
};

/* ---------------- Prescribed Exercises ---------------- */

export const usePrescribedExercises = (blockId: string | null) => {
  return useQuery({
    queryKey: ['programming-prescribed', blockId],
    enabled: !!blockId,
    queryFn: async (): Promise<PrescribedExercise[]> => {
      const { data, error } = await supabase
        .from('programming_exercises')
        .select('*')
        .eq('block_id', blockId!)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as PrescribedExercise[];
    },
  });
};

export const useCreatePrescribed = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      blockId,
      exerciseId,
      position,
    }: {
      blockId: string;
      exerciseId: string;
      position: number;
    }) => {
      const { data, error } = await supabase
        .from('programming_exercises')
        .insert({ block_id: blockId, exercise_id: exerciseId, position })
        .select()
        .single();
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        eventType: 'programming_exercise_updated',
        metadata: { block_id: blockId, prescribed_id: data.id, action: 'created' },
      });
      return data as PrescribedExercise;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['programming-prescribed', p.block_id] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to add exercise'),
  });
};

export const useUpdatePrescribed = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<PrescribedExercise> & { id: string }) => {
      const { id, ...rest } = patch;
      const { data, error } = await supabase
        .from('programming_exercises')
        .update(rest)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        eventType: 'programming_exercise_updated',
        metadata: { prescribed_id: id, action: 'updated' },
      });
      return data as PrescribedExercise;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['programming-prescribed', p.block_id] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to update exercise'),
  });
};

export const useDeletePrescribed = () => {
  const qc = useQueryClient();
  const { teamId } = useEffectiveTeamId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (p: PrescribedExercise) => {
      const { error } = await supabase.from('programming_exercises').delete().eq('id', p.id);
      if (error) throw error;
      await logActivity({
        teamId,
        userId: user?.id ?? null,
        eventType: 'programming_exercise_updated',
        metadata: { prescribed_id: p.id, action: 'deleted' },
      });
      return p;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['programming-prescribed', p.block_id] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to remove exercise'),
  });
};

export const useReorderPrescribed = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ blockId, ordered }: { blockId: string; ordered: PrescribedExercise[] }) => {
      for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].position !== i) {
          const { error } = await supabase
            .from('programming_exercises')
            .update({ position: i })
            .eq('id', ordered[i].id);
          if (error) throw error;
        }
      }
      return blockId;
    },
    onSuccess: (blockId) => {
      qc.invalidateQueries({ queryKey: ['programming-prescribed', blockId] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to reorder exercises'),
  });
};

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspaceTeams } from '@/hooks/useWorkspaceTeams';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  teamId: string | null;
  athleteId: string | null;
  onChange: (teamId: string | null, athleteId: string | null) => void;
}

export const StepAssignTarget = ({ teamId, athleteId, onChange }: Props) => {
  const { data: teams } = useWorkspaceTeams();

  const { data: athletes } = useQuery({
    queryKey: ['csv-upload-athletes', teamId],
    enabled: !!teamId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('athletes')
        .select('id, name')
        .eq('team_id', teamId!)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Assign to team & athlete</h3>
        <p className="text-sm text-muted-foreground">
          Pick the team first, then choose the athlete these results belong to.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Team</Label>
          <Select
            value={teamId ?? undefined}
            onValueChange={(v) => onChange(v, null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              {(teams ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Athlete</Label>
          <Select
            value={athleteId ?? undefined}
            onValueChange={(v) => onChange(teamId, v)}
            disabled={!teamId}
          >
            <SelectTrigger>
              <SelectValue placeholder={teamId ? 'Select athlete' : 'Pick a team first'} />
            </SelectTrigger>
            <SelectContent>
              {(athletes ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {athleteId && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          Selected athlete:{' '}
          <span className="font-semibold">
            {athletes?.find((a) => a.id === athleteId)?.name ?? '—'}
          </span>
        </div>
      )}
    </div>
  );
};

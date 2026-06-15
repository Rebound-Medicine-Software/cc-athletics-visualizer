import { useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Calendar, Loader2 } from 'lucide-react';
import { useWorkspaceTeams } from '@/hooks/useWorkspaceTeams';
import { useAthletes } from '@/hooks/useAthletes';
import { useGolfSessions, type GolfSessionRow } from './useGolfSessions';

interface Props {
  onSelect: (testDataId: string, meta: GolfSessionRow) => void;
  compact?: boolean;
  title?: string;
}

export function GolfDatabasePicker({ onSelect, compact, title = 'Open Saved Session' }: Props) {
  const { data: teams = [] } = useWorkspaceTeams();
  const { data: athletes = [] } = useAthletes();
  const [teamId, setTeamId] = useState<string>('all');
  const [athleteId, setAthleteId] = useState<string | undefined>();

  const filteredAthletes = useMemo(() => {
    if (teamId === 'all') return athletes;
    const team = teams.find((t) => t.id === teamId);
    return athletes.filter((a) => a.team === team?.name);
  }, [athletes, teams, teamId]);

  const { data: sessions = [], isLoading } = useGolfSessions(athleteId);

  useEffect(() => { setAthleteId(undefined); }, [teamId]);

  return (
    <Card className={`p-4 bg-slate-950 border-slate-800 text-slate-100 space-y-3 ${compact ? '' : ''}`}>
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4 text-amber-400" />
        <h3 className="text-xs uppercase tracking-widest text-slate-300">{title}</h3>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger className="h-9 bg-slate-900 border-slate-700 text-sm">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={athleteId} onValueChange={setAthleteId}>
          <SelectTrigger className="h-9 bg-slate-900 border-slate-700 text-sm">
            <SelectValue placeholder={filteredAthletes.length ? 'Athlete' : 'No athletes'} />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {filteredAthletes.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="pt-1">
        {!athleteId ? (
          <p className="text-xs text-slate-500 px-1">Pick an athlete to list saved golf sessions.</p>
        ) : isLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-500 px-1">No golf sessions saved for this athlete yet.</p>
        ) : (
          <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => onSelect(s.id, s)}
                  className="w-full text-left rounded-md border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-colors p-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span className="text-sm font-medium truncate">{s.test_date}</span>
                    {s.original_file_name && (
                      <span className="text-xs text-slate-500 truncate">· {s.original_file_name}</span>
                    )}
                  </div>
                  <Badge variant="outline" className="border-slate-700 text-[10px]">
                    {new Date(s.created_at).toLocaleDateString()}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

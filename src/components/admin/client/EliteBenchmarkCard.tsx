import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';
import { useEliteBenchmarkForAthlete } from '@/hooks/useEliteBenchmarkForAthlete';

interface Props {
  sports: string[];
}

const fmt = (n: number | null, unit = '') =>
  n == null ? '—' : `${n.toFixed(1)}${unit ? ' ' + unit : ''}`;

/**
 * Sport-aware elite reference card. Hidden when there are no matches.
 * Clearly labelled "Elite benchmark" — never implies medical or causal claims.
 */
export const EliteBenchmarkCard = ({ sports }: Props) => {
  const { data, isLoading } = useEliteBenchmarkForAthlete(sports);
  if (isLoading || !data || data.length === 0) return null;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Elite benchmark reference
          <Badge variant="outline" className="ml-2 text-[10px] uppercase tracking-wide">
            Reference only
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((row) => (
            <div key={row.sport} className="rounded-md border p-3">
              <div className="text-sm font-semibold mb-1">{row.sport}</div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>CMJ height: <span className="text-foreground tabular-nums">{fmt(row.cmj_jump_height_cm, 'cm')}</span></div>
                <div>CMJ peak power: <span className="text-foreground tabular-nums">{fmt(row.cmj_peak_power_w, 'W')}</span></div>
                <div>IMTP peak force: <span className="text-foreground tabular-nums">{fmt(row.imtp_peak_force_n, 'N')}</span></div>
                <div className="pt-1 italic">n = {row.sample_size}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Average values from elite athletes in your sport. Use as context, not a target.
        </p>
      </CardContent>
    </Card>
  );
};

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, User, Calendar, FileText } from 'lucide-react';

interface Props {
  athleteName: string;
  testDate: string;
  fileName: string | null;
  lastAnalysedAt?: string;
  onChange: () => void;
}

export function GolfDatabaseHeader({ athleteName, testDate, fileName, lastAnalysedAt, onChange }: Props) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-slate-950 p-3 flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3 text-sm">
        <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-widest text-[10px]">
          Database
        </Badge>
        <span className="flex items-center gap-1.5 text-slate-200"><User className="h-3.5 w-3.5 text-slate-400" />{athleteName || '—'}</span>
        <span className="text-slate-600">·</span>
        <span className="flex items-center gap-1.5 text-slate-200"><Calendar className="h-3.5 w-3.5 text-slate-400" />{testDate}</span>
        {fileName && (<>
          <span className="text-slate-600">·</span>
          <span className="flex items-center gap-1.5 text-slate-400 text-xs truncate max-w-[260px]"><FileText className="h-3 w-3" />{fileName}</span>
        </>)}
      </div>
      <div className="flex items-center gap-2">
        {lastAnalysedAt && (
          <span className="text-[10px] text-slate-500">Saved {new Date(lastAnalysedAt).toLocaleString()}</span>
        )}
        <Button size="sm" variant="outline" className="border-slate-700 h-7 text-xs" onClick={onChange}>
          <ChevronLeft className="h-3 w-3 mr-1" /> Change session
        </Button>
      </div>
    </div>
  );
}

import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export function GolfAiSummaryCard({ summary, loading }: { summary?: string; loading?: boolean }) {
  return (
    <Card className="p-4 bg-gradient-to-br from-slate-950 to-slate-900 border-amber-500/30 text-slate-100">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <h3 className="text-xs uppercase tracking-widest text-amber-300">AI Session Summary</h3>
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-slate-800 rounded w-3/4" />
          <div className="h-3 bg-slate-800 rounded w-5/6" />
          <div className="h-3 bg-slate-800 rounded w-2/3" />
        </div>
      ) : summary ? (
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{summary}</p>
      ) : (
        <p className="text-sm text-slate-500">
          Generate an AI summary to surface session-level trends and prescription priorities.
        </p>
      )}
    </Card>
  );
}

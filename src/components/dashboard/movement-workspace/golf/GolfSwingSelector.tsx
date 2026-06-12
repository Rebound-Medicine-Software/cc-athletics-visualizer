import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Props {
  count: number;
  selectedIndex: number;
  bestIndex: number;
  worstIndex: number;
  overlayIndices: number[];
  onSelect: (i: number) => void;
  onOverlayChange: (mode: 'off' | 'best_worst' | 'all', custom?: number[]) => void;
  overlayMode: 'off' | 'best_worst' | 'all';
}

export function GolfSwingSelector(p: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Swing</span>
        {Array.from({ length: p.count }).map((_, i) => {
          const idx = i + 1;
          const isBest = idx === p.bestIndex + 1;
          const isWorst = idx === p.worstIndex + 1;
          return (
            <Button
              key={idx}
              variant={p.selectedIndex === idx ? 'default' : 'outline'}
              size="sm"
              onClick={() => { p.onSelect(idx); p.onOverlayChange('off'); }}
              className="h-7 px-2 text-xs"
            >
              {idx}
              {isBest && <Badge className="ml-1 bg-amber-500/20 text-amber-700 border-amber-500/40 h-4 px-1 text-[9px]">BEST</Badge>}
              {isWorst && <Badge className="ml-1 bg-red-500/20 text-red-700 border-red-500/40 h-4 px-1 text-[9px]">WORST</Badge>}
            </Button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Overlay</span>
        <Button size="sm" variant={p.overlayMode === 'off' ? 'default' : 'outline'} className="h-7 text-xs"
          onClick={() => p.onOverlayChange('off')}>Off</Button>
        <Button size="sm" variant={p.overlayMode === 'best_worst' ? 'default' : 'outline'} className="h-7 text-xs"
          onClick={() => p.onOverlayChange('best_worst', [p.bestIndex + 1, p.worstIndex + 1])}>Best vs Worst</Button>
        <Button size="sm" variant={p.overlayMode === 'all' ? 'default' : 'outline'} className="h-7 text-xs"
          onClick={() => p.onOverlayChange('all', Array.from({ length: p.count }, (_, i) => i + 1))}>All</Button>
      </div>
    </div>
  );
}

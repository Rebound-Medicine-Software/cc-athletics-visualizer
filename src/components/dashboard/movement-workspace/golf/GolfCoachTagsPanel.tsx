import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GOLF_COACH_TAGS } from '@/lib/movement-engine/modules/golf/prescription';
import { X } from 'lucide-react';

interface Props { tags: string[]; onChange: (next: string[]) => void; }

export function GolfCoachTagsPanel({ tags, onChange }: Props) {
  const [custom, setCustom] = useState('');
  const toggle = (id: string) =>
    onChange(tags.includes(id) ? tags.filter((t) => t !== id) : [...tags, id]);

  return (
    <Card className="p-4 bg-slate-950 border-slate-800 text-slate-100 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-slate-400">Coach Tags</h3>
        <span className="text-xs text-slate-500">{tags.length} selected</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {GOLF_COACH_TAGS.map((t) => {
          const active = tags.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                ${active
                  ? t.polarity === 'positive'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : t.polarity === 'negative'
                    ? 'bg-red-500/20 border-red-500/50 text-red-300'
                    : 'bg-slate-500/20 border-slate-500/50 text-slate-200'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 pt-2 border-t border-slate-800">
        <Input value={custom} onChange={(e) => setCustom(e.target.value)}
          placeholder="Add custom tag…" className="h-8 text-xs bg-slate-900 border-slate-700" />
        <Button size="sm" variant="secondary" className="h-8 text-xs"
          onClick={() => { if (custom.trim()) { onChange([...tags, custom.trim()]); setCustom(''); } }}>
          Add
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800">
          {tags.filter((t) => !GOLF_COACH_TAGS.find((g) => g.id === t)).map((t) => (
            <Badge key={t} variant="outline" className="border-slate-600 text-slate-300">
              {t}
              <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => onChange(tags.filter((x) => x !== t))} />
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

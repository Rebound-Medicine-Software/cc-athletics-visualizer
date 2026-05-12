import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SportsSelectorProps {
  value: string[];
  onChange: (next: string[]) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Searchable, multi-select tag picker for athlete sports/events.
 * - Supports adding custom labels (Enter or "+ Add")
 * - Removes selected with X
 * - Keyboard friendly
 */
export const SportsSelector = ({
  value,
  onChange,
  options,
  placeholder = 'Add sports / events…',
  disabled,
  className,
}: SportsSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const lower = (s: string) => s.trim().toLowerCase();
  const isSelected = (s: string) => value.some((v) => lower(v) === lower(s));

  const toggle = (s: string) => {
    const trimmed = s.trim();
    if (!trimmed) return;
    if (isSelected(trimmed)) {
      onChange(value.filter((v) => lower(v) !== lower(trimmed)));
    } else {
      onChange([...value, trimmed]);
    }
  };

  const addCustom = () => {
    const t = query.trim();
    if (!t) return;
    if (!isSelected(t)) onChange([...value, t]);
    setQuery('');
  };

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.trim().toLowerCase())
  );
  const exactMatch = options.some((o) => lower(o) === lower(query));

  return (
    <div ref={ref} className={cn('relative w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'flex flex-wrap items-center gap-1 min-h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-left',
          open && 'ring-2 ring-ring',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        {value.length === 0 && (
          <span className="text-muted-foreground px-1">{placeholder}</span>
        )}
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            {!disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(tag);
                }}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </Badge>
        ))}
        <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
      </button>

      {open && !disabled && (
        <div className="absolute z-[1000] mt-1 w-full min-w-[220px] rounded-md border border-border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filtered[0] && !exactMatch) {
                    toggle(filtered[0]);
                    setQuery('');
                  } else {
                    addCustom();
                  }
                }
              }}
              placeholder="Search or add…"
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-auto py-1">
            {filtered.map((opt) => (
              <div
                key={opt}
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggle(opt);
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
              >
                <span
                  className={cn(
                    'inline-flex h-4 w-4 items-center justify-center border border-primary rounded-sm',
                    isSelected(opt) ? 'bg-primary text-primary-foreground' : 'bg-background'
                  )}
                >
                  {isSelected(opt) && <Check className="h-3 w-3" />}
                </span>
                <span className="truncate">{opt}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                No matches
              </div>
            )}
            {query.trim() && !exactMatch && (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  addCustom();
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer border-t hover:bg-accent"
              >
                <Plus className="h-3 w-3" />
                Add "{query.trim()}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

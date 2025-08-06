
import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type OptionType = { value: string; label: string };

interface MultiSelectDropdownProps {
  options: OptionType[];
  value: string[];
  onChange: (val: string[]) => void;
  placeholder?: string;
  className?: string;
  labelClassName?: string;
  dropdownClassName?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className = "",
  labelClassName = "",
  dropdownClassName = ""
}) => {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const listener = (e: MouseEvent) => {
      // Only close if click is outside the container
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", listener);
    }
    return () => document.removeEventListener("mousedown", listener);
  }, [open]);

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(val => val !== option));
    } else {
      onChange([...value, option]);
    }
    // DO NOT close dropdown for multi-select
  };

  const allLabels = options
    .filter(opt => value.includes(opt.value))
    .map(opt => opt.label);
  const labelDisplay = allLabels.length === 0 ? placeholder
    : allLabels.length <= 2 ? allLabels.join(", ")
    : `${allLabels.slice(0,2).join(", ")} +${allLabels.length-2} more`;

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(prev => !prev);
        }}
        className={cn(
          "flex items-center justify-between w-full border border-border rounded-md bg-background py-2 px-3 text-sm text-foreground text-center",
          open && "ring-2 ring-ring",
          labelClassName
        )}
      >
        <span className={cn(
          "whitespace-normal break-words text-center flex-1"
        )}>
          {labelDisplay}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
      </button>
      {open && (
        <div className={cn(
          "absolute z-50 mt-1 w-full bg-popover rounded-md shadow-lg border border-border max-h-60 overflow-auto flex flex-col",
          dropdownClassName
        )}>
           {options.map(opt => (
            <div
              key={opt.value}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground rounded justify-start cursor-pointer",
                value.includes(opt.value) && "font-semibold"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleOption(opt.value);
              }}
            >
              <span className={cn(
                "inline-flex h-4 w-4 shrink-0 items-center justify-center border border-primary rounded-sm mr-2",
                value.includes(opt.value) ? "bg-primary text-primary-foreground" : "bg-background"
              )}>
                {value.includes(opt.value) && <Check className="h-4 w-4" />}
              </span>
              <span className="truncate">{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

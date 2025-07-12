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
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [open]);

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter(val => val !== option));
    } else {
      onChange([...value, option]);
    }
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
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center justify-between w-full border border-gray-300 rounded-md bg-white py-2 px-3 text-sm text-gray-700 text-center",
          open && "ring-2 ring-blue-400",
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
          "absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-auto flex flex-col",
          dropdownClassName
        )}>
          {options.map(opt => (
            <button
              type="button"
              key={opt.value}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm text-gray-900 hover:bg-blue-50 rounded justify-start",
                value.includes(opt.value) && "font-semibold"
              )}
              onClick={() => toggleOption(opt.value)}
            >
              <span className={cn(
                "inline-flex h-4 w-4 items-center justify-center border border-border rounded mr-2",
                value.includes(opt.value) ? "bg-primary text-primary-foreground border-primary" : "bg-background"
              )}>
                {value.includes(opt.value) && <Check className="w-3 h-3" />}
              </span>
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

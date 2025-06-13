
import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MultiSelectProps {
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options = [],
  selected = [],
  onChange = () => {},
  placeholder = "Select items...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  // Defensive: ensure options and selected are always valid arrays
  const safeOptions = React.useMemo(() => {
    return Array.isArray(options)
      ? options.filter(
          option =>
            option &&
            typeof option === 'object' &&
            typeof option.value === 'string' &&
            typeof option.label === 'string' &&
            option.value.trim() !== '' &&
            option.label.trim() !== ''
        )
      : [];
  }, [options]);

  const safeSelected = React.useMemo(() => {
    return Array.isArray(selected)
      ? selected.filter(item => typeof item === 'string' && item.trim() !== '')
      : [];
  }, [selected]);

  const handleUnselect = React.useCallback(
    (item: string) => {
      const newSelected = safeSelected.filter(i => i !== item);
      onChange(newSelected);
    },
    [safeSelected, onChange]
  );

  const handleSelect = React.useCallback(
    (optionValue: string) => {
      const newSelected = safeSelected.includes(optionValue)
        ? safeSelected.filter(item => item !== optionValue)
        : [...safeSelected, optionValue];
      onChange(newSelected);
    },
    [safeSelected, onChange]
  );

  if (safeOptions.length === 0) {
    return (
      <Button
        variant="outline"
        role="combobox"
        className={cn("w-full justify-between h-auto min-h-10 bg-white", className)}
        disabled
      >
        <span className="text-gray-400">No options available</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-10 bg-white", className)}
        >
          <div className="flex gap-1 flex-wrap max-w-full">
            {safeSelected.length > 0 ? (
              safeSelected.map(item => {
                const option = safeOptions.find(opt => opt.value === item);
                if (!option) return null;
                return (
                  <Badge
                    variant="secondary"
                    key={item}
                    className="mr-1 mb-1 bg-blue-100 text-blue-800 border-blue-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnselect(item);
                    }}
                  >
                    {option.label}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUnselect(item);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnselect(item);
                      }}
                    >
                      <X className="h-3 w-3 text-blue-600 hover:text-blue-800" />
                    </button>
                  </Badge>
                );
              })
            ) : (
              <span className="text-gray-500">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-50 bg-white border border-gray-200 shadow-lg" align="start">
        <Command>
          <CommandInput placeholder="Search options..." className="h-9" />
          <CommandEmpty>No options found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {safeOptions.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => handleSelect(option.value)}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    safeSelected.includes(option.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

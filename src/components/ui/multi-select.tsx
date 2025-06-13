
import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface MultiSelectProps {
  options: { label: string; value: string }[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select items...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  console.log('MultiSelect render - options:', options);
  console.log('MultiSelect render - selected:', selected);

  // Comprehensive safety checks for options and selected values
  const safeOptions = React.useMemo(() => {
    if (!Array.isArray(options)) {
      console.log('Options is not an array:', options);
      return [];
    }
    const filtered = options.filter(option => 
      option && 
      typeof option === 'object' && 
      typeof option.value === 'string' && 
      typeof option.label === 'string' &&
      option.value.trim() !== '' &&
      option.label.trim() !== ''
    );
    console.log('Safe options:', filtered);
    return filtered;
  }, [options])
  
  const safeSelected = React.useMemo(() => {
    if (!Array.isArray(selected)) {
      console.log('Selected is not an array:', selected);
      return [];
    }
    const filtered = selected.filter(item => 
      typeof item === 'string' && 
      item.trim() !== ''
    );
    console.log('Safe selected:', filtered);
    return filtered;
  }, [selected])

  const handleUnselect = React.useCallback((item: string) => {
    try {
      if (typeof onChange !== 'function') {
        console.log('onChange is not a function');
        return;
      }
      const newSelected = safeSelected.filter((i) => i !== item);
      console.log('Unselecting item:', item, 'New selected:', newSelected);
      onChange(newSelected);
    } catch (error) {
      console.error('Error in handleUnselect:', error);
    }
  }, [safeSelected, onChange])

  const handleSelect = React.useCallback((optionValue: string) => {
    try {
      if (typeof onChange !== 'function') {
        console.log('onChange is not a function');
        return;
      }
      
      let newSelected;
      if (safeSelected.includes(optionValue)) {
        newSelected = safeSelected.filter((item) => item !== optionValue);
      } else {
        newSelected = [...safeSelected, optionValue];
      }
      console.log('Selecting option:', optionValue, 'New selected:', newSelected);
      onChange(newSelected);
    } catch (error) {
      console.error('Error in handleSelect:', error);
    }
  }, [safeSelected, onChange])

  // Show loading/empty state if no options
  if (!safeOptions || safeOptions.length === 0) {
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
    )
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
            {safeSelected && safeSelected.length > 0 ? (
              safeSelected.map((item) => {
                const option = safeOptions.find((opt) => opt.value === item)
                if (!option) return null
                return (
                  <Badge
                    variant="secondary"
                    key={item}
                    className="mr-1 mb-1 bg-blue-100 text-blue-800 border-blue-200"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUnselect(item)
                    }}
                  >
                    {option.label}
                    <button
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleUnselect(item)
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUnselect(item)
                      }}
                    >
                      <X className="h-3 w-3 text-blue-600 hover:text-blue-800" />
                    </button>
                  </Badge>
                )
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
  )
}

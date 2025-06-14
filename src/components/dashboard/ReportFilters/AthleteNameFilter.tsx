
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

interface AthleteNameFilterProps {
  value: string[];
  onChange: (val: string[]) => void;
  options: string[];
}
export const AthleteNameFilter = ({ value, onChange, options }: AthleteNameFilterProps) => {
  const dropdownOptions = options.map(a => ({ value: a, label: a }));
  return (
    <div className="w-[180px] min-w-[160px] max-w-[180px]">
      <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
      <div className="flex items-center gap-2">
        <MultiSelectDropdown
          options={dropdownOptions}
          value={value}
          onChange={onChange}
          placeholder="All Athletes"
          className="text-center"
          labelClassName="bg-white"
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Reset Athlete Name"
          className="p-2"
          onClick={() => onChange([])}
          type="button"
        >
          <RefreshCcw className="w-4 h-4 text-gray-500" />
        </Button>
      </div>
    </div>
  );
};

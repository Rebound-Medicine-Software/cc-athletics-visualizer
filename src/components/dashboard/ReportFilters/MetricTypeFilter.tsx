
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCcw } from "lucide-react";

interface MetricTypeFilterProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
}
export const MetricTypeFilter = ({ value, onChange, options }: MetricTypeFilterProps) => (
  <div className="w-[180px] min-w-[160px] max-w-[180px]">
    <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white text-center w-full">
          <SelectValue placeholder="All Metrics" />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Reset Metric Type"
        className="p-2"
        onClick={() => onChange("")}
        type="button"
      >
        <RefreshCcw className="w-4 h-4 text-gray-500" />
      </Button>
    </div>
  </div>
);

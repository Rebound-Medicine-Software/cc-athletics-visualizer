
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCcw } from "lucide-react";

interface TestDateFilterProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  formatOption: (date: string) => string;
}
export const TestDateFilter = ({ value, onChange, options, formatOption }: TestDateFilterProps) => (
  <div className="w-[180px] min-w-[160px] max-w-[180px]">
    <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Date</label>
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-white text-center w-full">
          <SelectValue placeholder="All Dates" />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt} value={opt}>
              {formatOption(opt)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Reset Test Date"
        className="p-2"
        onClick={() => onChange("")}
        type="button"
      >
        <RefreshCcw className="w-4 h-4 text-gray-500" />
      </Button>
    </div>
  </div>
);

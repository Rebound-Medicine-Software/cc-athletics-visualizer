
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TestData } from "@/types/forcePlateTypes";

interface ReportFiltersProps {
  data: TestData[];
  onTestSelect: (testName: string) => void;
}

export const ReportFilters = ({ data, onTestSelect }: ReportFiltersProps) => {
  const [filters, setFilters] = useState({
    athleteName: "",
    testName: "",
  });

  // Get unique values for dropdowns
  const uniqueAthletes = [...new Set(data.map(d => d.athlete_name))];
  const uniqueTests = [...new Set(data.map(d => d.test_name))];

  const handleTestNameChange = (value: string) => {
    setFilters(prev => ({ ...prev, testName: value }));
    onTestSelect(value);
  };

  return (
    <Card className="bg-teal-50/80 border-teal-200">
      <CardContent className="p-4">
        <div className="flex gap-4 mb-4">
          <Button 
            variant="default"
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            Individual Filters
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Select value={filters.athleteName} onValueChange={(value) => 
            setFilters(prev => ({ ...prev, athleteName: value }))
          }>
            <SelectTrigger className="bg-black text-white border-gray-600">
              <SelectValue placeholder="Athlete Name" />
            </SelectTrigger>
            <SelectContent>
              {uniqueAthletes.map(athlete => (
                <SelectItem key={athlete} value={athlete}>
                  {athlete}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.testName} onValueChange={handleTestNameChange}>
            <SelectTrigger className="bg-black text-white border-gray-600">
              <SelectValue placeholder="Test Name" />
            </SelectTrigger>
            <SelectContent>
              {uniqueTests.map(test => (
                <SelectItem key={test} value={test}>
                  {test}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

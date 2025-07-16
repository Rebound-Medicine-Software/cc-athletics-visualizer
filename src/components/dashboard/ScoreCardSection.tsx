
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/utils/dateUtils";
import { RefreshCcw } from "lucide-react";
import { TestData } from "@/types/forcePlateTypes";

interface ScoreCardSectionProps {
  data: TestData[];
  selectedTeams: string[];
  title: string;
}

export function ScoreCardSection({ data, selectedTeams, title }: ScoreCardSectionProps) {
  const [selectedAthlete, setSelectedAthlete] = useState("all");
  const [selectedTestDate, setSelectedTestDate] = useState("all");

  // Reset filters when selected teams change
  useEffect(() => {
    setSelectedAthlete("all");
    setSelectedTestDate("all");
  }, [selectedTeams]);

  // Filter data based on selected teams first
  const teamFilteredData = selectedTeams.length > 0
    ? data.filter(d => selectedTeams.includes(d.team_name))
    : data;

  // Get unique athletes from team-filtered data
  const uniqueAthletes = Array.from(
    new Set(teamFilteredData.map(d => d.athlete_name))
  ).sort();

  // Filter by athlete selection for test dates
  const athleteFilteredData = selectedAthlete !== "all"
    ? teamFilteredData.filter(d => d.athlete_name === selectedAthlete)
    : teamFilteredData;

  // Get unique test dates from athlete-filtered data
  const uniqueTestDates = Array.from(
    new Set(athleteFilteredData.map(d => d.test_date))
  ).sort();

  const handleResetAthlete = () => {
    setSelectedAthlete("all");
    setSelectedTestDate("all");
  };

  const handleResetTestDate = () => {
    setSelectedTestDate("all");
  };

  const handleAthleteChange = (value: string) => {
    setSelectedAthlete(value);
    setSelectedTestDate("all"); // Reset test date when athlete changes
  };

  return (
    <Card className="bg-white border-teal-200">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-center mb-4">
          <Button variant="default" className="bg-teal-600 hover:bg-teal-700 text-white w-auto min-w-[220px] text-lg font-semibold mx-auto justify-center block text-center">
            {title}
          </Button>
        </div>

        {/* Scorecard Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 justify-items-center items-center min-h-[120px] content-center">
          {/* Athlete Name */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Athlete Name</label>
            <div className="flex items-center gap-2">
              <Select value={selectedAthlete} onValueChange={handleAthleteChange}>
                <SelectTrigger className="bg-white text-center w-full h-10 min-h-[40px] max-h-[40px] overflow-hidden">
                  <SelectValue placeholder="All Athletes" />
                </SelectTrigger>
                <SelectContent className="w-[600px]">
                  <SelectItem value="all">All Athletes</SelectItem>
                  {uniqueAthletes.map(athlete => (
                    <SelectItem key={athlete} value={athlete} className="whitespace-normal break-words">
                      {athlete}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Athlete Name"
                className="p-2"
                onClick={handleResetAthlete}
                type="button"
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Test Date */}
          <div className="w-[200px] min-w-[200px] max-w-[200px] flex flex-col items-center justify-center">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center h-5">Test Date</label>
            <div className="flex items-center gap-2">
              <Select value={selectedTestDate} onValueChange={setSelectedTestDate}>
                <SelectTrigger className="bg-white text-center w-full h-10 min-h-[40px] max-h-[40px] overflow-hidden">
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent className="w-[600px]">
                  <SelectItem value="all">All Dates</SelectItem>
                  {uniqueTestDates.map(date => (
                    <SelectItem key={date} value={date} className="whitespace-normal break-words">
                      {formatDate(date)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Reset Test Date"
                className="p-2"
                onClick={handleResetTestDate}
                type="button"
              >
                <RefreshCcw className="w-4 h-4 text-gray-500" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

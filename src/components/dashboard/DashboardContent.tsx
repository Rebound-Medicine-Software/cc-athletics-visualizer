import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HighlightsSection } from "./HighlightsSection";
import { ReportFilters } from "./ReportFilters";
import { RegionComparison } from "./RegionComparison";
import { AlertCircle, CheckCircle, RefreshCw, ChevronRight, ChevronLeft } from "lucide-react";

export interface DashboardContentProps {
  data: any[];
  isLoading: boolean;
  error: Error | null;
  errorMessage: string;
  hasNoData: boolean;
  selectedTeams: string[];
  setSelectedTeams: (teams: string[]) => void;
  handleRefresh: () => void;
  orgData: any;
  navigationItems: any[];
  activeSection: string;
  resetFiltersKey: number;
}

export const DashboardContent = ({
  data, isLoading, error, errorMessage, hasNoData,
  selectedTeams, setSelectedTeams, handleRefresh, orgData,
  navigationItems, activeSection, resetFiltersKey
}: DashboardContentProps) => {
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [selectedTest2, setSelectedTest2] = useState<string>("");

  // Error state
  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
            <p className="text-red-600 mb-4">{errorMessage}</p>
            <Button onClick={handleRefresh} variant="outline" className="bg-white">
              <RefreshCw className="mr-2 h-4 w-4" /> Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (hasNoData) {
    return (
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-semibold text-amber-800 mb-2">No Data Available</h3>
            <p className="text-amber-600 mb-4">
              There are no test results available. Please check your connection or try again later.
            </p>
            <Button onClick={handleRefresh} variant="outline" className="bg-white">
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state with data
  const filteredData = selectedTeams.length === 0
    ? data
    : data.filter(d => selectedTeams.includes(d.team_name));
  
  return (
    <div className="space-y-6 w-full">
      {/* Performance Highlights */}
      <HighlightsSection
        data={data}
        selectedTeams={selectedTeams}
        setSelectedTeams={setSelectedTeams}
        resetFiltersKey={resetFiltersKey}
        allData={data}
      />
      
      {/* First ReportFilters section - completely independent */}
      <ReportFilters 
        data={filteredData} 
        onTestSelect={setSelectedTest}
        allData={data}
        resetFiltersKey={resetFiltersKey} 
        selectedTeams={selectedTeams}
        instanceId="report-filters-1"
      />
      
      {/* Second ReportFilters section - completely independent */}
      <ReportFilters 
        data={filteredData} 
        onTestSelect={setSelectedTest2}
        allData={data}
        resetFiltersKey={resetFiltersKey} 
        selectedTeams={selectedTeams}
        instanceId="report-filters-2"
      />
      
      {/* RegionComparison operates independently with unfiltered data */}
      <RegionComparison 
        data={data} 
        resetFiltersKey={resetFiltersKey} 
        selectedTeams={selectedTeams}
      />
    </div>
  );
};

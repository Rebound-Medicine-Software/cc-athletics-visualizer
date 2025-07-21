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
  // Independent state for each section
  const [selectedTest1, setSelectedTest1] = useState<string>("");
  const [selectedTest2, setSelectedTest2] = useState<string>("");
  const [resetKey1, setResetKey1] = useState<number>(0);
  const [resetKey2, setResetKey2] = useState<number>(0);
  const [selectedTeams1, setSelectedTeams1] = useState<string[]>([]);
  const [selectedTeams2, setSelectedTeams2] = useState<string[]>([]);

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

  // Create completely separate data sources for each section
  // Section 1: Jump and Isometric tests
  const section1Data = data.filter(d => 
    d.test_type === 'jump' || d.test_type === 'isometric'
  );
  const filteredData1 = selectedTeams1.length === 0
    ? section1Data
    : section1Data.filter(d => selectedTeams1.includes(d.team_name));

  // Section 2: Pogo tests and any remaining types
  const section2Data = data.filter(d => 
    d.test_type === 'pogo' || (d.test_type !== 'jump' && d.test_type !== 'isometric')
  );
  const filteredData2 = selectedTeams2.length === 0
    ? section2Data
    : section2Data.filter(d => selectedTeams2.includes(d.team_name));
  
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
      
      {/* First Independent ReportFilters section - Jump & Isometric Tests */}
      <ReportFilters 
        key="section-1"
        data={filteredData1} 
        onTestSelect={setSelectedTest1}
        allData={section1Data}
        resetFiltersKey={resetKey1} 
        selectedTeams={selectedTeams1}
      />
      
      {/* Second Independent ReportFilters section - Pogo & Other Tests */}
      <ReportFilters 
        key="section-2"
        data={filteredData2} 
        onTestSelect={setSelectedTest2}
        allData={section2Data}
        resetFiltersKey={resetKey2} 
        selectedTeams={selectedTeams2}
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

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList } from "recharts";
import { TestData } from "@/types/forcePlateTypes";
import { getMetricTypesForTest, getUniqueTestNames, getUniqueAthleteNames, getUniqueTestDates } from "./filters/filterUtils";

interface IndividualComparisonSectionProps {
  data: TestData[];
  resetFiltersKey: number;
  selectedTeams: string[];
}

interface LimbSymmetryData {
  name: string;
  leftPercentage: number;
  rightPercentage: number;
  leftValue: number;
  rightValue: number;
}

export const IndividualComparisonSection = ({ data, resetFiltersKey, selectedTeams }: IndividualComparisonSectionProps) => {
  // Filter states
  const [selectedTestName, setSelectedTestName] = useState("");
  const [selectedMetricType, setSelectedMetricType] = useState("");
  const [selectedAthleteName, setSelectedAthleteName] = useState("");
  const [selectedTestDate, setSelectedTestDate] = useState("");

  // API data state
  const [apiData, setApiData] = useState<TestData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // State for editable button text
  const [isEditing, setIsEditing] = useState(false);
  const [currentButtonText, setCurrentButtonText] = useState("Individual / Between Limb Comparisons");

  // Reset filters when resetFiltersKey changes
  useEffect(() => {
    setSelectedTestName("");
    setSelectedMetricType("");
    setSelectedAthleteName("");
    setSelectedTestDate("");
  }, [resetFiltersKey]);

  // Fetch API data using Supabase edge function
  const fetchApiData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://bvieqoevqkwdkphubabt.supabase.co/functions/v1/fetch-cc-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWVxb2V2cWt3ZGtwaHViYWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDA4OTksImV4cCI6MjA2NDk3Njg5OX0.5_zOSAnBSxzg5zdcmTWjTjdbvScQ5VE_HKx0-PBCtc0`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2aWVxb2V2cWt3ZGtwaHViYWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDA4OTksImV4cCI6MjA2NDk3Njg5OX0.5_zOSAnBSxzg5zdcmTWjTjdbvScQ5VE_HKx0-PBCtc0'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setApiData(result.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch API data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiData();
  }, []);

  // Filter options - use apiData instead of data prop
  const teamFilteredData = selectedTeams.length > 0
    ? apiData.filter(d => selectedTeams.includes(d.team_name))
    : apiData;

  const uniqueTestNames = getUniqueTestNames(teamFilteredData);
  const uniqueAthleteNames = selectedTestName 
    ? getUniqueAthleteNames(teamFilteredData.filter(d => d.test_name === selectedTestName))
    : [];
  
  const uniqueTestDates = selectedAthleteName && selectedTestName
    ? getUniqueTestDates(teamFilteredData.filter(d => 
        d.test_name === selectedTestName && d.athlete_name === selectedAthleteName
      ))
    : [];

  const availableMetricTypes = selectedTestName ? getMetricTypesForTest(selectedTestName) : [];

  // Calculate limb symmetry data based on TestData metrics
  const calculateLimbSymmetry = (): LimbSymmetryData | null => {
    if (!selectedTestName || !selectedMetricType || !selectedAthleteName || !selectedTestDate || !apiData.length) {
      return null;
    }

    // Find the test record that matches our filters
    const testRecord = apiData.find(d => 
      d.test_name === selectedTestName && 
      d.athlete_name === selectedAthleteName && 
      d.test_date === selectedTestDate
    );

    if (!testRecord || !testRecord.metrics) return null;

    let leftValue = 0;
    let rightValue = 0;

    // Access the metrics from TestData
    const metrics = testRecord.metrics as any;

    // Apply data logic based on test name and metric type - using the correct metric keys from console logs
    if (selectedTestName === "Drop Jump" && ["Jump Height (cm)", "Contact Time", "Reactive Strength Index", "Flight Time"].includes(selectedMetricType)) {
      leftValue = metrics.fp1_peak_force || 0;
      rightValue = metrics.fp2_peak_force || 0;
    } else if (selectedTestName === "Countermovement Jump") {
      leftValue = metrics.fp1_peak_force || 0;
      rightValue = metrics.fp2_peak_force || 0;
    } else if (selectedTestName === "Squat Jump") {
      leftValue = metrics.fp1_peak_force || 0;
      rightValue = metrics.fp2_peak_force || 0;
    } else if (selectedTestName === "Pogo Jump") {
      leftValue = metrics.fp1_avg_rfd || 0;
      rightValue = metrics.fp2_avg_rfd || 0;
    } else if (["Maximum Rate of Force Development", "Force at Max Rate of Force Development", "Peak Force"].includes(selectedMetricType)) {
      leftValue = metrics.fp1_peak_force || 0;
      rightValue = metrics.fp2_peak_force || 0;
    }

    const total = leftValue + rightValue;
    if (total === 0) return null;

    const leftPercentage = Math.round((leftValue / total) * 100 * 100) / 100;
    const rightPercentage = Math.round((rightValue / total) * 100 * 100) / 100;

    return {
      name: "Limb Symmetry",
      leftPercentage,
      rightPercentage,
      leftValue,
      rightValue
    };
  };

  const limbSymmetryData = calculateLimbSymmetry();

  // Debug logging
  useEffect(() => {
    console.log('Current selections:', {
      selectedTestName,
      selectedMetricType,
      selectedAthleteName,
      selectedTestDate
    });
    console.log('API Data length:', apiData.length);
    console.log('Limb symmetry result:', limbSymmetryData);
    if (selectedTestName && selectedAthleteName && selectedTestDate) {
      const testRecord = apiData.find(d => 
        d.test_name === selectedTestName && 
        d.athlete_name === selectedAthleteName && 
        d.test_date === selectedTestDate
      );
      console.log('Found test record:', testRecord);
      if (testRecord?.metrics) {
        console.log('Available metrics:', Object.keys(testRecord.metrics));
      }
    }
  }, [selectedTestName, selectedMetricType, selectedAthleteName, selectedTestDate, apiData, limbSymmetryData]);

  // Prepare chart data
  const chartData = limbSymmetryData ? [
    {
      name: "Left Limb %",
      value: limbSymmetryData.leftPercentage,
      fill: "#000000"
    },
    {
      name: "Right Limb %", 
      value: limbSymmetryData.rightPercentage,
      fill: "#7DD3FC"
    }
  ] : [];

  // Handle button text editing
  const handleButtonClick = () => {
    setIsEditing(true);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  // Filter handlers
  const handleTestNameChange = (value: string) => {
    setSelectedTestName(value);
    setSelectedMetricType("");
    setSelectedAthleteName("");
    setSelectedTestDate("");
  };

  const handleMetricTypeChange = (value: string) => {
    setSelectedMetricType(value);
  };

  const handleAthleteNameChange = (value: string) => {
    setSelectedAthleteName(value);
    setSelectedTestDate("");
  };

  const handleTestDateChange = (value: string) => {
    setSelectedTestDate(value);
  };

  return (
    <Card className="bg-white border-teal-200">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex justify-center mb-4">
          {isEditing ? (
            <form onSubmit={handleTextSubmit} className="w-auto min-w-[220px]">
              <Input
                value={currentButtonText}
                onChange={(e) => setCurrentButtonText(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={handleKeyDown}
                className="text-center text-lg font-semibold bg-teal-600 text-white border-teal-700 focus:border-teal-500 focus:ring-teal-500"
                autoFocus
              />
            </form>
          ) : (
            <Button 
              variant="default" 
              className="bg-teal-600 hover:bg-teal-700 text-white w-auto min-w-[220px] text-lg font-semibold mx-auto justify-center block text-center cursor-pointer"
              onClick={handleButtonClick}
            >
              {currentButtonText}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {/* Test Name */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Name</label>
            <Select value={selectedTestName} onValueChange={handleTestNameChange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select Test" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {uniqueTestNames.map(testName => (
                  <SelectItem key={testName} value={testName}>
                    {testName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Metric Type */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">Metric Type</label>
            <Select 
              value={selectedMetricType} 
              onValueChange={handleMetricTypeChange}
              disabled={!selectedTestName}
            >
              <SelectTrigger className={`${!selectedTestName ? "bg-gray-100 opacity-60" : "bg-white"}`}>
                <SelectValue placeholder="Select Metric" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {availableMetricTypes.map(metricType => (
                  <SelectItem key={metricType} value={metricType}>
                    {metricType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Athlete Name */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">Athlete Name</label>
            <Select 
              value={selectedAthleteName} 
              onValueChange={handleAthleteNameChange}
              disabled={!selectedTestName}
            >
              <SelectTrigger className={`${!selectedTestName ? "bg-gray-100 opacity-60" : "bg-white"}`}>
                <SelectValue placeholder="Select Athlete" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {uniqueAthleteNames.map(athleteName => (
                  <SelectItem key={athleteName} value={athleteName}>
                    {athleteName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Test Date */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Date</label>
            <Select 
              value={selectedTestDate} 
              onValueChange={handleTestDateChange}
              disabled={!selectedAthleteName}
            >
              <SelectTrigger className={`${!selectedAthleteName ? "bg-gray-100 opacity-60" : "bg-white"}`}>
                <SelectValue placeholder="Select Date" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {uniqueTestDates.map(testDate => (
                  <SelectItem key={testDate} value={testDate}>
                    {testDate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Legend */}
        {limbSymmetryData && (
          <div className="flex justify-center items-center gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-black"></div>
              <span className="text-sm font-medium">Left Limb %</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-sky-300"></div>
              <span className="text-sm font-medium">Right Limb %</span>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="h-[200px] w-full">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading...</div>
              </div>
            ) : (
              <div>
                <div className="mb-4 text-sm text-gray-600">
                  Debug Info: API Data: {apiData.length} records, 
                  Selected: {selectedTestName || 'None'} / {selectedAthleteName || 'None'} / {selectedTestDate || 'None'}
                  {limbSymmetryData && <span>, Chart Data: {chartData.length} items</span>}
                </div>
                
                {limbSymmetryData ? (
                  <div className="w-full h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="mb-2 text-sm font-medium">Limb Symmetry Data:</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-black text-white px-3 py-2 rounded" style={{width: `${limbSymmetryData.leftPercentage}%`}}>
                        <span className="text-sm font-bold">Left: {limbSymmetryData.leftPercentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between bg-sky-300 text-black px-3 py-2 rounded" style={{width: `${limbSymmetryData.rightPercentage}%`}}>
                        <span className="text-sm font-bold">Right: {limbSymmetryData.rightPercentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      Raw values: Left={limbSymmetryData.leftValue.toFixed(1)}, Right={limbSymmetryData.rightValue.toFixed(1)}
                    </div>
                  </div>
                ) : (
                  <div className="h-full">
                    {/* Test chart with sample data to verify rendering works */}
                    <div className="mb-2 text-xs text-blue-600">Testing chart rendering with sample data:</div>
                    <ResponsiveContainer width="100%" height="60%">
                      <BarChart
                        data={[
                          { name: "Left Limb %", value: 45, fill: "#000000" },
                          { name: "Right Limb %", value: 55, fill: "#7DD3FC" }
                        ]}
                        layout="horizontal"
                        margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
                      >
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" hide />
                        <Bar dataKey="value" stackId="limb" radius={[0, 4, 4, 0]}>
                          <Cell fill="#000000" />
                          <Cell fill="#7DD3FC" />
                          <LabelList 
                            dataKey="value" 
                            position="center" 
                            fill="white"
                            fontSize={12}
                            fontWeight="bold"
                            formatter={(value: number) => `${value}%`}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="text-center text-gray-500 text-sm">
                      {!selectedTestName || !selectedMetricType || !selectedAthleteName || !selectedTestDate 
                        ? "Please select all filters to view real limb symmetry data"
                        : "No data available for the selected filters"
                      }
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
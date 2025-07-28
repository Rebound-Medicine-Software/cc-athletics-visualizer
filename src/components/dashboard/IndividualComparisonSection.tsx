import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, LineChart, Line, CartesianGrid, Tooltip } from "recharts";
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

  // Fetch API data using appropriate endpoint based on test type
  const fetchApiData = async () => {
    setIsLoading(true);
    try {
      // Determine endpoint based on test type
      let endpoint = 'https://bvieqoevqkwdkphubabt.supabase.co/functions/v1/fetch-cc-data';
      
      if (selectedTestName && !["Countermovement Jump", "Drop Jump", "Pogo Jump", "Squat Jump"].includes(selectedTestName)) {
        // For isometric tests, use different endpoint
        endpoint = 'https://europe-west1-forcemate-desktop.cloudfunctions.net/get_athletes?analysis_type=isometric';
      }
      
      const response = await fetch(endpoint, {
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
        } else if (Array.isArray(result)) {
          // Handle direct API response format
          setApiData(result);
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

  // Format dates as DD/MM/YYYY for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Get historical data for the trend chart (Task 3)
  const getHistoricalData = () => {
    if (!selectedTestName || !selectedMetricType || !selectedAthleteName || !apiData.length) {
      return [];
    }

    // Get all test records for the selected athlete and test name
    const athleteTests = apiData.filter(d => 
      d.test_name === selectedTestName && 
      d.athlete_name === selectedAthleteName
    );

    return athleteTests.map(testRecord => {
      const metrics = testRecord.metrics as any;
      let leftValue = 0;
      let rightValue = 0;

      // Safety check - skip if metrics is undefined
      if (!metrics) {
        return {
          date: formatDate(testRecord.test_date),
          leftPercentage: 0,
          rightPercentage: 0
        };
      }

      // Use same logic as limb symmetry calculation - using exact API metric names
      if (selectedTestName === "Drop Jump" && ["Jump Height (cm)", "Contact Time", "Reactive Strength Index", "Flight Time"].includes(selectedMetricType)) {
        // Case 1: Drop Jump with specific metrics
        leftValue = metrics.p1_avg_force || 0;
        rightValue = metrics.p2_avg_force || 0;
      } else if (selectedTestName === "Countermovement Jump") {
        // Case 2: CMJ with any metrics
        leftValue = metrics.p1_avg_force || 0;
        rightValue = metrics.p2_avg_force || 0;
      } else if (selectedTestName === "Squat Jump") {
        // Case 3: Squat Jump
        leftValue = metrics.p1_avg_force || 0;
        rightValue = metrics.p2_avg_force || 0;
      } else if (selectedTestName === "Pogo Jump") {
        // Case 4: Pogo Jump
        leftValue = metrics.avg_fp1_contribution || 0;
        rightValue = metrics.avg_fp2_contribution || 0;
      } else {
      // Case 5: Isometric tests - average trials by stance within the same test
      if (metrics.isometric_analysis?.trials) {
        const leftTrials = metrics.isometric_analysis.trials.filter((trial: any) => 
          trial.stance === 'left_leg'
        );
        const rightTrials = metrics.isometric_analysis.trials.filter((trial: any) => 
          trial.stance === 'right_leg'
        );
        
        leftValue = leftTrials.length > 0 
          ? leftTrials.reduce((sum: number, trial: any) => sum + (trial.total_metrics?.force_peak || 0), 0) / leftTrials.length
          : 0;
        rightValue = rightTrials.length > 0 
          ? rightTrials.reduce((sum: number, trial: any) => sum + (trial.total_metrics?.force_peak || 0), 0) / rightTrials.length
          : 0;
      } else {
        leftValue = 0;
        rightValue = 0;
      }
      }

      const total = leftValue + rightValue;
      const leftPercentage = total > 0 ? Math.round((leftValue / total) * 100 * 100) / 100 : 0;
      const rightPercentage = total > 0 ? Math.round((rightValue / total) * 100 * 100) / 100 : 0;

      return {
        date: formatDate(testRecord.test_date),
        leftPercentage,
        rightPercentage,
        rawDate: testRecord.test_date
      };
    }).sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
  };

  const historicalData = getHistoricalData();

  const availableMetricTypes = selectedTestName ? getMetricTypesForTest(selectedTestName) : [];

  // Calculate limb symmetry data based on TestData metrics
  const calculateLimbSymmetry = (): LimbSymmetryData | null => {
    if (!selectedTestName || !selectedMetricType || !selectedAthleteName || !selectedTestDate || !apiData.length) {
      return null;
    }

    console.log('=== LIMB SYMMETRY CALCULATION ===');
    console.log('Filters:', { selectedTestName, selectedMetricType, selectedAthleteName, selectedTestDate });
    console.log('Available apiData records:', apiData.length);

    // Find the test record that matches our filters
    const testRecord = apiData.find(d => 
      d.test_name === selectedTestName && 
      d.athlete_name === selectedAthleteName && 
      d.test_date === selectedTestDate
    );

    console.log('Found test record:', testRecord);
    if (!testRecord || !testRecord.metrics) {
      console.log('No matching test record found or no metrics');
      return null;
    }

    let leftValue = 0;
    let rightValue = 0;

    // Access the metrics from TestData
    const metrics = testRecord.metrics as any;

    // Apply data logic based on test name and metric type - using exact API metric names
    if (selectedTestName === "Drop Jump" && ["Jump Height (cm)", "Contact Time", "Reactive Strength Index", "Flight Time"].includes(selectedMetricType)) {
      // Case 1: Drop Jump with specific metrics
      leftValue = metrics.p1_avg_force || 0;
      rightValue = metrics.p2_avg_force || 0;
    } else if (selectedTestName === "Countermovement Jump") {
      // Case 2: CMJ with any metrics
      leftValue = metrics.p1_avg_force || 0;
      rightValue = metrics.p2_avg_force || 0;
    } else if (selectedTestName === "Squat Jump") {
      // Case 3: Squat Jump
      leftValue = metrics.p1_avg_force || 0;
      rightValue = metrics.p2_avg_force || 0;
    } else if (selectedTestName === "Pogo Jump") {
      // Case 4: Pogo Jump
      leftValue = metrics.avg_fp1_contribution || 0;
      rightValue = metrics.avg_fp2_contribution || 0;
    } else {
      // Case 5: Isometric tests
      console.log('=== ISOMETRIC DATA ANALYSIS ===');
      console.log('Full metrics object:', JSON.stringify(metrics, null, 2));
      console.log('isometric_analysis:', metrics.isometric_analysis);
      
      if (metrics.isometric_analysis?.trials) {
        console.log('Available trials:', metrics.isometric_analysis.trials);
        console.log('Number of trials:', metrics.isometric_analysis.trials.length);
        
        // Log each trial's stance and force_peak
        metrics.isometric_analysis.trials.forEach((trial: any, index: number) => {
          console.log(`Trial ${index}:`, {
            stance: trial.stance,
            force_peak: trial.total_metrics?.force_peak,
            total_metrics_keys: trial.total_metrics ? Object.keys(trial.total_metrics) : 'no total_metrics',
            raw_trial: trial
          });
        });
        
        console.log('Current athlete selection:', selectedAthleteName);
        console.log('Current test selection:', selectedTestName);
        console.log('Current date selection:', selectedTestDate);
        
        // Search across ALL test records for matching athlete, date to find left_leg and right_leg trials
        // Since right_leg trials may be in different test_name records
        const matchingRecords = teamFilteredData.filter((record: TestData) => 
          record.athlete_name === selectedAthleteName &&
          record.test_date === selectedTestDate &&
          record.test_name.includes('Isometric') // Look for any isometric test variations
        );
        
        console.log('All matching isometric records for limb symmetry:', matchingRecords.length);
        
        let allLeftTrials: any[] = [];
        let allRightTrials: any[] = [];
        let foundDualTrial = false;
        
        // Collect all left_leg and right_leg trials from all matching records
        matchingRecords.forEach((record: TestData, recordIndex: number) => {
          console.log(`Record ${recordIndex}: ${record.test_name}`);
          
          const recordMetrics = record.metrics as any;
          if (recordMetrics?.isometric_analysis?.trials) {
            const leftTrials = recordMetrics.isometric_analysis.trials.filter((trial: any) => 
              trial.stance === 'left_leg' || trial.stance === 'left'
            );
            const rightTrials = recordMetrics.isometric_analysis.trials.filter((trial: any) => 
              trial.stance === 'right_leg' || trial.stance === 'right'
            );
            const dualTrials = recordMetrics.isometric_analysis.trials.filter((trial: any) => trial.stance === 'dual');
            
            console.log(`  - Left trials: ${leftTrials.length}, Right trials: ${rightTrials.length}, Dual trials: ${dualTrials.length}`);
            
            allLeftTrials.push(...leftTrials);
            allRightTrials.push(...rightTrials);
            
            // Handle dual trials (prefer these over separate trials)
            dualTrials.forEach((dualTrial: any) => {
              if (dualTrial?.total_metrics?.force_peak_left && dualTrial?.total_metrics?.force_peak_right) {
                console.log('Found dual trial with separate left/right values');
                leftValue = dualTrial.total_metrics.force_peak_left;
                rightValue = dualTrial.total_metrics.force_peak_right;
                foundDualTrial = true;
              } else if (dualTrial?.cha1_metrics?.force_peak && dualTrial?.cha2_metrics?.force_peak) {
                console.log('Found dual trial with channel-based left/right values');
                leftValue = dualTrial.cha1_metrics.force_peak;
                rightValue = dualTrial.cha2_metrics.force_peak;
                foundDualTrial = true;
              }
            });
          }
        });
        
        console.log('Total collected - Left trials:', allLeftTrials.length, 'Right trials:', allRightTrials.length);

        // Only calculate from separate trials if we didn't find dual trial values
        if (!foundDualTrial) {
          if (allLeftTrials.length > 0) {
            leftValue = allLeftTrials.reduce((sum: number, trial: any) => {
              const value = trial.total_metrics?.force_peak || 
                           trial.total_metrics?.[selectedMetricType] || 
                           trial.max_force || 0;
              console.log('Left trial value:', value, 'from trial:', trial.stance);
              return sum + value;
            }, 0) / allLeftTrials.length;
          }

          if (allRightTrials.length > 0) {
            rightValue = allRightTrials.reduce((sum: number, trial: any) => {
              const value = trial.total_metrics?.force_peak || 
                           trial.total_metrics?.[selectedMetricType] || 
                           trial.max_force || 0;
              console.log('Right trial value:', value, 'from trial:', trial.stance);
              return sum + value;
            }, 0) / allRightTrials.length;
          }
        }
        
        console.log('Final calculated values - Left:', leftValue, 'Right:', rightValue);
      } else {
        console.log('No isometric_analysis.trials found');
        leftValue = 0;
        rightValue = 0;
      }
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

  // Custom mirrored bar chart component
  const MirroredBarChart = ({ data }: { data: LimbSymmetryData | null }) => {
    if (!data) return <div className="text-center text-gray-500">No data available</div>;

    const maxPercentage = Math.max(data.leftPercentage, data.rightPercentage);
    const scale = maxPercentage > 0 ? 50 / maxPercentage : 1; // Scale to fit 50% of each side

    return (
      <div className="w-full">
        {/* Chart container */}
        <div className="relative h-16 bg-gray-50 rounded border">
          {/* Center line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400 z-10"></div>
          
          {/* Left bar (black) */}
          <div 
            className="absolute top-2 bottom-2 bg-black rounded-l"
            style={{
              right: '50%',
              width: `${data.leftPercentage * scale}%`,
              marginRight: '1px'
            }}
          >
            {/* Left percentage label */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-sm font-medium">
              {data.leftPercentage.toFixed(2)}%
            </div>
          </div>
          
          {/* Right bar (light blue) */}
          <div 
            className="absolute top-2 bottom-2 bg-sky-300 rounded-r"
            style={{
              left: '50%',
              width: `${data.rightPercentage * scale}%`,
              marginLeft: '1px'
            }}
          >
            {/* Right percentage label */}
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-800 text-sm font-medium">
              {data.rightPercentage.toFixed(2)}%
            </div>
          </div>
          
        </div>
        
        {/* Raw values as attractive scorecards */}
        <div className="mt-6 flex justify-center gap-6">
          <div className="bg-card rounded-lg border p-4 min-w-[120px] text-center shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-1">Left Limb</div>
            <div className="text-2xl font-bold text-foreground">{data.leftValue.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">{data.leftPercentage.toFixed(1)}%</div>
          </div>
          <div className="bg-card rounded-lg border p-4 min-w-[120px] text-center shadow-sm">
            <div className="text-sm font-medium text-muted-foreground mb-1">Right Limb</div>
            <div className="text-2xl font-bold text-foreground">{data.rightValue.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">{data.rightPercentage.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    );
  };

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
                    {formatDate(testDate)}
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

        {/* Charts Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Limb Symmetry Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">Current Test Limb Symmetry</h3>
            <div className="h-[200px] w-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : (
                <div>
                  {limbSymmetryData ? (
                     <MirroredBarChart data={limbSymmetryData} />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-gray-500 text-sm">
                        {!selectedTestName || !selectedMetricType || !selectedAthleteName || !selectedTestDate 
                          ? "Please select all filters to view limb symmetry data"
                          : "No data available for the selected filters"
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Historical Trend Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">Historical Trend</h3>
            <div className="h-[200px] w-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : (
                <div>
                  {historicalData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          fontSize={11}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          domain={[0, 100]}
                          fontSize={11}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="leftPercentage" 
                          stroke="#000000" 
                          strokeWidth={2}
                          dot={{ fill: "#000000", strokeWidth: 2, r: 4 }}
                          name="Left Limb %"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rightPercentage" 
                          stroke="#7DD3FC" 
                          strokeWidth={2}
                          dot={{ fill: "#7DD3FC", strokeWidth: 2, r: 4 }}
                          name="Right Limb %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-gray-500 text-sm">
                        {!selectedTestName || !selectedMetricType || !selectedAthleteName 
                          ? "Please select test, metric, and athlete to view historical trends"
                          : "No historical data available for the selected athlete and test"
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
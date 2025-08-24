import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, LineChart, Line, CartesianGrid, Tooltip } from "recharts";
import { TestData } from "@/types/forcePlateTypes";
import { getMetricTypesForTest, getUniqueTestNames, getUniqueAthleteNames, getUniqueTestDates } from "./filters/filterUtils";
import { metricCaseLogic } from "./chart/useMetricCaseLogic";

interface IndividualComparisonSectionProps {
  data: TestData[];
  resetFiltersKey: number;
  selectedTeams: string[];
  branding?: any;
}

// Helper function to get metric units
const getMetricUnit = (metricType: string | null): string => {
  if (!metricType) return '';
  
  switch (metricType) {
    case 'Jump Height (cm)':
      return '[cm]';
    case 'Peak Power':
    case 'Average Propulsive Power':
    case 'Power':
      return '[w]';
    case 'Relative Peak Power':
      return '[w/kg]';
    case 'Reactive Strength Index':
      return '[A/U]';
    case 'Take-off Velocity':
      return '[m/s]';
    case 'Average Rate of Force Development':
    case 'Maximum Rate of Force Development':
      return '[N/s]';
    case 'Contact Time':
    case 'Flight Time':
      return '[ms]';
    case 'Force at Max Rate of Force Development':
    case 'Peak Force':
      return '[N]';
    default:
      return '';
  }
};

// Helper function to format metric values based on type
const formatMetricValue = (value: number, metricType: string | null): number => {
  if (!metricType) return value;
  
  switch (metricType) {
    case 'Jump Height (cm)':
      // Convert from meters to centimeters (multiply by 100)
      return value * 100;
    case 'Contact Time':
    case 'Flight Time':
      // Convert from seconds to milliseconds (multiply by 1000)
      return value * 1000;
    default:
      // No conversion needed for other metrics
      return value;
  }
};

interface LimbSymmetryData {
  name: string;
  leftPercentage: number;
  rightPercentage: number;
  leftValue: number;
  rightValue: number;
}

export const IndividualComparisonSection = ({ data, resetFiltersKey, selectedTeams, branding }: IndividualComparisonSectionProps) => {
  // Filter states
  const [selectedTestName, setSelectedTestName] = useState("");
  const [selectedMetricType, setSelectedMetricType] = useState("");
  const [selectedAthleteName, setSelectedAthleteName] = useState("");
  const [selectedTestDate, setSelectedTestDate] = useState("");

  // API data state
  const [apiData, setApiData] = useState<TestData[]>([]);
  const [isLoading, setIsLoading] = useState(false);


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
      console.log('Historical data missing requirements:', {
        selectedTestName: !!selectedTestName,
        selectedMetricType: !!selectedMetricType,
        selectedAthleteName: !!selectedAthleteName,
        apiDataLength: apiData.length
      });
      return [];
    }

    console.log('Getting historical data for:', { selectedTestName, selectedMetricType, selectedAthleteName });

    // Get all test records for the selected athlete and test name (regardless of selected test date)
    const athleteTests = teamFilteredData.filter(d => 
      d.test_name === selectedTestName && 
      d.athlete_name === selectedAthleteName
    );

    console.log('Found athlete tests:', athleteTests.length);
    console.log('Athlete test dates:', athleteTests.map(t => t.test_date));

    // Group tests by date to get the best value per date
    const testsByDate = athleteTests.reduce((acc, testRecord) => {
      const date = testRecord.test_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(testRecord);
      return acc;
    }, {} as Record<string, TestData[]>);

    const historicalResults = Object.entries(testsByDate).map(([date, testsOnDate]) => {
      console.log(`Processing date ${date} with ${testsOnDate.length} tests`);

      // Calculate metric values for all tests on this date
      const values = testsOnDate.map(testRecord => {
        const { value, yAxisLabel } = metricCaseLogic(testRecord, selectedTestName, selectedMetricType);
        return { value: value || 0, yAxisLabel };
      }).filter(result => result.value > 0); // Filter out zero values

      if (values.length === 0) {
        return {
          date: formatDate(date),
          value: 0,
          rawDate: date,
          yAxisLabel: selectedMetricType
        };
      }

      // For RSI: higher is better, show max value
      // For Contact Time: lower is better, show min value but invert for positive trend display
      // For others: higher is better, show max value
      let bestValue;
      let displayValue;
      
      if (selectedMetricType === 'Contact Time') {
        // Lower contact time is better, so take minimum value
        bestValue = Math.min(...values.map(v => v.value));
        // Invert for positive trend visualization (subtract from max possible or use negative)
        const maxContactTime = Math.max(...values.map(v => v.value));
        displayValue = maxContactTime - bestValue; // Invert so improvements show as positive trend
      } else {
        // For RSI and all other metrics, higher is better
        bestValue = Math.max(...values.map(v => v.value));
        displayValue = bestValue;
      }

      // Format the value based on metric type
      const formattedValue = formatMetricValue(displayValue, selectedMetricType);

      console.log(`Date ${date}: ${selectedMetricType}=${bestValue}, displayValue=${displayValue}, formattedValue=${formattedValue}`);

      return {
        date: formatDate(date),
        value: formattedValue,
        rawDate: date,
        yAxisLabel: values[0].yAxisLabel
      };
    }).sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

    console.log('Final historical results:', historicalResults);
    return historicalResults;
  };

  const historicalData = getHistoricalData();
  
  // Debug historical data
  console.log('=== HISTORICAL DATA DEBUG ===');
  console.log('Historical data length:', historicalData.length);
  console.log('Historical data:', historicalData);

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
        <div 
          className="relative h-16 rounded border-2"
          style={{
            backgroundColor: branding?.secondary_color ? `${branding.secondary_color}20` : 'hsl(var(--muted))',
            borderColor: branding?.secondary_color ? `${branding.secondary_color}40` : 'hsl(var(--border))'
          }}
        >
          {/* Center line */}
          <div 
            className="absolute left-1/2 top-0 bottom-0 w-0.5 z-10"
            style={{ backgroundColor: branding?.primary_color || 'hsl(var(--border))' }}
          ></div>
          
          {/* Left bar */}
          <div 
            className="absolute top-2 bottom-2 rounded-l"
            style={{
              right: '50%',
              width: `${data.leftPercentage * scale}%`,
              marginRight: '1px',
              backgroundColor: branding?.primary_color || 'hsl(var(--foreground))'
            }}
          >
            {/* Left percentage label */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-sm font-medium">
              {data.leftPercentage.toFixed(2)}%
            </div>
          </div>
          
          {/* Right bar */}
          <div 
            className="absolute top-2 bottom-2 rounded-r"
            style={{
              left: '50%',
              width: `${data.rightPercentage * scale}%`,
              marginLeft: '1px',
              backgroundColor: branding?.accent_color || 'hsl(var(--accent))'
            }}
          >
            {/* Right percentage label */}
            <div 
              className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm font-medium"
              style={{ color: branding?.primary_color || 'hsl(var(--foreground))' }}
            >
              {data.rightPercentage.toFixed(2)}%
            </div>
          </div>
          
        </div>
        
        {/* Raw values as attractive scorecards */}
        <div className="mt-6 flex justify-center gap-6">
          <div 
            className="rounded-lg border-2 p-4 min-w-[120px] text-center shadow-sm"
            style={{
              backgroundColor: branding?.primary_color || 'hsl(var(--foreground))',
              borderColor: branding?.primary_color || 'hsl(var(--foreground))'
            }}
          >
            <div className="text-sm font-medium text-gray-300 mb-1">Left Limb</div>
            <div className="text-2xl font-bold text-white">{data.leftValue.toFixed(2)}</div>
            <div className="text-xs text-gray-300">{data.leftPercentage.toFixed(1)}%</div>
          </div>
          <div 
            className="rounded-lg border-2 p-4 min-w-[120px] text-center shadow-sm"
            style={{
              backgroundColor: branding?.accent_color || 'hsl(var(--accent))',
              borderColor: branding?.accent_color || 'hsl(var(--accent))'
            }}
          >
            <div 
              className="text-sm font-medium mb-1"
              style={{ color: branding?.primary_color || 'hsl(var(--foreground))' }}
            >
              Right Limb
            </div>
            <div 
              className="text-2xl font-bold"
              style={{ color: branding?.primary_color || 'hsl(var(--foreground))' }}
            >
              {data.rightValue.toFixed(2)}
            </div>
            <div 
              className="text-xs"
              style={{ color: branding?.primary_color || 'hsl(var(--muted-foreground))' }}
            >
              {data.rightPercentage.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>
    );
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
    <div style={branding ? { fontFamily: branding.font_family || 'Inter, system-ui, sans-serif' } : {}}>
      <Card 
        className="border-2"
        style={{
          backgroundColor: branding?.secondary_color ? `${branding.secondary_color}10` : 'hsl(var(--card))',
          borderColor: branding?.secondary_color ? `${branding.secondary_color}40` : 'hsl(var(--border))'
        }}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex justify-center mb-4">
            <Button 
              variant="default" 
              className="w-auto min-w-[220px] text-lg font-semibold mx-auto justify-center block text-center cursor-default text-white"
              style={{
                backgroundColor: branding?.accent_color || 'hsl(var(--accent))',
                borderColor: branding?.accent_color || 'hsl(var(--accent))'
              }}
              aria-label="Individual / Between Limb Comparisons"
            >
            Individual / Between Limb Comparisons
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {/* Test Name */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Name</label>
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

          {/* Athlete Name */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Athlete Name</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Test Date</label>
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

          {/* Metric Type */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
            <Select 
              value={selectedMetricType} 
              onValueChange={handleMetricTypeChange}
              disabled={!selectedTestDate}
            >
              <SelectTrigger className={`${!selectedTestDate ? "bg-gray-100 opacity-60" : "bg-white"}`}>
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
        </div>


        {/* Charts Container */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Limb Symmetry Chart */}
          <div 
            className="rounded-lg p-6 border-2"
            style={{
              backgroundColor: branding?.secondary_color ? `${branding.secondary_color}10` : 'hsl(var(--card))',
              borderColor: branding?.secondary_color ? `${branding.secondary_color}40` : 'hsl(var(--border))'
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4 text-center"
              style={{ color: branding?.primary_color || 'hsl(var(--foreground))' }}
            >
              {selectedTestName || 'Test Name'} Limb Symmetry
            </h3>
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
          <div 
            className="rounded-lg p-6 border-2"
            style={{
              backgroundColor: branding?.secondary_color ? `${branding.secondary_color}10` : 'hsl(var(--card))',
              borderColor: branding?.secondary_color ? `${branding.secondary_color}40` : 'hsl(var(--border))'
            }}
          >
            <h3 
              className="text-lg font-semibold mb-4 text-center"
              style={{ color: branding?.primary_color || 'hsl(var(--foreground))' }}
            >
              Individual Scores
            </h3>
            <div className="h-[200px] w-full">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-500">Loading...</div>
                </div>
              ) : historicalData.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <div style={{ width: Math.max(100, historicalData.length * 80), minWidth: '100%' }}>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart 
                        data={historicalData} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <XAxis 
                          dataKey="date" 
                          fontSize={11}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          interval={0}
                        />
                        <YAxis 
                          fontSize={11}
                          tickFormatter={(value) => `${value.toFixed(1)}`}
                          label={{
                            value: historicalData.length > 0 ? historicalData[0].yAxisLabel : selectedMetricType || "Metric",
                            angle: -90,
                            position: 'insideLeft',
                            style: { 
                              textAnchor: 'middle', 
                              fontSize: 12, 
                              fill: branding?.primary_color || "#374151" 
                            },
                          }}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            const unit = getMetricUnit(selectedMetricType);
                            return [`${value.toFixed(1)}${unit}`, name];
                          }}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke={branding?.primary_color || "#7DD3FC"}
                          strokeWidth={3}
                          dot={{ 
                            fill: branding?.primary_color || "#7DD3FC", 
                            strokeWidth: 2, 
                            r: 5,
                            stroke: branding?.accent_color || "#7DD3FC"
                          }}
                          name={selectedMetricType || "Metric"}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
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
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};
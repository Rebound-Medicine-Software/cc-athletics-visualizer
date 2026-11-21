import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, LineChart, Line, CartesianGrid, Tooltip } from "recharts";
import { TestData } from "@/types/forcePlateTypes";
import { getMetricTypesForTest, getUniqueTestNames, getUniqueAthleteNames } from "./filters/filterUtils";
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

// Contact/Flight time arrives in different units depending on data source:
// CC Athletics' raw API returns these in seconds, while VALD's dashboard
// mapper (valdToCCAthletics.ts) already converts them to milliseconds
// before the record reaches this chart. Both land in the same
// metrics.contact_time / metrics.flight_time keys.
//
// This MUST run on each record's raw value individually, before any
// averaging happens (see getHistoricalData below) — not on an already
// averaged value. An athlete can have a CC Athletics (software) test and a
// VALD (hardware) test of the same type on the same calendar date, and
// Josh wants both providers combining onto the same report card /
// historical trend rather than being treated as separate silos. Averaging
// a raw CC seconds value (e.g. 0.70) together with a raw VALD ms value
// (e.g. 704) before converting would blend them into a meaningless ~352.
// Normalizing each value to ms first, then averaging, means a mixed-source
// day combines into one correct point. Values are always well under 5 when
// expressed in seconds and well over 5 once in ms, so that's the signal to
// convert — the same tolerant heuristic valdToCCAthletics.ts's own toMs()
// helper already uses elsewhere in this codebase.
const normalizeRawMetricValue = (value: number, metricType: string | null): number => {
  if (!metricType) return value;

  switch (metricType) {
    case 'Contact Time':
    case 'Flight Time':
      return value < 5 ? value * 1000 : value;
    default:
      return value;
  }
};

// Helper function to format metric values based on type. Runs on the
// already-averaged (and, for Contact/Flight Time, already per-record
// unit-normalized — see normalizeRawMetricValue above) value.
const formatMetricValue = (value: number, metricType: string | null): number => {
  if (!metricType) return value;

  switch (metricType) {
    case 'Jump Height (cm)':
      return value * 100;
    default:
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
  const [selectedTestName, setSelectedTestName] = useState("");
  const [selectedMetricType, setSelectedMetricType] = useState("");
  const [selectedAthleteName, setSelectedAthleteName] = useState("");
  const [selectedTestDate, setSelectedTestDate] = useState("");

  useEffect(() => {
    setSelectedTestName("");
    setSelectedMetricType("");
    setSelectedAthleteName("");
    setSelectedTestDate("");
  }, [resetFiltersKey]);

  // Use the data prop passed down by the parent (DashboardContent for CC
  // Athletics, ValdAnalytics for the VALD Hub) instead of re-fetching
  // fetch-cc-data directly. The old self-fetch here always pulled CC
  // Athletics data regardless of which page rendered this component, so the
  // VALD Hub's Individual / Limb Comparison charts were silently showing CC
  // Athletics data instead of the VALD data selected above them.
  const teamFilteredData = selectedTeams.length > 0
    ? data.filter(d => selectedTeams.includes(d.team_name))
    : data;

  const uniqueTestNames = getUniqueTestNames(teamFilteredData).filter(t => !t.startsWith("Left Side") && !t.startsWith("Right Side"));
  const uniqueAthleteNames = selectedTestName
    ? getUniqueAthleteNames(teamFilteredData.filter(d => d.test_name === selectedTestName))
    : [];

  const normalizeTestDate = (dateString: string) => {
    if (!dateString) return "";

    const isoLikeDate = dateString.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (isoLikeDate) return isoLikeDate;

    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) return "";

    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const day = String(parsedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const uniqueTestDates = selectedAthleteName && selectedTestName
    ? Array.from(new Set(
        teamFilteredData
          .filter(d => d.test_name === selectedTestName && d.athlete_name === selectedAthleteName)
          .map(d => normalizeTestDate(d.test_date))
          .filter(Boolean)
      )).sort()
    : [];

  const formatDate = (dateString: string) => {
    const normalizedDate = normalizeTestDate(dateString);
    if (!normalizedDate) return dateString;

    const [year, month, day] = normalizedDate.split('-');
    return `${day}/${month}/${year}`;
  };

  const getHistoricalData = () => {
    if (!selectedTestName || !selectedMetricType || !selectedAthleteName || !data.length) {
      return [];
    }

    const athleteTests = teamFilteredData.filter(d =>
      d.test_name === selectedTestName &&
      d.athlete_name === selectedAthleteName
    );

    const testsByDate = athleteTests.reduce((acc, testRecord) => {
      const date = normalizeTestDate(testRecord.test_date);
      if (!date) return acc;

      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(testRecord);
      return acc;
    }, {} as Record<string, TestData[]>);

    const historicalResults = Object.entries(testsByDate).map(([date, testsOnDate]) => {
      const values = testsOnDate.map(testRecord => {
        const { value, yAxisLabel } = metricCaseLogic(testRecord, selectedTestName, selectedMetricType);
        // Normalize per-record, before averaging, so a CC Athletics
        // (software) record and a VALD (hardware) record for the same
        // athlete/test/date combine correctly instead of blending
        // mismatched units.
        const normalized = value != null ? normalizeRawMetricValue(value, selectedMetricType) : value;
        return { value: normalized || 0, yAxisLabel };
      }).filter(result => result.value > 0);

      if (values.length === 0) {
        return {
          date: formatDate(date),
          value: 0,
          rawDate: date,
          yAxisLabel: selectedMetricType
        };
      }

      const avgValue = values.reduce((sum, v) => sum + v.value, 0) / values.length;
      const formattedValue = formatMetricValue(avgValue, selectedMetricType);

      return {
        date: formatDate(date),
        value: formattedValue,
        rawDate: date,
        yAxisLabel: values[0].yAxisLabel
      };
    }).sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

    return historicalResults;
  };

  const historicalData = getHistoricalData();

  const availableMetricTypes = selectedTestName ? getMetricTypesForTest(selectedTestName) : [];

  const calculateLimbSymmetry = (): LimbSymmetryData | null => {
    if (!selectedTestName || !selectedMetricType || !selectedAthleteName || !selectedTestDate || !data.length) {
      return null;
    }

    const matchingRecords = data.filter(d =>
      d.test_name === selectedTestName &&
      d.athlete_name === selectedAthleteName &&
      normalizeTestDate(d.test_date) === selectedTestDate
    );

    if (matchingRecords.length === 0) {
      return null;
    }

    let leftValue = 0;
    let rightValue = 0;

    const getLimbAverages = (leftKey: string, rightKey: string) => {
      let leftSum = 0, rightSum = 0, count = 0;
      matchingRecords.forEach(record => {
        const m = record.metrics as any;
        if (m[leftKey] != null || m[rightKey] != null) {
          leftSum += (m[leftKey] || 0);
          rightSum += (m[rightKey] || 0);
          count++;
        }
      });
      return count > 0 ? { left: leftSum / count, right: rightSum / count } : { left: 0, right: 0 };
    };

    if (selectedTestName === "Drop Jump" && ["Jump Height (cm)", "Contact Time", "Reactive Strength Index", "Flight Time"].includes(selectedMetricType)) {
      const avg = getLimbAverages('p1_avg_force', 'p2_avg_force');
      leftValue = avg.left;
      rightValue = avg.right;
    } else if (selectedTestName === "Countermovement Jump") {
      const avg = getLimbAverages('p1_avg_force', 'p2_avg_force');
      leftValue = avg.left;
      rightValue = avg.right;
    } else if (selectedTestName === "Squat Jump") {
      const avg = getLimbAverages('p1_avg_force', 'p2_avg_force');
      leftValue = avg.left;
      rightValue = avg.right;
    } else if (selectedTestName === "Pogo Jump") {
      const avg = getLimbAverages('avg_fp1_contribution', 'avg_fp2_contribution');
      leftValue = avg.left;
      rightValue = avg.right;
    } else {
      const firstRecord = matchingRecords[0];
      const metrics = firstRecord.metrics as any;

      if (metrics?.isometric_analysis?.trials) {
        const isoRecords = teamFilteredData.filter((record: TestData) =>
          record.athlete_name === selectedAthleteName &&
          normalizeTestDate(record.test_date) === selectedTestDate &&
          record.test_name.includes('Isometric')
        );

        let allLeftTrials: any[] = [];
        let allRightTrials: any[] = [];
        let foundDualTrial = false;

        isoRecords.forEach((record: TestData, recordIndex: number) => {

          const recordMetrics = record.metrics as any;
          if (recordMetrics?.isometric_analysis?.trials) {
            const leftTrials = recordMetrics.isometric_analysis.trials.filter((trial: any) =>
              trial.stance === 'left_leg' || trial.stance === 'left'
            );
            const rightTrials = recordMetrics.isometric_analysis.trials.filter((trial: any) =>
              trial.stance === 'right_leg' || trial.stance === 'right'
            );
            const dualTrials = recordMetrics.isometric_analysis.trials.filter((trial: any) => trial.stance === 'dual');

            allLeftTrials.push(...leftTrials);
            allRightTrials.push(...rightTrials);

            dualTrials.forEach((dualTrial: any) => {
              if (dualTrial?.total_metrics?.force_peak_left && dualTrial?.total_metrics?.force_peak_right) {
                leftValue = dualTrial.total_metrics.force_peak_left;
                rightValue = dualTrial.total_metrics.force_peak_right;
                foundDualTrial = true;
              } else if (dualTrial?.cha1_metrics?.force_peak && dualTrial?.cha2_metrics?.force_peak) {
                leftValue = dualTrial.cha1_metrics.force_peak;
                rightValue = dualTrial.cha2_metrics.force_peak;
                foundDualTrial = true;
              }
            });
          }
        });

        if (!foundDualTrial) {
          if (allLeftTrials.length > 0) {
            leftValue = allLeftTrials.reduce((sum: number, trial: any) => {
              const value = trial.total_metrics?.force_peak ||
                           trial.total_metrics?.[selectedMetricType] ||
                           trial.max_force || 0;
              return sum + value;
            }, 0) / allLeftTrials.length;
          }

          if (allRightTrials.length > 0) {
            rightValue = allRightTrials.reduce((sum: number, trial: any) => {
              const value = trial.total_metrics?.force_peak ||
                           trial.total_metrics?.[selectedMetricType] ||
                           trial.max_force || 0;
              return sum + value;
            }, 0) / allRightTrials.length;
          }
        }

      } else {
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

  const MirroredBarChart = ({ data }: { data: LimbSymmetryData | null }) => {
    if (!data) return <div className="text-center text-gray-500">No data available</div>;

    const maxPercentage = Math.max(data.leftPercentage, data.rightPercentage);
    const scale = maxPercentage > 0 ? 50 / maxPercentage : 1;

    return (
      <div className="w-full">
        <div
          className="relative h-16 rounded border-2"
          style={{
            backgroundColor: branding?.secondary_color ? `${branding.secondary_color}20` : 'hsl(var(--muted))',
            borderColor: branding?.secondary_color ? `${branding.secondary_color}40` : 'hsl(var(--border))'
          }}
        >
          <div
            className="absolute left-1/2 top-0 bottom-0 w-0.5 z-10"
            style={{ backgroundColor: branding?.primary_color || 'hsl(var(--border))' }}
          ></div>

          <div
            className="absolute top-2 bottom-2 rounded-l"
            style={{
              right: '50%',
              width: `${data.leftPercentage * scale}%`,
              marginRight: '1px',
              backgroundColor: branding?.primary_color || 'hsl(var(--foreground))'
            }}
          >
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white text-sm font-medium">
              {data.leftPercentage.toFixed(2)}%
            </div>
          </div>

          <div
            className="absolute top-2 bottom-2 rounded-r"
            style={{
              left: '50%',
              width: `${data.rightPercentage * scale}%`,
              marginLeft: '1px',
              backgroundColor: branding?.accent_color || 'hsl(var(--accent))'
            }}
          >
            <div
              className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm font-medium"
              style={{ color: branding?.primary_color || 'hsl(var(--foreground))' }}
            >
              {data.rightPercentage.toFixed(2)}%
            </div>
          </div>

        </div>

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
          <div className="sticky top-[80px] z-30 pb-4 rounded-t-lg" style={{
            backgroundColor: branding?.secondary_color ? `${branding.secondary_color}10` : 'hsl(var(--card))',
          }}>
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

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

              <div className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Metric Type</label>
                <Select
                  value={selectedMetricType}
                  onValueChange={handleMetricTypeChange}
                  disabled={!selectedTestDate}
                >
                  <SelectTrigger className={`${!selectedTestDate ? "bg-gray-100 opacity-60" : "bg-white"} h-auto min-h-[2.5rem] [&>span]:!block [&>span]:!whitespace-normal [&>span]:!overflow-visible [&>span]:!text-ellipsis-none`}>
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className="rounded-lg p-6 border-2"
              style={{
                backgroundColor: '#ffffff',
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
            </div>

            <div
              className="rounded-lg p-6 border-2"
              style={{
                backgroundColor: '#ffffff',
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
                {historicalData.length > 0 ? (
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
                                fontSize: 8,
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

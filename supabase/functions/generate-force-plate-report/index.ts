import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestMetrics {
  [key: string]: any;
}

interface TestRecord {
  test_name: string;
  test_date: string;
  metrics: TestMetrics;
  repetition_number?: number;
}

interface GroupedTest {
  testName: string;
  records: TestRecord[];
  latestDate: string;
  latestMetrics: TestMetrics;
  previousValues: { date: string; metrics: TestMetrics }[];
  baseline: TestMetrics | null;
  personalRecord: TestMetrics | null;
}

interface CardConfig {
  icon: string;
  title: string;
  metricKey: string;
  keyOverride?: string;
  fallbackKeys?: string[];
  unit: string;
}

// Get metric card configurations matching dashboard's metricCardConfig.ts
function getCardConfigs(testName: string): CardConfig[] {
  switch (testName) {
    case "Countermovement Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "Peak Power", metricKey: "peak_power", unit: "W" },
        { icon: "⚡", title: "Peak Power / Body Mass", metricKey: "relative_peak_power", unit: "W/kg" },
        { icon: "⚡", title: "Reactive Strength Index", metricKey: "rsi", unit: "" },
      ];
    case "Squat Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "Take-off Velocity", metricKey: "takeoff_velocity", unit: "m/s" },
        { icon: "⚡", title: "Avg Rate of Force Dev.", metricKey: "avg_rfd", unit: "N/s" },
        { icon: "⚡", title: "Avg Propulsive Power", metricKey: "avg_propulsive_power", unit: "W" },
      ];
    case "Drop Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "jump_height_ft", keyOverride: "jump_height_cm", unit: "cm" },
        { icon: "⏱️", title: "Flight Time", metricKey: "flight_time", unit: "ms" },
        { icon: "⚡", title: "Reactive Strength Index", metricKey: "rsi", unit: "" },
        { icon: "⏱️", title: "Contact Time", metricKey: "contact_time", unit: "ms" },
      ];
    case "Pogo Jump":
      return [
        { icon: "📏", title: "Jump Height (cm)", metricKey: "avg_jump_height", keyOverride: "avg_jump_height_cm", unit: "cm" },
        { icon: "⚡", title: "Reactive Strength Index", metricKey: "avg_rsi", unit: "" },
        { icon: "⚡", title: "Power", metricKey: "avg_power", fallbackKeys: ["power", "avg_pogo_power"], unit: "W" },
        { icon: "⏱️", title: "Flight Time", metricKey: "avg_flight_time", unit: "ms" },
      ];
    default:
      // Isometric tests
      return [
        { icon: "⚡", title: "Peak Force", metricKey: "force_peak", unit: "N" },
        { icon: "📈", title: "RFD Max", metricKey: "rfd_max", unit: "N/s" },
        { icon: "⚡", title: "Impulse 50ms", metricKey: "impulse_50ms", unit: "N·s" },
        { icon: "⚡", title: "Impulse 250ms", metricKey: "impulse_250ms", unit: "N·s" },
      ];
  }
}

// Extract limb symmetry data matching dashboard's IndividualComparisonSection.tsx logic
function calculateLimbSymmetry(testName: string, metrics: TestMetrics): { leftValue: number; rightValue: number; asymmetryPercent: number } | null {
  let leftValue = 0;
  let rightValue = 0;

  // Apply data logic based on test name - matching dashboard logic exactly
  if (testName === "Drop Jump") {
    leftValue = metrics.p1_avg_force || 0;
    rightValue = metrics.p2_avg_force || 0;
  } else if (testName === "Countermovement Jump") {
    leftValue = metrics.p1_avg_force || 0;
    rightValue = metrics.p2_avg_force || 0;
  } else if (testName === "Squat Jump") {
    leftValue = metrics.p1_avg_force || 0;
    rightValue = metrics.p2_avg_force || 0;
  } else if (testName === "Pogo Jump") {
    leftValue = metrics.avg_fp1_contribution || 0;
    rightValue = metrics.avg_fp2_contribution || 0;
  } else {
    // Isometric tests - check for isometric_analysis structure
    if (metrics.isometric_analysis?.trials) {
      const trials = metrics.isometric_analysis.trials;
      
      // Look for dual trials with separate left/right values
      for (const trial of trials) {
        if (trial.stance === 'dual') {
          if (trial.total_metrics?.force_peak_left && trial.total_metrics?.force_peak_right) {
            leftValue = trial.total_metrics.force_peak_left;
            rightValue = trial.total_metrics.force_peak_right;
            break;
          } else if (trial.cha1_metrics?.force_peak && trial.cha2_metrics?.force_peak) {
            leftValue = trial.cha1_metrics.force_peak;
            rightValue = trial.cha2_metrics.force_peak;
            break;
          }
        }
      }

      // If no dual trials found, collect separate left/right leg trials
      if (leftValue === 0 && rightValue === 0) {
        const leftTrials = trials.filter((t: any) => t.stance === 'left_leg' || t.stance === 'left');
        const rightTrials = trials.filter((t: any) => t.stance === 'right_leg' || t.stance === 'right');

        if (leftTrials.length > 0) {
          leftValue = leftTrials.reduce((sum: number, t: any) => sum + (t.total_metrics?.force_peak || 0), 0) / leftTrials.length;
        }
        if (rightTrials.length > 0) {
          rightValue = rightTrials.reduce((sum: number, t: any) => sum + (t.total_metrics?.force_peak || 0), 0) / rightTrials.length;
        }
      }
    }
  }

  const total = leftValue + rightValue;
  if (total === 0) return null;

  // Asymmetry formula: |Left - Right| / Max(Left, Right) × 100
  const asymmetryPercent = Math.abs(leftValue - rightValue) / Math.max(leftValue, rightValue) * 100;

  return {
    leftValue,
    rightValue,
    asymmetryPercent
  };
}

// Format metric value based on type (convert units like dashboard does)
// All length metrics are normalized to cm
function formatMetricValue(value: number, metricKey: string): number {
  switch (metricKey) {
    case 'jump_height_ft':
    case 'jump_height_cm':
      // Convert from meters to centimeters
      return value * 100;
    case 'avg_jump_height':
    case 'avg_jump_height_cm':
      // Pogo Jump height - convert from meters to centimeters
      // But only if value appears to be in meters (< 3 means it's likely meters)
      if (value < 3) {
        return value * 100;
      }
      // Already in cm
      return value;
    case 'contact_time':
    case 'flight_time':
    case 'avg_flight_time':
    case 'avg_contact_time':
      // Convert from seconds to milliseconds
      return value * 1000;
    default:
      return value;
  }
}

// Get metric value from record, applying any key overrides and fallbacks
function getMetricValue(metrics: TestMetrics, config: CardConfig): number | null {
  // Try primary key first
  let value = metrics[config.metricKey];
  
  // Try fallback keys if primary is not a number
  if (typeof value !== 'number' && config.fallbackKeys) {
    for (const fallbackKey of config.fallbackKeys) {
      const fallbackValue = metrics[fallbackKey];
      if (typeof fallbackValue === 'number') {
        value = fallbackValue;
        break;
      }
    }
  }
  
  if (typeof value !== 'number') return null;
  return formatMetricValue(value, config.keyOverride || config.metricKey);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { athlete_id, athlete_name, team_name, test_data } = body

    if (!athlete_name || !test_data || test_data.length === 0) {
      throw new Error('athlete_name and test_data are required')
    }

    console.log(`Generating force plate PDF report for: ${athlete_name}`)

    // Group tests by test_name
    const groupedTests: Map<string, GroupedTest> = new Map()
    
    for (const record of test_data) {
      const testName = record.test_name
      if (!groupedTests.has(testName)) {
        groupedTests.set(testName, {
          testName,
          records: [],
          latestDate: '',
          latestMetrics: {},
          previousValues: [],
          baseline: null,
          personalRecord: null,
        })
      }
      groupedTests.get(testName)!.records.push(record)
    }

    // Process each test group - Select BEST result per date
    for (const [testName, group] of groupedTests) {
      const cardConfigs = getCardConfigs(testName)
      const primaryConfig = cardConfigs[0]
      
      // Determine if primary metric is "lower is better"
      const lowerIsBetterMetrics = [
        'contact_time', 'gct', 'ground_contact_time', 'avg_contact_time',
        'time_to_peak_force', 'time_to_takeoff', 'braking_time', 'propulsive_time'
      ]
      const isLowerBetter = lowerIsBetterMetrics.some(m => 
        primaryConfig.metricKey.toLowerCase().includes(m) || 
        primaryConfig.title.toLowerCase().includes('contact') ||
        primaryConfig.title.toLowerCase().includes('gct')
      )
      
      // Group records by date and pick BEST per date
      // Normalize date to YYYY-MM-DD to handle timestamps properly
      const recordsByDate: Record<string, TestRecord[]> = {}
      for (const record of group.records) {
        // Extract just the date portion (YYYY-MM-DD) from potential datetime strings
        const dateOnly = record.test_date.split('T')[0]
        if (!recordsByDate[dateOnly]) {
          recordsByDate[dateOnly] = []
        }
        recordsByDate[dateOnly].push(record)
      }
      
      // Select best record per date
      const bestRecordsPerDate: TestRecord[] = []
      for (const [date, records] of Object.entries(recordsByDate)) {
        if (records.length === 1) {
          bestRecordsPerDate.push(records[0])
        } else {
          // Find best based on primary metric
          let bestRecord = records[0]
          let bestValue = getMetricValue(records[0].metrics, primaryConfig) ?? (isLowerBetter ? Infinity : -Infinity)
          
          for (const record of records.slice(1)) {
            const value = getMetricValue(record.metrics, primaryConfig)
            if (value !== null) {
              if (isLowerBetter ? value < bestValue : value > bestValue) {
                bestValue = value
                bestRecord = record
              }
            }
          }
          bestRecordsPerDate.push(bestRecord)
        }
      }
      
      // Replace group records with best-per-date records
      group.records = bestRecordsPerDate
      
      // Sort by date descending
      group.records.sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())
      
      const latest = group.records[0]
      group.latestDate = latest.test_date
      group.latestMetrics = latest.metrics
      
      // Previous values (last 10 excluding latest)
      group.previousValues = group.records.slice(1, 11).map(r => ({
        date: r.test_date,
        metrics: r.metrics
      }))
      
      // Baseline (average of first 3 sessions)
      const oldestRecords = group.records.slice(-3)
      if (oldestRecords.length >= 2) {
        const baselineMetrics: TestMetrics = {}
        const metricKeys = Object.keys(oldestRecords[0].metrics || {})
        for (const key of metricKeys) {
          const values = oldestRecords.map(r => r.metrics[key]).filter(v => typeof v === 'number') as number[]
          if (values.length > 0) {
            baselineMetrics[key] = values.reduce((a, b) => a + b, 0) / values.length
          }
        }
        group.baseline = baselineMetrics
      }
      
      // Personal Record (best for each metric - considering lower/higher is better for primary)
      const prMetrics: TestMetrics = {}
      const metricKeys = Object.keys(group.records[0]?.metrics || {})
      for (const key of metricKeys) {
        const values = group.records.map(r => r.metrics[key]).filter(v => typeof v === 'number') as number[]
        if (values.length > 0) {
          // For primary metric, use appropriate comparison; for others default to max
          if (key === primaryConfig.metricKey && isLowerBetter) {
            prMetrics[key] = Math.min(...values)
          } else {
            prMetrics[key] = Math.max(...values)
          }
        }
      }
      group.personalRecord = prMetrics
    }

    // Generate AI insights for each test
    const aiInsights: Map<string, any> = new Map()
    
    for (const [testName, group] of groupedTests) {
      try {
        const cardConfigs = getCardConfigs(testName)
        const primaryConfig = cardConfigs[0]
        const primaryValue = getMetricValue(group.latestMetrics, primaryConfig)
        const limbData = calculateLimbSymmetry(testName, group.latestMetrics)
        
        const insightResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-ai-coach-insight`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              testMetrics: {
                testName,
                testDate: group.latestDate,
                currentValue: primaryValue,
                metricType: primaryConfig.title,
                metricUnit: primaryConfig.unit,
                previousValues: group.previousValues.slice(0, 5).map(p => getMetricValue(p.metrics, primaryConfig)),
                baseline: group.baseline ? getMetricValue(group.baseline, primaryConfig) : null,
                personalRecord: group.personalRecord ? getMetricValue(group.personalRecord, primaryConfig) : null,
                leftLimb: limbData?.leftValue,
                rightLimb: limbData?.rightValue,
                asymmetryPercent: limbData?.asymmetryPercent,
              }
            })
          }
        )
        
        if (insightResponse.ok) {
          const { insight } = await insightResponse.json()
          aiInsights.set(testName, insight)
        }
      } catch (e) {
        console.error(`Failed to get insight for ${testName}:`, e)
        aiInsights.set(testName, {
          explanation: "Insight unavailable. Continue with your current training protocol.",
          recommendations: ["Maintain consistent training", "Focus on proper form"],
          keyCues: ["Quality over quantity"]
        })
      }
    }

    // Generate PDF with improved styling matching the HTML template
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Colors matching the HTML template
    const colors = {
      headerBg: [31, 41, 55],       // #1F2933
      primary: [30, 78, 216],       // #1D4ED8
      dark: [17, 24, 39],           // #111827
      text: [75, 85, 99],           // #4B5563
      lightText: [107, 114, 128],   // #6B7280
      muted: [156, 163, 175],       // #9CA3AF
      success: [5, 150, 105],       // #059669
      danger: [185, 28, 28],        // #B91C1C
      cardBg: [248, 250, 253],      // #F8FAFD
      sectionBg: [248, 250, 253],   // #F8FAFD
      border: [229, 231, 235],      // #E5E7EB
      coachBg: [239, 246, 255],     // #EFF6FF
      coachBorder: [191, 219, 254], // #BFDBFE
    }

    // Get date range
    const allDates = test_data.map((r: TestRecord) => new Date(r.test_date))
    const minDate = new Date(Math.min(...allDates.map((d: Date) => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map((d: Date) => d.getTime())))
    const dateRange = `${formatDate(minDate)} – ${formatDate(maxDate)}`

    let pageNumber = 0

    // Generate one page per test
    for (const [testName, group] of groupedTests) {
      if (pageNumber > 0) {
        doc.addPage()
      }
      pageNumber++

      const pageWidth = 210
      const marginLeft = 15
      const marginRight = 15
      const contentWidth = pageWidth - marginLeft - marginRight

      // ===== HEADER =====
      let yPos = 18
      
      // Title and meta on same line
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2])
      doc.text('FORCE PLATE PERFORMANCE REPORT', marginLeft, yPos)

      // Right-aligned meta info
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
      doc.text(dateRange, pageWidth - marginRight, yPos - 2, { align: 'right' })
      doc.text(`Latest Test: ${formatDate(new Date(group.latestDate))}`, pageWidth - marginRight, yPos + 4, { align: 'right' })

      // Athlete info
      yPos += 8
      doc.setFontSize(9)
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      doc.text(`${athlete_name}   |   ${team_name || 'N/A'}`, marginLeft, yPos)

      // Divider line
      yPos += 4
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
      doc.setLineWidth(0.3)
      doc.line(marginLeft, yPos, pageWidth - marginRight, yPos)

      // ===== TEST NAME SECTION =====
      yPos += 10
      doc.setFillColor(colors.sectionBg[0], colors.sectionBg[1], colors.sectionBg[2])
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
      doc.roundedRect(marginLeft, yPos, contentWidth, 18, 2, 2, 'FD')

      yPos += 8
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2])
      doc.text(testName.toUpperCase(), marginLeft + 6, yPos)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
      doc.text(`Latest Test: ${formatDate(new Date(group.latestDate))}`, pageWidth - marginRight - 6, yPos, { align: 'right' })

      yPos += 16

      // ===== TWO-COLUMN LAYOUT: Metrics + Summary =====
      const leftColWidth = 100
      const rightColWidth = 75
      const gap = 5

      // Left Column: Individual Scores
      const leftColX = marginLeft
      
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
      doc.roundedRect(leftColX, yPos, leftColWidth, 65, 2, 2, 'FD')

      let scoreY = yPos + 7
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
      doc.text('Individual Scores', leftColX + 5, scoreY)

      scoreY += 8

      // Metrics grid (2 columns inside card)
      const cardConfigs = getCardConfigs(testName)
      const metricsPerCol = 2
      const metricColWidth = 46

      cardConfigs.forEach((config, i) => {
        const col = i % metricsPerCol
        const row = Math.floor(i / metricsPerCol)
        const metricX = leftColX + 5 + col * metricColWidth
        const metricY = scoreY + row * 13

        // Metric label
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        doc.text(config.title, metricX, metricY)

        // Metric value
        const value = getMetricValue(group.latestMetrics, config)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.text(value !== null ? value.toFixed(2) : '-', metricX, metricY + 5)

        // Delta vs baseline
        if (group.baseline && value !== null) {
          const baselineValue = getMetricValue(group.baseline, config)
          if (baselineValue !== null && baselineValue !== 0) {
            const diff = value - baselineValue
            const diffPct = ((diff / baselineValue) * 100).toFixed(1)
            
            doc.setFontSize(7)
            if (diff > 0) {
              doc.setTextColor(colors.success[0], colors.success[1], colors.success[2])
              doc.text(`+${diffPct}% vs baseline`, metricX, metricY + 9)
            } else if (diff < 0) {
              doc.setTextColor(colors.danger[0], colors.danger[1], colors.danger[2])
              doc.text(`${diffPct}% vs baseline`, metricX, metricY + 9)
            }
          }
        }
      })

      // Right Column: Comparison Summary
      const rightColX = marginLeft + leftColWidth + gap
      const summaryY = yPos
      
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
      doc.roundedRect(rightColX, summaryY, rightColWidth, 65, 2, 2, 'FD')

      let sumY = summaryY + 7
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
      doc.text('Comparisons Amongst Previous Scores', rightColX + 5, sumY, { maxWidth: rightColWidth - 10 })

      sumY += 12

      // Primary metric comparison
      const primaryConfig = cardConfigs[0]
      const primaryValue = getMetricValue(group.latestMetrics, primaryConfig)
      const baselineValue = group.baseline ? getMetricValue(group.baseline, primaryConfig) : null
      const prValue = group.personalRecord ? getMetricValue(group.personalRecord, primaryConfig) : null

      // Summary rows
      const summaryRows = [
        { label: 'Latest', value: primaryValue },
        { label: 'Baseline', value: baselineValue },
        { label: 'Personal Record', value: prValue },
      ]

      summaryRows.forEach((row, i) => {
        const rowY = sumY + i * 9
        
        // Label (left-aligned)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        doc.text(row.label, rightColX + 5, rowY)

        // Value (right-aligned)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        const valueText = row.value !== null ? `${row.value.toFixed(2)} ${primaryConfig.unit}` : '-'
        doc.text(valueText, rightColX + rightColWidth - 5, rowY, { align: 'right' })
      })

      // Between-limb note in summary card
      sumY += 30
      const limbData = calculateLimbSymmetry(testName, group.latestMetrics)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      if (!limbData) {
        doc.text('Between-limb differences: L/R data not available for this test.', rightColX + 5, sumY, { maxWidth: rightColWidth - 10 })
      }

      yPos += 72

      // ===== HISTORICAL TREND CHART - Best Value Per Date =====
      // Determine if this metric is "lower is better" (contact time, GCT, etc.)
      const lowerIsBetterMetrics = [
        'contact_time', 'gct', 'ground_contact_time', 'avg_contact_time',
        'time_to_peak_force', 'time_to_takeoff', 'braking_time', 'propulsive_time'
      ]
      const isLowerBetter = lowerIsBetterMetrics.some(m => 
        primaryConfig.metricKey.toLowerCase().includes(m) || 
        primaryConfig.title.toLowerCase().includes('contact') ||
        primaryConfig.title.toLowerCase().includes('gct')
      )

      // Group test records by date (normalize to YYYY-MM-DD)
      const testsByDate: Record<string, TestRecord[]> = {}
      for (const record of group.records) {
        const dateOnly = record.test_date.split('T')[0]
        if (!testsByDate[dateOnly]) {
          testsByDate[dateOnly] = []
        }
        testsByDate[dateOnly].push(record)
      }

      // Calculate BEST value per date for the primary metric
      const trendData: { date: string; displayDate: string; bestValue: number }[] = []
      for (const [date, records] of Object.entries(testsByDate)) {
        const values = records
          .map(r => getMetricValue(r.metrics, primaryConfig))
          .filter((v): v is number => v !== null && v > 0)
        
        if (values.length > 0) {
          // Best = lowest for contact time metrics, highest for everything else
          const bestValue = isLowerBetter ? Math.min(...values) : Math.max(...values)
          trendData.push({
            date,
            displayDate: formatDate(new Date(date)),
            bestValue
          })
        }
      }

      // Sort by date ascending for chronological chart
      trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Draw trend chart if we have at least 1 data point (show single point too)
      if (trendData.length >= 1) {
        const chartHeight = 35
        const chartCardHeight = chartHeight + 18
        
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.roundedRect(marginLeft, yPos, contentWidth, chartCardHeight, 2, 2, 'FD')

        // Chart title
        let chartY = yPos + 7
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        const betterLabel = isLowerBetter ? 'lower is better' : 'higher is better'
        doc.text(`${primaryConfig.title} Trend (Best per Date - ${betterLabel})`, marginLeft + 6, chartY)

        chartY += 6

        // Chart area
        const chartX = marginLeft + 25
        const chartWidth = contentWidth - 35
        const chartAreaHeight = chartHeight - 5

        // Calculate value range
        const values = trendData.map(d => d.bestValue)
        const maxVal = Math.max(...values)
        const minVal = Math.min(...values)
        const range = maxVal - minVal || maxVal * 0.1 || 1 // Handle single value case

        // Draw Y-axis labels
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        doc.text(maxVal.toFixed(1), marginLeft + 5, chartY + 3)
        doc.text(minVal.toFixed(1), marginLeft + 5, chartY + chartAreaHeight)

        // Draw grid lines
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.setLineWidth(0.1)
        doc.line(chartX, chartY, chartX + chartWidth, chartY)
        doc.line(chartX, chartY + chartAreaHeight, chartX + chartWidth, chartY + chartAreaHeight)

        // Calculate points
        const points: { x: number; y: number; value: number; date: string }[] = trendData.map((d, i) => ({
          x: trendData.length === 1 
            ? chartX + chartWidth / 2 // Center single point
            : chartX + (i * (chartWidth / (trendData.length - 1))),
          y: range > 0 
            ? chartY + chartAreaHeight - ((d.bestValue - minVal) / range) * chartAreaHeight
            : chartY + chartAreaHeight / 2, // Center if no range
          value: d.bestValue,
          date: d.displayDate
        }))

        // Draw connecting line (only if more than 1 point)
        if (points.length > 1) {
          doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2])
          doc.setLineWidth(0.5)
          for (let i = 1; i < points.length; i++) {
            doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y)
          }
        }

        // Draw points
        points.forEach((pt, i) => {
          // Highlight latest point (or single point)
          if (i === points.length - 1) {
            doc.setFillColor(colors.success[0], colors.success[1], colors.success[2])
            doc.circle(pt.x, pt.y, 2.5, 'F')
            // Add value label for single point
            if (trendData.length === 1) {
              doc.setFontSize(8)
              doc.setFont('helvetica', 'bold')
              doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
              doc.text(`${pt.value.toFixed(2)} ${primaryConfig.unit}`, pt.x, pt.y - 5, { align: 'center' })
            }
          } else {
            doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
            doc.circle(pt.x, pt.y, 1.5, 'F')
          }
        })

        // Draw X-axis date labels
        doc.setFontSize(5)
        doc.setTextColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        if (points.length === 1) {
          doc.text(points[0].date, points[0].x, chartY + chartAreaHeight + 4, { align: 'center' })
        } else if (points.length >= 3) {
          doc.text(points[0].date, points[0].x, chartY + chartAreaHeight + 4, { align: 'center' })
          const midIndex = Math.floor(points.length / 2)
          doc.text(points[midIndex].date, points[midIndex].x, chartY + chartAreaHeight + 4, { align: 'center' })
          doc.text(points[points.length - 1].date, points[points.length - 1].x, chartY + chartAreaHeight + 4, { align: 'center' })
        } else {
          points.forEach(pt => {
            doc.text(pt.date, pt.x, chartY + chartAreaHeight + 4, { align: 'center' })
          })
        }

        yPos += chartCardHeight + 5
      }

      // ===== BETWEEN-LIMB DIFFERENCES SECTION =====
      if (limbData) {
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2])
        doc.roundedRect(marginLeft, yPos, contentWidth, 40, 2, 2, 'FD')

        let limbY = yPos + 8
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.text('Between-Limb Differences', marginLeft + 6, limbY)

        limbY += 12

        // Symmetry bar
        const barWidth = 120
        const barX = marginLeft + 35
        const barHeight = 8

        const total = limbData.leftValue + limbData.rightValue
        const leftPct = (limbData.leftValue / total) * 100
        const rightPct = (limbData.rightValue / total) * 100

        // Left side (primary color)
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
        doc.rect(barX, limbY, (leftPct / 100) * barWidth, barHeight, 'F')

        // Right side (gray)
        doc.setFillColor(colors.lightText[0], colors.lightText[1], colors.lightText[2])
        doc.rect(barX + (leftPct / 100) * barWidth, limbY, (rightPct / 100) * barWidth, barHeight, 'F')

        // Left label
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.text('LEFT', marginLeft + 8, limbY + 3)
        doc.setFontSize(9)
        doc.text(limbData.leftValue.toFixed(1), marginLeft + 8, limbY + 9)

        // Right label
        doc.text('RIGHT', pageWidth - marginRight - 22, limbY + 3)
        doc.setFontSize(9)
        doc.text(limbData.rightValue.toFixed(1), pageWidth - marginRight - 22, limbY + 9)

        // Asymmetry indicator
        limbY += 18
        const asymColor = limbData.asymmetryPercent > 15 ? colors.danger : 
                         limbData.asymmetryPercent > 10 ? [234, 179, 8] : colors.success
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(asymColor[0], asymColor[1], asymColor[2])
        doc.text(`Asymmetry: ${limbData.asymmetryPercent.toFixed(1)}%`, barX + barWidth / 2, limbY, { align: 'center' })

        // Formula note
        doc.setFontSize(6)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
        doc.text('Formula: |Left - Right| / Max(Left, Right) × 100', marginLeft + 8, limbY + 6)

        yPos += 45
      }

      // ===== REPORT INSIGHTS SECTION =====
      const insight = aiInsights.get(testName)
      
      // Calculate available space - ensure we don't overflow the page
      const pageHeight = 297 // A4 height in mm
      const bottomMargin = 18 // Space for footer + buffer
      const maxYForContent = pageHeight - bottomMargin
      const availableSpace = maxYForContent - yPos
      
      // Dynamically size the insight card based on available space
      // Minimum 55mm, maximum 70mm, or whatever fits
      const idealCardHeight = 65
      const insightCardHeight = Math.min(idealCardHeight, Math.max(45, availableSpace - 10))

      // Insight header bar
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2])
      doc.roundedRect(marginLeft, yPos, contentWidth, 8, 2, 2, 'F')
      
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text('Report Insights', marginLeft + 6, yPos + 5.5)

      yPos += 10

      // Insight content card
      doc.setFillColor(colors.coachBg[0], colors.coachBg[1], colors.coachBg[2])
      doc.setDrawColor(colors.coachBorder[0], colors.coachBorder[1], colors.coachBorder[2])
      doc.roundedRect(marginLeft, yPos, contentWidth, insightCardHeight, 2, 2, 'FD')

      if (insight) {
        let insightY = yPos + 6

        // What this means
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.text('What this means', marginLeft + 6, insightY)

        insightY += 4
        doc.setFontSize(7.5)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
        const explanationLines = doc.splitTextToSize(insight.explanation || '', contentWidth - 14)
        doc.text(explanationLines.slice(0, 3), marginLeft + 6, insightY)

        insightY += Math.min(explanationLines.length, 3) * 3.5 + 5

        // Training Recommendations
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
        doc.text('Training Recommendations', marginLeft + 6, insightY)

        insightY += 4
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        
        const recommendations = insight.recommendations || []
        const maxRecs = insightCardHeight < 55 ? 2 : 4 // Show fewer recs if space is tight
        recommendations.slice(0, maxRecs).forEach((rec: string, i: number) => {
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
          const recText = `${i + 1}. ${rec}`
          const recLines = doc.splitTextToSize(recText, contentWidth - 14)
          doc.text(recLines[0], marginLeft + 6, insightY)
          insightY += 3.5
        })

        // Coaching Cues (inline) - only if we have space
        if (insight.keyCues && insight.keyCues.length > 0 && insightY < yPos + insightCardHeight - 8) {
          insightY += 2
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2])
          doc.text('Coaching Cues', marginLeft + 6, insightY)

          insightY += 3.5
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(colors.text[0], colors.text[1], colors.text[2])
          const cuesText = insight.keyCues.slice(0, 2).join('   •   ')
          doc.text(cuesText, marginLeft + 6, insightY, { maxWidth: contentWidth - 14 })
        }
      }

      // ===== PAGE FOOTER =====
      doc.setFontSize(8)
      doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2])
      doc.text(`Page ${pageNumber} of ${groupedTests.size}`, pageWidth - marginRight, pageHeight - 10, { align: 'right' })
    }

    // Generate filename - remove all special characters including en-dash
    const safeName = athlete_name.replace(/[^a-zA-Z0-9]/g, '_')
    const safeRange = dateRange.replace(/[^a-zA-Z0-9]/g, '_').replace(/__+/g, '_')
    const fileName = `${safeName}_${safeRange}_ForcePlateReport.pdf`

    // Convert to buffer and upload
    const pdfBuffer = doc.output('arraybuffer')

    const { error: uploadError } = await supabaseClient.storage
      .from('athlete-reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    const { data: urlData } = supabaseClient.storage
      .from('athlete-reports')
      .getPublicUrl(fileName)

    console.log('Force plate PDF generated successfully:', urlData.publicUrl)

    return new Response(
      JSON.stringify({
        success: true,
        report_url: urlData.publicUrl,
        filename: fileName,
        athlete_name,
        athlete_id,
        test_count: groupedTests.size,
        tests: Array.from(groupedTests.keys()),
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch (error) {
    console.error('Error generating force plate PDF:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

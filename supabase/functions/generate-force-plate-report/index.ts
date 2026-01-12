import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestMetrics {
  [key: string]: number | string | undefined;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
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

    // Process each test group
    for (const [testName, group] of groupedTests) {
      // Sort by date descending
      group.records.sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())
      
      // Latest record
      const latest = group.records[0]
      group.latestDate = latest.test_date
      group.latestMetrics = latest.metrics
      
      // Previous values (last 10 excluding latest)
      group.previousValues = group.records.slice(1, 11).map(r => ({
        date: r.test_date,
        metrics: r.metrics
      }))
      
      // Baseline (average of first 3 sessions or 28-day average)
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
      
      // Personal Record (max for each metric)
      const prMetrics: TestMetrics = {}
      const metricKeys = Object.keys(group.records[0]?.metrics || {})
      for (const key of metricKeys) {
        const values = group.records.map(r => r.metrics[key]).filter(v => typeof v === 'number') as number[]
        if (values.length > 0) {
          prMetrics[key] = Math.max(...values)
        }
      }
      group.personalRecord = prMetrics
    }

    // Generate AI insights for each test
    const aiInsights: Map<string, any> = new Map()
    
    for (const [testName, group] of groupedTests) {
      try {
        // Get primary metric for the test
        const primaryMetric = getPrimaryMetric(testName, group.latestMetrics)
        const limbData = getLimbData(group.latestMetrics)
        
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
                currentValue: primaryMetric.value,
                metricType: primaryMetric.name,
                metricUnit: primaryMetric.unit,
                previousValues: group.previousValues.slice(0, 5).map(p => p.metrics[primaryMetric.key]),
                baseline: group.baseline?.[primaryMetric.key],
                personalRecord: group.personalRecord?.[primaryMetric.key],
                ...limbData,
              }
            })
          }
        )
        
        if (insightResponse.ok) {
          const { insight } = await insightResponse.json()
          aiInsights.set(testName, insight)
        }
      } catch (e) {
        console.error(`Failed to get AI insight for ${testName}:`, e)
        aiInsights.set(testName, {
          explanation: "AI insight unavailable. Continue with your current training protocol.",
          recommendations: ["Maintain consistent training", "Focus on proper form"],
          keyCues: ["Quality over quantity"],
          weeklyProgression: null
        })
      }
    }

    // Generate PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Colors
    const primaryColor = [30, 64, 175] // Blue
    const darkColor = [15, 23, 42] // Slate 900
    const textColor = [51, 65, 85] // Slate 700
    const lightTextColor = [100, 116, 139] // Slate 500
    const successColor = [22, 163, 74] // Green
    const warningColor = [234, 179, 8] // Yellow
    const dangerColor = [220, 38, 38] // Red
    const bgColor = [248, 250, 252] // Slate 50

    // Get date range
    const allDates = test_data.map((r: TestRecord) => new Date(r.test_date))
    const minDate = new Date(Math.min(...allDates.map((d: Date) => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map((d: Date) => d.getTime())))
    const dateRange = `${formatDate(minDate)} - ${formatDate(maxDate)}`

    let pageNumber = 0

    // Generate one page per test
    for (const [testName, group] of groupedTests) {
      if (pageNumber > 0) {
        doc.addPage()
      }
      pageNumber++

      let yPos = 15

      // Header
      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2])
      doc.rect(0, 0, 210, 35, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('FORCE PLATE PERFORMANCE REPORT', 15, 15)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`${athlete_name}  |  ${team_name || 'N/A'}  |  ${dateRange}`, 15, 25)

      // Test Name Section
      yPos = 45

      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.rect(15, yPos, 180, 12, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(testName.toUpperCase(), 20, yPos + 8)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Latest Test: ${formatDate(new Date(group.latestDate))}`, 150, yPos + 8)

      yPos += 20

      // Individual Scores Section
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('INDIVIDUAL SCORES', 15, yPos)

      yPos += 8

      // Metrics grid
      const metrics = group.latestMetrics
      const metricKeys = Object.keys(metrics).filter(k => typeof metrics[k] === 'number')
      const gridCols = 3
      const colWidth = 58
      const cellHeight = 18

      metricKeys.slice(0, 9).forEach((key, index) => {
        const col = index % gridCols
        const row = Math.floor(index / gridCols)
        const x = 15 + col * colWidth
        const y = yPos + row * cellHeight

        // Cell background
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
        doc.roundedRect(x, y, colWidth - 3, cellHeight - 2, 2, 2, 'F')

        // Metric name
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2])
        doc.text(formatMetricName(key), x + 3, y + 5)

        // Metric value
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
        const value = metrics[key]
        doc.text(typeof value === 'number' ? value.toFixed(2) : String(value || '-'), x + 3, y + 12)

        // Comparison to baseline/PR
        if (group.baseline && group.baseline[key] !== undefined) {
          const baselineVal = group.baseline[key] as number
          const currentVal = value as number
          const diff = currentVal - baselineVal
          const diffPct = ((diff / baselineVal) * 100).toFixed(1)
          
          doc.setFontSize(6)
          if (diff > 0) {
            doc.setTextColor(successColor[0], successColor[1], successColor[2])
            doc.text(`↑${diffPct}% vs baseline`, x + 30, y + 12)
          } else if (diff < 0) {
            doc.setTextColor(dangerColor[0], dangerColor[1], dangerColor[2])
            doc.text(`↓${Math.abs(parseFloat(diffPct))}% vs baseline`, x + 30, y + 12)
          }
        }
      })

      yPos += Math.ceil(Math.min(metricKeys.length, 9) / gridCols) * cellHeight + 10

      // Historical Comparison Section
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('COMPARISONS AMONGST PREVIOUS SCORES', 15, yPos)

      yPos += 8

      // Draw trend chart
      const primaryMetric = getPrimaryMetric(testName, metrics)
      const chartData = [
        { date: group.latestDate, value: primaryMetric.value },
        ...group.previousValues.slice(0, 5).map(p => ({
          date: p.date,
          value: p.metrics[primaryMetric.key] as number
        }))
      ].reverse().filter(d => typeof d.value === 'number')

      if (chartData.length > 1) {
        const chartX = 15
        const chartY = yPos
        const chartWidth = 85
        const chartHeight = 40

        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
        doc.roundedRect(chartX, chartY, chartWidth, chartHeight, 2, 2, 'F')

        const values = chartData.map(d => d.value)
        const maxVal = Math.max(...values)
        const minVal = Math.min(...values)
        const range = maxVal - minVal || 1

        // Draw line chart
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.setLineWidth(0.5)

        const points: [number, number][] = chartData.map((d, i) => [
          chartX + 8 + (i * ((chartWidth - 16) / (chartData.length - 1))),
          chartY + chartHeight - 8 - ((d.value - minVal) / range) * (chartHeight - 16)
        ])

        for (let i = 1; i < points.length; i++) {
          doc.line(points[i-1][0], points[i-1][1], points[i][0], points[i][1])
        }

        // Draw points
        points.forEach(([px, py]) => {
          doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
          doc.circle(px, py, 1.5, 'F')
        })

        // Labels
        doc.setFontSize(6)
        doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2])
        doc.text(primaryMetric.name, chartX + 3, chartY + 6)
      }

      // Baseline vs PR comparison
      const comparisonX = 105
      doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
      doc.roundedRect(comparisonX, yPos, 90, 40, 2, 2, 'F')

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
      doc.text('COMPARISON SUMMARY', comparisonX + 5, yPos + 8)

      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(textColor[0], textColor[1], textColor[2])

      doc.text(`Latest: ${primaryMetric.value?.toFixed(2) || '-'} ${primaryMetric.unit}`, comparisonX + 5, yPos + 16)
      doc.text(`Baseline: ${group.baseline?.[primaryMetric.key]?.toFixed(2) || '-'} ${primaryMetric.unit}`, comparisonX + 5, yPos + 23)
      doc.text(`Personal Record: ${group.personalRecord?.[primaryMetric.key]?.toFixed(2) || '-'} ${primaryMetric.unit}`, comparisonX + 5, yPos + 30)

      yPos += 48

      // Between Limb Comparisons Section
      const limbData = getLimbData(metrics)

      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('BETWEEN-LIMB DIFFERENCES', 15, yPos)

      yPos += 8

      if (limbData.leftLimb !== undefined && limbData.rightLimb !== undefined) {
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
        doc.roundedRect(15, yPos, 180, 35, 2, 2, 'F')

        // Symmetry bar
        const barWidth = 120
        const barX = 45
        const barY = yPos + 12
        const barHeight = 8

        const total = limbData.leftLimb + limbData.rightLimb
        const leftPct = (limbData.leftLimb / total) * 100
        const rightPct = (limbData.rightLimb / total) * 100

        // Left side
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.rect(barX, barY, (leftPct / 100) * barWidth, barHeight, 'F')

        // Right side
        doc.setFillColor(100, 116, 139)
        doc.rect(barX + (leftPct / 100) * barWidth, barY, (rightPct / 100) * barWidth, barHeight, 'F')

        // Labels
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
        doc.text('LEFT', 20, barY + 5)
        doc.text(`${limbData.leftLimb.toFixed(1)}`, 20, barY + 11)

        doc.text('RIGHT', 170, barY + 5)
        doc.text(`${limbData.rightLimb.toFixed(1)}`, 170, barY + 11)

        // Asymmetry calculation
        const asymmetry = limbData.asymmetryPercent || Math.abs(limbData.leftLimb - limbData.rightLimb) / Math.max(limbData.leftLimb, limbData.rightLimb) * 100

        doc.setFontSize(9)
        const asymColor = asymmetry > 15 ? dangerColor : asymmetry > 10 ? warningColor : successColor
        doc.setTextColor(asymColor[0], asymColor[1], asymColor[2])
        doc.text(`Asymmetry: ${asymmetry.toFixed(1)}%`, barX + barWidth / 2 - 15, yPos + 30)

        doc.setFontSize(6)
        doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2])
        doc.text('Formula: |Left - Right| / Max(Left, Right) × 100', 15, yPos + 33)

        yPos += 40
      } else {
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2])
        doc.roundedRect(15, yPos, 180, 15, 2, 2, 'F')

        doc.setFontSize(9)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2])
        doc.text('L/R data not available for this test', 20, yPos + 10)

        yPos += 20
      }

      // AI Coach Insight Section
      const insight = aiInsights.get(testName)

      doc.setFillColor(30, 58, 138) // Dark blue
      doc.roundedRect(15, yPos, 180, 8, 2, 2, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('🤖 AI COACH INSIGHT', 20, yPos + 6)

      yPos += 12

      doc.setFillColor(239, 246, 255) // Light blue
      doc.roundedRect(15, yPos, 180, 70, 2, 2, 'F')

      if (insight) {
        // Explanation
        doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('What this means:', 20, yPos + 8)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        const explanationLines = doc.splitTextToSize(insight.explanation || '', 165)
        doc.text(explanationLines.slice(0, 3), 20, yPos + 14)

        // Recommendations
        let recY = yPos + 26
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('Training Recommendations:', 20, recY)

        recY += 5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        
        const recommendations = insight.recommendations || []
        recommendations.slice(0, 4).forEach((rec: string, i: number) => {
          const recLines = doc.splitTextToSize(`${i + 1}. ${rec}`, 165)
          doc.text(recLines[0], 20, recY)
          recY += 5
        })

        // Key Cues
        if (insight.keyCues && insight.keyCues.length > 0) {
          recY += 2
          doc.setFontSize(8)
          doc.setFont('helvetica', 'bold')
          doc.text('Key Cues:', 20, recY)

          recY += 5
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
          doc.text(insight.keyCues.slice(0, 2).join('  •  '), 20, recY)
        }

        // Weekly Progression
        if (insight.weeklyProgression) {
          recY += 6
          doc.setFontSize(7)
          doc.setFont('helvetica', 'italic')
          doc.setTextColor(textColor[0], textColor[1], textColor[2])
          const progLines = doc.splitTextToSize(`💡 ${insight.weeklyProgression}`, 165)
          doc.text(progLines[0], 20, recY)
        }
      }

      // Page number
      doc.setFontSize(8)
      doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2])
      doc.text(`Page ${pageNumber} of ${groupedTests.size}`, 180, 290)
    }

    // Generate filename
    const safeName = athlete_name.replace(/[^a-zA-Z0-9]/g, '_')
    const safeRange = dateRange.replace(/[^a-zA-Z0-9]/g, '_')
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

function formatMetricName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

function getPrimaryMetric(testName: string, metrics: TestMetrics): { key: string; name: string; value: number; unit: string } {
  const testLower = testName.toLowerCase()
  
  // Define primary metrics for each test type
  const primaryMetrics: Record<string, { keys: string[]; name: string; unit: string }> = {
    'cmj': { keys: ['jump_height_ft', 'jump_height', 'jumpHeight'], name: 'Jump Height', unit: 'ft' },
    'countermovement': { keys: ['jump_height_ft', 'jump_height', 'jumpHeight'], name: 'Jump Height', unit: 'ft' },
    'squat': { keys: ['jump_height_ft', 'jump_height', 'jumpHeight'], name: 'Jump Height', unit: 'ft' },
    'drop': { keys: ['rsi', 'reactive_strength_index', 'reactiveStrengthIndex'], name: 'RSI', unit: '' },
    'pogo': { keys: ['avg_rsi', 'rsi', 'avgRsi'], name: 'RSI', unit: '' },
    'imtp': { keys: ['force_peak', 'peak_force', 'forcePeak'], name: 'Peak Force', unit: 'N' },
    'isometric': { keys: ['force_peak', 'peak_force', 'forcePeak'], name: 'Peak Force', unit: 'N' },
  }

  for (const [key, config] of Object.entries(primaryMetrics)) {
    if (testLower.includes(key)) {
      for (const metricKey of config.keys) {
        if (metrics[metricKey] !== undefined && typeof metrics[metricKey] === 'number') {
          return { key: metricKey, name: config.name, value: metrics[metricKey] as number, unit: config.unit }
        }
      }
    }
  }

  // Fallback to first numeric metric
  const firstKey = Object.keys(metrics).find(k => typeof metrics[k] === 'number')
  return {
    key: firstKey || 'value',
    name: firstKey ? formatMetricName(firstKey) : 'Value',
    value: (firstKey ? metrics[firstKey] : 0) as number,
    unit: ''
  }
}

function getLimbData(metrics: TestMetrics): { leftLimb?: number; rightLimb?: number; asymmetryPercent?: number } {
  const leftKeys = ['left_limb_force', 'leftLimbForce', 'left_force', 'left_peak_force', 'avg_left_force']
  const rightKeys = ['right_limb_force', 'rightLimbForce', 'right_force', 'right_peak_force', 'avg_right_force']
  const asymKeys = ['asymmetry_index', 'asymmetryIndex', 'limb_asymmetry', 'asymmetry']

  let leftLimb: number | undefined
  let rightLimb: number | undefined
  let asymmetryPercent: number | undefined

  for (const key of leftKeys) {
    if (typeof metrics[key] === 'number') {
      leftLimb = metrics[key] as number
      break
    }
  }

  for (const key of rightKeys) {
    if (typeof metrics[key] === 'number') {
      rightLimb = metrics[key] as number
      break
    }
  }

  for (const key of asymKeys) {
    if (typeof metrics[key] === 'number') {
      asymmetryPercent = metrics[key] as number
      break
    }
  }

  return { leftLimb, rightLimb, asymmetryPercent }
}

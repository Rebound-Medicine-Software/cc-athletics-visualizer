import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import PDFDocument from 'https://esm.sh/pdfkit@0.13.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    console.log('Generating interactive PDF report...')

    // Sample athlete data
    const athleteData = {
      name: "Joshua Richards-Fisher",
      team: "Evolve Physiotherapy",
      sport: "Football",
      position: "Midfielder",
      age: 24,
      weight: 75,
      height: 180,
      testDate: "2025-09-18"
    }

    const testResults = [
      {
        testName: "Countermovement Jump",
        metrics: [
          { name: "Jump Height", value: "42.5 cm", percentile: 85 },
          { name: "Peak Power", value: "3200 W", percentile: 78 },
          { name: "Relative Peak Power", value: "42.7 W/kg", percentile: 82 },
          { name: "Force at Zero Velocity", value: "1850 N", percentile: 87 },
          { name: "Rate of Force Development", value: "8500 N/s", percentile: 91 }
        ]
      },
      {
        testName: "IMTP (Isometric Mid-Thigh Pull)",
        metrics: [
          { name: "Peak Force", value: "2800 N", percentile: 72 },
          { name: "Relative Peak Force", value: "37.3 N/kg", percentile: 74 },
          { name: "Time to Peak Force", value: "285 ms", percentile: 65 },
          { name: "Impulse 200ms", value: "420 N·s", percentile: 97 }
        ]
      }
    ]

    // Create PDF document
    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    })

    // Store PDF content in memory
    const chunks: Uint8Array[] = []
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))
    
    let pdfBuffer: Uint8Array
    const pdfPromise = new Promise<void>((resolve) => {
      doc.on('end', () => {
        pdfBuffer = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          pdfBuffer.set(chunk, offset)
          offset += chunk.length
        }
        resolve()
      })
    })

    // Header with gradient background
    doc.rect(0, 0, 612, 120).fillColor('#667eea').fill()
    doc.fillColor('white')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('Interactive Performance Report', 50, 35, { align: 'center' })
       .fontSize(12)
       .font('Helvetica')
       .text(`Generated on ${athleteData.testDate}`, 50, 65, { align: 'center' })

    // Reset Y position
    let currentY = 140

    // Athlete Information Section
    doc.fillColor('#2d3748')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Athlete Profile', 50, currentY)

    currentY += 30

    // Interactive dropdown for comparison type
    doc.rect(400, currentY - 5, 120, 20)
       .strokeColor('#cbd5e0')
       .stroke()

    // Create interactive dropdown field
    const comparisonField = doc.formField('comparison_type', {
      type: 'choice',
      rect: [400, currentY - 5, 520, currentY + 15],
      options: [
        { value: 'elite', label: 'Elite Athletes' },
        { value: 'sport', label: 'Sport Specific' },
        { value: 'position', label: 'Position Specific' },
        { value: 'age', label: 'Age Group' },
        { value: 'team', label: 'Team Average' }
      ],
      defaultValue: 'elite'
    })

    doc.fillColor('#4a5568')
       .fontSize(10)
       .text('Compare with:', 320, currentY, { width: 75 })

    // Athlete details
    const athleteInfo = [
      ['Name:', athleteData.name],
      ['Team:', athleteData.team],
      ['Sport:', athleteData.sport],
      ['Position:', athleteData.position],
      ['Age:', `${athleteData.age} years`],
      ['Weight:', `${athleteData.weight} kg`],
      ['Height:', `${athleteData.height} cm`]
    ]

    currentY += 25
    athleteInfo.forEach(([label, value], index) => {
      const row = Math.floor(index / 2)
      const col = index % 2
      const x = 50 + (col * 250)
      const y = currentY + (row * 20)
      
      doc.fillColor('#4a5568')
         .fontSize(10)
         .font('Helvetica-Bold')
         .text(label, x, y, { width: 80 })
         .fillColor('#2d3748')
         .font('Helvetica')
         .text(value, x + 85, y, { width: 150 })
    })

    currentY += 100

    // Time Period Filter
    doc.rect(50, currentY, 120, 20)
       .strokeColor('#cbd5e0')
       .stroke()

    const timePeriodField = doc.formField('time_period', {
      type: 'choice',
      rect: [50, currentY, 170, currentY + 20],
      options: [
        { value: 'latest', label: 'Latest Test' },
        { value: '3months', label: 'Last 3 Months' },
        { value: '6months', label: 'Last 6 Months' },
        { value: '1year', label: 'Last Year' },
        { value: 'all', label: 'All Time' }
      ],
      defaultValue: 'latest'
    })

    doc.fillColor('#4a5568')
       .fontSize(10)
       .text('Time Period:', 50, currentY - 15)

    // View Type Filter
    doc.rect(200, currentY, 120, 20)
       .strokeColor('#cbd5e0')
       .stroke()

    const viewTypeField = doc.formField('view_type', {
      type: 'choice',
      rect: [200, currentY, 320, currentY + 20],
      options: [
        { value: 'detailed', label: 'Detailed Metrics' },
        { value: 'summary', label: 'Summary Only' },
        { value: 'trends', label: 'Trend Analysis' },
        { value: 'comparison', label: 'Side by Side' }
      ],
      defaultValue: 'detailed'
    })

    doc.fillColor('#4a5568')
       .fontSize(10)
       .text('View Type:', 200, currentY - 15)

    currentY += 40

    // Test Results Sections
    testResults.forEach((test, testIndex) => {
      // Test header
      doc.rect(50, currentY, 512, 25)
         .fillColor('#4a5568')
         .fill()
         .fillColor('white')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(test.testName, 60, currentY + 8)

      // Test-specific comparison dropdown
      const testComparisonY = currentY + 3
      doc.rect(400, testComparisonY, 100, 18)
         .strokeColor('white')
         .fillColor('white')
         .fill()
         .stroke()

      const testComparisonField = doc.formField(`test_comparison_${testIndex}`, {
        type: 'choice',
        rect: [400, testComparisonY, 500, testComparisonY + 18],
        options: [
          { value: 'percentile', label: 'Percentile View' },
          { value: 'raw', label: 'Raw Values' },
          { value: 'normalized', label: 'Normalized' },
          { value: 'progression', label: 'Progression' }
        ],
        defaultValue: 'percentile'
      })

      currentY += 35

      // Metrics grid
      test.metrics.forEach((metric, metricIndex) => {
        const row = Math.floor(metricIndex / 2)
        const col = metricIndex % 2
        const x = 60 + (col * 240)
        const y = currentY + (row * 50)

        // Metric card background
        doc.rect(x, y, 220, 45)
           .fillColor('#f7fafc')
           .fill()
           .strokeColor('#e2e8f0')
           .stroke()

        // Metric details
        doc.fillColor('#2d3748')
           .fontSize(10)
           .font('Helvetica-Bold')
           .text(metric.name, x + 10, y + 8)
           .fillColor('#48bb78')
           .fontSize(16)
           .text(metric.value, x + 10, y + 20)
           .fillColor('#718096')
           .fontSize(8)
           .text(`${metric.percentile}th percentile`, x + 10, y + 35)

        // Percentile bar
        const barWidth = (metric.percentile / 100) * 180
        doc.rect(x + 10, y + 38, 180, 4)
           .fillColor('#e2e8f0')
           .fill()
           .rect(x + 10, y + 38, barWidth, 4)
           .fillColor('#48bb78')
           .fill()
      })

      currentY += Math.ceil(test.metrics.length / 2) * 50 + 20

      // Add chart placeholder
      doc.rect(60, currentY, 480, 80)
         .fillColor('#f7fafc')
         .fill()
         .strokeColor('#cbd5e0')
         .stroke()
         .fillColor('#718096')
         .fontSize(12)
         .text('📊 Interactive Chart Placeholder', 60, currentY + 25, { align: 'center', width: 480 })
         .fontSize(10)
         .text('Force-Time curve with zoom and filter capabilities', 60, currentY + 45, { align: 'center', width: 480 })

      currentY += 100
    })

    // Add new page if needed
    if (currentY > 700) {
      doc.addPage()
      currentY = 50
    }

    // Recommendations Section
    doc.fillColor('#c53030')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Training Recommendations', 50, currentY)

    currentY += 25

    const recommendations = [
      'Focus on explosive power development through plyometric exercises',
      'Improve rate of force development with rapid isometric contractions',
      'Consider bilateral symmetry training for left-right balance',
      'Monitor fatigue levels during high-intensity sessions'
    ]

    recommendations.forEach((rec, index) => {
      doc.fillColor('#2d3748')
         .fontSize(10)
         .font('Helvetica')
         .text(`→ ${rec}`, 60, currentY + (index * 20), { width: 500 })
    })

    // Comments section with text field
    currentY += recommendations.length * 20 + 30
    
    doc.fillColor('#2d3748')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('Additional Comments:', 50, currentY)

    currentY += 20

    // Interactive text field for comments
    doc.rect(50, currentY, 500, 60)
       .strokeColor('#cbd5e0')
       .stroke()

    const commentsField = doc.formField('comments', {
      type: 'text',
      rect: [50, currentY, 550, currentY + 60],
      multiline: true,
      value: 'Enter your notes here...'
    })

    // Rating checkboxes
    currentY += 80
    
    doc.fillColor('#2d3748')
       .fontSize(12)
       .font('Helvetica-Bold')
       .text('Overall Performance Rating:', 50, currentY)

    const ratings = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
    ratings.forEach((rating, index) => {
      const x = 60 + (index * 100)
      const y = currentY + 20
      
      // Checkbox
      doc.rect(x, y, 12, 12)
         .strokeColor('#cbd5e0')
         .stroke()
      
      const ratingField = doc.formField(`rating_${index}`, {
        type: 'check',
        rect: [x, y, x + 12, y + 12],
        value: index === 2 // Default to "Good"
      })
      
      doc.fillColor('#2d3748')
         .fontSize(9)
         .text(rating, x + 18, y + 2)
    })

    // Finalize the document
    doc.end()
    await pdfPromise

    console.log('PDF generated successfully, uploading to storage...')

    // Upload to Supabase Storage
    const fileName = `interactive-report-${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('athlete-reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    // Get public URL
    const { data: urlData } = supabaseClient.storage
      .from('athlete-reports')
      .getPublicUrl(fileName)

    console.log('Interactive PDF uploaded successfully:', urlData.publicUrl)

    return new Response(
      JSON.stringify({
        success: true,
        report_url: urlData.publicUrl,
        filename: fileName,
        athlete_name: athleteData.name,
        test_count: testResults.length
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  } catch (error) {
    console.error('Error generating interactive PDF:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})
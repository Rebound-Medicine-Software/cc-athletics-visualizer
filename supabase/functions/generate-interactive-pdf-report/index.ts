import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1'

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

    // Step 1 - Data Models (Athlete and TestResults)
    const athleteData = {
      name: "Joshua Richards-Fisher",
      team: "Llanelli Town Academy AFC",
      email: "joshua.richards@example.com",
      testingDates: "01/01/2025 - 01/09/2025"
    }

    const testResults = [
      {
        testName: "Countermovement Jump",
        athlete_id: "sample-athlete-id",
        test_name: "cmj",
        metrics: {
          jumpHeight: 45.2,
          peakPower: 3200,
          relativePeakPower: 42.7,
          contactTime: 0.65,
          leftLimbForce: 2236.81,
          rightLimbForce: 1674.56,
          asymmetryIndex: 57.9,
          reactiveStrengthIndex: 0.69
        }
      },
      {
        testName: "Squat Jump",
        athlete_id: "sample-athlete-id", 
        test_name: "squat_jump",
        metrics: {
          jumpHeight: 42.8,
          peakPower: 3050,
          relativePeakPower: 40.3,
          contactTime: 0.58
        }
      },
      {
        testName: "Drop Jump",
        athlete_id: "sample-athlete-id",
        test_name: "drop_jump", 
        metrics: {
          jumpHeight: 38.5,
          peakPower: 2890,
          relativePeakPower: 38.1,
          contactTime: 0.72,
          reactiveStrengthIndex: 0.53
        }
      },
      {
        testName: "Pogo Jump",
        athlete_id: "sample-athlete-id",
        test_name: "pogo_jump",
        metrics: {
          jumpHeight: 25.3,
          peakPower: 2650,
          relativePeakPower: 34.9,
          contactTime: 0.35,
          frequency: 2.85
        }
      }
    ]

    // Sample peer comparison data
    const peerData = [
      { name: "Athlete A", value: 0.82 },
      { name: "Athlete B", value: 0.79 },
      { name: "Athlete C", value: 0.75 },
      { name: "Athlete D", value: 0.73 },
      { name: "Current", value: 0.69 }
    ]

    // Individual scores timeline data
    const timelineData = [
      { date: "Dec 2024", score: 42.1 },
      { date: "Jan 2025", score: 44.3 },
      { date: "Feb 2025", score: 45.2 },
      { date: "Mar 2025", score: 45.8 },
      { date: "Apr 2025", score: 45.2 }
    ]

    // Step 3 - Recommendation Engine
    const generateRecommendation = (test_name: string, metrics: any): string => {
      switch(test_name) {
        case 'cmj':
          if (metrics.jumpHeight < 30) return "Focus on concentric strength training with squats and deadlifts to improve jump height"
          if (metrics.contactTime > 0.3) return "Reduce contact time with reactive plyometrics and bounce drills"
          if (metrics.asymmetryIndex > 15) return "Address limb asymmetry with unilateral strength and stability exercises"
          return "Maintain current training protocol - performance within optimal ranges"
        
        case 'drop_jump':
          if (metrics.contactTime > 0.3) return "Reduce contact time with reactive plyometrics and fast SSC exercises"
          if (metrics.reactiveStrengthIndex < 0.5) return "Improve reactive strength with depth jumps and drop jumps"
          return "Continue reactive training with varied jump protocols"
        
        case 'squat_jump':
          if (metrics.jumpHeight < 35) return "Focus on maximal strength development in squats and Olympic lifts"
          if (metrics.peakPower < 2500) return "Incorporate explosive power training with jump squats and plyometrics"
          return "Maintain strength levels with consistent resistance training"
        
        case 'pogo_jump':
          if (metrics.frequency < 2.5) return "Improve stretch-shortening cycle with high-frequency bouncing exercises"
          if (metrics.contactTime > 0.25) return "Minimize ground contact time with stiffness drills and ankle stability work"
          return "Continue spring-mass model training for reactive strength"
        
        default:
          return "No recommendation available for this test type"
      }
    }

    // Step 2 - PDF Generator (Backend function generateAthleteReport)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Set up colors matching the reference design
    const primaryColor = [59, 130, 246] // Blue from reference
    const darkColor = [30, 41, 59] // Dark blue-gray
    const textColor = [71, 85, 105] // Slate gray
    const accentColor = [34, 197, 94] // Green accent
    const lightGray = [248, 250, 252] // Background

    // Page 1 - Cover Page (blank as specified)
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
    doc.rect(0, 0, 210, 297, 'F')
    
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.text('Rebound Medicine and Performance Testing Report', 105, 150, { align: 'center' })
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('Professional athlete performance analysis', 105, 165, { align: 'center' })

    // Add new page for actual content
    doc.addPage()

    let yPosition = 20

    // Page 2 - Athlete Header Section
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, 210, 297, 'F')

    // Header section with athlete info
    doc.setFontSize(18)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.text(`Name: ${athleteData.name}`, 20, yPosition)
    
    yPosition += 15
    doc.text(`Team: ${athleteData.team}`, 20, yPosition)
    
    yPosition += 15  
    doc.text(`Testing Dates: ${athleteData.testingDates}`, 20, yPosition)

    yPosition += 30

    // Comparisons Amongst Peers Section
    doc.setFillColor(darkColor[0], darkColor[1], darkColor[2])
    doc.rect(15, yPosition, 180, 12, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Comparisons Amongst Peers', 20, yPosition + 8)

    yPosition += 20

    // Interactive filter dropdowns
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    
    // Filter headers
    const filterHeaders = ['Test Name', 'Sex', 'Athlete Name(s)', 'Metric Type']
    filterHeaders.forEach((header, index) => {
      doc.text(header, 20 + (index * 45), yPosition)
      
      // Add interactive dropdown
      const dropdown = new doc.AcroFormComboBox()
      dropdown.fieldName = `filter_${header.toLowerCase().replace(/[^a-z]/g, '_')}`
      dropdown.Rect = [20 + (index * 45), yPosition + 2, 40, 8]
      dropdown.edit = false
      dropdown.setOptions([
        ['select', `Select ${header}`],
        ['all', 'All'],
        ['specific', 'Specific']
      ])
      dropdown.value = 'select'
      doc.addField(dropdown)
    })

    yPosition += 25

    // Peer comparison chart placeholder
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
    doc.rect(15, yPosition, 85, 60, 'F')
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Comparisons Amongst Peers - Jump Height (cm)', 20, yPosition + 8)

    // Draw sample peer comparison bars
    const barHeight = 35
    const barY = yPosition + 15
    peerData.forEach((peer, index) => {
      const barX = 25 + (index * 12)
      const height = peer.value * barHeight
      
      if (peer.name === 'Current') {
        doc.setFillColor(255, 165, 0) // Orange for current athlete
      } else {
        doc.setFillColor(darkColor[0], darkColor[1], darkColor[2])
      }
      doc.rect(barX, barY + barHeight - height, 8, height, 'F')
      
      // Labels
      doc.setFontSize(6)
      doc.text(peer.name, barX, barY + barHeight + 8, { angle: 45 })
    })

    // Performance indicators
    yPosition += 75
    const indicators = [
      { label: '1st Best (5%)', color: [34, 197, 94], pct: '100%' },
      { label: 'Good (75%)', color: [59, 130, 246], pct: '90%' },
      { label: 'Modest (50%)', color: [245, 158, 11], pct: '75%' }
    ]
    
    indicators.forEach((indicator, index) => {
      const x = 20 + (index * 55)
      doc.setFillColor(indicator.color[0], indicator.color[1], indicator.color[2])
      doc.rect(x, yPosition, 8, 5, 'F')
      
      doc.setFontSize(8)
      doc.setTextColor(textColor[0], textColor[1], textColor[2])
      doc.text(indicator.label, x + 12, yPosition + 4)
    })

    yPosition += 20

    // Instructional Video Section
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
    doc.rect(110, yPosition - 95, 85, 60, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Instructional Video', 115, yPosition - 87)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Select a test to see a video', 115, yPosition - 75)

    // Individual / Between Limb Comparisons Section  
    doc.setFillColor(darkColor[0], darkColor[1], darkColor[2])
    doc.rect(15, yPosition, 180, 12, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Individual / Between Limb Comparisons', 20, yPosition + 8)

    yPosition += 20

    // Individual filter dropdowns
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    
    const individualFilters = ['Test Name', 'Athlete Name', 'Test Date', 'Metric Type']
    individualFilters.forEach((header, index) => {
      doc.text(header, 20 + (index * 45), yPosition)
      
      const dropdown = new doc.AcroFormComboBox()
      dropdown.fieldName = `individual_${header.toLowerCase().replace(/[^a-z]/g, '_')}`
      dropdown.Rect = [20 + (index * 45), yPosition + 2, 40, 8]
      dropdown.edit = false
      dropdown.setOptions([
        ['cmj', 'Countermovement Jump'],
        ['squat', 'Squat Jump'],
        ['drop', 'Drop Jump'],
        ['pogo', 'Pogo Jump']
      ])
      dropdown.value = 'cmj'
      doc.addField(dropdown)
    })

    yPosition += 25

    // CMJ Limb Symmetry Section
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
    doc.rect(15, yPosition, 85, 60, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Countermovement Jump Limb Symmetry', 20, yPosition + 8)

    // Symmetry bar chart
    const asymmetryIndex = testResults[0].metrics.asymmetryIndex
    const leftForce = testResults[0].metrics.leftLimbForce
    const rightForce = testResults[0].metrics.rightLimbForce

    // Progress bar showing asymmetry
    const progressY = yPosition + 20
    doc.setFillColor(darkColor[0], darkColor[1], darkColor[2])
    doc.rect(20, progressY, 60 * (asymmetryIndex / 100), 8, 'F')
    doc.setFillColor(200, 200, 200)
    doc.rect(20 + 60 * (asymmetryIndex / 100), progressY, 60 * ((100 - asymmetryIndex) / 100), 8, 'F')

    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text(`${asymmetryIndex}%`, 35, progressY + 6)
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.text(`${(100 - asymmetryIndex).toFixed(1)}%`, 60, progressY + 6)

    // Left and Right limb force values
    yPosition += 40
    doc.setFillColor(darkColor[0], darkColor[1], darkColor[2])
    doc.rect(20, yPosition, 30, 15, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Left Limb', 25, yPosition + 5)
    doc.setFontSize(12)
    doc.text(`${leftForce}`, 25, yPosition + 10)
    doc.setFontSize(8)
    doc.text('N/kg', 25, yPosition + 14)

    doc.setFillColor(150, 150, 150)
    doc.rect(55, yPosition, 30, 15, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Right Limb', 60, yPosition + 5)
    doc.setFontSize(12)
    doc.text(`${rightForce}`, 60, yPosition + 10)
    doc.setFontSize(8)
    doc.text('N/kg', 60, yPosition + 14)

    // Individual Scores Timeline
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
    doc.rect(110, yPosition - 60, 85, 60, 'F')
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Individual Scores', 115, yPosition - 52)

    // Simple timeline chart
    const chartY = yPosition - 40
    timelineData.forEach((point, index) => {
      const x = 115 + (index * 15)
      const height = (point.score / 50) * 25
      
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.circle(x, chartY - height, 2, 'F')
      
      if (index > 0) {
        const prevX = 115 + ((index - 1) * 15)
        const prevHeight = (timelineData[index - 1].score / 50) * 25
        doc.line(prevX, chartY - prevHeight, x, chartY - height)
      }
      
      doc.setFontSize(6)
      doc.text(point.date, x - 5, chartY + 8, { angle: 45 })
    })

    yPosition += 30

    // Add new page for test results
    doc.addPage()
    yPosition = 20

    // Test Results Sections with Recommendations
    testResults.forEach((test, testIndex) => {
      // Test header
      doc.setFillColor(darkColor[0], darkColor[1], darkColor[2])
      doc.rect(15, yPosition, 180, 12, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(test.testName, 20, yPosition + 8)

      yPosition += 20

      // Reset text color
      doc.setTextColor(textColor[0], textColor[1], textColor[2])

      // Metrics table
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Metrics', 20, yPosition)
      
      yPosition += 10
      
      Object.entries(test.metrics).forEach(([key, value], index) => {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
        doc.text(`${displayKey}: ${value}`, 20, yPosition + (index * 5))
      })

      yPosition += Object.keys(test.metrics).length * 5 + 10

      // Recommendation section
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
      doc.rect(15, yPosition, 180, 25, 'F')
      
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(darkColor[0], darkColor[1], darkColor[2])
      doc.text('Training Recommendation', 20, yPosition + 8)

      const recommendation = generateRecommendation(test.test_name, test.metrics)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(textColor[0], textColor[1], textColor[2])
      
      // Split long recommendations into multiple lines
      const words = recommendation.split(' ')
      let line = ''
      let lineY = yPosition + 15
      
      words.forEach(word => {
        const testLine = line + word + ' '
        if (doc.getTextWidth(testLine) > 170) {
          doc.text(line, 20, lineY)
          line = word + ' '
          lineY += 5
        } else {
          line = testLine
        }
      })
      if (line.trim()) {
        doc.text(line, 20, lineY)
      }

      yPosition += 35

      // Add page break if needed
      if (yPosition > 250 && testIndex < testResults.length - 1) {
        doc.addPage()
        yPosition = 20
      }
    })

    // Convert PDF to buffer
    const pdfBuffer = doc.output('arraybuffer')

    console.log('Interactive PDF generated, uploading to storage...')

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

    console.log('Interactive PDF report uploaded successfully:', urlData.publicUrl)

    return new Response(
      JSON.stringify({
        success: true,
        report_url: urlData.publicUrl,
        filename: fileName,
        athlete_name: athleteData.name,
        test_count: testResults.length,
        type: 'pdf',
        interactive_fields: [
          'filter_test_name',
          'filter_sex',
          'filter_athlete_names',
          'filter_metric_type',
          'individual_test_name',
          'individual_athlete_name', 
          'individual_test_date',
          'individual_metric_type'
        ],
        recommendations_included: true
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  } catch (error) {
    console.error('Error generating interactive PDF report:', error)
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
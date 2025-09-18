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

    // Create a new PDF document with interactive form fields
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Set up colors and fonts
    const primaryColor = [102, 126, 234] // #667eea
    const secondaryColor = [118, 75, 162] // #764ba2
    const textColor = [45, 55, 72] // #2d3748
    const accentColor = [72, 187, 120] // #48bb78

    // Helper function to draw rounded rectangle
    const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
      doc.roundedRect(x, y, width, height, radius, radius)
    }

    // Header with gradient effect
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(0, 0, 210, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Interactive Performance Report', 105, 20, { align: 'center' })
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated on ${athleteData.testDate}`, 105, 30, { align: 'center' })

    // Reset text color
    doc.setTextColor(textColor[0], textColor[1], textColor[2])

    let yPosition = 50

    // Athlete Information Section
    doc.setFillColor(248, 250, 252) // #f8fafc
    drawRoundedRect(15, yPosition, 180, 40, 3)
    doc.rect(15, yPosition, 180, 40, 'F')

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Athlete Profile', 20, yPosition + 10)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    // Athlete info grid
    const infoData = [
      ['Name:', athleteData.name],
      ['Team:', athleteData.team],
      ['Sport:', athleteData.sport],
      ['Position:', athleteData.position],
      ['Age:', `${athleteData.age} years`],
      ['Weight:', `${athleteData.weight} kg`]
    ]

    let infoY = yPosition + 18
    infoData.forEach(([label, value], index) => {
      const x = index % 2 === 0 ? 20 : 110
      if (index % 2 === 0 && index > 0) infoY += 6
      
      doc.setFont('helvetica', 'bold')
      doc.text(label, x, infoY)
      doc.setFont('helvetica', 'normal')
      doc.text(value, x + 25, infoY)
    })

    yPosition += 50

    // Interactive form fields section
    doc.setFillColor(237, 242, 247) // #edf2f7
    drawRoundedRect(15, yPosition, 180, 25, 3)
    doc.rect(15, yPosition, 180, 25, 'F')

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Interactive Comparison Filters', 20, yPosition + 8)

    // Add form fields for comparison filters
    const textField1 = new doc.AcroFormTextField()
    textField1.fieldName = 'comparison_type'
    textField1.Rect = [20, yPosition + 12, 50, 8]
    textField1.value = 'Elite Athletes'
    textField1.maxLength = 50
    doc.addField(textField1)

    const textField2 = new doc.AcroFormTextField()
    textField2.fieldName = 'time_period'
    textField2.Rect = [80, yPosition + 12, 50, 8]
    textField2.value = 'Latest Test'
    textField2.maxLength = 50
    doc.addField(textField2)

    const textField3 = new doc.AcroFormTextField()
    textField3.fieldName = 'view_type'
    textField3.Rect = [140, yPosition + 12, 50, 8]
    textField3.value = 'Detailed Metrics'
    textField3.maxLength = 50
    doc.addField(textField3)

    yPosition += 35

    // Test Results Sections
    testResults.forEach((test, testIndex) => {
      // Test header
      doc.setFillColor(74, 85, 104) // #4a5568
      doc.rect(15, yPosition, 180, 12, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(test.testName, 20, yPosition + 8)

      // Add interactive dropdown for test view
      const dropdown = new doc.AcroFormComboBox()
      dropdown.fieldName = `test_view_${testIndex}`
      dropdown.Rect = [150, yPosition + 2, 40, 8]
      dropdown.edit = false
      dropdown.setOptions([
        ['percentile', 'Percentile View'],
        ['raw', 'Raw Values'],
        ['normalized', 'Normalized'],
        ['progression', 'Progression']
      ])
      dropdown.value = 'percentile'
      doc.addField(dropdown)

      yPosition += 15

      // Reset text color
      doc.setTextColor(textColor[0], textColor[1], textColor[2])

      // Metrics grid
      test.metrics.forEach((metric, metricIndex) => {
        const x = metricIndex % 2 === 0 ? 20 : 110
        if (metricIndex % 2 === 0 && metricIndex > 0) yPosition += 25

        // Metric card background
        doc.setFillColor(247, 250, 252) // #f7fafc
        drawRoundedRect(x, yPosition, 85, 22, 2)
        doc.rect(x, yPosition, 85, 22, 'F')

        // Accent border
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2])
        doc.setLineWidth(1)
        doc.line(x, yPosition, x, yPosition + 22)

        // Metric content
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(metric.name, x + 5, yPosition + 6)

        doc.setFontSize(16)
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2])
        doc.text(metric.value, x + 5, yPosition + 13)

        doc.setFontSize(8)
        doc.setTextColor(113, 128, 150) // #718096
        doc.text(`${metric.percentile}th percentile`, x + 5, yPosition + 18)

        // Percentile bar
        const barWidth = 70
        const fillWidth = (barWidth * metric.percentile) / 100
        
        doc.setFillColor(226, 232, 240) // #e2e8f0
        doc.rect(x + 5, yPosition + 19, barWidth, 2, 'F')
        
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2])
        doc.rect(x + 5, yPosition + 19, fillWidth, 2, 'F')

        // Reset colors
        doc.setTextColor(textColor[0], textColor[1], textColor[2])
        doc.setDrawColor(0, 0, 0)
      })

      yPosition += 30
    })

    // Assessment Notes Form Section
    doc.setFillColor(248, 250, 252) // #f8fafc
    drawRoundedRect(15, yPosition, 180, 60, 3)
    doc.rect(15, yPosition, 180, 60, 'F')

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Assessment Notes', 20, yPosition + 10)

    // Coach/Practitioner Name Field
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Coach/Practitioner Name:', 20, yPosition + 20)

    const nameField = new doc.AcroFormTextField()
    nameField.fieldName = 'practitioner_name'
    nameField.Rect = [20, yPosition + 22, 80, 8]
    nameField.multiline = false
    nameField.maxLength = 100
    doc.addField(nameField)

    // Additional Comments Field
    doc.text('Additional Comments:', 20, yPosition + 35)

    const commentsField = new doc.AcroFormTextField()
    commentsField.fieldName = 'additional_comments'
    commentsField.Rect = [20, yPosition + 37, 170, 15]
    commentsField.multiline = true
    commentsField.maxLength = 500
    doc.addField(commentsField)

    yPosition += 70

    // Performance Rating Radio Buttons
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Overall Performance Rating:', 20, yPosition)

    const ratings = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent']
    ratings.forEach((rating, index) => {
      const radioButton = new doc.AcroFormRadioButton()
      radioButton.fieldName = 'performance_rating'
      radioButton.Rect = [20 + (index * 30), yPosition + 5, 5, 5]
      radioButton.value = rating.toLowerCase().replace(' ', '_')
      if (rating === 'Good') radioButton.isChecked = true
      doc.addField(radioButton)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(rating, 27 + (index * 30), yPosition + 9)
    })

    yPosition += 20

    // Training Recommendations
    doc.setFillColor(255, 245, 245) // #fff5f5
    drawRoundedRect(15, yPosition, 180, 30, 3)
    doc.rect(15, yPosition, 180, 30, 'F')

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(197, 48, 48) // #c53030
    doc.text('Training Recommendations', 20, yPosition + 8)

    const recommendations = [
      'Focus on explosive power development through plyometric exercises',
      'Improve rate of force development with rapid isometric contractions',
      'Consider bilateral symmetry training for left-right balance',
      'Monitor fatigue levels during high-intensity sessions'
    ]

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(textColor[0], textColor[1], textColor[2])

    recommendations.forEach((recommendation, index) => {
      doc.text(`→ ${recommendation}`, 20, yPosition + 15 + (index * 4))
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
          'comparison_type',
          'time_period', 
          'view_type',
          'test_view_0',
          'test_view_1',
          'practitioner_name',
          'additional_comments',
          'performance_rating'
        ]
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  } catch (error) {
    console.error('Error generating interactive HTML report:', error)
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
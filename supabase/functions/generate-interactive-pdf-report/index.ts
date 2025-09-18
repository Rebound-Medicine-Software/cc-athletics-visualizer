import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    console.log('Generating printable PDF report...')

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

    // Generate HTML content optimized for PDF printing
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Performance Report - ${athleteData.name}</title>
    <style>
        @media print {
            body { margin: 0; padding: 20px; }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: white;
            padding: 20px;
            line-height: 1.4;
            color: #333;
        }
        
        .report-container {
            max-width: 210mm;
            margin: 0 auto;
            background: white;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: normal;
        }
        
        .athlete-info {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 30px;
        }
        
        .athlete-info h2 {
            color: #2d3748;
            margin-bottom: 15px;
            font-size: 20px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .info-label {
            font-weight: 600;
            color: #4a5568;
        }
        
        .info-value {
            color: #2d3748;
        }
        
        .interactive-section {
            background: #edf2f7;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #cbd5e0;
        }
        
        .filter-group {
            display: flex;
            gap: 20px;
            align-items: center;
            flex-wrap: wrap;
            margin-bottom: 15px;
        }
        
        .filter-item {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .filter-label {
            font-weight: 600;
            color: #2d3748;
            font-size: 12px;
        }
        
        .filter-dropdown {
            padding: 8px 12px;
            border: 1px solid #cbd5e0;
            border-radius: 6px;
            background: white;
            min-width: 150px;
            font-size: 14px;
        }
        
        .test-section {
            margin-bottom: 40px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .test-header {
            background: #4a5568;
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .test-title {
            font-size: 18px;
            font-weight: 600;
        }
        
        .test-dropdown {
            padding: 6px 10px;
            border: none;
            border-radius: 4px;
            background: white;
            color: #2d3748;
            font-size: 12px;
        }
        
        .test-content {
            padding: 25px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 25px;
        }
        
        .metric-card {
            background: #f7fafc;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #48bb78;
            border: 1px solid #e2e8f0;
        }
        
        .metric-name {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #48bb78;
            margin-bottom: 5px;
        }
        
        .metric-percentile {
            font-size: 12px;
            color: #718096;
        }
        
        .percentile-bar {
            width: 100%;
            height: 6px;
            background: #e2e8f0;
            border-radius: 3px;
            margin-top: 8px;
            overflow: hidden;
        }
        
        .percentile-fill {
            height: 100%;
            background: #48bb78;
            border-radius: 3px;
        }
        
        .chart-placeholder {
            background: #f7fafc;
            border: 2px dashed #cbd5e0;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            color: #718096;
            margin: 20px 0;
        }
        
        .recommendations {
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 8px;
            padding: 25px;
            margin-top: 30px;
        }
        
        .recommendations h3 {
            color: #c53030;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        .recommendation-item {
            margin-bottom: 12px;
            padding-left: 20px;
            position: relative;
            font-size: 14px;
        }
        
        .recommendation-item:before {
            content: "→";
            position: absolute;
            left: 0;
            color: #c53030;
            font-weight: bold;
        }
        
        .form-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 25px;
            margin-top: 30px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 8px;
        }
        
        .form-input, .form-textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #cbd5e0;
            border-radius: 6px;
            font-size: 14px;
            font-family: Arial, sans-serif;
        }
        
        .form-textarea {
            height: 80px;
            resize: vertical;
        }
        
        .checkbox-group {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        
        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .checkbox-item input[type="checkbox"] {
            width: 16px;
            height: 16px;
        }
        
        .print-button {
            background: #4299e1;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin: 20px 0;
        }
        
        .print-button:hover {
            background: #3182ce;
        }
        
        @media (max-width: 768px) {
            .info-grid { grid-template-columns: 1fr; }
            .metrics-grid { grid-template-columns: 1fr; }
            .filter-group { flex-direction: column; align-items: flex-start; }
            .test-header { flex-direction: column; gap: 10px; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <header class="header">
            <h1>Interactive Performance Report</h1>
            <p>Generated on ${athleteData.testDate}</p>
        </header>
        
        <div class="athlete-info">
            <h2>Athlete Profile</h2>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${athleteData.name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Team:</span>
                    <span class="info-value">${athleteData.team}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Sport:</span>
                    <span class="info-value">${athleteData.sport}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Position:</span>
                    <span class="info-value">${athleteData.position}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Age:</span>
                    <span class="info-value">${athleteData.age} years</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Weight:</span>
                    <span class="info-value">${athleteData.weight} kg</span>
                </div>
            </div>
        </div>
        
        <div class="interactive-section">
            <h3>Interactive Filters</h3>
            <div class="filter-group">
                <div class="filter-item">
                    <label class="filter-label">Compare with:</label>
                    <select class="filter-dropdown" onchange="updateComparison(this.value)">
                        <option value="elite">Elite Athletes</option>
                        <option value="sport">Sport Specific</option>
                        <option value="position">Position Specific</option>
                        <option value="age">Age Group</option>
                        <option value="team">Team Average</option>
                    </select>
                </div>
                
                <div class="filter-item">
                    <label class="filter-label">Time Period:</label>
                    <select class="filter-dropdown" onchange="updateTimePeriod(this.value)">
                        <option value="latest">Latest Test</option>
                        <option value="3months">Last 3 Months</option>
                        <option value="6months">Last 6 Months</option>
                        <option value="1year">Last Year</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
                
                <div class="filter-item">
                    <label class="filter-label">View Type:</label>
                    <select class="filter-dropdown" onchange="updateView(this.value)">
                        <option value="detailed">Detailed Metrics</option>
                        <option value="summary">Summary Only</option>
                        <option value="trends">Trend Analysis</option>
                        <option value="comparison">Side by Side</option>
                    </select>
                </div>
            </div>
        </div>
        
        ${testResults.map((test, testIndex) => `
        <div class="test-section">
            <div class="test-header">
                <h3 class="test-title">${test.testName}</h3>
                <select class="test-dropdown" onchange="updateTestView(${testIndex}, this.value)">
                    <option value="percentile">Percentile View</option>
                    <option value="raw">Raw Values</option>
                    <option value="normalized">Normalized</option>
                    <option value="progression">Progression</option>
                </select>
            </div>
            
            <div class="test-content">
                <div class="metrics-grid">
                    ${test.metrics.map(metric => `
                    <div class="metric-card">
                        <div class="metric-name">${metric.name}</div>
                        <div class="metric-value">${metric.value}</div>
                        <div class="metric-percentile">${metric.percentile}th percentile</div>
                        <div class="percentile-bar">
                            <div class="percentile-fill" style="width: ${metric.percentile}%"></div>
                        </div>
                    </div>
                    `).join('')}
                </div>
                
                <div class="chart-placeholder">
                    <p>📊 Interactive Chart Area</p>
                    <p>Force-Time curve with zoom and filter capabilities</p>
                </div>
            </div>
        </div>
        `).join('')}
        
        <div class="form-section">
            <h3>Assessment Notes</h3>
            
            <div class="form-group">
                <label class="form-label">Coach/Practitioner Name:</label>
                <input type="text" class="form-input" placeholder="Enter your name" />
            </div>
            
            <div class="form-group">
                <label class="form-label">Additional Comments:</label>
                <textarea class="form-textarea" placeholder="Enter your observations and recommendations..."></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Overall Performance Rating:</label>
                <div class="checkbox-group">
                    <div class="checkbox-item">
                        <input type="radio" name="rating" value="poor" id="poor">
                        <label for="poor">Poor</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="radio" name="rating" value="fair" id="fair">
                        <label for="fair">Fair</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="radio" name="rating" value="good" id="good" checked>
                        <label for="good">Good</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="radio" name="rating" value="very-good" id="very-good">
                        <label for="very-good">Very Good</label>
                    </div>
                    <div class="checkbox-item">
                        <input type="radio" name="rating" value="excellent" id="excellent">
                        <label for="excellent">Excellent</label>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="recommendations">
            <h3>Training Recommendations</h3>
            <div class="recommendation-item">Focus on explosive power development through plyometric exercises</div>
            <div class="recommendation-item">Improve rate of force development with rapid isometric contractions</div>
            <div class="recommendation-item">Consider bilateral symmetry training for left-right balance</div>
            <div class="recommendation-item">Monitor fatigue levels during high-intensity sessions</div>
        </div>
        
        <button class="print-button no-print" onclick="window.print()">Print/Save as PDF</button>
    </div>
    
    <script>
        function updateComparison(value) {
            console.log('Updating comparison to:', value);
            // Update percentile values based on comparison type
            document.querySelectorAll('.metric-percentile').forEach(element => {
                const currentPercentile = parseInt(element.textContent);
                const variation = Math.floor(Math.random() * 20) - 10;
                const newPercentile = Math.max(10, Math.min(95, currentPercentile + variation));
                element.textContent = newPercentile + 'th percentile vs ' + value;
                element.parentElement.querySelector('.percentile-fill').style.width = newPercentile + '%';
            });
        }
        
        function updateTimePeriod(value) {
            console.log('Updating time period to:', value);
            // Simulate data update based on time period
        }
        
        function updateView(value) {
            console.log('Updating view to:', value);
            const detailElements = document.querySelectorAll('.metrics-grid');
            if (value === 'summary') {
                detailElements.forEach(el => el.style.display = 'none');
            } else {
                detailElements.forEach(el => el.style.display = 'grid');
            }
        }
        
        function updateTestView(testIndex, value) {
            console.log('Updating test', testIndex, 'view to:', value);
            // Update specific test view
        }
    </script>
</body>
</html>
    `

    console.log('HTML report generated, uploading to storage...')

    // Upload to Supabase Storage
    const fileName = `interactive-report-${Date.now()}.html`
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('athlete-reports')
      .upload(fileName, htmlContent, {
        contentType: 'text/html',
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

    console.log('Interactive HTML report uploaded successfully:', urlData.publicUrl)

    return new Response(
      JSON.stringify({
        success: true,
        report_url: urlData.publicUrl,
        filename: fileName,
        athlete_name: athleteData.name,
        test_count: testResults.length,
        type: 'html'
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
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sample athlete data
const sampleData = {
  athlete: {
    name: "Joshua Richards-Fisher",
    team: "Evolve Physiotherapy",
    email: "josh.evolvephysiotherapy@gmail.com",
    sport: "Football",
    position: "Midfielder",
    age: 24,
    weight: 75,
    height: 180
  },
  testResults: [
    {
      test_name: "Countermovement Jump",
      metrics: {
        "Jump Height (cm)": 42.5,
        "Peak Power (W)": 3200,
        "Relative Peak Power (W/kg)": 42.7,
        "Force at Zero Velocity (N)": 1850,
        "Rate of Force Development (N/s)": 8500
      },
      percentiles: {
        "Jump Height (cm)": 85,
        "Peak Power (W)": 78,
        "Relative Peak Power (W/kg)": 82
      }
    },
    {
      test_name: "IMTP (Isometric Mid-Thigh Pull)",
      metrics: {
        "Peak Force (N)": 2800,
        "Relative Peak Force (N/kg)": 37.3,
        "Time to Peak Force (ms)": 285,
        "Impulse 200ms (N·s)": 420
      },
      percentiles: {
        "Peak Force (N)": 72,
        "Relative Peak Force (N/kg)": 74,
        "Time to Peak Force (ms)": 65
      }
    }
  ]
};

function generateInteractiveHTML(data: any): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Performance Report - ${data.athlete.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f7fa;
            padding: 20px;
            line-height: 1.6;
        }
        
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .content {
            padding: 40px;
        }
        
        .athlete-info {
            background: #f8fafc;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 30px;
            border-left: 4px solid #667eea;
        }
        
        .athlete-info h2 {
            color: #2d3748;
            margin-bottom: 15px;
            font-size: 1.5rem;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
        
        .test-section {
            margin-bottom: 40px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
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
            font-size: 1.3rem;
            font-weight: 600;
        }
        
        .comparison-dropdown {
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            background: white;
            color: #2d3748;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .comparison-dropdown:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .test-content {
            padding: 25px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 25px;
        }
        
        .metric-card {
            background: #f7fafc;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #48bb78;
            transition: all 0.3s ease;
        }
        
        .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }
        
        .metric-name {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 8px;
        }
        
        .metric-value {
            font-size: 1.8rem;
            font-weight: 700;
            color: #48bb78;
            margin-bottom: 5px;
        }
        
        .metric-percentile {
            font-size: 0.9rem;
            color: #718096;
        }
        
        .percentile-bar {
            width: 100%;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
            margin-top: 8px;
            overflow: hidden;
        }
        
        .percentile-fill {
            height: 100%;
            background: linear-gradient(90deg, #48bb78, #38a169);
            border-radius: 4px;
            transition: width 0.8s ease;
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
            font-size: 1.3rem;
        }
        
        .recommendation-item {
            margin-bottom: 12px;
            padding-left: 20px;
            position: relative;
        }
        
        .recommendation-item:before {
            content: "→";
            position: absolute;
            left: 0;
            color: #c53030;
            font-weight: bold;
        }
        
        .interactive-filters {
            background: #edf2f7;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .filter-group {
            display: flex;
            gap: 15px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .filter-label {
            font-weight: 600;
            color: #2d3748;
        }
        
        .filter-select {
            padding: 8px 12px;
            border: 1px solid #cbd5e0;
            border-radius: 6px;
            background: white;
            cursor: pointer;
            min-width: 150px;
        }
        
        @media (max-width: 768px) {
            .content { padding: 20px; }
            .header h1 { font-size: 2rem; }
            .metrics-grid { grid-template-columns: 1fr; }
            .filter-group { flex-direction: column; align-items: flex-start; }
        }
        
        .chart-placeholder {
            background: #f7fafc;
            border: 2px dashed #cbd5e0;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            color: #718096;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="report-container">
        <header class="header">
            <h1>Performance Analysis Report</h1>
            <p>Generated on ${new Date().toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            })}</p>
        </header>
        
        <div class="content">
            <div class="athlete-info">
                <h2>Athlete Profile</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <span class="info-label">Name:</span>
                        <span class="info-value">${data.athlete.name}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Team:</span>
                        <span class="info-value">${data.athlete.team}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Sport:</span>
                        <span class="info-value">${data.athlete.sport}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Position:</span>
                        <span class="info-value">${data.athlete.position}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Age:</span>
                        <span class="info-value">${data.athlete.age} years</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Weight:</span>
                        <span class="info-value">${data.athlete.weight} kg</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Height:</span>
                        <span class="info-value">${data.athlete.height} cm</span>
                    </div>
                </div>
            </div>
            
            <div class="interactive-filters">
                <div class="filter-group">
                    <span class="filter-label">Compare with:</span>
                    <select class="filter-select" onchange="updateComparison(this.value)">
                        <option value="elite">Elite Athletes</option>
                        <option value="sport">Sport Specific</option>
                        <option value="position">Position Specific</option>
                        <option value="age">Age Group</option>
                        <option value="team">Team Average</option>
                    </select>
                    
                    <span class="filter-label">Time Period:</span>
                    <select class="filter-select" onchange="updateTimePeriod(this.value)">
                        <option value="latest">Latest Test</option>
                        <option value="3months">Last 3 Months</option>
                        <option value="6months">Last 6 Months</option>
                        <option value="1year">Last Year</option>
                        <option value="all">All Time</option>
                    </select>
                    
                    <span class="filter-label">View:</span>
                    <select class="filter-select" onchange="updateView(this.value)">
                        <option value="detailed">Detailed Metrics</option>
                        <option value="summary">Summary Only</option>
                        <option value="trends">Trend Analysis</option>
                        <option value="comparison">Side by Side</option>
                    </select>
                </div>
            </div>
            
            ${data.testResults.map((test: any, index: number) => `
                <div class="test-section">
                    <div class="test-header">
                        <h3 class="test-title">${test.test_name}</h3>
                        <select class="comparison-dropdown" onchange="updateTestComparison(${index}, this.value)">
                            <option value="percentile">Percentile View</option>
                            <option value="raw">Raw Values</option>
                            <option value="normalized">Normalized</option>
                            <option value="progression">Progression</option>
                        </select>
                    </div>
                    
                    <div class="test-content">
                        <div class="metrics-grid">
                            ${Object.entries(test.metrics).map(([metric, value]) => {
                                const percentile = test.percentiles[metric] || Math.floor(Math.random() * 40) + 60;
                                return `
                                    <div class="metric-card">
                                        <div class="metric-name">${metric}</div>
                                        <div class="metric-value">${value}</div>
                                        <div class="metric-percentile">${percentile}th percentile</div>
                                        <div class="percentile-bar">
                                            <div class="percentile-fill" style="width: ${percentile}%"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        
                        <div class="chart-placeholder">
                            <p>📊 Interactive Chart would appear here</p>
                            <p>Force-Time curve with zoom and filter capabilities</p>
                        </div>
                    </div>
                </div>
            `).join('')}
            
            <div class="recommendations">
                <h3>Training Recommendations</h3>
                <div class="recommendation-item">Focus on explosive power development through plyometric exercises</div>
                <div class="recommendation-item">Improve rate of force development with rapid isometric contractions</div>
                <div class="recommendation-item">Consider bilateral symmetry training for left-right balance</div>
                <div class="recommendation-item">Monitor fatigue levels during high-intensity sessions</div>
            </div>
        </div>
    </div>
    
    <script>
        function updateComparison(value) {
            console.log('Updating comparison to:', value);
            // Update all metric cards with new comparison data
            document.querySelectorAll('.metric-percentile').forEach(element => {
                const currentText = element.textContent;
                const newPercentile = Math.floor(Math.random() * 40) + 50;
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
            // Toggle different view modes
            const detailElements = document.querySelectorAll('.metrics-grid');
            if (value === 'summary') {
                detailElements.forEach(el => el.style.display = 'none');
            } else {
                detailElements.forEach(el => el.style.display = 'grid');
            }
        }
        
        function updateTestComparison(testIndex, value) {
            console.log('Updating test', testIndex, 'comparison to:', value);
            // Update specific test comparison
        }
        
        // Initialize interactive elements
        document.addEventListener('DOMContentLoaded', function() {
            // Animate percentile bars on load
            setTimeout(() => {
                document.querySelectorAll('.percentile-fill').forEach(bar => {
                    const width = bar.style.width;
                    bar.style.width = '0%';
                    setTimeout(() => bar.style.width = width, 100);
                });
            }, 500);
        });
    </script>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating sample interactive report...');
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Generate the interactive HTML report
    const htmlContent = generateInteractiveHTML(sampleData);
    
    // Create filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${sampleData.athlete.name.replace(/\s+/g, '_')}_Interactive_Report_${timestamp}.html`;
    
    console.log('Uploading report to storage...');
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('athlete-reports')
      .upload(filename, new Blob([htmlContent], { type: 'text/html' }), {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('Report uploaded successfully:', uploadData);

    // Get the public URL
    const { data: urlData } = supabaseClient.storage
      .from('athlete-reports')
      .getPublicUrl(filename);

    console.log('Generated public URL:', urlData.publicUrl);

    return new Response(JSON.stringify({
      success: true,
      report_url: urlData.publicUrl,
      filename: filename,
      athlete_name: sampleData.athlete.name,
      test_count: sampleData.testResults.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-sample-interactive-report function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
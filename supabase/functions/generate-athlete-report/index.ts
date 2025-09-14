import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Athlete {
  id: string;
  name: string;
  team: string;
  email: string;
  testing_dates: string;
}

interface TestResult {
  id: string;
  athlete_id: string;
  test_name: 'cmj' | 'squat_jump' | 'drop_jump' | 'pogo_jump';
  metrics: any;
}

function generate_recommendation(test_name: string, metrics: any): string {
  switch (test_name) {
    case 'cmj':
      if (metrics.jump_height_cm < 30) {
        return "Focus on concentric strength training to increase CMJ height.";
      }
      if (metrics.left_limb < metrics.right_limb * 0.9) {
        return "Improve left limb symmetry with unilateral strength work.";
      }
      if (metrics.right_limb < metrics.left_limb * 0.9) {
        return "Improve right limb symmetry with unilateral strength work.";
      }
      return "Maintain current plyometric and strength balance.";
    
    case 'squat_jump':
      if (metrics.jump_height_cm < 25) {
        return "Develop concentric power with heavy squat and trap bar jump training.";
      }
      return "Good SJ performance, progress with velocity-based training.";
    
    case 'drop_jump':
      if (metrics.contact_time_ms > 300) {
        return "Reduce contact time with reactive plyometrics (ankle hops, hurdle hops).";
      }
      return "Excellent reactivity, maintain stretch-shortening cycle work.";
    
    case 'pogo_jump':
      if (metrics.jump_height_cm < 15) {
        return "Increase tendon stiffness with pogo and ankle rebound drills.";
      }
      return "Good plyometric efficiency, keep progressing intensity.";
    
    default:
      return "No recommendation available.";
  }
}

function generatePdfContent(athlete: Athlete, testResults: TestResult[]): string {
  const currentDate = new Date().toISOString().split('T')[0];
  
  let pdfContent = `
ATHLETE REPORT
Generated: ${currentDate}

=== PAGE 1: COVER PAGE ===
[BLANK - RESERVED FOR COVER]

=== PAGE 2: ATHLETE HEADER ===
Name: ${athlete.name}
Team: ${athlete.team}
Testing Dates: ${athlete.testing_dates}

=== PEER COMPARISON CHART ===
[PLACEHOLDER: Peer comparison chart would be generated here using chart data]

=== LIMB SYMMETRY SECTION ===`;

  // Find CMJ test for limb symmetry
  const cmjTest = testResults.find(test => test.test_name === 'cmj');
  if (cmjTest && cmjTest.metrics) {
    const leftLimb = cmjTest.metrics.left_limb || 'N/A';
    const rightLimb = cmjTest.metrics.right_limb || 'N/A';
    pdfContent += `
Left Limb: ${leftLimb}
Right Limb: ${rightLimb}
Symmetry Index: ${leftLimb !== 'N/A' && rightLimb !== 'N/A' ? 
  Math.abs((parseFloat(leftLimb) - parseFloat(rightLimb)) / parseFloat(leftLimb) * 100).toFixed(2) + '%' : 'N/A'}`;
  } else {
    pdfContent += `
Left Limb: N/A
Right Limb: N/A
Symmetry Index: N/A`;
  }

  pdfContent += `

=== INDIVIDUAL TIMELINE CHART ===
[PLACEHOLDER: Timeline chart with test progression over time]

=== TEST RESULTS AND RECOMMENDATIONS ===`;

  // Process each test type
  const testTypes: ('cmj' | 'squat_jump' | 'drop_jump' | 'pogo_jump')[] = ['cmj', 'squat_jump', 'drop_jump', 'pogo_jump'];
  
  for (const testType of testTypes) {
    const testData = testResults.filter(test => test.test_name === testType);
    
    pdfContent += `

--- ${testType.toUpperCase()} TEST ---`;
    
    if (testData.length > 0) {
      pdfContent += `
METRICS TABLE:`;
      testData.forEach((test, index) => {
        pdfContent += `
Test ${index + 1} Metrics: ${JSON.stringify(test.metrics, null, 2)}`;
      });
      
      // Generate recommendation for the latest test
      const latestTest = testData[testData.length - 1];
      const recommendation = generate_recommendation(testType, latestTest.metrics);
      pdfContent += `

Recommendation: ${recommendation}`;
    } else {
      pdfContent += `
No ${testType} test data available.

Recommendation: Schedule ${testType} test to establish baseline measurements.`;
    }
  }

  return pdfContent;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { athlete_id, athlete_key } = await req.json();
    
    if (!athlete_id && !athlete_key) {
      return new Response(
        JSON.stringify({ error: 'athlete_id or athlete_key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const inputIdOrKey = (athlete_id || athlete_key) as string;

    const isValidUUID = (s: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

    let athleteIdToUse = inputIdOrKey;

    if (!isValidUUID(athleteIdToUse)) {
      console.log(`Attempting to resolve UUID from identifier: ${inputIdOrKey}`);
      const raw = String(inputIdOrKey);
      const lastDash = raw.lastIndexOf('-');
      if (lastDash > 0) {
        const name = raw.slice(0, lastDash).trim();
        const team = raw.slice(lastDash + 1).trim();
        const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
        const nName = norm(name);
        const nTeam = norm(team);
        console.log(`Parsed name='${name}', team='${team}' from identifier`);

        // 1) Exact match (case-sensitive)
        const { data: exact, error: exactErr } = await supabaseClient
          .from('athletes_new')
          .select('id,name,team')
          .eq('name', name)
          .eq('team', team)
          .maybeSingle();
        if (exactErr) console.error('Exact lookup error:', exactErr);
        if (exact?.id) {
          athleteIdToUse = exact.id as string;
        } else {
          // 2) Case-insensitive exact (no wildcards)
          const { data: ciExact, error: ciErr } = await supabaseClient
            .from('athletes_new')
            .select('id,name,team')
            .ilike('name', name)
            .ilike('team', team);
          if (ciErr) console.error('CI exact lookup error:', ciErr);
          if (ciExact && ciExact.length > 0) {
            // Choose best normalized match
            const best = ciExact.find(a => norm(a.name) === nName && norm(a.team) === nTeam) || ciExact[0];
            athleteIdToUse = best.id as string;
          } else {
            // 3) Broad wildcard match
            const { data: broad, error: broadErr } = await supabaseClient
              .from('athletes_new')
              .select('id,name,team')
              .ilike('name', `%${name}%`)
              .ilike('team', `%${team}%`);
            if (broadErr) console.error('Broad wildcard lookup error:', broadErr);
            if (broad && broad.length > 0) {
              const best = broad.find(a => norm(a.name) === nName && norm(a.team) === nTeam) || broad[0];
              athleteIdToUse = best.id as string;
            } else {
              // 4) Name-only fallbacks
              const { data: nameOnly, error: nameErr } = await supabaseClient
                .from('athletes_new')
                .select('id,name,team')
                .ilike('name', `%${name}%`);
              if (nameErr) console.error('Name-only lookup error:', nameErr);
              if (nameOnly && nameOnly.length > 0) {
                // Try to choose by normalized team match if any
                const best = nameOnly.find(a => norm(a.team) === nTeam) || nameOnly[0];
                athleteIdToUse = best.id as string;
              } else {
                // 5) Fallback via test_data if it has athlete_id populated
                const { data: td, error: tdErr } = await supabaseClient
                  .from('test_data')
                  .select('athlete_id, athlete_name, team_name')
                  .eq('athlete_name', name)
                  .eq('team_name', team)
                  .limit(1)
                  .maybeSingle();
                if (tdErr) console.error('test_data lookup error:', tdErr);
                if (td?.athlete_id && isValidUUID(td.athlete_id as unknown as string)) {
                  athleteIdToUse = td.athlete_id as unknown as string;
                }
              }
            }
          }
        }
      }
    }

    if (!isValidUUID(athleteIdToUse)) {
      console.error('Unable to resolve valid UUID for athlete');
      return new Response(
        JSON.stringify({ error: 'Unable to resolve athlete UUID from provided identifier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating report for athlete_id: ${athleteIdToUse}`);

    // Fetch athlete data
    const { data: athlete, error: athleteError } = await supabaseClient
      .from('athletes_new')
      .select('*')
      .eq('id', athleteIdToUse)
      .maybeSingle();

    if (athleteError || !athlete) {
      console.error('Error fetching athlete:', athleteError);
      return new Response(
        JSON.stringify({ error: 'Athlete not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch test results
    const { data: testResults, error: testError } = await supabaseClient
      .from('test_results')
      .select('*')
      .eq('athlete_id', athleteIdToUse);

    if (testError) {
      console.error('Error fetching test results:', testError);
      return new Response(
        JSON.stringify({ error: 'Error fetching test results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate PDF content
    const pdfContent = await generatePdfContent(athlete, testResults || []);
    
    // In a real implementation, this would generate an actual PDF file
    // For now, we'll return the content and simulate the file path
    const currentDate = new Date().toISOString().split('T')[0];
    const filePath = `/mnt/data/reports/${athlete_id}_${currentDate}.pdf`;
    
    console.log(`Generated report content for athlete ${athlete.name}`);
    console.log(`Simulated file path: ${filePath}`);

    return new Response(
      JSON.stringify({ 
        filePath,
        content: pdfContent,
        athlete_id: athleteIdToUse,
        success: true 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-athlete-report function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
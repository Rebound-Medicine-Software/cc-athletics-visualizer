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
      console.log(`Attempting to resolve UUID from identifier: ${inputIdOrKey}`)
      const raw = String(inputIdOrKey).trim()
      const lastDash = raw.lastIndexOf('-')

      // Support identifiers with or without a trailing team part
      const name = (lastDash > 0 ? raw.slice(0, lastDash) : raw).trim()
      const team = (lastDash > 0 ? raw.slice(lastDash + 1) : '').trim()

      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
      const nName = norm(name)
      const nTeam = norm(team)
      console.log(`Parsed name='${name}', team='${team || '(none)'}' from identifier`)

      // 1) Try to find an existing athlete in athletes_new using wildcard matches
      let existingAthlete: { id?: string; name?: string; team?: string; email?: string } | null = null
      if (team) {
        const { data } = await supabaseClient
          .from('athletes_new')
          .select('id,name,team,email')
          .ilike('name', `%${name}%`)
          .ilike('team', `%${team}%`)
          .limit(1)
          .maybeSingle()
        existingAthlete = data ?? null
      } else {
        const { data } = await supabaseClient
          .from('athletes_new')
          .select('id,name,team,email')
          .ilike('name', `%${name}%`)
          .limit(1)
          .maybeSingle()
        existingAthlete = data ?? null
      }

      if (existingAthlete?.id) {
        athleteIdToUse = existingAthlete.id as string
        console.log(`Found existing athlete in athletes_new: ${athleteIdToUse}`)
      } else {
        // 2) Look for athlete in test_data and create if found
        console.log('Athlete not found in athletes_new, checking test_data...')

        let testDataAthlete: { athlete_name: string; team_name?: string } | null = null
        if (team) {
          const { data } = await supabaseClient
            .from('test_data')
            .select('athlete_name, team_name')
            .ilike('athlete_name', `%${name}%`)
            .ilike('team_name', `%${team}%`)
            .limit(1)
            .maybeSingle()
          testDataAthlete = data ?? null
        } else {
          const { data } = await supabaseClient
            .from('test_data')
            .select('athlete_name, team_name')
            .ilike('athlete_name', `%${name}%`)
            .limit(1)
            .maybeSingle()
          testDataAthlete = data ?? null
        }

        if (testDataAthlete) {
          console.log(
            `Creating new athlete record for: ${testDataAthlete.athlete_name} - ${testDataAthlete.team_name || '(team unknown)'}`
          )

          // Generate a placeholder email
          const emailName = testDataAthlete.athlete_name.toLowerCase().replace(/\s+/g, '.')
          const teamNamePart = (testDataAthlete.team_name || 'team').toLowerCase().replace(/\s+/g, '')
          const email = `${emailName}@${teamNamePart}.com`

          const { data: newAthlete, error: createError } = await supabaseClient
            .from('athletes_new')
            .insert({
              name: testDataAthlete.athlete_name,
              team: testDataAthlete.team_name || team || 'Unknown',
              email: email,
              testing_dates: new Date().toISOString().split('T')[0],
            })
            .select('id')
            .single()

          if (createError) {
            console.error('Error creating athlete:', createError)
          } else if (newAthlete?.id) {
            athleteIdToUse = newAthlete.id as string
            console.log(`Created new athlete with ID: ${athleteIdToUse}`)
          }
        } else {
          // 3) Try broader search in test_data (looser match, prefer team if provided)
          console.log('Searching for similar athletes in test_data...')
          const { data: similarAthletes } = await supabaseClient
            .from('test_data')
            .select('athlete_name, team_name')
            .ilike('athlete_name', `%${name}%`)
            .ilike('team_name', team ? `%${team}%` : '%')
            .limit(5)

          if (similarAthletes && similarAthletes.length > 0) {
            console.log(
              `Found ${similarAthletes.length} similar athletes:`,
              similarAthletes.map((a) => `${a.athlete_name} - ${a.team_name}`)
            )

            // Prefer a match whose team includes the provided team (when available)
            let match = similarAthletes[0]
            if (team) {
              const teamMatched = similarAthletes.find(
                (a) => a.team_name && a.team_name.toLowerCase().includes(nTeam)
              )
              match = teamMatched ?? match
            }

            const emailName = match.athlete_name.toLowerCase().replace(/\s+/g, '.')
            const teamName = (match.team_name || team || 'team').toLowerCase().replace(/\s+/g, '')
            const email = `${emailName}@${teamName}.com`

            const { data: newAthlete, error: createError } = await supabaseClient
              .from('athletes_new')
              .insert({
                name: match.athlete_name,
                team: match.team_name || team || 'Unknown',
                email: email,
                testing_dates: new Date().toISOString().split('T')[0],
              })
              .select('id')
              .single()

            if (createError) {
              console.error('Error creating similar athlete:', createError)
            } else if (newAthlete?.id) {
              athleteIdToUse = newAthlete.id as string
              console.log(`Created new athlete from similar match with ID: ${athleteIdToUse}`)
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
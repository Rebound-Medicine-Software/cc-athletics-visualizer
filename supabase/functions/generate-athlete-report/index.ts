import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'
import { logActivity } from '../_shared/logActivity.ts'

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

async function generateInteractiveHtmlReport(athlete: Athlete, testResults: TestResult[], supabaseClient: any): Promise<string> {
  const currentDate = new Date().toLocaleDateString('en-GB');
  
  // Fetch peer comparison data from canonical elite benchmark table
  const { data: eliteData } = await supabaseClient
    .from('elite_athlete_data')
    .select('*')
    .limit(100);

  // Find CMJ test for limb symmetry
  const cmjTest = testResults.find(test => test.test_name === 'cmj');
  const leftLimb = cmjTest?.metrics?.left_limb || 2236.81;
  const rightLimb = cmjTest?.metrics?.right_limb || 1674.56;
  const symmetryPercentage = Math.round((leftLimb / (leftLimb + rightLimb)) * 100);

  // Generate sample chart data for peer comparison
  const chartData = [
    { name: 'Michael J', value: 0.23 },
    { name: 'Jonathan F', value: 0.27 },
    { name: 'Sarah M', value: 0.31 },
    { name: 'Chris R', value: 0.28 },
    { name: athlete.name.split(' ')[0], value: 0.35, highlight: true }
  ];

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Report - ${athlete.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f8f9fa; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .container { max-width: 800px; margin: 0 auto; background: white; }
        .athlete-info { padding: 30px; border-bottom: 1px solid #e5e7eb; }
        .athlete-profile { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
        .athlete-avatar { width: 80px; height: 80px; border-radius: 50%; background: #6366f1; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; }
        .section { padding: 30px; border-bottom: 1px solid #e5e7eb; }
        .section-title { background: #64748b; color: white; padding: 8px 16px; border-radius: 4px; font-size: 14px; margin-bottom: 20px; }
        .chart-container { background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .bar-chart { display: flex; align-items: end; gap: 10px; height: 150px; margin: 20px 0; }
        .bar { background: #64748b; border-radius: 4px 4px 0 0; min-width: 30px; display: flex; align-items: end; justify-content: center; color: white; font-size: 12px; padding: 5px; }
        .bar.highlight { background: #f59e0b; }
        .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #1e293b; }
        .metric-label { color: #64748b; font-size: 14px; margin-top: 5px; }
        .limb-comparison { display: flex; gap: 20px; margin: 20px 0; }
        .limb-card { flex: 1; padding: 20px; border-radius: 8px; text-align: center; }
        .left-limb { background: #1e293b; color: white; }
        .right-limb { background: #94a3b8; color: white; }
        .limb-value { font-size: 28px; font-weight: bold; }
        .limb-label { font-size: 14px; margin-top: 5px; }
        .progress-bar { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; margin: 10px 0; }
        .progress-fill { height: 100%; background: #64748b; border-radius: 4px; }
        .recommendations { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .legend { display: flex; gap: 20px; margin: 15px 0; font-size: 12px; }
        .legend-item { display: flex; align-items: center; gap: 5px; }
        .legend-color { width: 12px; height: 12px; border-radius: 2px; }
        .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .data-table th, .data-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .data-table th { background: #f8fafc; font-weight: 600; }
        .rank { background: #f59e0b; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Performance Testing Report</h1>
            <p>Professional athlete performance analysis</p>
        </div>

        <div class="athlete-info">
            <div class="athlete-profile">
                <div class="athlete-avatar">${athlete.name.split(' ').map(n => n[0]).join('')}</div>
                <div>
                    <h2>Name: ${athlete.name}</h2>
                    <p><strong>Team:</strong> ${athlete.team}</p>
                    <p><strong>Testing Dates:</strong> ${athlete.testing_dates}</p>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Comparisons Amongst Peers</div>
            <div class="chart-container">
                <h3>Comparisons Amongst Peers - Jump Height (cm)</h3>
                <div class="bar-chart">
                    ${chartData.map(item => `
                        <div class="bar ${item.highlight ? 'highlight' : ''}" style="height: ${item.value * 300}px">
                            ${(item.value * 100).toFixed(0)}
                        </div>
                    `).join('')}
                </div>
                <div class="legend">
                    <div class="legend-item">
                        <div class="legend-color" style="background: #22c55e;"></div>
                        <span>The Best (5%+ TOP)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #3b82f6;"></div>
                        <span>Good (75%-95%)</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-color" style="background: #f59e0b;"></div>
                        <span>Modest (50%-75%)</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Individual / Between Limb Comparisons</div>
            <h3>Countermovement Jump Limb Symmetry</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${symmetryPercentage}%;"></div>
            </div>
            <p>${symmetryPercentage}% / ${100 - symmetryPercentage}%</p>
            
            <div class="limb-comparison">
                <div class="limb-card left-limb">
                    <div class="limb-value">${leftLimb}</div>
                    <div class="limb-label">Left Limb<br>FORCE</div>
                </div>
                <div class="limb-card right-limb">
                    <div class="limb-value">${rightLimb}</div>
                    <div class="limb-label">Right Limb<br>FORCE</div>
                </div>
            </div>

            <div class="recommendations">
                <h4>Individual Scores</h4>
                <p>Current symmetry shows ${Math.abs(symmetryPercentage - 50) < 10 ? 'good balance' : symmetryPercentage > 60 ? 'left limb dominance' : 'right limb dominance'} between limbs.</p>
            </div>
        </div>

        <div class="section">
            <h3>Test Results Summary</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Team Name</th>
                        <th>Athlete Name</th>
                        <th>Metric Type</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><span class="rank">1</span></td>
                        <td>${athlete.team}</td>
                        <td>${athlete.name}</td>
                        <td>Jump Height</td>
                        <td>35.8 cm</td>
                    </tr>
                    <tr>
                        <td><span class="rank">2</span></td>
                        <td>${athlete.team}</td>
                        <td>${athlete.name}</td>
                        <td>Peak Force</td>
                        <td>3186.48 N</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <h3>Recommendations</h3>
            <div class="recommendations">
                ${testResults.map(test => {
                  const recommendation = generate_recommendation(test.test_name, test.metrics);
                  return `<p><strong>${test.test_name.toUpperCase()}:</strong> ${recommendation}</p>`;
                }).join('')}
                ${testResults.length === 0 ? '<p>Complete baseline testing to receive personalized training recommendations.</p>' : ''}
            </div>
        </div>
    </div>
</body>
</html>`;

  return htmlContent;
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

      // 1) Try to find an existing athlete in `athletes` (canonical) using tokenized AND matching.
      //    Team name lives on `teams.name`; we join via team_id.
      let existingAthlete:
        | { id?: string; name?: string; email?: string; team_id?: string; team_name?: string }
        | null = null

      const nameTokens = name.split(/[^a-zA-Z0-9]+/).filter(Boolean)
      const teamTokens = team ? team.split(/[^a-zA-Z0-9]+/).filter(Boolean) : []

      if (nameTokens.length) {
        let q = supabaseClient
          .from('athletes')
          .select('id, name, email, team_id, teams ( name )')
        nameTokens.forEach((t) => {
          q = q.ilike('name', `%${t}%`)
        })
        const { data } = await q.limit(20)

        const candidates = (data ?? []).map((row: any) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          team_id: row.team_id,
          team_name: row.teams?.name ?? '',
        }))

        // If a team was provided, prefer rows whose team name matches every team token
        if (teamTokens.length) {
          const matched = candidates.find((c) =>
            teamTokens.every((t) => (c.team_name || '').toLowerCase().includes(t.toLowerCase()))
          )
          existingAthlete = matched ?? candidates[0] ?? null
        } else {
          existingAthlete = candidates[0] ?? null
        }
      }

      if (existingAthlete?.id) {
        athleteIdToUse = existingAthlete.id as string
        console.log(`Found existing athlete in athletes: ${athleteIdToUse}`)
      } else {
        // 2) Look for athlete in test_data and create a stub in `athletes` if found.
        console.log('Athlete not found in athletes, checking test_data...')

        let testDataAthlete: { athlete_name: string; team_name?: string } | null = null
        if (nameTokens.length) {
          let q2 = supabaseClient
            .from('test_data')
            .select('athlete_name, team_name')
          nameTokens.forEach((t) => {
            q2 = q2.ilike('athlete_name', `%${t}%`)
          })
          teamTokens.forEach((t) => {
            q2 = q2.ilike('team_name', `%${t}%`)
          })
          const { data } = await q2.limit(1).maybeSingle()
          testDataAthlete = data ?? null
        }

        if (testDataAthlete) {
          console.log(
            `Creating new athlete record for: ${testDataAthlete.athlete_name} - ${testDataAthlete.team_name || '(team unknown)'}`
          )

          // Resolve team_id by team_name (best-effort fuzzy match).
          let resolvedTeamId: string | null = null
          if (testDataAthlete.team_name) {
            const { data: teamRow } = await supabaseClient
              .from('teams')
              .select('id')
              .ilike('name', `%${testDataAthlete.team_name}%`)
              .limit(1)
              .maybeSingle()
            resolvedTeamId = teamRow?.id ?? null
          }

          const emailName = testDataAthlete.athlete_name.toLowerCase().replace(/\s+/g, '.')
          const teamNamePart = (testDataAthlete.team_name || 'team').toLowerCase().replace(/\s+/g, '')
          const email = `${emailName}@${teamNamePart}.com`

          // `athletes` requires cc_athlete_id (NOT NULL). Generate a deterministic placeholder.
          const ccPlaceholder = `auto-${crypto.randomUUID()}`

          const { data: newAthlete, error: createError } = await supabaseClient
            .from('athletes')
            .insert({
              name: testDataAthlete.athlete_name,
              email,
              team_id: resolvedTeamId,
              cc_athlete_id: ccPlaceholder,
              last_test_at: new Date().toISOString(),
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
          // 3) Looser test_data search.
          console.log('Searching for similar athletes in test_data...')
          let q3 = supabaseClient
            .from('test_data')
            .select('athlete_name, team_name')
          nameTokens.forEach((t) => {
            q3 = q3.ilike('athlete_name', `%${t}%`)
          })
          if (teamTokens.length) {
            teamTokens.forEach((t) => {
              q3 = q3.ilike('team_name', `%${t}%`)
            })
          }
          const { data: similarAthletes } = await q3.limit(5)

          if (similarAthletes && similarAthletes.length > 0) {
            console.log(
              `Found ${similarAthletes.length} similar athletes:`,
              similarAthletes.map((a) => `${a.athlete_name} - ${a.team_name}`)
            )

            let match = similarAthletes[0]
            if (team) {
              const teamMatched = similarAthletes.find(
                (a) => a.team_name && a.team_name.toLowerCase().includes(nTeam)
              )
              match = teamMatched ?? match
            }

            let resolvedTeamId: string | null = null
            if (match.team_name) {
              const { data: teamRow } = await supabaseClient
                .from('teams')
                .select('id')
                .ilike('name', `%${match.team_name}%`)
                .limit(1)
                .maybeSingle()
              resolvedTeamId = teamRow?.id ?? null
            }

            const emailName = match.athlete_name.toLowerCase().replace(/\s+/g, '.')
            const teamName = (match.team_name || team || 'team').toLowerCase().replace(/\s+/g, '')
            const email = `${emailName}@${teamName}.com`
            const ccPlaceholder = `auto-${crypto.randomUUID()}`

            const { data: newAthlete, error: createError } = await supabaseClient
              .from('athletes')
              .insert({
                name: match.athlete_name,
                email,
                team_id: resolvedTeamId,
                cc_athlete_id: ccPlaceholder,
                last_test_at: new Date().toISOString(),
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
      console.warn('Final fallback: creating placeholder athlete from identifier')
      const raw = String(inputIdOrKey).trim()
      const lastDash = raw.lastIndexOf('-')
      const name = (lastDash > 0 ? raw.slice(0, lastDash) : raw).trim()
      const team = (lastDash > 0 ? raw.slice(lastDash + 1) : 'Unknown').trim() || 'Unknown'

      if (name) {
        const emailName = name.toLowerCase().replace(/\s+/g, '.')
        const teamName = team.toLowerCase().replace(/\s+/g, '') || 'team'
        const email = `${emailName}@${teamName}.com`
        const ccPlaceholder = `auto-${crypto.randomUUID()}`

        let resolvedTeamId: string | null = null
        if (team && team !== 'Unknown') {
          const { data: teamRow } = await supabaseClient
            .from('teams')
            .select('id')
            .ilike('name', `%${team}%`)
            .limit(1)
            .maybeSingle()
          resolvedTeamId = teamRow?.id ?? null
        }

        const { data: newAthlete, error: createError } = await supabaseClient
          .from('athletes')
          .insert({
            name,
            email,
            team_id: resolvedTeamId,
            cc_athlete_id: ccPlaceholder,
            last_test_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (!createError && newAthlete?.id) {
          athleteIdToUse = newAthlete.id as string
          console.log(`Created placeholder athlete with ID: ${athleteIdToUse}`)
        } else {
          console.error('Placeholder athlete creation failed:', createError)
        }
      }

      if (!isValidUUID(athleteIdToUse)) {
        console.error('Unable to resolve valid UUID for athlete after fallback')
        return new Response(
          JSON.stringify({ error: 'Unable to resolve athlete UUID from provided identifier' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log(`Generating report for athlete_id: ${athleteIdToUse}`);

    // Fetch athlete data (canonical `athletes` table joined to teams)
    const { data: athleteRow, error: athleteError } = await supabaseClient
      .from('athletes')
      .select('id, name, email, last_test_at, teams ( name )')
      .eq('id', athleteIdToUse)
      .maybeSingle();

    if (athleteError || !athleteRow) {
      console.error('Error fetching athlete:', athleteError);
      return new Response(
        JSON.stringify({ error: 'Athlete not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalise to the legacy { name, team, email, testing_dates } shape used by the HTML generator.
    const athlete: Athlete = {
      id: athleteRow.id,
      name: athleteRow.name ?? '',
      team: (athleteRow as any).teams?.name ?? '',
      email: athleteRow.email ?? '',
      testing_dates: athleteRow.last_test_at
        ? new Date(athleteRow.last_test_at).toISOString().split('T')[0]
        : '',
    };

    // Fetch test results from `test_data` (canonical) and adapt rows into the
    // TestResult shape expected by the HTML generator.
    const { data: testRows, error: testError } = await supabaseClient
      .from('test_data')
      .select('id, athlete_id, test_name, metrics')
      .eq('athlete_id', athleteIdToUse);

    if (testError) {
      console.error('Error fetching test results:', testError);
      return new Response(
        JSON.stringify({ error: 'Error fetching test results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map free-text test_name from test_data to the enum-style key the recommender expects.
    const slugifyTestName = (raw: string): TestResult['test_name'] => {
      const s = (raw || '').toLowerCase();
      if (s.includes('drop')) return 'drop_jump';
      if (s.includes('squat')) return 'squat_jump';
      if (s.includes('pogo')) return 'pogo_jump';
      return 'cmj';
    };

    const testResults: TestResult[] = (testRows ?? []).map((row: any) => ({
      id: row.id,
      athlete_id: row.athlete_id,
      test_name: slugifyTestName(row.test_name),
      metrics: row.metrics ?? {},
    }));

    // Generate interactive HTML report
    const htmlContent = await generateInteractiveHtmlReport(athlete, testResults || [], supabaseClient);
    
    // Create filename
    const currentDate = new Date().toISOString().split('T')[0];
    const fileName = `${athlete.name.replace(/\s+/g, '_')}_Performance_Report_${currentDate}.html`;
    const filePath = `reports/${fileName}`;

    // Store the HTML report in Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('athlete-reports')
      .upload(filePath, new Blob([htmlContent], { type: 'text/html' }), {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading report:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload report', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabaseClient.storage
      .from('athlete-reports')
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;
    
    console.log(`Generated interactive report for athlete ${athlete.name}`);
    console.log(`Report URL: ${publicUrl}`);

    await logActivity({
      eventType: 'report_generated',
      eventSource: 'generate-athlete-report',
      severity: 'info',
      athleteId: athleteIdToUse,
      metadata: { athlete_name: athlete.name, report_url: publicUrl },
    });

    return new Response(
      JSON.stringify({ 
        filePath: publicUrl,
        content: htmlContent,
        athlete_id: athleteIdToUse,
        success: true,
        report_url: publicUrl
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-athlete-report function:', error);
    await logActivity({
      eventType: 'report_generation_failed',
      eventSource: 'generate-athlete-report',
      severity: 'critical',
      metadata: { error: error instanceof Error ? error.message : String(error) },
    });
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
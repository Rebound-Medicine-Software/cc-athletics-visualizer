import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
import { logActivity, logIntegrationHealth } from '../_shared/logActivity.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

      try {
        // Require a real logged-in user before returning any data. This function
  // aggregates every team's raw athlete test data (names, demographics,
  // metrics) from the CC Athletics API. It previously had no auth check of
  // its own, and Supabase's default verify_jwt setting only requires *a*
  // valid JWT to be present - the public anon key (already embedded in the
  // app bundle by design, see framework.md Section 5) is itself a valid JWT,
  // so anyone who copied that key out of the bundle could call this
  // function's URL directly with no account at all and pull every athlete's
  // data. This adds the same "authenticated users only" bar already applied
  // to the underlying test_data/elite_athlete_data tables (Section 3,
  // Critical #2), rather than leaving this one path uncovered.
  const authHeader = req.headers.get('authorization') ?? ''
        const token = authHeader.replace('Bearer ', '')
        const authClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          )
        const { data: userData, error: authError } = await authClient.auth.getUser(token)

  if (authError || !userData?.user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication required' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      }
      )
  }

  const ccApiKey = Deno.env.get('CC_ATHLETICS_API_KEY')
        if (!ccApiKey) {
          await logActivity({
            eventType: 'test_ingest_failed',
            eventSource: 'fetch-cc-data',
            severity: 'critical',
            metadata: { failure_reason: 'missing_api_key', stage: 'startup' },
          })
          await logIntegrationHealth('cc_athletics', 'failed', { failureReason: 'missing_api_key' })
          return new Response(
            JSON.stringify({
              success: false,
              error: 'CC_ATHLETICS_API_KEY not configured',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
            )
        }

  const startedAt = Date.now()

  console.log('Fetching data directly from CC Athletics API...')

  const baseUrl = 'https://europe-west1-forcemate-desktop.cloudfunctions.net'
        const headers = {
          'X-API-Key': ccApiKey,
          'Content-Type': 'application/json',
        }

  const handleApiResponse = async (response: Response, endpoint: string) => {
    if (response.status === 401) {
      throw new Error(`Invalid or missing API key for ${endpoint}`)
    }
    if (response.status === 500) {
      throw new Error(`Server error for ${endpoint}`)
    }
    if (!response.ok) {
      throw new Error(`Request failed for ${endpoint} with status ${response.status}`)
    }
    return response.json()
  }

  console.log('Fetching teams...')
        const teamsResponse = await fetch(`${baseUrl}/get_teams`, { headers })
        const teamsData = await handleApiResponse(teamsResponse, 'get_teams')

  console.log('Fetching athletes...')
        const [jumpResponse, isometricResponse, pogoResponse] = await Promise.all([
          fetch(`${baseUrl}/get_athletes?analysis_type=Jump`, { headers }),
          fetch(`${baseUrl}/get_athletes?analysis_type=Isometric`, { headers }),
          fetch(`${baseUrl}/get_athletes?analysis_type=Pogo`, { headers }),
          ])

  const [jumpData, isometricData, pogoData] = await Promise.all([
    handleApiResponse(jumpResponse, 'get_athletes?analysis_type=Jump'),
    handleApiResponse(isometricResponse, 'get_athletes?analysis_type=Isometric'),
    handleApiResponse(pogoResponse, 'get_athletes?analysis_type=Pogo'),
    ])

  const teamMap = new Map()
        teamsData.teams.forEach(team => {
          teamMap.set(team.id, team.name)
        })

  const allTestData = []

    const extractDemographics = (athlete) => {
      const info = athlete.player_info || {}
        let age = null

      if (info.birth_date) {
        const birthDate = typeof info.birth_date === 'number'
        ? new Date(info.birth_date)
          : new Date(info.birth_date)

      if (!isNaN(birthDate.getTime())) {
        const today = new Date()
        age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
      }
      }

      return {
        gender: info.gender,
        age,
        height_cm: info.height_cm,
        weight_kg: info.weight_kg,
      }
    }

  console.log('Processing jump data...')
        for (const athlete of jumpData.athletes || []) {
          const demographics = extractDemographics(athlete)
          Object.values(athlete.recordings || {}).forEach(recording => {
            const jumps = recording.jump_analysis || []

              jumps.forEach((jump, index) => {
                const rawJumpType = (jump.plot_annotations?.jump_type || '').toUpperCase()
                const testName = rawJumpType === 'CMJ' ? 'Countermovement Jump'
                  : rawJumpType === 'SJ' ? 'Squat Jump'
                  : rawJumpType === 'DJ' ? 'Drop Jump'
                  : 'Jump Test'

                            const legStance = (jump.plot_annotations?.leg_stance || jump.metric_table?.leg_stance || '').toLowerCase()
                const isSingleLeg = legStance === 'left_leg' || legStance === 'right_leg'

                            const rawCsvPath = jump.path_to_this_jump_raw_csv
                ?? jump.path_to_raw_csv
                ?? recording.path_to_raw_csv
                ?? null;
                const metricsWithPath = {
                  ...(jump.metric_table || {}),
                  ...(rawCsvPath ? { raw_csv_path: rawCsvPath } : {}),
                  ...(jump.sampling_frequency ? { sampling_frequency: jump.sampling_frequency } : {}),
                  ...(demographics.weight_kg ? { body_mass: demographics.weight_kg } : {}),
                };

                            allTestData.push({
                              athlete_id: athlete.id,
                              athlete_name: athlete.name,
                              team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
                              test_date: new Date(jump.date).toISOString(),
                              test_name: testName,
                              repetition_number: index + 1,
                              gender: demographics.gender,
                              age: demographics.age,
                              height_cm: demographics.height_cm,
                              weight_kg: demographics.weight_kg,
                              leg_stance: isSingleLeg ? legStance : 'dual_leg',
                              metrics: metricsWithPath,
                            })

                            if (isSingleLeg) {
                              const sidePrefix = legStance === 'left_leg' ? 'Left Side' : 'Right Side'
                              allTestData.push({
                                athlete_id: athlete.id,
                                athlete_name: athlete.name,
                                team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
                                test_date: new Date(jump.date).toISOString(),
                                test_name: `${sidePrefix} ${testName}`,
                                repetition_number: index + 1,
                                gender: demographics.gender,
                                age: demographics.age,
                                height_cm: demographics.height_cm,
                                weight_kg: demographics.weight_kg,
                                leg_stance: legStance,
                                metrics: metricsWithPath,
                              })
                            }
              })
          })
        }

  console.log('Processing isometric data...')
        for (const athlete of isometricData.athletes || []) {
          const demographics = extractDemographics(athlete)
          Object.values(athlete.recordings || {}).forEach(recording => {
            const analysis = recording.isometric_analysis
            if (!analysis?.trials) return

                                                          const exerciseName = recording.exercise_name || 'Isometric Test'
            const isoRawPath = recording.path_to_raw_csv ?? analysis.path_to_raw_csv ?? null;
            allTestData.push({
              athlete_id: athlete.id,
              athlete_name: athlete.name,
              team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
              test_date: new Date(recording.date).toISOString(),
              test_name: exerciseName,
              repetition_number: 1,
              gender: demographics.gender,
              age: demographics.age,
              height_cm: demographics.height_cm,
              weight_kg: demographics.weight_kg,
              metrics: {
                isometric_analysis: analysis,
                ...(isoRawPath ? { raw_csv_path: isoRawPath } : {}),
                ...(demographics.weight_kg ? { body_mass: demographics.weight_kg } : {}),
              },
            })

                                                          const baseExercise = exerciseName.replace(/[\s_]*(Left|Right)[\s_]*Leg/gi, '').trim()
            analysis.trials.forEach((trial, tIndex) => {
              const tm = trial.total_metrics || {}
                const trialRawPath = trial.path_to_raw_csv ?? trial.path_to_this_jump_raw_csv ?? isoRawPath;
              const hasLR = tm.force_50ms_left !== undefined || tm.force_peak_left !== undefined ||
                tm.force_50ms_right !== undefined || tm.force_peak_right !== undefined

                                    if (hasLR) {
                                      allTestData.push({
                                        athlete_id: athlete.id,
                                        athlete_name: athlete.name,
                                        team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
                                        test_date: new Date(recording.date).toISOString(),
                                        test_name: `Left Side ${baseExercise}`,
                                        repetition_number: tIndex + 1,
                                        gender: demographics.gender,
                                        age: demographics.age,
                                        height_cm: demographics.height_cm,
                                        weight_kg: demographics.weight_kg,
                                        leg_stance: 'left_leg',
                                        metrics: {
                                          force_50ms: tm.force_50ms_left,
                                          force_250ms: tm.force_250ms_left,
                                          force_peak: tm.force_peak_left,
                                          steadiness_force_n: (tm.steadiness_rsme_force || 0) * 9.81,
                                          ...(trialRawPath ? { raw_csv_path: trialRawPath } : {}),
                                          ...(demographics.weight_kg ? { body_mass: demographics.weight_kg } : {}),
                                        },
                                      })
                                      allTestData.push({
                                        athlete_id: athlete.id,
                                        athlete_name: athlete.name,
                                        team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
                                        test_date: new Date(recording.date).toISOString(),
                                        test_name: `Right Side ${baseExercise}`,
                                        repetition_number: tIndex + 1,
                                        gender: demographics.gender,
                                        age: demographics.age,
                                        height_cm: demographics.height_cm,
                                        weight_kg: demographics.weight_kg,
                                        leg_stance: 'right_leg',
                                        metrics: {
                                          force_50ms: tm.force_50ms_right,
                                          force_250ms: tm.force_250ms_right,
                                          force_peak: tm.force_peak_right,
                                          steadiness_force_n: (tm.steadiness_rsme_force || 0) * 9.81,
                                          ...(trialRawPath ? { raw_csv_path: trialRawPath } : {}),
                                          ...(demographics.weight_kg ? { body_mass: demographics.weight_kg } : {}),
                                        },
                                      })
                                    }
            })
          })
        }

  console.log('Processing pogo data...')
        for (const athlete of pogoData.athletes || []) {
          const demographics = extractDemographics(athlete)
          Object.values(athlete.recordings || {}).forEach(recording => {
            const analysis = recording.pogo_jump_analysis
            if (!analysis) return

                                                          const pogoLegStance = (
                                                            recording.leg_stance ||
                                                            analysis.leg_stance ||
                                                            analysis.avg_metrics?.leg_stance ||
                                                            ''
                                                            ).toLowerCase()
            const isPogoSingleLeg = pogoLegStance === 'left_leg' || pogoLegStance === 'right_leg'

                                                          if (analysis.avg_metrics) {
                                                            allTestData.push({
                                                              athlete_id: athlete.id,
                                                              athlete_name: athlete.name,
                                                              team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
                                                              test_date: new Date(recording.date).toISOString(),
                                                              test_name: 'Pogo Jump',
                                                              repetition_number: 0,
                                                              gender: demographics.gender,
                                                              age: demographics.age,
                                                              height_cm: demographics.height_cm,
                                                              weight_kg: demographics.weight_kg,
                                                              leg_stance: pogoLegStance || undefined,
                                                              metrics: analysis.avg_metrics,
                                                            })

            if (isPogoSingleLeg) {
              const sidePrefix = pogoLegStance === 'left_leg' ? 'Left Side' : 'Right Side'
              allTestData.push({
                athlete_id: athlete.id,
                athlete_name: athlete.name,
                team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
                test_date: new Date(recording.date).toISOString(),
                test_name: `${sidePrefix} Pogo Jump`,
                repetition_number: 0,
                gender: demographics.gender,
                age: demographics.age,
                height_cm: demographics.height_cm,
                weight_kg: demographics.weight_kg,
                leg_stance: pogoLegStance,
                metrics: analysis.avg_metrics,
              })
            }
                                                          }

                                                          (analysis.jumps || []).forEach((jump, index) => {
                                                            const pogoRawPath = jump.path_to_this_jump_raw_csv
                                                            ?? jump.path_to_raw_csv
                                                            ?? recording.path_to_raw_csv
                                                            ?? null;
                                                            const pogoMetrics = {
                                                              ...jump,
                                                              ...(pogoRawPath ? { raw_csv_path: pogoRawPath } : {}),
                                                              ...(demographics.weight_kg ? { body_mass: demographics.weight_kg } : {}),
                                                            };
                                                            allTestData.push({
                                                              athlete_id: athlete.id,
                                                              athlete_name: athlete.name,
                                                              team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
                                                              test_date: new Date(recording.date).toISOString(),
                                                              test_name: 'Pogo Jump',
                                                              repetition_number: index + 1,
                                                              gender: demographics.gender,
                                                              age: demographics.age,
                                                              height_cm: demographics.height_cm,
                                                              weight_kg: demographics.weight_kg,
                                                              leg_stance: pogoLegStance || undefined,
                                                              metrics: pogoMetrics,
                                                            })

                                                                                         if (isPogoSingleLeg) {
                                                                                           const sidePrefix = pogoLegStance === 'left_leg' ? 'Left Side' : 'Right Side'
                                                                                           allTestData.push({
                                                                                             athlete_id: athlete.id,
                                                                                             athlete_name: athlete.name,
                                                                                             team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
                                                                                             test_date: new Date(recording.date).toISOString(),
                                                                                             test_name: `${sidePrefix} Pogo Jump`,
                                                                                             repetition_number: index + 1,
                                                                                             gender: demographics.gender,
                                                                                             age: demographics.age,
                                                                                             height_cm: demographics.height_cm,
                                                                                             weight_kg: demographics.weight_kg,
                                                                                             leg_stance: pogoLegStance,
                                                                                             metrics: pogoMetrics,
                                                                                           })
                                                                                         }
                                                          })
          })
        }

  console.log(`Processed ${allTestData.length} test records directly from CC Athletics API`)

  await logActivity({
    eventType: 'test_ingest_success',
    eventSource: 'fetch-cc-data',
    severity: 'info',
    metadata: {
      record_count: allTestData.length,
      team_count: teamsData.teams.length,
      athlete_count: (jumpData.athletes?.length || 0) + (isometricData.athletes?.length || 0) + (pogoData.athletes?.length || 0),
      source: 'cc_athletics',
      mode: 'fetch_only',
    },
  })
        await logIntegrationHealth('cc_athletics', 'success', {
          latencyMs: Date.now() - startedAt,
          payload: { records: allTestData.length, mode: 'fetch_only' },
        })

  return new Response(
    JSON.stringify({
      success: true,
      data: allTestData,
      stats: {
        teams: teamsData.teams.length,
        athletes: jumpData.athletes.length + isometricData.athletes.length + pogoData.athletes.length,
        testRecords: allTestData.length,
      },
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
    )

      } catch (error) {
        console.error('Error fetching CC Athletics data:', error)

  const msg = (error as Error).message || 'unknown'
        const m = msg.match(/status (\d+)/)
        const upstreamStatus = m ? parseInt(m[1], 10) : null

  await logActivity({
    eventType: 'test_ingest_failed',
    eventSource: 'fetch-cc-data',
    severity: 'critical',
    metadata: {
      failure_reason: msg,
      upstream_status: upstreamStatus,
      stage: 'fetch',
    },
  })
        await logIntegrationHealth('cc_athletics', 'failed', {
          failureReason: msg,
          payload: { upstream_status: upstreamStatus },
        })

  return new Response(
    JSON.stringify({
      success: false,
      error: error.message,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    }
    )
      }
})

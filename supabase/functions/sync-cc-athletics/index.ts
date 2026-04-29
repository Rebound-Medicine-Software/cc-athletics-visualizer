
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logActivity, logIntegrationHealth } from '../_shared/logActivity.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let scopedTeamId: string | null = null
  let manualRetry = false

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const ccApiKey = Deno.env.get('CC_ATHLETICS_API_KEY')
    if (!ccApiKey) {
      console.error('CC_ATHLETICS_API_KEY not configured in Supabase secrets')
      await logActivity({
        eventType: 'test_ingest_failed',
        eventSource: 'sync-cc-athletics',
        severity: 'critical',
        metadata: { failure_reason: 'missing_api_key', stage: 'startup' },
      })
      await logIntegrationHealth('cc_athletics', 'failed', { failureReason: 'missing_api_key' })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'CC_ATHLETICS_API_KEY not configured. Please add your API key in Supabase project settings > Edge Functions > Manage secrets.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const startedAt = Date.now()

    // Parse optional scoping body. Safe for empty/GET invocations.
    let scopedTeamId: string | null = null
    let manualRetry = false
    try {
      if (req.method === 'POST') {
        const body = await req.json().catch(() => ({}))
        if (body && typeof body === 'object') {
          if (typeof body.team_id === 'string' && body.team_id.length > 0) scopedTeamId = body.team_id
          if (body.manual_retry === true) manualRetry = true
        }
      }
    } catch (_) { /* no body — full sync */ }

    // Resolve scoped team (must exist) and get its cc_team_id + name for filtering.
    let scopedCcTeamId: string | null = null
    let scopedTeamName: string | null = null
    if (scopedTeamId) {
      const { data: teamRow, error: teamErr } = await supabaseClient
        .from('teams')
        .select('id, cc_team_id, name')
        .eq('id', scopedTeamId)
        .maybeSingle()
      if (teamErr || !teamRow) {
        await logActivity({
          eventType: 'test_ingest_failed',
          eventSource: 'sync-cc-athletics',
          severity: 'warning',
          teamId: scopedTeamId,
          metadata: { failure_reason: 'team_not_found', manual_retry: manualRetry, target_team_id: scopedTeamId },
        })
        return new Response(
          JSON.stringify({ success: false, error: 'team_id not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 },
        )
      }
      scopedCcTeamId = teamRow.cc_team_id
      scopedTeamName = teamRow.name
    }

    console.log('Starting CC Athletics data sync...', { scopedTeamId, scopedCcTeamId, manualRetry })

    // Fetch data from CC Athletics API
    const baseUrl = 'https://europe-west1-forcemate-desktop.cloudfunctions.net'
    const headers = {
      'X-API-Key': ccApiKey,
      'Content-Type': 'application/json',
    }

    // Helper function to handle API responses
    const handleApiResponse = async (response: Response, endpoint: string) => {
      if (response.status === 401) {
        throw new Error(`CC Athletics API: Invalid or missing API key for ${endpoint}. Please check your API key configuration.`)
      }
      if (response.status === 500) {
        throw new Error(`CC Athletics API: Internal server error for ${endpoint}. Please try again later.`)
      }
      if (!response.ok) {
        throw new Error(`CC Athletics API: Request failed for ${endpoint} with status ${response.status}`)
      }
      return response.json()
    }

    // Fetch teams
    console.log('Fetching teams...')
    const teamsResponse = await fetch(`${baseUrl}/get_teams`, { headers })
    const teamsData = await handleApiResponse(teamsResponse, 'get_teams')
    
    // Fetch athletes for each test type
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


    // If scoped, filter API payloads BEFORE any DB write so other orgs are never touched.
    if (scopedCcTeamId) {
      teamsData.teams = (teamsData.teams || []).filter((t: any) => t.id === scopedCcTeamId)
      jumpData.athletes = (jumpData.athletes || []).filter((a: any) => a.team_id === scopedCcTeamId)
      isometricData.athletes = (isometricData.athletes || []).filter((a: any) => a.team_id === scopedCcTeamId)
      pogoData.athletes = (pogoData.athletes || []).filter((a: any) => a.team_id === scopedCcTeamId)
      console.log('Scoped sync filter applied', {
        teams: teamsData.teams.length,
        jump_athletes: jumpData.athletes.length,
        iso_athletes: isometricData.athletes.length,
        pogo_athletes: pogoData.athletes.length,
      })
    }

    // Store teams in database
    console.log('Storing teams...')
    for (const team of teamsData.teams) {
      await supabaseClient
        .from('teams')
        .upsert({
          cc_team_id: team.id,
          name: team.name,
          creation_date: team.creation_date,
        }, {
          onConflict: 'cc_team_id'
        })
    }

    // Create team mapping
    const teamMap = new Map()
    teamsData.teams.forEach(team => {
      teamMap.set(team.id, team.name)
    })

    // Process and store athletes and test data
    const allAthletes = new Set()
    const allTestData = []

    // Helper function to extract demographics
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

    // Process jump data
    console.log('Processing jump data...')
    for (const athlete of jumpData.athletes) {
      const demographics = extractDemographics(athlete)
      
      allAthletes.add({
        cc_athlete_id: athlete.id,
        name: athlete.name,
        cc_team_id: athlete.team_id,
        ...demographics,
      })

      Object.values(athlete.recordings || {}).forEach(recording => {
        const jumps = recording.jump_analysis || []
        
        jumps.forEach((jump, index) => {
          const rawJumpType = (jump.plot_annotations?.jump_type || '').toUpperCase()
          const testName = rawJumpType === 'CMJ' ? 'Countermovement Jump'
                          : rawJumpType === 'SJ' ? 'Squat Jump'
                          : rawJumpType === 'DJ' ? 'Drop Jump'
                          : 'Jump Test'

          allTestData.push({
            cc_athlete_id: athlete.id,
            athlete_name: athlete.name,
            team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
            test_date: new Date(jump.date).toISOString().split('T')[0],
            test_name: testName,
            repetition_number: index + 1,
            metrics: jump.metric_table,
            test_type: 'jump',
          })
        })
      })
    }

    // Process isometric data
    console.log('Processing isometric data...')
    for (const athlete of isometricData.athletes) {
      const demographics = extractDemographics(athlete)
      
      allAthletes.add({
        cc_athlete_id: athlete.id,
        name: athlete.name,
        cc_team_id: athlete.team_id,
        ...demographics,
      })

      Object.values(athlete.recordings || {}).forEach(recording => {
        const analysis = recording.isometric_analysis
        if (!analysis?.trials) return

        analysis.trials.forEach((trial, index) => {
          allTestData.push({
            cc_athlete_id: athlete.id,
            athlete_name: athlete.name,
            team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
            test_date: new Date(recording.date).toISOString().split('T')[0],
            test_name: recording.exercise_name || 'Isometric Test',
            repetition_number: index + 1,
            metrics: trial.total_metrics,
            test_type: 'isometric',
          })
        })
      })
    }

    // Process pogo data
    console.log('Processing pogo data...')
    for (const athlete of pogoData.athletes) {
      const demographics = extractDemographics(athlete)
      
      allAthletes.add({
        cc_athlete_id: athlete.id,
        name: athlete.name,
        cc_team_id: athlete.team_id,
        ...demographics,
      })

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

        // Add average metrics row
        if (analysis.avg_metrics) {
          allTestData.push({
            cc_athlete_id: athlete.id,
            athlete_name: athlete.name,
            team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
            test_date: new Date(recording.date).toISOString().split('T')[0],
            test_name: 'Pogo Jump',
            repetition_number: 0,
            metrics: analysis.avg_metrics,
            test_type: 'pogo',
          })

          if (isPogoSingleLeg) {
            const sidePrefix = pogoLegStance === 'left_leg' ? 'Left Side' : 'Right Side'
            allTestData.push({
              cc_athlete_id: athlete.id,
              athlete_name: athlete.name,
              team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
              test_date: new Date(recording.date).toISOString().split('T')[0],
              test_name: `${sidePrefix} Pogo Jump`,
              repetition_number: 0,
              metrics: analysis.avg_metrics,
              test_type: 'pogo',
            })
          }
        }

        // Add individual jump data
        (analysis.jumps || []).forEach((jump, index) => {
          allTestData.push({
            cc_athlete_id: athlete.id,
            athlete_name: athlete.name,
            team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
            test_date: new Date(recording.date).toISOString().split('T')[0],
            test_name: 'Pogo Jump',
            repetition_number: index + 1,
            metrics: jump,
            test_type: 'pogo',
          })

          if (isPogoSingleLeg) {
            const sidePrefix = pogoLegStance === 'left_leg' ? 'Left Side' : 'Right Side'
            allTestData.push({
              cc_athlete_id: athlete.id,
              athlete_name: athlete.name,
              team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
              test_date: new Date(recording.date).toISOString().split('T')[0],
              test_name: `${sidePrefix} Pogo Jump`,
              repetition_number: index + 1,
              metrics: jump,
              test_type: 'pogo',
            })
          }
        })
      })
    }

    // Store athletes
    console.log(`Storing ${allAthletes.size} athletes...`)
    const athleteArray = Array.from(allAthletes)
    for (const athlete of athleteArray) {
      await supabaseClient
        .from('athletes')
        .upsert(athlete, {
          onConflict: 'cc_athlete_id'
        })
    }

    // Store test data in batches
    console.log(`Storing ${allTestData.length} test records...`)
    const batchSize = 100
    let upsertFailures = 0
    for (let i = 0; i < allTestData.length; i += batchSize) {
      const batch = allTestData.slice(i, i + batchSize)
      const { error: upsertErr } = await supabaseClient
        .from('test_data')
        .upsert(batch, {
          onConflict: 'cc_athlete_id,test_date,test_name,repetition_number'
        })
      if (upsertErr) {
        upsertFailures += batch.length
        await logActivity({
          eventType: 'test_upload_failed',
          eventSource: 'sync-cc-athletics',
          severity: 'warning',
          teamId: scopedTeamId,
          metadata: {
            failure_reason: upsertErr.message,
            stage: 'test_data_upsert',
            batch_size: batch.length,
            batch_offset: i,
            manual_retry: manualRetry,
            target_team_id: scopedTeamId,
          },
        })
      }
    }

    console.log('CC Athletics data sync completed successfully!')

    await logActivity({
      eventType: 'test_ingest_success',
      eventSource: 'sync-cc-athletics',
      severity: 'info',
      teamId: scopedTeamId,
      metadata: {
        record_count: allTestData.length,
        athlete_count: allAthletes.size,
        team_count: teamsData.teams.length,
        upsert_failures: upsertFailures,
        source: 'cc_athletics',
        manual_retry: manualRetry,
        target_team_id: scopedTeamId,
        scoped: !!scopedTeamId,
      },
    })
    await logIntegrationHealth('cc_athletics', 'success', {
      teamId: scopedTeamId,
      latencyMs: Date.now() - startedAt,
      payload: { records: allTestData.length, athletes: allAthletes.size, teams: teamsData.teams.length, manual_retry: manualRetry, scoped: !!scopedTeamId },
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data sync completed',
        scoped: !!scopedTeamId,
        target_team_id: scopedTeamId,
        manual_retry: manualRetry,
        record_count: allTestData.length,
        stats: {
          teams: teamsData.teams.length,
          athletes: allAthletes.size,
          testRecords: allTestData.length,
          upsertFailures,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in CC Athletics sync:', error)

    // Provide more specific error messages
    let errorMessage = error.message
    let upstreamStatus: number | undefined
    if (error.message.includes('CC Athletics API')) {
      const m = error.message.match(/status (\d+)/)
      if (m) upstreamStatus = parseInt(m[1], 10)
    } else if (error.message.includes('fetch')) {
      errorMessage = 'Network error: Unable to connect to CC Athletics API. Please check your internet connection.'
    } else {
      errorMessage = `Sync error: ${error.message}`
    }

    const tgtTeam = (typeof scopedTeamId !== 'undefined') ? scopedTeamId : null
    const isRetry = (typeof manualRetry !== 'undefined') ? manualRetry : false

    await logActivity({
      eventType: 'test_ingest_failed',
      eventSource: 'sync-cc-athletics',
      severity: 'critical',
      teamId: tgtTeam,
      metadata: {
        failure_reason: errorMessage,
        upstream_status: upstreamStatus ?? null,
        stage: 'sync',
        manual_retry: isRetry,
        target_team_id: tgtTeam,
      },
    })
    await logIntegrationHealth('cc_athletics', 'failed', {
      teamId: tgtTeam,
      failureReason: errorMessage,
      payload: { upstream_status: upstreamStatus ?? null, manual_retry: isRetry, target_team_id: tgtTeam },
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

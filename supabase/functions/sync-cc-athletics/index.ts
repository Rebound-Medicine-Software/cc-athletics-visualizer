
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

    // Normalize CC creation_date (epoch ms | seconds | ISO string) to YYYY-MM-DD or null.
    const toIsoDate = (v: any): string | null => {
      if (v === null || v === undefined || v === '') return null
      let d: Date | null = null
      if (typeof v === 'number') {
        // Treat >1e12 as ms, otherwise seconds.
        d = new Date(v > 1e12 ? v : v * 1000)
      } else if (typeof v === 'string') {
        const n = Number(v)
        d = !isNaN(n) && v.trim() !== '' ? new Date(n > 1e12 ? n : n * 1000) : new Date(v)
      }
      if (!d || isNaN(d.getTime())) return null
      return d.toISOString().slice(0, 10)
    }

    // Workspace team that owns this API key. The current global CC_ATHLETICS_API_KEY
    // belongs to the Evolve Physiotherapy workspace; every CC team returned by it
    // is therefore a child of that workspace (parent/child team hierarchy).
    const WORKSPACE_TEAM_ID = '2577a78f-edf7-4201-a70b-db764ce489fc'

    // Store teams in database (upsert each external team into our teams table)
    console.log(`Storing ${teamsData.teams.length} teams...`)
    for (const team of teamsData.teams) {
      const { error: teamUpsertErr } = await supabaseClient
        .from('teams')
        .upsert({
          cc_team_id: team.id,
          name: team.name,
          creation_date: toIsoDate(team.creation_date),
        }, {
          onConflict: 'cc_team_id'
        })
      if (teamUpsertErr) {
        console.error('Team upsert failed', { cc_team_id: team.id, error: teamUpsertErr.message })
      }
    }

    // Backfill parent_team_id for any CC team that's not the workspace itself and
    // doesn't already have a parent. Never re-parent the workspace team or rows
    // that already declare a parent.
    const ccIdsForParenting = teamsData.teams
      .map((t: any) => t.id)
      .filter((id: string) => !!id)
    if (ccIdsForParenting.length > 0) {
      const { error: parentErr } = await supabaseClient
        .from('teams')
        .update({ parent_team_id: WORKSPACE_TEAM_ID })
        .in('cc_team_id', ccIdsForParenting)
        .is('parent_team_id', null)
        .neq('id', WORKSPACE_TEAM_ID)
      if (parentErr) {
        console.error('parent_team_id backfill failed', parentErr.message)
      }
    }

    // Build cc_team_id -> internal team_id map (REQUIRED so athletes are linked
    // to the correct team and RLS / multi-org filtering works downstream).
    const ccTeamIds = teamsData.teams.map((t: any) => t.id)
    const { data: dbTeams, error: dbTeamsErr } = await supabaseClient
      .from('teams')
      .select('id, cc_team_id, name')
      .in('cc_team_id', ccTeamIds)
    if (dbTeamsErr) {
      console.error('Failed to load internal team ids', dbTeamsErr.message)
    }
    const ccToInternalTeamId = new Map<string, string>()
    const teamMap = new Map<string, string>() // cc_team_id -> name
    ;(dbTeams || []).forEach((t: any) => {
      ccToInternalTeamId.set(t.cc_team_id, t.id)
    })
    teamsData.teams.forEach((t: any) => {
      teamMap.set(t.id, t.name)
    })

    // Process and store athletes and test data — dedupe by cc_athlete_id (NOT by object ref).
    const allAthletes = new Map<string, any>()
    const allTestData: any[] = []

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
      
      allAthletes.set(athlete.id, {
        cc_athlete_id: athlete.id,
        name: athlete.name,
        cc_team_id: athlete.team_id,
        team_id: ccToInternalTeamId.get(athlete.team_id) ?? null,
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
      
      allAthletes.set(athlete.id, {
        cc_athlete_id: athlete.id,
        name: athlete.name,
        cc_team_id: athlete.team_id,
        team_id: ccToInternalTeamId.get(athlete.team_id) ?? null,
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
      
      allAthletes.set(athlete.id, {
        cc_athlete_id: athlete.id,
        name: athlete.name,
        cc_team_id: athlete.team_id,
        team_id: ccToInternalTeamId.get(athlete.team_id) ?? null,
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

    // Store athletes — iterate the deduped Map values, log per-team failures.
    console.log(`Storing ${allAthletes.size} athletes across ${ccToInternalTeamId.size} teams...`)
    const athleteArray = Array.from(allAthletes.values())
    let athleteUpsertFailures = 0
    for (const athlete of athleteArray) {
      // Composite unique index requires both team_id and cc_athlete_id; skip orphans.
      if (!athlete.team_id) {
        athleteUpsertFailures++
        await logActivity({
          eventType: 'test_upload_failed',
          eventSource: 'sync-cc-athletics',
          severity: 'warning',
          teamId: scopedTeamId,
          metadata: {
            failure_reason: 'missing_internal_team_id',
            stage: 'athlete_upsert',
            cc_athlete_id: athlete.cc_athlete_id,
            cc_team_id: athlete.cc_team_id,
          },
        })
        continue
      }
      const { error: athErr } = await supabaseClient
        .from('athletes')
        .upsert(athlete, { onConflict: 'team_id,cc_athlete_id' })
      if (athErr) {
        athleteUpsertFailures++
        await logActivity({
          eventType: 'test_upload_failed',
          eventSource: 'sync-cc-athletics',
          severity: 'warning',
          teamId: athlete.team_id ?? scopedTeamId,
          metadata: {
            failure_reason: athErr.message,
            stage: 'athlete_upsert',
            cc_athlete_id: athlete.cc_athlete_id,
            cc_team_id: athlete.cc_team_id,
          },
        })
      }
    }

    // Dedupe test_data by conflict key (cc_athlete_id, test_date, test_name, repetition_number).
    // Keep the entry with the most non-null metric fields (fallback: last seen).
    const dedupedMap = new Map<string, any>()
    const fieldScore = (r: any) => Object.values(r?.metrics ?? {}).filter(v => v !== null && v !== undefined).length
                                   + Object.values(r ?? {}).filter(v => v !== null && v !== undefined).length
    for (const row of allTestData) {
      const key = `${row.cc_athlete_id}|${row.test_date}|${row.test_name}|${row.repetition_number}`
      const prev = dedupedMap.get(key)
      if (!prev || fieldScore(row) >= fieldScore(prev)) dedupedMap.set(key, row)
    }
    const dedupedTestData = Array.from(dedupedMap.values())
    const inBatchDuplicateCount = allTestData.length - dedupedTestData.length
    console.log(`Storing ${dedupedTestData.length} test records (deduped ${inBatchDuplicateCount} in-batch duplicates)...`)

    const batchSize = 100
    let upsertFailures = 0
    for (let i = 0; i < dedupedTestData.length; i += batchSize) {
      const batch = dedupedTestData.slice(i, i + batchSize)
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
            in_batch_duplicates_removed: inBatchDuplicateCount,
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

    const tgtTeam = scopedTeamId
    const isRetry = manualRetry

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


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const ccApiKey = Deno.env.get('CC_ATHLETICS_API_KEY')
    if (!ccApiKey) {
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

    console.log('Fetching data directly from CC Athletics API...')

    const baseUrl = 'https://europe-west1-forcemate-desktop.cloudfunctions.net'
    const headers = {
      'X-API-Key': ccApiKey,
      'Content-Type': 'application/json',
    }

    // Helper function to handle API responses
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

    // Create team mapping
    const teamMap = new Map()
    teamsData.teams.forEach(team => {
      teamMap.set(team.id, team.name)
    })

    // Process and transform data
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

          allTestData.push({
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
            test_date: new Date(jump.date).toISOString(),
            test_name: testName,
            repetition_number: index + 1,
            gender: demographics.gender,
            metrics: jump.metric_table,
          })
        })
      })
    }

    // Process isometric data
    console.log('Processing isometric data...')
    for (const athlete of isometricData.athletes || []) {
      const demographics = extractDemographics(athlete)
      Object.values(athlete.recordings || {}).forEach(recording => {
        const analysis = recording.isometric_analysis
        if (!analysis?.trials) return

        // For isometric tests, create one record per recording (not per trial)
        // and include the full isometric_analysis structure for limb symmetry calculations
        allTestData.push({
          athlete_id: athlete.id,
          athlete_name: athlete.name,
          team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
           test_date: new Date(recording.date).toISOString(),
          test_name: recording.exercise_name || 'Isometric Test',
          repetition_number: 1, // One record per recording session
          gender: demographics.gender,
          metrics: {
            isometric_analysis: analysis
          },
        })
      })
    }

    // Process pogo data
    console.log('Processing pogo data...')
    for (const athlete of pogoData.athletes || []) {
      const demographics = extractDemographics(athlete)
      Object.values(athlete.recordings || {}).forEach(recording => {
        const analysis = recording.pogo_jump_analysis
        if (!analysis) return

        // Add average metrics row
        if (analysis.avg_metrics) {
          allTestData.push({
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
             test_date: new Date(recording.date).toISOString(),
            test_name: 'Pogo Jump',
            repetition_number: 0, // 0 indicates average
            gender: demographics.gender,
            metrics: analysis.avg_metrics,
          })
        }

        // Add individual jump data
        (analysis.jumps || []).forEach((jump, index) => {
          allTestData.push({
            athlete_id: athlete.id,
            athlete_name: athlete.name,
            team_name: teamMap.get(athlete.team_id) || 'Unknown Team',
            test_date: new Date(recording.date).toISOString(),
            test_name: 'Pogo Jump',
            repetition_number: index + 1,
            gender: demographics.gender,
            metrics: jump,
          })
        })
      })
    }

    console.log(`Processed ${allTestData.length} test records directly from CC Athletics API`)

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

import { NextRequest, NextResponse } from 'next/server'
import { createPick, checkPickExists } from '@/lib/database'
import { CronJobResponse, ErrorResponse, MLRequest, MLResponse } from '@/lib/types'
import { Pick } from '@/lib/database.types'
import { getTodayDate } from '@/lib/utils'
import { fetchGamesFromOddsAPI, getMockGameData } from '@/lib/external-apis'

// Function to call the ML service
async function callMLService(request: MLRequest): Promise<MLResponse> {
  const mlUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000/api/ml/pick'
    : `${process.env.VERCEL_URL || 'https://dailybet-ai.vercel.app'}/api/ml/pick`

  const response = await fetch(mlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`ML service error: ${response.status} - ${errorData.error || 'Unknown error'}`)
  }

  return await response.json()
}

// Function to fetch games from external APIs
async function fetchTodaysGames(date: string) {
  console.log(`Fetching games for ${date}`)
  
  // Try to fetch from external APIs first, fallback to mock data
  try {
    const games = await fetchGamesFromOddsAPI(date)
    if (games.length > 0) {
      return games
    }
  } catch (error) {
    console.warn('External API failed, using mock data:', error)
  }
  
  // Fallback to mock data for development/testing
  return getMockGameData(date)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('Daily pick cron job started')

    // Validate cron secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not set')
      const errorResponse: ErrorResponse = {
        error: 'Server configuration error',
        code: 'CONFIG_ERROR'
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.error('Invalid or missing cron authorization')
      const errorResponse: ErrorResponse = {
        error: 'Unauthorized',
        code: 'UNAUTHORIZED'
      }
      return NextResponse.json(errorResponse, { status: 401 })
    }

    const today = getTodayDate()
    console.log(`Processing daily pick for ${today}`)

    // Check if pick already exists for today
    const existingPickResult = await checkPickExists(today)
    if (existingPickResult.error) {
      console.error('Error checking existing pick:', existingPickResult.error)
      const errorResponse: ErrorResponse = {
        error: 'Database error while checking existing pick',
        code: 'DATABASE_ERROR',
        details: existingPickResult.error
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    if (existingPickResult.data) {
      console.log('Pick already exists for today, skipping generation')
      const response: CronJobResponse = {
        success: true,
        message: 'Pick already exists for today',
        execution_time: Date.now() - startTime
      }
      return NextResponse.json(response)
    }

    // Fetch today's games
    let games
    try {
      games = await fetchTodaysGames(today)
      console.log(`Found ${games.length} games for ${today}`)
    } catch (error) {
      console.error('Error fetching games:', error)
      const errorResponse: ErrorResponse = {
        error: 'Failed to fetch game data',
        code: 'EXTERNAL_API_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    if (games.length === 0) {
      console.log('No games found for today')
      const response: CronJobResponse = {
        success: true,
        message: 'No games available for today',
        execution_time: Date.now() - startTime
      }
      return NextResponse.json(response)
    }

    // Call ML service to generate pick
    let mlResponse: MLResponse
    try {
      const mlRequest: MLRequest = {
        date: today,
        games,
        context: {
          timezone: 'America/Denver',
          min_confidence: 60,
          max_risk: 'medium'
        }
      }

      console.log('Calling ML service for pick generation')
      mlResponse = await callMLService(mlRequest)
      console.log(`ML service returned pick: ${mlResponse.selection}`)
    } catch (error) {
      console.error('Error calling ML service:', error)
      const errorResponse: ErrorResponse = {
        error: 'ML service failed to generate pick',
        code: 'ML_SERVICE_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    // Extract team names from selection for database storage
    const selectionParts = mlResponse.selection.split(' ')
    const teamName = selectionParts.slice(0, -1).join(' ') // Everything except the last part (ML)
    
    // Find the game to get home/away team info
    const selectedGame = games.find(game => 
      game.home_team === teamName || game.away_team === teamName
    )

    if (!selectedGame) {
      console.error('Could not find selected game in games list')
      const errorResponse: ErrorResponse = {
        error: 'Selected game not found in available games',
        code: 'GAME_NOT_FOUND'
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    // Store pick in database
    try {
      const pickData = {
        pick_date: today,
        league: mlResponse.league,
        home_team: selectedGame.home_team,
        away_team: selectedGame.away_team,
        market: mlResponse.market,
        selection: mlResponse.selection,
        odds: mlResponse.odds,
        confidence: mlResponse.confidence,
        rationale: {
          reasoning: mlResponse.rationale.reasoning || 'ML analysis completed',
          topFactors: mlResponse.rationale.top_factors || ['Statistical Analysis', 'Team Performance', 'Market Conditions']
        },
        features_used: mlResponse.features_used
      }

      console.log('Storing pick in database')
      const createResult = await createPick(pickData)
      
      if (createResult.error) {
        console.error('Error storing pick:', createResult.error)
        const errorResponse: ErrorResponse = {
          error: 'Failed to store pick in database',
          code: 'DATABASE_STORE_ERROR',
          details: createResult.error
        }
        return NextResponse.json(errorResponse, { status: 500 })
      }

      const storedPick = createResult.data as Pick | null
      if (!storedPick) {
        const errorResponse: ErrorResponse = {
          error: 'Failed to store pick: No data returned',
          code: 'STORAGE_ERROR'
        }
        return NextResponse.json(errorResponse, { status: 500 })
      }

      console.log(`Successfully stored pick with ID: ${storedPick.id}`)

      const response: CronJobResponse = {
        success: true,
        message: 'Daily pick generated and stored successfully',
        execution_time: Date.now() - startTime,
        pick_generated: {
          id: storedPick.id,
          date: today,
          selection: mlResponse.selection,
          confidence: mlResponse.confidence
        }
      }

      return NextResponse.json(response)

    } catch (error) {
      console.error('Error storing pick in database:', error)
      const errorResponse: ErrorResponse = {
        error: 'Database error while storing pick',
        code: 'DATABASE_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error(`Daily pick cron job failed after ${executionTime}ms:`, error)
    
    const errorResponse: ErrorResponse = {
      error: 'Internal server error during cron job execution',
      code: 'CRON_EXECUTION_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Health check endpoint for the cron job
export async function GET(request: NextRequest) {
  try {
    const today = getTodayDate()
    
    // Check if pick exists for today
    const existingPickResult = await checkPickExists(today)
    
    const healthStatus = {
      status: 'healthy',
      service: 'Daily Pick Cron Job',
      timestamp: new Date().toISOString(),
      today_date: today,
      pick_exists_today: existingPickResult.data || false,
      environment: process.env.NODE_ENV || 'unknown'
    }
    
    return NextResponse.json(healthStatus)
    
  } catch (error) {
    console.error('Cron job health check error:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'Daily Pick Cron Job',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed'
      },
      { status: 503 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createPick, checkPickExists, deletePick, getTodaysPick } from '@/lib/database'
import { RecomputeResponse, ErrorResponse, MLRequest, MLResponse } from '@/lib/types'
import { Pick } from '@/lib/database.types'
import { getTodayDate } from '@/lib/utils'
import { fetchGamesFromOddsAPI, getMockGameData } from '@/lib/external-apis'
import { validateAdminAuth, checkAdminRateLimit, AdminPermissions, hasPermission } from '@/lib/admin-auth'

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
    console.log('Admin recompute endpoint called')

    // Validate admin authentication
    if (!validateAdminAuth(request)) {
      const errorResponse: ErrorResponse = {
        error: 'Unauthorized - Admin access required',
        code: 'UNAUTHORIZED'
      }
      return NextResponse.json(errorResponse, { status: 401 })
    }

    // Check rate limiting
    if (!checkAdminRateLimit(request)) {
      const errorResponse: ErrorResponse = {
        error: 'Rate limit exceeded - Too many admin requests',
        code: 'RATE_LIMIT_EXCEEDED'
      }
      return NextResponse.json(errorResponse, { status: 429 })
    }

    // Check permissions
    if (!hasPermission(request, AdminPermissions.RECOMPUTE_PICKS)) {
      const errorResponse: ErrorResponse = {
        error: 'Insufficient permissions - Cannot recompute picks',
        code: 'INSUFFICIENT_PERMISSIONS'
      }
      return NextResponse.json(errorResponse, { status: 403 })
    }

    // Parse request body to get optional date parameter
    let targetDate = getTodayDate()
    try {
      const body = await request.json().catch(() => ({}))
      if (body.date) {
        targetDate = body.date
      }
    } catch (error) {
      // If JSON parsing fails, just use today's date
      console.log('No valid JSON body provided, using today\'s date')
    }

    console.log(`Recomputing pick for ${targetDate}`)

    // Check if pick already exists for the target date
    const existingPickResult = await getTodaysPick(targetDate)
    let existingPickId: string | null = null
    
    if (existingPickResult.data) {
      existingPickId = existingPickResult.data.id
      console.log(`Found existing pick for ${targetDate}, will replace it`)
      
      // Delete existing pick (this will cascade delete the result too)
      const deleteResult = await deletePick(existingPickId)
      if (deleteResult.error) {
        console.error('Error deleting existing pick:', deleteResult.error)
        const errorResponse: ErrorResponse = {
          error: 'Failed to delete existing pick for recomputation',
          code: 'DELETE_ERROR',
          details: deleteResult.error
        }
        return NextResponse.json(errorResponse, { status: 500 })
      }
      console.log(`Deleted existing pick ${existingPickId}`)
    }

    // Fetch games for the target date
    let games
    try {
      games = await fetchTodaysGames(targetDate)
      console.log(`Found ${games.length} games for ${targetDate}`)
    } catch (error) {
      console.error('Error fetching games:', error)
      const errorResponse: ErrorResponse = {
        error: 'Failed to fetch game data for recomputation',
        code: 'EXTERNAL_API_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    if (games.length === 0) {
      console.log(`No games found for ${targetDate}`)
      const response: RecomputeResponse = {
        success: true,
        message: `No games available for ${targetDate}, no pick generated`
      }
      return NextResponse.json(response)
    }

    // Call ML service to generate new pick
    let mlResponse: MLResponse
    try {
      const mlRequest: MLRequest = {
        date: targetDate,
        games,
        context: {
          timezone: 'America/Denver',
          min_confidence: 60,
          max_risk: 'medium',
          recompute: true // Flag to indicate this is a recomputation
        }
      }

      console.log('Calling ML service for pick recomputation')
      mlResponse = await callMLService(mlRequest)
      console.log(`ML service returned pick: ${mlResponse.selection}`)
    } catch (error) {
      console.error('Error calling ML service:', error)
      const errorResponse: ErrorResponse = {
        error: 'ML service failed to generate pick during recomputation',
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
        error: 'Selected game not found in available games during recomputation',
        code: 'GAME_NOT_FOUND'
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    // Store new pick in database
    try {
      const pickData = {
        pick_date: targetDate,
        league: mlResponse.league,
        home_team: selectedGame.home_team,
        away_team: selectedGame.away_team,
        market: mlResponse.market,
        selection: mlResponse.selection,
        odds: mlResponse.odds,
        confidence: mlResponse.confidence,
        rationale: {
          reasoning: mlResponse.rationale.reasoning || 'ML analysis recomputed',
          topFactors: mlResponse.rationale.top_factors || ['Statistical Analysis', 'Team Performance', 'Market Conditions']
        },
        features_used: mlResponse.features_used
      }

      console.log('Storing recomputed pick in database')
      const createResult = await createPick(pickData)
      
      if (createResult.error) {
        console.error('Error storing recomputed pick:', createResult.error)
        const errorResponse: ErrorResponse = {
          error: 'Failed to store recomputed pick in database',
          code: 'DATABASE_STORE_ERROR',
          details: createResult.error
        }
        return NextResponse.json(errorResponse, { status: 500 })
      }

      const storedPick = createResult.data as Pick | null
      if (!storedPick) {
        const errorResponse: ErrorResponse = {
          error: 'Failed to store recomputed pick: No data returned',
          code: 'STORAGE_ERROR'
        }
        return NextResponse.json(errorResponse, { status: 500 })
      }

      console.log(`Successfully stored recomputed pick with ID: ${storedPick.id}`)

      const response: RecomputeResponse = {
        success: true,
        message: existingPickId 
          ? `Pick for ${targetDate} successfully recomputed and replaced`
          : `New pick for ${targetDate} successfully computed`,
        pick: {
          id: storedPick.id,
          date: targetDate,
          selection: mlResponse.selection,
          confidence: mlResponse.confidence
        }
      }

      return NextResponse.json(response)

    } catch (error) {
      console.error('Error storing recomputed pick in database:', error)
      const errorResponse: ErrorResponse = {
        error: 'Database error while storing recomputed pick',
        code: 'DATABASE_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

  } catch (error) {
    const executionTime = Date.now() - startTime
    console.error(`Admin recompute failed after ${executionTime}ms:`, error)
    
    const errorResponse: ErrorResponse = {
      error: 'Internal server error during pick recomputation',
      code: 'RECOMPUTE_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Health check for admin recompute endpoint
export async function GET(request: NextRequest) {
  try {
    // Validate admin authentication for health check too
    if (!validateAdminAuth(request)) {
      const errorResponse: ErrorResponse = {
        error: 'Unauthorized - Admin access required',
        code: 'UNAUTHORIZED'
      }
      return NextResponse.json(errorResponse, { status: 401 })
    }

    const healthStatus = {
      status: 'healthy',
      service: 'Admin Recompute Endpoint',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    }
    
    return NextResponse.json(healthStatus)
    
  } catch (error) {
    console.error('Admin recompute health check error:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'Admin Recompute Endpoint',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed'
      },
      { status: 503 }
    )
  }
}
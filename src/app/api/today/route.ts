import { NextRequest, NextResponse } from 'next/server'
import { getTodaysPick, getPerformanceStats } from '@/lib/database'
import { TodayResponse } from '@/lib/types'
import { getTodayDate } from '@/lib/utils'
import { withErrorHandling, createErrorResponse, ERROR_CODES, logError } from '@/lib/error-handling'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || getTodayDate()

  logError(`Fetching today's pick for date: ${date}`, undefined, undefined, { date, endpoint: '/api/today' })

  // Fetch today's pick and performance stats in parallel
  const [pickResult, performanceResult] = await Promise.all([
    getTodaysPick(date),
    getPerformanceStats()
  ])

  // Handle pick fetch error
  if (pickResult.error) {
    return createErrorResponse(
      'Failed to fetch today\'s pick',
      ERROR_CODES.PICK_FETCH_ERROR,
      500,
      { date, originalError: pickResult.error }
    )
  }

  // Handle performance stats error
  if (performanceResult.error) {
    return createErrorResponse(
      'Failed to fetch performance statistics',
      ERROR_CODES.PERFORMANCE_FETCH_ERROR,
      500,
      { date, originalError: performanceResult.error }
    )
  }

  // Transform pick data
  let pick = null
  if (pickResult.data) {
    const pickData = pickResult.data
    const rationale = pickData.rationale as any

    pick = {
      id: pickData.id,
      date: pickData.pick_date,
      league: pickData.league,
      market: pickData.market,
      selection: pickData.selection,
      odds: pickData.odds,
      confidence: pickData.confidence,
      rationale: {
        topFactors: rationale?.topFactors || [],
        reasoning: rationale?.reasoning || 'No reasoning provided'
      }
    }
  }

  // Transform performance data
  const performanceData = performanceResult.data as any
  const performance = {
    winRate: performanceData?.win_rate || 0,
    record: `${performanceData?.wins || 0}-${performanceData?.losses || 0}${performanceData?.pushes ? `-${performanceData.pushes}` : ''}`,
    totalPicks: performanceData?.total_picks || 0
  }

  const response: TodayResponse = {
    pick,
    performance
  }

  // Log successful response
  logError(`Successfully fetched today's data`, undefined, undefined, { 
    date, 
    hasPick: !!pick, 
    totalPicks: performance.totalPicks,
    winRate: performance.winRate 
  })

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
    }
  })
})
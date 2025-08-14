import { NextRequest, NextResponse } from 'next/server'
import { getPerformanceStats, getPerformanceHistory, getWinningStreak, getLosingStreak } from '@/lib/database'
import { PerformanceResponse } from '@/lib/types'
import { withErrorHandling, createErrorResponse, ERROR_CODES, AppError, ErrorSeverity, logError } from '@/lib/error-handling'

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const includeChartData = searchParams.get('includeChartData') !== 'false'

  // Validate limit parameter
  if (limit < 1 || limit > 200) {
    throw new AppError(
      'Invalid limit parameter. Limit must be between 1 and 200',
      ERROR_CODES.VALIDATION_ERROR,
      400,
      ErrorSeverity.LOW,
      { limit, validRange: '1-200' }
    )
  }

  // Validate offset parameter
  if (offset < 0) {
    throw new AppError(
      'Invalid offset parameter. Offset must be 0 or greater',
      ERROR_CODES.VALIDATION_ERROR,
      400,
      ErrorSeverity.LOW,
      { offset }
    )
  }

  logError(`Fetching performance data`, undefined, undefined, { 
    limit, 
    offset, 
    includeChartData, 
    endpoint: '/api/performance' 
  })

    // Fetch performance data in parallel
    const [statsResult, historyResult, winStreakResult, lossStreakResult] = await Promise.all([
      getPerformanceStats(),
      getPerformanceHistory(limit, offset),
      getWinningStreak(),
      getLosingStreak()
    ])

  // Handle errors
  if (statsResult.error) {
    throw new AppError(
      'Failed to fetch performance statistics',
      ERROR_CODES.PERFORMANCE_FETCH_ERROR,
      500,
      ErrorSeverity.HIGH,
      { originalError: statsResult.error }
    )
  }

  if (historyResult.error) {
    throw new AppError(
      'Failed to fetch performance history',
      ERROR_CODES.PERFORMANCE_FETCH_ERROR,
      500,
      ErrorSeverity.HIGH,
      { originalError: historyResult.error, limit, offset }
    )
  }

    // Transform stats data
    const statsData = statsResult.data as any
    const currentStreak = statsData?.current_streak as any
    
    // Determine current streak type and count
    let streakType: 'win' | 'loss' | 'none' = 'none'
    let streakCount = 0
    
    if (winStreakResult.data && winStreakResult.data > 0) {
      streakType = 'win'
      streakCount = winStreakResult.data
    } else if (lossStreakResult.data && lossStreakResult.data > 0) {
      streakType = 'loss'
      streakCount = lossStreakResult.data
    }

    const stats = {
      winRate: statsData?.win_rate || 0,
      totalPicks: statsData?.total_picks || 0,
      wins: statsData?.wins || 0,
      losses: statsData?.losses || 0,
      pushes: statsData?.pushes || 0,
      currentStreak: {
        type: streakType,
        count: streakCount
      }
    }

    // Transform history data
    const historyData = historyResult.data || []
    const history = historyData.map((item: any) => ({
      id: item.pick_id || `${item.pick_date}-${item.league}`,
      date: item.pick_date,
      selection: item.selection,
      odds: item.odds,
      confidence: item.confidence,
      result: item.result,
      settledAt: item.settled_at
    }))

    // Generate chart data if requested
    let chartData: any[] = []
    if (includeChartData && historyData.length > 0) {
      chartData = historyData
        .filter((item: any) => item.result !== null)
        .map((item: any) => ({
          date: item.pick_date,
          winRate: item.running_win_rate || 0,
          cumulativeWins: item.cumulative_wins || 0,
          cumulativeLosses: item.cumulative_losses || 0
        }))
        .reverse() // Show chronological order for charts
    }

    const response: PerformanceResponse = {
      stats,
      history,
      chartData
    }

  // Log successful response
  logError(`Successfully fetched performance data`, undefined, undefined, { 
    totalPicks: stats.totalPicks,
    winRate: stats.winRate,
    historyCount: history.length,
    chartDataPoints: chartData.length
  })

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'
    }
  })
})
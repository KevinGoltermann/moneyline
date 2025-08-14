import { NextRequest, NextResponse } from 'next/server'
import { getAllUnsettledPicks } from '@/lib/database'
import { ErrorResponse } from '@/lib/types'
import { validateAdminAuth, checkAdminRateLimit, AdminPermissions, hasPermission } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    console.log('Admin unsettled picks endpoint called')

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
    if (!hasPermission(request, AdminPermissions.VIEW_ADMIN_PANEL)) {
      const errorResponse: ErrorResponse = {
        error: 'Insufficient permissions - Cannot view admin panel',
        code: 'INSUFFICIENT_PERMISSIONS'
      }
      return NextResponse.json(errorResponse, { status: 403 })
    }

    console.log('Fetching all unsettled picks')

    // Fetch unsettled picks from database
    const unsettledResult = await getAllUnsettledPicks()
    if (unsettledResult.error) {
      console.error('Error fetching unsettled picks:', unsettledResult.error)
      const errorResponse: ErrorResponse = {
        error: 'Database error while fetching unsettled picks',
        code: 'DATABASE_ERROR',
        details: unsettledResult.error
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    const unsettledPicks = unsettledResult.data || []
    console.log(`Found ${unsettledPicks.length} unsettled picks`)

    const response = {
      success: true,
      count: unsettledPicks.length,
      picks: unsettledPicks.map(pick => {
        const pickData = pick as any // Cast to access results array from query
        return {
          id: pick.id,
          pick_date: pick.pick_date,
          league: pick.league,
          home_team: pick.home_team,
          away_team: pick.away_team,
          market: pick.market,
          selection: pick.selection,
          odds: pick.odds,
          confidence: pick.confidence,
          rationale: pick.rationale,
          created_at: pick.created_at,
          // Include result info (should be null for unsettled)
          result: pickData.results && pickData.results.length > 0 ? pickData.results[0] : null
        }
      })
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Admin unsettled picks endpoint error:', error)
    
    const errorResponse: ErrorResponse = {
      error: 'Internal server error while fetching unsettled picks',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
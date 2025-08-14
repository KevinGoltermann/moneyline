import { NextRequest, NextResponse } from 'next/server'
import { settlePickResult, getPickById } from '@/lib/database'
import { SettleRequest, SettleResponse, ErrorResponse } from '@/lib/types'
import { Result } from '@/lib/database.types'
import { isValidUUID } from '@/lib/validation'
import { validateAdminAuth, checkAdminRateLimit, AdminPermissions, hasPermission } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    console.log('Admin settle endpoint called')

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
    if (!hasPermission(request, AdminPermissions.SETTLE_PICKS)) {
      const errorResponse: ErrorResponse = {
        error: 'Insufficient permissions - Cannot settle picks',
        code: 'INSUFFICIENT_PERMISSIONS'
      }
      return NextResponse.json(errorResponse, { status: 403 })
    }

    // Parse request body
    let body: SettleRequest
    try {
      body = await request.json()
    } catch (error) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON'
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Validate required fields
    if (!body.pickId || !body.result) {
      const errorResponse: ErrorResponse = {
        error: 'Missing required fields: pickId and result are required',
        code: 'MISSING_FIELDS'
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Validate pickId format
    if (!isValidUUID(body.pickId)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid pickId format - must be a valid UUID',
        code: 'INVALID_PICK_ID'
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Validate result value
    if (!['win', 'loss', 'push'].includes(body.result)) {
      const errorResponse: ErrorResponse = {
        error: 'Invalid result value - must be win, loss, or push',
        code: 'INVALID_RESULT'
      }
      return NextResponse.json(errorResponse, { status: 400 })
    }

    console.log(`Settling pick ${body.pickId} with result: ${body.result}`)

    // Check if pick exists
    const pickResult = await getPickById(body.pickId)
    if (pickResult.error) {
      console.error('Error fetching pick:', pickResult.error)
      const errorResponse: ErrorResponse = {
        error: 'Database error while fetching pick',
        code: 'DATABASE_ERROR',
        details: pickResult.error
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    if (!pickResult.data) {
      const errorResponse: ErrorResponse = {
        error: 'Pick not found',
        code: 'PICK_NOT_FOUND'
      }
      return NextResponse.json(errorResponse, { status: 404 })
    }

    // Check if pick is already settled
    const pickData = pickResult.data as any // Cast to access results array from query
    if (pickData.results && pickData.results.length > 0) {
      const errorResponse: ErrorResponse = {
        error: 'Pick is already settled',
        code: 'ALREADY_SETTLED',
        details: {
          currentResult: pickData.results[0].result,
          settledAt: pickData.results[0].settled_at
        }
      }
      return NextResponse.json(errorResponse, { status: 409 })
    }

    // Settle the pick
    const settleResult = await settlePickResult(body.pickId, body.result, body.notes)
    if (settleResult.error) {
      console.error('Error settling pick:', settleResult.error)
      const errorResponse: ErrorResponse = {
        error: 'Failed to settle pick result',
        code: 'SETTLE_ERROR',
        details: settleResult.error
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    const settledResult = settleResult.data as Result | null
    if (!settledResult) {
      const errorResponse: ErrorResponse = {
        error: 'Failed to settle pick: No data returned',
        code: 'SETTLE_NO_DATA'
      }
      return NextResponse.json(errorResponse, { status: 500 })
    }

    console.log(`Successfully settled pick ${body.pickId} with result: ${body.result}`)

    const response: SettleResponse = {
      success: true,
      message: `Pick settled successfully with result: ${body.result}`,
      result: {
        id: settledResult.id,
        pickId: body.pickId,
        result: body.result,
        settledAt: settledResult.settled_at
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Admin settle endpoint error:', error)
    
    const errorResponse: ErrorResponse = {
      error: 'Internal server error during pick settlement',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Health check for admin settle endpoint
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
      service: 'Admin Settle Endpoint',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    }
    
    return NextResponse.json(healthStatus)
    
  } catch (error) {
    console.error('Admin settle health check error:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'Admin Settle Endpoint',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed'
      },
      { status: 503 }
    )
  }
}
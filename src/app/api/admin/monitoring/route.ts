import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ErrorResponse } from '@/lib/types'

interface MonitoringData {
  system_health: any
  recent_picks: any[]
  performance_summary: any
  error_logs: any[]
  cron_job_status: any
}

// Validate admin access
function validateAdminAccess(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET
  
  if (!adminSecret || !authHeader) {
    return false
  }
  
  return authHeader === `Bearer ${adminSecret}`
}

// Get recent error logs from database (if we implement logging table)
async function getRecentErrors() {
  try {
    // For now, return empty array since we don't have error logging table
    // In a production system, you'd query an error_logs table
    return []
  } catch (error) {
    console.error('Error fetching error logs:', error)
    return []
  }
}

// Get recent picks with their results
async function getRecentPicks() {
  try {
    const { data, error } = await supabase
      .from('picks')
      .select(`
        *,
        results (
          result,
          settled_at
        )
      `)
      .order('pick_date', { ascending: false })
      .limit(10)
    
    if (error) {
      console.error('Error fetching recent picks:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error fetching recent picks:', error)
    return []
  }
}

// Get performance summary
async function getPerformanceSummary() {
  try {
    const { data, error } = await supabase
      .from('v_performance')
      .select('*')
      .single()
    
    if (error) {
      console.error('Error fetching performance summary:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error fetching performance summary:', error)
    return null
  }
}

// Check cron job status
async function getCronJobStatus() {
  try {
    const cronUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000/api/jobs/daily-pick'
      : `${process.env.VERCEL_URL || 'https://dailybet-ai.vercel.app'}/api/jobs/daily-pick`

    const response = await fetch(cronUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return {
        status: 'error',
        message: `HTTP ${response.status}`,
        last_check: new Date().toISOString()
      }
    }
    
    const data = await response.json()
    return {
      status: 'healthy',
      ...data,
      last_check: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Cron job check failed',
      last_check: new Date().toISOString()
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Validate admin access
    if (!validateAdminAccess(request)) {
      const errorResponse: ErrorResponse = {
        error: 'Unauthorized access to monitoring endpoint',
        code: 'UNAUTHORIZED'
      }
      return NextResponse.json(errorResponse, { status: 401 })
    }

    // Get system health
    const healthUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000/api/health'
      : `${process.env.VERCEL_URL || 'https://dailybet-ai.vercel.app'}/api/health`

    let systemHealth
    try {
      const healthResponse = await fetch(healthUrl)
      systemHealth = await healthResponse.json()
    } catch (error) {
      systemHealth = {
        status: 'unhealthy',
        error: 'Failed to fetch system health'
      }
    }

    // Gather all monitoring data in parallel
    const [recentPicks, performanceSummary, errorLogs, cronJobStatus] = await Promise.all([
      getRecentPicks(),
      getPerformanceSummary(),
      getRecentErrors(),
      getCronJobStatus()
    ])

    const monitoringData: MonitoringData = {
      system_health: systemHealth,
      recent_picks: recentPicks,
      performance_summary: performanceSummary,
      error_logs: errorLogs,
      cron_job_status: cronJobStatus
    }

    return NextResponse.json(monitoringData)

  } catch (error) {
    console.error('Monitoring endpoint error:', error)
    
    const errorResponse: ErrorResponse = {
      error: 'Failed to fetch monitoring data',
      code: 'MONITORING_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// POST endpoint for manual system checks
export async function POST(request: NextRequest) {
  try {
    // Validate admin access
    if (!validateAdminAccess(request)) {
      const errorResponse: ErrorResponse = {
        error: 'Unauthorized access to monitoring endpoint',
        code: 'UNAUTHORIZED'
      }
      return NextResponse.json(errorResponse, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'test_cron':
        // Test cron job manually
        const cronUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000/api/jobs/daily-pick'
          : `${process.env.VERCEL_URL || 'https://dailybet-ai.vercel.app'}/api/jobs/daily-pick`

        const cronResponse = await fetch(cronUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
          },
        })

        const cronResult = await cronResponse.json()
        
        return NextResponse.json({
          action: 'test_cron',
          success: cronResponse.ok,
          result: cronResult
        })

      case 'health_check':
        // Force a comprehensive health check
        const healthUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000/api/health'
          : `${process.env.VERCEL_URL || 'https://dailybet-ai.vercel.app'}/api/health`

        const healthResponse = await fetch(healthUrl)
        const healthResult = await healthResponse.json()
        
        return NextResponse.json({
          action: 'health_check',
          success: healthResponse.ok,
          result: healthResult
        })

      default:
        const errorResponse: ErrorResponse = {
          error: 'Unknown monitoring action',
          code: 'INVALID_ACTION'
        }
        return NextResponse.json(errorResponse, { status: 400 })
    }

  } catch (error) {
    console.error('Monitoring action error:', error)
    
    const errorResponse: ErrorResponse = {
      error: 'Failed to execute monitoring action',
      code: 'MONITORING_ACTION_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
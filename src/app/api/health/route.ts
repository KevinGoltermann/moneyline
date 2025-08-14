import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTodayDate } from '@/lib/utils'

interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  response_time?: number
  error?: string
  details?: any
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  checks: HealthCheck[]
  uptime: number
  today_pick_status: {
    exists: boolean
    generated_at?: string
  }
}

// Check database connectivity and performance
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const { data, error } = await supabase
      .from('picks')
      .select('id')
      .limit(1)
    
    const responseTime = Date.now() - start
    
    if (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        response_time: responseTime,
        error: error.message
      }
    }
    
    return {
      service: 'database',
      status: responseTime > 1000 ? 'degraded' : 'healthy',
      response_time: responseTime
    }
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      response_time: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database connection failed'
    }
  }
}

// Check ML service availability
async function checkMLService(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    const mlUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000/api/ml/pick'
      : `${process.env.VERCEL_URL || 'https://dailybet-ai.vercel.app'}/api/ml/pick`

    // Simple health check request
    const response = await fetch(mlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: getTodayDate(),
        games: [],
        context: { health_check: true }
      }),
    })

    const responseTime = Date.now() - start
    
    if (!response.ok) {
      return {
        service: 'ml_service',
        status: 'unhealthy',
        response_time: responseTime,
        error: `HTTP ${response.status}`
      }
    }
    
    return {
      service: 'ml_service',
      status: responseTime > 5000 ? 'degraded' : 'healthy',
      response_time: responseTime
    }
  } catch (error) {
    return {
      service: 'ml_service',
      status: 'unhealthy',
      response_time: Date.now() - start,
      error: error instanceof Error ? error.message : 'ML service unavailable'
    }
  }
}

// Check external APIs availability
async function checkExternalAPIs(): Promise<HealthCheck> {
  const start = Date.now()
  
  try {
    // Check if API keys are configured
    const oddsApiKey = process.env.ODDS_API_KEY
    const weatherApiKey = process.env.WEATHER_API_KEY
    
    if (!oddsApiKey || !weatherApiKey) {
      return {
        service: 'external_apis',
        status: 'degraded',
        response_time: Date.now() - start,
        error: 'API keys not configured',
        details: {
          odds_api_configured: !!oddsApiKey,
          weather_api_configured: !!weatherApiKey
        }
      }
    }
    
    return {
      service: 'external_apis',
      status: 'healthy',
      response_time: Date.now() - start,
      details: {
        odds_api_configured: true,
        weather_api_configured: true
      }
    }
  } catch (error) {
    return {
      service: 'external_apis',
      status: 'unhealthy',
      response_time: Date.now() - start,
      error: error instanceof Error ? error.message : 'External API check failed'
    }
  }
}

// Check today's pick status
async function checkTodayPickStatus() {
  try {
    const today = getTodayDate()
    const { data, error } = await supabase
      .from('picks')
      .select('created_at')
      .eq('pick_date', today)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error
    }
    
    return {
      exists: !!data,
      generated_at: data?.created_at
    }
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Run all health checks in parallel
    const [databaseCheck, mlServiceCheck, externalAPIsCheck, todayPickStatus] = await Promise.all([
      checkDatabase(),
      checkMLService(),
      checkExternalAPIs(),
      checkTodayPickStatus()
    ])
    
    const checks = [databaseCheck, mlServiceCheck, externalAPIsCheck]
    
    // Determine overall system status
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy')
    const hasDegraded = checks.some(check => check.status === 'degraded')
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (hasUnhealthy) {
      overallStatus = 'unhealthy'
    } else if (hasDegraded) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }
    
    const health: SystemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      checks,
      uptime: Date.now() - startTime,
      today_pick_status: todayPickStatus
    }
    
    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503
    
    return NextResponse.json(health, { status: httpStatus })
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    const errorHealth: SystemHealth = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      checks: [{
        service: 'system',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check system failure'
      }],
      uptime: Date.now() - startTime,
      today_pick_status: { exists: false }
    }
    
    return NextResponse.json(errorHealth, { status: 503 })
  }
}
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../daily-pick/route'

// Mock environment variables
const originalEnv = process.env

// Mock database functions
vi.mock('@/lib/database', () => ({
  checkPickExists: vi.fn(),
  createPick: vi.fn(),
}))

// Mock utils
vi.mock('@/lib/utils', () => ({
  getTodayDate: vi.fn(() => '2024-01-15'),
}))

// Mock fetch for ML service calls
global.fetch = vi.fn()

describe('/api/jobs/daily-pick Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      CRON_SECRET: 'test-cron-secret',
      NODE_ENV: 'test'
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should complete full workflow: check existing pick, call ML service, store result', async () => {
    const { checkPickExists, createPick } = await import('@/lib/database')
    
    // Mock no existing pick
    vi.mocked(checkPickExists).mockResolvedValue({ data: false, error: null })
    
    // Mock successful pick creation
    const mockCreatedPick = {
      id: 'integration-test-pick',
      pick_date: '2024-01-15',
      league: 'NBA',
      home_team: 'Lakers',
      away_team: 'Warriors',
      market: 'moneyline',
      selection: 'Lakers ML',
      odds: -110,
      confidence: 78.5,
      rationale: {
        reasoning: 'Lakers have strong home advantage and recent form',
        top_factors: ['Home court advantage', 'Recent winning streak', 'Key player health'],
        risk_assessment: 'Medium risk with good value'
      },
      features_used: ['odds_value', 'team_strength', 'home_advantage'],
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z'
    }
    
    vi.mocked(createPick).mockResolvedValue({
      data: mockCreatedPick,
      error: null
    })

    // Mock ML service response
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        selection: 'Lakers ML',
        market: 'moneyline',
        league: 'NBA',
        odds: -110,
        confidence: 78.5,
        rationale: {
          reasoning: 'Lakers have strong home advantage and recent form',
          top_factors: ['Home court advantage', 'Recent winning streak', 'Key player health'],
          risk_assessment: 'Medium risk with good value'
        },
        features_used: ['odds_value', 'team_strength', 'home_advantage']
      })
    } as Response)

    const request = new NextRequest('http://localhost:3000/api/jobs/daily-pick', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer test-cron-secret'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    // Verify response
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Daily pick generated and stored successfully')
    expect(data.pick_generated).toEqual({
      id: 'integration-test-pick',
      date: '2024-01-15',
      selection: 'Lakers ML',
      confidence: 78.5
    })
    expect(data.execution_time).toBeGreaterThan(0)

    // Verify database interactions
    expect(checkPickExists).toHaveBeenCalledWith('2024-01-15')
    expect(createPick).toHaveBeenCalledWith({
      pick_date: '2024-01-15',
      league: 'NBA',
      home_team: 'Lakers',
      away_team: 'Warriors',
      market: 'moneyline',
      selection: 'Lakers ML',
      odds: -110,
      confidence: 78.5,
      rationale: {
        reasoning: 'Lakers have strong home advantage and recent form',
        topFactors: ['Home court advantage', 'Recent winning streak', 'Key player health'],
        risk_assessment: 'Medium risk with good value'
      },
      features_used: ['odds_value', 'team_strength', 'home_advantage']
    })

    // Verify ML service was called
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ml/pick'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('2024-01-15')
      })
    )
  })

  it('should handle ML service timeout gracefully', async () => {
    const { checkPickExists } = await import('@/lib/database')
    vi.mocked(checkPickExists).mockResolvedValue({ data: false, error: null })

    // Mock ML service timeout
    vi.mocked(fetch).mockImplementation(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 100)
      )
    )

    const request = new NextRequest('http://localhost:3000/api/jobs/daily-pick', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer test-cron-secret'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('ML service failed to generate pick')
    expect(data.code).toBe('ML_SERVICE_ERROR')
  })

  it('should handle database connection issues during pick creation', async () => {
    const { checkPickExists, createPick } = await import('@/lib/database')
    
    vi.mocked(checkPickExists).mockResolvedValue({ data: false, error: null })
    vi.mocked(createPick).mockResolvedValue({
      data: null,
      error: 'Connection timeout'
    })

    // Mock successful ML service response
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        selection: 'Lakers ML',
        market: 'moneyline',
        league: 'NBA',
        odds: -110,
        confidence: 75.0,
        rationale: {
          reasoning: 'Test reasoning',
          top_factors: ['Test factor'],
          risk_assessment: 'Low risk'
        },
        features_used: ['test_feature']
      })
    } as Response)

    const request = new NextRequest('http://localhost:3000/api/jobs/daily-pick', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer test-cron-secret'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to store pick in database')
    expect(data.code).toBe('DATABASE_STORE_ERROR')
  })

  it('should handle malformed ML service response', async () => {
    const { checkPickExists } = await import('@/lib/database')
    vi.mocked(checkPickExists).mockResolvedValue({ data: false, error: null })

    // Mock ML service with malformed response
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        // Missing required fields
        selection: 'Lakers ML',
        // missing market, league, odds, confidence, rationale
      })
    } as Response)

    const request = new NextRequest('http://localhost:3000/api/jobs/daily-pick', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer test-cron-secret'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('ML service failed to generate pick')
    expect(data.code).toBe('ML_SERVICE_ERROR')
  })

  it('should handle concurrent requests properly', async () => {
    const { checkPickExists, createPick } = await import('@/lib/database')
    
    // First request finds no pick
    vi.mocked(checkPickExists).mockResolvedValueOnce({ data: false, error: null })
    // Second request finds existing pick (race condition simulation)
    vi.mocked(checkPickExists).mockResolvedValueOnce({ data: true, error: null })
    
    vi.mocked(createPick).mockResolvedValue({
      data: {
        id: 'test-pick',
        pick_date: '2024-01-15',
        league: 'NBA',
        home_team: 'Lakers',
        away_team: 'Warriors',
        market: 'moneyline',
        selection: 'Lakers ML',
        odds: -110,
        confidence: 75,
        rationale: {},
        features_used: [],
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      },
      error: null
    })

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        selection: 'Lakers ML',
        market: 'moneyline',
        league: 'NBA',
        odds: -110,
        confidence: 75,
        rationale: { reasoning: 'Test', top_factors: [], risk_assessment: 'Low' },
        features_used: []
      })
    } as Response)

    const request1 = new NextRequest('http://localhost:3000/api/jobs/daily-pick', {
      method: 'POST',
      headers: { 'authorization': 'Bearer test-cron-secret' }
    })

    const request2 = new NextRequest('http://localhost:3000/api/jobs/daily-pick', {
      method: 'POST',
      headers: { 'authorization': 'Bearer test-cron-secret' }
    })

    // Execute requests concurrently
    const [response1, response2] = await Promise.all([
      POST(request1),
      POST(request2)
    ])

    const [data1, data2] = await Promise.all([
      response1.json(),
      response2.json()
    ])

    // First request should succeed
    expect(response1.status).toBe(200)
    expect(data1.success).toBe(true)

    // Second request should skip (pick already exists)
    expect(response2.status).toBe(200)
    expect(data2.message).toBe('Pick already exists for today')
  })

  it('should validate ML service response structure', async () => {
    const { checkPickExists } = await import('@/lib/database')
    vi.mocked(checkPickExists).mockResolvedValue({ data: false, error: null })

    // Mock ML service with invalid confidence value
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        selection: 'Lakers ML',
        market: 'moneyline',
        league: 'NBA',
        odds: -110,
        confidence: 150, // Invalid confidence > 100
        rationale: {
          reasoning: 'Test reasoning',
          top_factors: ['Test factor'],
          risk_assessment: 'Low risk'
        },
        features_used: ['test_feature']
      })
    } as Response)

    const request = new NextRequest('http://localhost:3000/api/jobs/daily-pick', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer test-cron-secret'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to store pick in database')
    expect(data.code).toBe('DATABASE_STORE_ERROR')
  })
})
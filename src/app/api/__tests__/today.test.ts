import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../today/route'
import { NextRequest } from 'next/server'
import * as database from '@/lib/database'
import * as utils from '@/lib/utils'

// Mock the database functions
vi.mock('@/lib/database', () => ({
  getTodaysPick: vi.fn(),
  getPerformanceStats: vi.fn()
}))

// Mock the utils functions
vi.mock('@/lib/utils', () => ({
  getTodayDate: vi.fn(() => '2024-01-15')
}))

describe('/api/today', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return today\'s pick and performance data successfully', async () => {
    // Mock successful responses
    const mockPick = {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        pick_date: '2024-01-15',
        league: 'NFL',
        home_team: 'Kansas City Chiefs',
        away_team: 'Buffalo Bills',
        market: 'moneyline',
        selection: 'Kansas City Chiefs',
        odds: -110,
        confidence: 75,
        rationale: {
          topFactors: ['Strong home record', 'Key player healthy'],
          reasoning: 'Chiefs have been dominant at home this season'
        },
        features_used: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        result: null
      },
      error: null
    }

    const mockPerformance = {
      data: {
        total_picks: 25,
        wins: 18,
        losses: 7,
        pushes: 0,
        win_rate: 72.0,
        settled_picks: 25,
        current_streak: null
      },
      error: null
    }

    vi.mocked(database.getTodaysPick).mockResolvedValue(mockPick as any)
    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockPerformance as any)

    const request = new NextRequest('http://localhost:3000/api/today')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pick).toEqual({
      id: '123e4567-e89b-12d3-a456-426614174000',
      date: '2024-01-15',
      league: 'NFL',
      market: 'moneyline',
      selection: 'Kansas City Chiefs',
      odds: -110,
      confidence: 75,
      rationale: {
        topFactors: ['Strong home record', 'Key player healthy'],
        reasoning: 'Chiefs have been dominant at home this season'
      }
    })
    expect(data.performance).toEqual({
      winRate: 72.0,
      record: '18-7',
      totalPicks: 25
    })
  })

  it('should return null pick when no pick exists for today', async () => {
    const mockNoPick = {
      data: null,
      error: null
    }

    const mockPerformance = {
      data: {
        total_picks: 25,
        wins: 18,
        losses: 7,
        pushes: 0,
        win_rate: 72.0,
        settled_picks: 25,
        current_streak: null
      },
      error: null
    }

    vi.mocked(database.getTodaysPick).mockResolvedValue(mockNoPick as any)
    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockPerformance as any)

    const request = new NextRequest('http://localhost:3000/api/today')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pick).toBeNull()
    expect(data.performance).toBeDefined()
  })

  it('should handle custom date parameter', async () => {
    const mockPick = {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        pick_date: '2024-01-10',
        league: 'NBA',
        home_team: 'Los Angeles Lakers',
        away_team: 'Boston Celtics',
        market: 'moneyline',
        selection: 'Los Angeles Lakers',
        odds: 120,
        confidence: 68,
        rationale: {
          topFactors: ['Home court advantage'],
          reasoning: 'Lakers playing well at home'
        },
        features_used: null,
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2024-01-10T10:00:00Z',
        result: null
      },
      error: null
    }

    const mockPerformance = {
      data: {
        total_picks: 25,
        wins: 18,
        losses: 7,
        pushes: 0,
        win_rate: 72.0,
        settled_picks: 25,
        current_streak: null
      },
      error: null
    }

    vi.mocked(database.getTodaysPick).mockResolvedValue(mockPick as any)
    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockPerformance as any)

    const request = new NextRequest('http://localhost:3000/api/today?date=2024-01-10')
    const response = await GET(request)

    expect(database.getTodaysPick).toHaveBeenCalledWith('2024-01-10')
    expect(response.status).toBe(200)
  })

  it('should handle pick fetch error', async () => {
    const mockPickError = {
      data: null,
      error: 'Database connection failed'
    }

    const mockPerformance = {
      data: {
        total_picks: 25,
        wins: 18,
        losses: 7,
        pushes: 0,
        win_rate: 72.0,
        settled_picks: 25,
        current_streak: null
      },
      error: null
    }

    vi.mocked(database.getTodaysPick).mockResolvedValue(mockPickError as any)
    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockPerformance as any)

    const request = new NextRequest('http://localhost:3000/api/today')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch today\'s pick')
    expect(data.code).toBe('PICK_FETCH_ERROR')
  })

  it('should handle performance stats fetch error', async () => {
    const mockPick = {
      data: null,
      error: null
    }

    const mockPerformanceError = {
      data: null,
      error: 'Performance view not found'
    }

    vi.mocked(database.getTodaysPick).mockResolvedValue(mockPick as any)
    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockPerformanceError as any)

    const request = new NextRequest('http://localhost:3000/api/today')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch performance statistics')
    expect(data.code).toBe('PERFORMANCE_FETCH_ERROR')
  })

  it('should handle performance data with pushes', async () => {
    const mockPick = {
      data: null,
      error: null
    }

    const mockPerformance = {
      data: {
        total_picks: 30,
        wins: 18,
        losses: 10,
        pushes: 2,
        win_rate: 64.3,
        settled_picks: 30,
        current_streak: null
      },
      error: null
    }

    vi.mocked(database.getTodaysPick).mockResolvedValue(mockPick as any)
    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockPerformance as any)

    const request = new NextRequest('http://localhost:3000/api/today')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.performance.record).toBe('18-10-2')
  })

  it('should handle unexpected errors', async () => {
    vi.mocked(database.getTodaysPick).mockRejectedValue(new Error('Unexpected error'))

    const request = new NextRequest('http://localhost:3000/api/today')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Unexpected error')
    expect(data.code).toBe('INTERNAL_ERROR')
  })

  it('should handle missing rationale data gracefully', async () => {
    const mockPick = {
      data: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        pick_date: '2024-01-15',
        league: 'NFL',
        home_team: 'Kansas City Chiefs',
        away_team: 'Buffalo Bills',
        market: 'moneyline',
        selection: 'Kansas City Chiefs',
        odds: -110,
        confidence: 75,
        rationale: {}, // Empty rationale
        features_used: null,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        result: null
      },
      error: null
    }

    const mockPerformance = {
      data: {
        total_picks: 25,
        wins: 18,
        losses: 7,
        pushes: 0,
        win_rate: 72.0,
        settled_picks: 25,
        current_streak: null
      },
      error: null
    }

    vi.mocked(database.getTodaysPick).mockResolvedValue(mockPick as any)
    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockPerformance as any)

    const request = new NextRequest('http://localhost:3000/api/today')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pick.rationale.topFactors).toEqual([])
    expect(data.pick.rationale.reasoning).toBe('No reasoning provided')
  })

  it('should set appropriate cache headers', async () => {
    const mockPick = { data: null, error: null }
    const mockPerformance = {
      data: {
        total_picks: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        win_rate: 0,
        settled_picks: 0,
        current_streak: null
      },
      error: null
    }

    vi.mocked(database.getTodaysPick).mockResolvedValue(mockPick as any)
    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockPerformance as any)

    const request = new NextRequest('http://localhost:3000/api/today')
    const response = await GET(request)

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, stale-while-revalidate=600')
  })
})
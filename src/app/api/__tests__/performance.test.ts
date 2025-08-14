import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../performance/route'
import { NextRequest } from 'next/server'
import * as database from '@/lib/database'

// Mock the database functions
vi.mock('@/lib/database', () => ({
  getPerformanceStats: vi.fn(),
  getPerformanceHistory: vi.fn(),
  getWinningStreak: vi.fn(),
  getLosingStreak: vi.fn()
}))

describe('/api/performance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return performance data successfully', async () => {
    const mockStats = {
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

    const mockHistory = {
      data: [
        {
          pick_id: '123e4567-e89b-12d3-a456-426614174000',
          pick_date: '2024-01-15',
          league: 'NFL',
          selection: 'Kansas City Chiefs',
          odds: -110,
          confidence: 75,
          result: 'win' as const,
          settled_at: '2024-01-16T10:00:00Z',
          running_win_rate: 72.0,
          cumulative_wins: 18,
          cumulative_losses: 7,
          cumulative_pushes: 0
        },
        {
          pick_id: '123e4567-e89b-12d3-a456-426614174001',
          pick_date: '2024-01-14',
          league: 'NBA',
          selection: 'Los Angeles Lakers',
          odds: 120,
          confidence: 68,
          result: 'loss' as const,
          settled_at: '2024-01-15T10:00:00Z',
          running_win_rate: 70.8,
          cumulative_wins: 17,
          cumulative_losses: 7,
          cumulative_pushes: 0
        }
      ],
      error: null
    }

    const mockWinStreak = { data: 3, error: null }
    const mockLossStreak = { data: 0, error: null }

    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockStats as any)
    vi.mocked(database.getPerformanceHistory).mockResolvedValue(mockHistory as any)
    vi.mocked(database.getWinningStreak).mockResolvedValue(mockWinStreak as any)
    vi.mocked(database.getLosingStreak).mockResolvedValue(mockLossStreak as any)

    const request = new NextRequest('http://localhost:3000/api/performance')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.stats).toEqual({
      winRate: 72.0,
      totalPicks: 25,
      wins: 18,
      losses: 7,
      pushes: 0,
      currentStreak: {
        type: 'win',
        count: 3
      }
    })
    expect(data.history).toHaveLength(2)
    expect(data.chartData).toHaveLength(2)
  })

  it('should handle custom limit parameter', async () => {
    const mockStats = {
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

    const mockHistory = { data: [], error: null }
    const mockWinStreak = { data: 0, error: null }
    const mockLossStreak = { data: 0, error: null }

    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockStats as any)
    vi.mocked(database.getPerformanceHistory).mockResolvedValue(mockHistory as any)
    vi.mocked(database.getWinningStreak).mockResolvedValue(mockWinStreak as any)
    vi.mocked(database.getLosingStreak).mockResolvedValue(mockLossStreak as any)

    const request = new NextRequest('http://localhost:3000/api/performance?limit=100')
    const response = await GET(request)

    expect(database.getPerformanceHistory).toHaveBeenCalledWith(100, 0)
    expect(response.status).toBe(200)
  })

  it('should reject invalid limit parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/performance?limit=300')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid limit parameter. Limit must be between 1 and 200')
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('should handle losing streak', async () => {
    const mockStats = {
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

    const mockHistory = { data: [], error: null }
    const mockWinStreak = { data: 0, error: null }
    const mockLossStreak = { data: 2, error: null }

    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockStats as any)
    vi.mocked(database.getPerformanceHistory).mockResolvedValue(mockHistory as any)
    vi.mocked(database.getWinningStreak).mockResolvedValue(mockWinStreak as any)
    vi.mocked(database.getLosingStreak).mockResolvedValue(mockLossStreak as any)

    const request = new NextRequest('http://localhost:3000/api/performance')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.stats.currentStreak).toEqual({
      type: 'loss',
      count: 2
    })
  })

  it('should handle no streak', async () => {
    const mockStats = {
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

    const mockHistory = { data: [], error: null }
    const mockWinStreak = { data: 0, error: null }
    const mockLossStreak = { data: 0, error: null }

    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockStats as any)
    vi.mocked(database.getPerformanceHistory).mockResolvedValue(mockHistory as any)
    vi.mocked(database.getWinningStreak).mockResolvedValue(mockWinStreak as any)
    vi.mocked(database.getLosingStreak).mockResolvedValue(mockLossStreak as any)

    const request = new NextRequest('http://localhost:3000/api/performance')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.stats.currentStreak).toEqual({
      type: 'none',
      count: 0
    })
  })

  it('should exclude chart data when requested', async () => {
    const mockStats = {
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

    const mockHistory = {
      data: [
        {
          pick_id: '123e4567-e89b-12d3-a456-426614174000',
          pick_date: '2024-01-15',
          league: 'NFL',
          selection: 'Kansas City Chiefs',
          odds: -110,
          confidence: 75,
          result: 'win' as const,
          settled_at: '2024-01-16T10:00:00Z',
          running_win_rate: 72.0,
          cumulative_wins: 18,
          cumulative_losses: 7,
          cumulative_pushes: 0
        }
      ],
      error: null
    }

    const mockWinStreak = { data: 0, error: null }
    const mockLossStreak = { data: 0, error: null }

    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockStats as any)
    vi.mocked(database.getPerformanceHistory).mockResolvedValue(mockHistory as any)
    vi.mocked(database.getWinningStreak).mockResolvedValue(mockWinStreak as any)
    vi.mocked(database.getLosingStreak).mockResolvedValue(mockLossStreak as any)

    const request = new NextRequest('http://localhost:3000/api/performance?includeChartData=false')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.chartData).toEqual([])
  })

  it('should handle stats fetch error', async () => {
    const mockStatsError = {
      data: null,
      error: 'Performance view not found'
    }

    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockStatsError as any)

    const request = new NextRequest('http://localhost:3000/api/performance')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch performance statistics')
    expect(data.code).toBe('PERFORMANCE_FETCH_ERROR')
  })

  it('should handle history fetch error', async () => {
    const mockStats = {
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

    const mockHistoryError = {
      data: null,
      error: 'History view not found'
    }

    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockStats as any)
    vi.mocked(database.getPerformanceHistory).mockResolvedValue(mockHistoryError as any)

    const request = new NextRequest('http://localhost:3000/api/performance')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch performance history')
    expect(data.code).toBe('PERFORMANCE_FETCH_ERROR')
  })

  it('should handle empty history data', async () => {
    const mockStats = {
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

    const mockHistory = { data: [], error: null }
    const mockWinStreak = { data: 0, error: null }
    const mockLossStreak = { data: 0, error: null }

    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockStats as any)
    vi.mocked(database.getPerformanceHistory).mockResolvedValue(mockHistory as any)
    vi.mocked(database.getWinningStreak).mockResolvedValue(mockWinStreak as any)
    vi.mocked(database.getLosingStreak).mockResolvedValue(mockLossStreak as any)

    const request = new NextRequest('http://localhost:3000/api/performance')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.history).toEqual([])
    expect(data.chartData).toEqual([])
  })

  it('should filter out unsettled picks from chart data', async () => {
    const mockStats = {
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

    const mockHistory = {
      data: [
        {
          pick_id: '123e4567-e89b-12d3-a456-426614174000',
          pick_date: '2024-01-15',
          league: 'NFL',
          selection: 'Kansas City Chiefs',
          odds: -110,
          confidence: 75,
          result: 'win' as const,
          settled_at: '2024-01-16T10:00:00Z',
          running_win_rate: 72.0,
          cumulative_wins: 18,
          cumulative_losses: 7,
          cumulative_pushes: 0
        },
        {
          pick_id: '123e4567-e89b-12d3-a456-426614174001',
          pick_date: '2024-01-16',
          league: 'NBA',
          selection: 'Los Angeles Lakers',
          odds: 120,
          confidence: 68,
          result: null, // Unsettled pick
          settled_at: null,
          running_win_rate: null,
          cumulative_wins: null,
          cumulative_losses: null,
          cumulative_pushes: null
        }
      ],
      error: null
    }

    const mockWinStreak = { data: 0, error: null }
    const mockLossStreak = { data: 0, error: null }

    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockStats as any)
    vi.mocked(database.getPerformanceHistory).mockResolvedValue(mockHistory as any)
    vi.mocked(database.getWinningStreak).mockResolvedValue(mockWinStreak as any)
    vi.mocked(database.getLosingStreak).mockResolvedValue(mockLossStreak as any)

    const request = new NextRequest('http://localhost:3000/api/performance')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.history).toHaveLength(2) // Both picks in history
    expect(data.chartData).toHaveLength(1) // Only settled pick in chart data
  })

  it('should handle unexpected errors', async () => {
    vi.mocked(database.getPerformanceStats).mockRejectedValue(new Error('Unexpected error'))

    const request = new NextRequest('http://localhost:3000/api/performance')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Unexpected error')
    expect(data.code).toBe('INTERNAL_ERROR')
  })

  it('should set appropriate cache headers', async () => {
    const mockStats = {
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

    const mockHistory = { data: [], error: null }
    const mockWinStreak = { data: 0, error: null }
    const mockLossStreak = { data: 0, error: null }

    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockStats as any)
    vi.mocked(database.getPerformanceHistory).mockResolvedValue(mockHistory as any)
    vi.mocked(database.getWinningStreak).mockResolvedValue(mockWinStreak as any)
    vi.mocked(database.getLosingStreak).mockResolvedValue(mockLossStreak as any)

    const request = new NextRequest('http://localhost:3000/api/performance')
    const response = await GET(request)

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, stale-while-revalidate=600')
  })

  it('should handle null history data gracefully', async () => {
    const mockStats = {
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

    const mockHistory = { data: null, error: null }
    const mockWinStreak = { data: 0, error: null }
    const mockLossStreak = { data: 0, error: null }

    vi.mocked(database.getPerformanceStats).mockResolvedValue(mockStats as any)
    vi.mocked(database.getPerformanceHistory).mockResolvedValue(mockHistory as any)
    vi.mocked(database.getWinningStreak).mockResolvedValue(mockWinStreak as any)
    vi.mocked(database.getLosingStreak).mockResolvedValue(mockLossStreak as any)

    const request = new NextRequest('http://localhost:3000/api/performance')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.history).toEqual([])
    expect(data.chartData).toEqual([])
  })
})
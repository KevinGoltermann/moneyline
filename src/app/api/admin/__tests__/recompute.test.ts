import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '../recompute/route'

// Mock the database functions
vi.mock('@/lib/database', () => ({
  createPick: vi.fn(),
  getTodaysPick: vi.fn(),
  deletePick: vi.fn()
}))

// Mock the admin auth
vi.mock('@/lib/admin-auth', () => ({
  validateAdminAuth: vi.fn(),
  checkAdminRateLimit: vi.fn(),
  hasPermission: vi.fn(),
  AdminPermissions: {
    RECOMPUTE_PICKS: 'recompute_picks'
  }
}))

// Mock the utils
vi.mock('@/lib/utils', () => ({
  getTodayDate: vi.fn()
}))

// Mock the external APIs
vi.mock('@/lib/external-apis', () => ({
  fetchGamesFromOddsAPI: vi.fn(),
  getMockGameData: vi.fn()
}))

import { createPick, getTodaysPick, deletePick } from '@/lib/database'
import { validateAdminAuth, checkAdminRateLimit, hasPermission } from '@/lib/admin-auth'
import { getTodayDate } from '@/lib/utils'
import { fetchGamesFromOddsAPI, getMockGameData } from '@/lib/external-apis'

// Mock fetch for ML service calls
global.fetch = vi.fn()

describe('/api/admin/recompute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up default environment
    process.env.ADMIN_SECRET = 'test-admin-secret'
    process.env.NODE_ENV = 'test'
    
    // Default mocks
    vi.mocked(getTodayDate).mockReturnValue('2024-01-15')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('POST', () => {
    it('should return 401 if admin authentication fails', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/admin/recompute', {
        method: 'POST',
        headers: { 'authorization': 'Bearer invalid-token' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized - Admin access required')
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('should return 429 if rate limit is exceeded', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)
      vi.mocked(checkAdminRateLimit).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/admin/recompute', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded - Too many admin requests')
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('should return 403 if insufficient permissions', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)
      vi.mocked(checkAdminRateLimit).mockReturnValue(true)
      vi.mocked(hasPermission).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/admin/recompute', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Insufficient permissions - Cannot recompute picks')
      expect(data.code).toBe('INSUFFICIENT_PERMISSIONS')
    })

    it('should handle no games available', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)
      vi.mocked(checkAdminRateLimit).mockReturnValue(true)
      vi.mocked(hasPermission).mockReturnValue(true)
      vi.mocked(getTodaysPick).mockResolvedValue({ data: null, error: null })
      vi.mocked(fetchGamesFromOddsAPI).mockResolvedValue([])
      vi.mocked(getMockGameData).mockReturnValue([])

      const request = new NextRequest('http://localhost:3000/api/admin/recompute', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('No games available for 2024-01-15, no pick generated')
    })

    it('should successfully recompute pick when no existing pick', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)
      vi.mocked(checkAdminRateLimit).mockReturnValue(true)
      vi.mocked(hasPermission).mockReturnValue(true)
      vi.mocked(getTodaysPick).mockResolvedValue({ data: null, error: null })
      
      const mockGames = [
        {
          home_team: 'Team A',
          away_team: 'Team B',
          league: 'NBA',
          start_time: '2024-01-15T20:00:00Z',
          odds: { home: -110, away: +105 }
        }
      ]
      vi.mocked(fetchGamesFromOddsAPI).mockResolvedValue(mockGames)
      
      const mockMLResponse = {
        selection: 'Team A ML',
        market: 'moneyline',
        league: 'NBA',
        odds: -110,
        confidence: 75,
        rationale: { reasoning: 'Strong team performance', top_factors: ['Recent form', 'Home advantage'] },
        features_used: ['odds', 'team_stats']
      }
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMLResponse)
      } as Response)
      
      vi.mocked(createPick).mockResolvedValue({
        data: {
          id: 'new-pick-id',
          pick_date: '2024-01-15',
          selection: 'Team A ML'
        } as any,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/admin/recompute', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('New pick for 2024-01-15 successfully computed')
      expect(data.pick.id).toBe('new-pick-id')
      expect(data.pick.selection).toBe('Team A ML')
    })

    it('should successfully recompute pick when existing pick exists', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)
      vi.mocked(checkAdminRateLimit).mockReturnValue(true)
      vi.mocked(hasPermission).mockReturnValue(true)
      vi.mocked(getTodaysPick).mockResolvedValue({
        data: { id: 'existing-pick-id' } as any,
        error: null
      })
      vi.mocked(deletePick).mockResolvedValue({ data: null, error: null })
      
      const mockGames = [
        {
          home_team: 'Team A',
          away_team: 'Team B',
          league: 'NBA',
          start_time: '2024-01-15T20:00:00Z',
          odds: { home: -110, away: +105 }
        }
      ]
      vi.mocked(fetchGamesFromOddsAPI).mockResolvedValue(mockGames)
      
      const mockMLResponse = {
        selection: 'Team A ML',
        market: 'moneyline',
        league: 'NBA',
        odds: -110,
        confidence: 75,
        rationale: { reasoning: 'Strong team performance', top_factors: ['Recent form', 'Home advantage'] },
        features_used: ['odds', 'team_stats']
      }
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMLResponse)
      } as Response)
      
      vi.mocked(createPick).mockResolvedValue({
        data: {
          id: 'new-pick-id',
          pick_date: '2024-01-15',
          selection: 'Team A ML'
        } as any,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/admin/recompute', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Pick for 2024-01-15 successfully recomputed and replaced')
      expect(deletePick).toHaveBeenCalledWith('existing-pick-id')
    })

    it('should handle ML service errors', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)
      vi.mocked(checkAdminRateLimit).mockReturnValue(true)
      vi.mocked(hasPermission).mockReturnValue(true)
      vi.mocked(getTodaysPick).mockResolvedValue({ data: null, error: null })
      
      const mockGames = [
        {
          home_team: 'Team A',
          away_team: 'Team B',
          league: 'NBA',
          start_time: '2024-01-15T20:00:00Z',
          odds: { home: -110, away: +105 }
        }
      ]
      vi.mocked(fetchGamesFromOddsAPI).mockResolvedValue(mockGames)
      
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'ML service error' })
      } as Response)

      const request = new NextRequest('http://localhost:3000/api/admin/recompute', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('ML service failed to generate pick during recomputation')
      expect(data.code).toBe('ML_SERVICE_ERROR')
    })
  })

  describe('GET', () => {
    it('should return health status for authenticated admin', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/admin/recompute', {
        method: 'GET',
        headers: { 'authorization': 'Bearer test-admin-secret' }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.service).toBe('Admin Recompute Endpoint')
    })

    it('should return 401 for unauthenticated health check', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/admin/recompute', {
        method: 'GET',
        headers: { 'authorization': 'Bearer invalid-token' }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized - Admin access required')
    })
  })
})
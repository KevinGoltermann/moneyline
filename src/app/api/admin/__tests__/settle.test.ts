import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '../settle/route'

// Mock the database functions
vi.mock('@/lib/database', () => ({
  settlePickResult: vi.fn(),
  getPickById: vi.fn()
}))

// Mock the admin auth
vi.mock('@/lib/admin-auth', () => ({
  validateAdminAuth: vi.fn(),
  checkAdminRateLimit: vi.fn(),
  hasPermission: vi.fn(),
  AdminPermissions: {
    SETTLE_PICKS: 'settle_picks'
  }
}))

// Mock the validation
vi.mock('@/lib/validation', () => ({
  isValidUUID: vi.fn()
}))

import { settlePickResult, getPickById } from '@/lib/database'
import { validateAdminAuth, checkAdminRateLimit, hasPermission } from '@/lib/admin-auth'
import { isValidUUID } from '@/lib/validation'

describe('/api/admin/settle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up default environment
    process.env.ADMIN_SECRET = 'test-admin-secret'
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('POST', () => {
    it('should return 401 if admin authentication fails', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/admin/settle', {
        method: 'POST',
        headers: { 'authorization': 'Bearer invalid-token' },
        body: JSON.stringify({ pickId: 'test-id', result: 'win' })
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

      const request = new NextRequest('http://localhost:3000/api/admin/settle', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' },
        body: JSON.stringify({ pickId: 'test-id', result: 'win' })
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

      const request = new NextRequest('http://localhost:3000/api/admin/settle', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' },
        body: JSON.stringify({ pickId: 'test-id', result: 'win' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Insufficient permissions - Cannot settle picks')
      expect(data.code).toBe('INSUFFICIENT_PERMISSIONS')
    })

    it('should return 400 for invalid JSON', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)
      vi.mocked(checkAdminRateLimit).mockReturnValue(true)
      vi.mocked(hasPermission).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/admin/settle', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' },
        body: 'invalid-json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON in request body')
      expect(data.code).toBe('INVALID_JSON')
    })

    it('should return 400 for missing required fields', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)
      vi.mocked(checkAdminRateLimit).mockReturnValue(true)
      vi.mocked(hasPermission).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/admin/settle', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' },
        body: JSON.stringify({ pickId: 'test-id' }) // missing result
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields: pickId and result are required')
      expect(data.code).toBe('MISSING_FIELDS')
    })

    it('should return 400 for invalid pickId format', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)
      vi.mocked(checkAdminRateLimit).mockReturnValue(true)
      vi.mocked(hasPermission).mockReturnValue(true)
      vi.mocked(isValidUUID).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/admin/settle', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' },
        body: JSON.stringify({ pickId: 'invalid-id', result: 'win' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid pickId format - must be a valid UUID')
      expect(data.code).toBe('INVALID_PICK_ID')
    })

    it('should return 400 for invalid result value', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)
      vi.mocked(checkAdminRateLimit).mockReturnValue(true)
      vi.mocked(hasPermission).mockReturnValue(true)
      vi.mocked(isValidUUID).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/admin/settle', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' },
        body: JSON.stringify({ pickId: 'valid-uuid', result: 'invalid' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid result value - must be win, loss, or push')
      expect(data.code).toBe('INVALID_RESULT')
    })

    it('should return 404 if pick not found', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)
      vi.mocked(checkAdminRateLimit).mockReturnValue(true)
      vi.mocked(hasPermission).mockReturnValue(true)
      vi.mocked(isValidUUID).mockReturnValue(true)
      vi.mocked(getPickById).mockResolvedValue({ data: null, error: null })

      const request = new NextRequest('http://localhost:3000/api/admin/settle', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' },
        body: JSON.stringify({ pickId: 'valid-uuid', result: 'win' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Pick not found')
      expect(data.code).toBe('PICK_NOT_FOUND')
    })

    it('should return 409 if pick is already settled', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)
      vi.mocked(checkAdminRateLimit).mockReturnValue(true)
      vi.mocked(hasPermission).mockReturnValue(true)
      vi.mocked(isValidUUID).mockReturnValue(true)
      vi.mocked(getPickById).mockResolvedValue({
        data: {
          id: 'test-id',
          results: [{ result: 'win', settled_at: '2024-01-01T00:00:00Z' }]
        } as any,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/admin/settle', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' },
        body: JSON.stringify({ pickId: 'valid-uuid', result: 'win' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Pick is already settled')
      expect(data.code).toBe('ALREADY_SETTLED')
    })

    it('should successfully settle a pick', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)
      vi.mocked(checkAdminRateLimit).mockReturnValue(true)
      vi.mocked(hasPermission).mockReturnValue(true)
      vi.mocked(isValidUUID).mockReturnValue(true)
      vi.mocked(getPickById).mockResolvedValue({
        data: {
          id: 'test-id',
          results: []
        } as any,
        error: null
      })
      vi.mocked(settlePickResult).mockResolvedValue({
        data: {
          id: 'result-id',
          pick_id: 'test-id',
          result: 'win',
          settled_at: '2024-01-01T00:00:00Z'
        } as any,
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/admin/settle', {
        method: 'POST',
        headers: { 'authorization': 'Bearer test-admin-secret' },
        body: JSON.stringify({ pickId: 'test-id', result: 'win', notes: 'Test settlement' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Pick settled successfully with result: win')
      expect(data.result.result).toBe('win')
      expect(settlePickResult).toHaveBeenCalledWith('test-id', 'win', 'Test settlement')
    })
  })

  describe('GET', () => {
    it('should return health status for authenticated admin', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/admin/settle', {
        method: 'GET',
        headers: { 'authorization': 'Bearer test-admin-secret' }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.service).toBe('Admin Settle Endpoint')
    })

    it('should return 401 for unauthenticated health check', async () => {
      vi.mocked(validateAdminAuth).mockReturnValue(false)

      const request = new NextRequest('http://localhost:3000/api/admin/settle', {
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
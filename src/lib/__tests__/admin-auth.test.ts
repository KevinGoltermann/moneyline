import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { 
  validateAdminAuth, 
  hasAdminRole, 
  getAdminInfo, 
  hasPermission, 
  checkAdminRateLimit,
  AdminRole,
  AdminPermissions
} from '../admin-auth'

describe('admin-auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up default environment
    process.env.ADMIN_SECRET = 'test-admin-secret'
  })

  afterEach(() => {
    vi.resetAllMocks()
    delete process.env.ADMIN_SECRET
  })

  describe('validateAdminAuth', () => {
    it('should return false if ADMIN_SECRET is not set', () => {
      delete process.env.ADMIN_SECRET
      
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'authorization': 'Bearer any-token' }
      })

      const result = validateAdminAuth(request)
      expect(result).toBe(false)
    })

    it('should return false if authorization header is missing', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test')

      const result = validateAdminAuth(request)
      expect(result).toBe(false)
    })

    it('should return false if authorization token is invalid', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'authorization': 'Bearer invalid-token' }
      })

      const result = validateAdminAuth(request)
      expect(result).toBe(false)
    })

    it('should return false if authorization format is incorrect', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'authorization': 'test-admin-secret' } // Missing Bearer prefix
      })

      const result = validateAdminAuth(request)
      expect(result).toBe(false)
    })

    it('should return true if authorization token is valid', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'authorization': 'Bearer test-admin-secret' }
      })

      const result = validateAdminAuth(request)
      expect(result).toBe(true)
    })
  })

  describe('hasAdminRole', () => {
    it('should return false if not authenticated', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'authorization': 'Bearer invalid-token' }
      })

      const result = hasAdminRole(request, AdminRole.ADMIN)
      expect(result).toBe(false)
    })

    it('should return true if authenticated (all roles currently supported)', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'authorization': 'Bearer test-admin-secret' }
      })

      const result = hasAdminRole(request, AdminRole.ADMIN)
      expect(result).toBe(true)
    })
  })

  describe('getAdminInfo', () => {
    it('should return null if not authenticated', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'authorization': 'Bearer invalid-token' }
      })

      const result = getAdminInfo(request)
      expect(result).toBe(null)
    })

    it('should return admin info if authenticated', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'authorization': 'Bearer test-admin-secret' }
      })

      const result = getAdminInfo(request)
      expect(result).toEqual({
        id: 'admin',
        role: AdminRole.ADMIN,
        permissions: ['settle_picks', 'recompute_picks', 'view_admin_panel']
      })
    })
  })

  describe('hasPermission', () => {
    it('should return false if not authenticated', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'authorization': 'Bearer invalid-token' }
      })

      const result = hasPermission(request, AdminPermissions.SETTLE_PICKS)
      expect(result).toBe(false)
    })

    it('should return true if authenticated and has permission', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'authorization': 'Bearer test-admin-secret' }
      })

      const result = hasPermission(request, AdminPermissions.SETTLE_PICKS)
      expect(result).toBe(true)
    })

    it('should return true for all permissions when authenticated (current implementation)', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'authorization': 'Bearer test-admin-secret' }
      })

      expect(hasPermission(request, AdminPermissions.SETTLE_PICKS)).toBe(true)
      expect(hasPermission(request, AdminPermissions.RECOMPUTE_PICKS)).toBe(true)
      expect(hasPermission(request, AdminPermissions.VIEW_ADMIN_PANEL)).toBe(true)
    })
  })

  describe('checkAdminRateLimit', () => {
    it('should allow first request', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      })

      const result = checkAdminRateLimit(request, 10, 60000)
      expect(result).toBe(true)
    })

    it('should allow requests within limit', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'x-forwarded-for': '192.168.1.2' }
      })

      // Make multiple requests within limit
      for (let i = 0; i < 5; i++) {
        const result = checkAdminRateLimit(request, 10, 60000)
        expect(result).toBe(true)
      }
    })

    it('should block requests exceeding limit', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'x-forwarded-for': '192.168.1.3' }
      })

      // Make requests up to limit
      for (let i = 0; i < 3; i++) {
        const result = checkAdminRateLimit(request, 3, 60000)
        expect(result).toBe(true)
      }

      // Next request should be blocked
      const result = checkAdminRateLimit(request, 3, 60000)
      expect(result).toBe(false)
    })

    it('should reset counter after window expires', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test', {
        headers: { 'x-forwarded-for': '192.168.1.4' }
      })

      // Make requests up to limit with short window
      for (let i = 0; i < 2; i++) {
        const result = checkAdminRateLimit(request, 2, 1) // 1ms window
        expect(result).toBe(true)
      }

      // Wait for window to expire
      return new Promise(resolve => {
        setTimeout(() => {
          // Should allow new requests after window reset
          const result = checkAdminRateLimit(request, 2, 60000)
          expect(result).toBe(true)
          resolve(undefined)
        }, 10)
      })
    })

    it('should handle requests without IP', () => {
      const request = new NextRequest('http://localhost:3000/api/admin/test')

      const result = checkAdminRateLimit(request, 10, 60000)
      expect(result).toBe(true)
    })
  })

  describe('AdminPermissions constants', () => {
    it('should have expected permission constants', () => {
      expect(AdminPermissions.SETTLE_PICKS).toBe('settle_picks')
      expect(AdminPermissions.RECOMPUTE_PICKS).toBe('recompute_picks')
      expect(AdminPermissions.VIEW_ADMIN_PANEL).toBe('view_admin_panel')
      expect(AdminPermissions.DELETE_PICKS).toBe('delete_picks')
      expect(AdminPermissions.MANAGE_USERS).toBe('manage_users')
    })
  })

  describe('AdminRole enum', () => {
    it('should have expected role values', () => {
      expect(AdminRole.ADMIN).toBe('admin')
      expect(AdminRole.MODERATOR).toBe('moderator')
      expect(AdminRole.VIEWER).toBe('viewer')
    })
  })
})
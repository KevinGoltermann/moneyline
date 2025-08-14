import { NextRequest } from 'next/server'

/**
 * Admin authentication middleware
 * Validates admin access using Bearer token authentication
 */
export function validateAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET
  
  if (!adminSecret) {
    console.error('ADMIN_SECRET environment variable not set')
    return false
  }

  if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
    console.error('Invalid or missing admin authorization')
    return false
  }

  return true
}

/**
 * Admin authorization levels for future extensibility
 */
export enum AdminRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  VIEWER = 'viewer'
}

/**
 * Check if admin has required role (for future use)
 */
export function hasAdminRole(request: NextRequest, requiredRole: AdminRole): boolean {
  // For now, all authenticated admins have full access
  // This can be extended in the future with role-based access
  return validateAdminAuth(request)
}

/**
 * Extract admin info from request (for future use with JWT tokens)
 */
export interface AdminInfo {
  id: string
  role: AdminRole
  permissions: string[]
}

export function getAdminInfo(request: NextRequest): AdminInfo | null {
  // For now, return basic admin info if authenticated
  if (validateAdminAuth(request)) {
    return {
      id: 'admin',
      role: AdminRole.ADMIN,
      permissions: ['settle_picks', 'recompute_picks', 'view_admin_panel']
    }
  }
  
  return null
}

/**
 * Admin permissions for granular access control
 */
export const AdminPermissions = {
  SETTLE_PICKS: 'settle_picks',
  RECOMPUTE_PICKS: 'recompute_picks',
  VIEW_ADMIN_PANEL: 'view_admin_panel',
  DELETE_PICKS: 'delete_picks',
  MANAGE_USERS: 'manage_users'
} as const

/**
 * Check if admin has specific permission
 */
export function hasPermission(request: NextRequest, permission: string): boolean {
  const adminInfo = getAdminInfo(request)
  if (!adminInfo) {
    return false
  }
  
  // For now, all authenticated admins have all permissions
  return adminInfo.permissions.includes(permission)
}

/**
 * Rate limiting for admin endpoints (basic implementation)
 */
const adminRequestCounts = new Map<string, { count: number; resetTime: number }>()

export function checkAdminRateLimit(request: NextRequest, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const now = Date.now()
  
  const clientData = adminRequestCounts.get(clientIp)
  
  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize counter
    adminRequestCounts.set(clientIp, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (clientData.count >= maxRequests) {
    return false
  }
  
  clientData.count++
  return true
}

/**
 * Clean up expired rate limit entries
 */
export function cleanupRateLimitData(): void {
  const now = Date.now()
  const entries = Array.from(adminRequestCounts.entries())
  for (const [ip, data] of entries) {
    if (now > data.resetTime) {
      adminRequestCounts.delete(ip)
    }
  }
}

// Clean up rate limit data every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitData, 5 * 60 * 1000)
}
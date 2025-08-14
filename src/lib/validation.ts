import { z } from 'zod'

// Pick validation schemas
export const PickRationaleSchema = z.object({
  topFactors: z.array(z.string()).min(1).max(5),
  reasoning: z.string().min(10).max(500),
  confidence_factors: z.object({
    odds_movement: z.number().min(0).max(1).optional(),
    team_form: z.number().min(0).max(1).optional(),
    weather_impact: z.number().min(0).max(1).optional(),
    injury_impact: z.number().min(0).max(1).optional(),
    home_advantage: z.number().min(0).max(1).optional(),
  }).optional()
})

export const PickInsertSchema = z.object({
  pick_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  league: z.string().min(1).max(50),
  home_team: z.string().min(1).max(100),
  away_team: z.string().min(1).max(100),
  market: z.string().default('moneyline'),
  selection: z.string().min(1).max(200),
  odds: z.number().min(-1000).max(1000),
  confidence: z.number().min(0).max(100),
  rationale: PickRationaleSchema,
  features_used: z.union([z.array(z.string()), z.record(z.string(), z.any())]).optional()
})

// Result validation schemas
export const ResultSchema = z.enum(['win', 'loss', 'push'])

export const SettleRequestSchema = z.object({
  pickId: z.string().uuid(),
  result: ResultSchema,
  notes: z.string().max(500).optional()
})

// ML Service validation schemas
export const GameSchema = z.object({
  home_team: z.string().min(1).max(100),
  away_team: z.string().min(1).max(100),
  league: z.string().min(1).max(50),
  start_time: z.string().datetime(),
  odds: z.record(z.string(), z.number())
})

export const MLRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  games: z.array(GameSchema).min(1),
  context: z.record(z.string(), z.any()).default({})
})

export const MLResponseSchema = z.object({
  selection: z.string().min(1).max(200),
  market: z.string().min(1).max(50),
  league: z.string().min(1).max(50),
  odds: z.number().min(-1000).max(1000),
  confidence: z.number().min(0).max(100),
  rationale: z.record(z.string(), z.any()),
  features_used: z.array(z.string())
})

// API validation schemas
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).optional()
})

export const DateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

// Admin validation schemas
export const AdminAuthSchema = z.object({
  secret: z.string().min(1)
})

export const CronAuthSchema = z.object({
  authorization: z.string().startsWith('Bearer ')
})

// Query parameter validation
export const PerformanceQuerySchema = z.object({
  ...PaginationSchema.shape,
  ...DateRangeSchema.shape
})

// Validation utility functions
export function validatePickInsert(data: unknown) {
  return PickInsertSchema.safeParse(data)
}

export function validateSettleRequest(data: unknown) {
  return SettleRequestSchema.safeParse(data)
}

export function validateMLRequest(data: unknown) {
  return MLRequestSchema.safeParse(data)
}

export function validateMLResponse(data: unknown) {
  return MLResponseSchema.safeParse(data)
}

export function validatePagination(data: unknown) {
  return PaginationSchema.safeParse(data)
}

export function validateDateRange(data: unknown) {
  return DateRangeSchema.safeParse(data)
}

// Custom validation helpers
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/) !== null
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export function sanitizeString(input: string, maxLength: number = 255): string {
  return input.trim().slice(0, maxLength)
}

export function validateOdds(odds: number): boolean {
  return odds >= -1000 && odds <= 1000 && odds !== 0
}

export function validateConfidence(confidence: number): boolean {
  return confidence >= 0 && confidence <= 100
}

// Additional validation utilities for API endpoints
export function validateApiKey(key: string | undefined, expectedKey: string): boolean {
  return key === expectedKey && key !== undefined && key.length > 0
}

export function validateCronSecret(authHeader: string | undefined): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }
  
  const token = authHeader.substring(7)
  return token === process.env.CRON_SECRET && token !== undefined && token.length > 0
}

export function validateAdminSecret(secret: string | undefined): boolean {
  return secret === process.env.ADMIN_SECRET && secret !== undefined && secret.length > 0
}

// Request validation utilities
export function validateRequestMethod(method: string, allowedMethods: string[]): boolean {
  return allowedMethods.includes(method.toUpperCase())
}

export function validateContentType(contentType: string | undefined, expected: string = 'application/json'): boolean {
  return contentType?.includes(expected) ?? false
}

// Data validation utilities
export function validatePickDate(date: string): { valid: boolean; error?: string } {
  if (!isValidDate(date)) {
    return { valid: false, error: 'Invalid date format. Use YYYY-MM-DD.' }
  }
  
  const pickDate = new Date(date)
  const today = new Date()
  const maxFutureDate = new Date()
  maxFutureDate.setDate(today.getDate() + 7) // Allow picks up to 7 days in future
  
  if (pickDate > maxFutureDate) {
    return { valid: false, error: 'Pick date cannot be more than 7 days in the future.' }
  }
  
  return { valid: true }
}

export function validateTeamNames(homeTeam: string, awayTeam: string): { valid: boolean; error?: string } {
  if (homeTeam.trim() === awayTeam.trim()) {
    return { valid: false, error: 'Home team and away team cannot be the same.' }
  }
  
  if (homeTeam.length < 2 || awayTeam.length < 2) {
    return { valid: false, error: 'Team names must be at least 2 characters long.' }
  }
  
  return { valid: true }
}

export function validateOddsRange(odds: number): { valid: boolean; error?: string } {
  if (!validateOdds(odds)) {
    return { valid: false, error: 'Odds must be between -1000 and +1000, and cannot be 0.' }
  }
  
  // Additional business logic validation
  if (Math.abs(odds) < 100 && odds !== -100) {
    return { valid: false, error: 'Odds between -100 and +100 (exclusive) are not valid.' }
  }
  
  return { valid: true }
}
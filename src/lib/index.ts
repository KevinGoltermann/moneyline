// Database exports
export * from './database'
export * from './database.types'
export { supabase, supabaseAdmin, testConnection, executeQuery } from './supabase'

// API types and validation exports
export * from './types'
export * from './validation'
export * from './utils'

// Re-export commonly used types
export type {
  Pick,
  PickInsert,
  PickUpdate,
  Result,
  ResultInsert,
  ResultUpdate,
  PerformanceStats,
  PerformanceHistory,
  PickWithResult,
  PickRationale,
  PerformanceOverview,
  ChartDataPoint
} from './database.types'

export type {
  TodayResponse,
  PerformanceResponse,
  SettleRequest,
  SettleResponse,
  RecomputeResponse,
  MLRequest,
  MLResponse,
  Game,
  ErrorResponse,
  ApiResponse,
  PaginationParams,
  PaginatedResponse,
  HealthCheckResponse,
  CronJobResponse,
  AdminDashboardData,
  FeatureFlags,
  WebhookPayload,
  CacheEntry,
  CacheOptions
} from './types'
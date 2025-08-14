// API Response Types
export interface TodayResponse {
  pick: {
    id: string
    date: string
    league: string
    market: string
    selection: string
    odds: number
    confidence: number
    rationale: {
      topFactors: string[]
      reasoning: string
    }
  } | null
  performance: {
    winRate: number
    record: string
    totalPicks: number
  }
}

export interface PerformanceResponse {
  stats: {
    winRate: number
    totalPicks: number
    wins: number
    losses: number
    pushes: number
    currentStreak: { type: 'win' | 'loss' | 'none'; count: number }
  }
  history: Array<{
    id: string
    date: string
    selection: string
    odds: number
    confidence: number
    result: 'win' | 'loss' | 'push' | null
    settledAt: string | null
  }>
  chartData: Array<{
    date: string
    winRate: number
    cumulativeWins: number
    cumulativeLosses: number
  }>
}

// Admin API Types
export interface SettleRequest {
  pickId: string
  result: 'win' | 'loss' | 'push'
  notes?: string
}

export interface SettleResponse {
  success: boolean
  message: string
  result?: {
    id: string
    pickId: string
    result: 'win' | 'loss' | 'push'
    settledAt: string
  }
}

export interface RecomputeResponse {
  success: boolean
  message: string
  pick?: {
    id: string
    date: string
    selection: string
    confidence: number
  }
}

// ML Service Types
export interface MLRequest {
  date: string
  games: Game[]
  context: Record<string, any>
}

export interface Game {
  home_team: string
  away_team: string
  league: string
  start_time: string
  odds: Record<string, number> // moneyline odds
}

export interface MLResponse {
  selection: string
  market: string
  league: string
  odds: number
  confidence: number
  rationale: Record<string, any>
  features_used: string[]
}

// Error Response Type
export interface ErrorResponse {
  error: string
  code: string
  details?: any
}

// Common API Response Wrapper
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  code?: string
}

// Pagination Types
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
    hasPrevious: boolean
  }
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  database: {
    connected: boolean
    picks_count: number
    results_count: number
    last_pick_date?: string
  }
  services: {
    ml_service: 'available' | 'unavailable'
    external_apis: 'available' | 'unavailable'
  }
}

// Cron Job Types
export interface CronJobResponse {
  success: boolean
  message: string
  execution_time: number
  pick_generated?: {
    id: string
    date: string
    selection: string
    confidence: number
  }
  errors?: string[]
}

// Admin Dashboard Types
export interface AdminDashboardData {
  overview: {
    total_picks: number
    settled_picks: number
    unsettled_picks: number
    win_rate: number
    current_streak: { type: 'win' | 'loss' | 'none'; count: number }
  }
  recent_picks: Array<{
    id: string
    date: string
    selection: string
    odds: number
    confidence: number
    result: 'win' | 'loss' | 'push' | null
    settled_at: string | null
  }>
  performance_trends: {
    last_7_days: number
    last_30_days: number
    all_time: number
  }
}

// Feature Flag Types (for future use)
export interface FeatureFlags {
  ml_service_enabled: boolean
  admin_panel_enabled: boolean
  performance_charts_enabled: boolean
  push_notifications_enabled: boolean
}

// Webhook Types (for future integrations)
export interface WebhookPayload {
  event: 'pick_created' | 'pick_settled' | 'performance_updated'
  timestamp: string
  data: any
}

// Cache Types
export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  key?: string
}
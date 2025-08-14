import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { PerformanceStats, PerformanceHistory, PickRationale } from './database.types'
import { PerformanceResponse, TodayResponse } from './types'

// Utility for combining Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date utilities
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function getDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

// Odds utilities
export function formatOdds(odds: number): string {
  if (odds > 0) {
    return `+${odds}`
  }
  return odds.toString()
}

export function oddsToImpliedProbability(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100)
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100)
  }
}

export function impliedProbabilityToOdds(probability: number): number {
  if (probability >= 0.5) {
    return Math.round(-(probability / (1 - probability)) * 100)
  } else {
    return Math.round(((1 - probability) / probability) * 100)
  }
}

// Performance utilities
export function calculateWinRate(wins: number, losses: number): number {
  const total = wins + losses
  if (total === 0) return 0
  return Math.round((wins / total) * 100 * 10) / 10 // Round to 1 decimal
}

export function formatRecord(wins: number, losses: number, pushes: number = 0): string {
  if (pushes > 0) {
    return `${wins}-${losses}-${pushes}`
  }
  return `${wins}-${losses}`
}

export function calculateStreak(history: PerformanceHistory[]): { type: 'win' | 'loss' | 'none'; count: number } {
  if (!history || history.length === 0) {
    return { type: 'none', count: 0 }
  }

  // Sort by date descending to get most recent first
  const sortedHistory = [...history]
    .filter(h => h.result && h.result !== 'push')
    .sort((a, b) => new Date(b.pick_date || '').getTime() - new Date(a.pick_date || '').getTime())

  if (sortedHistory.length === 0) {
    return { type: 'none', count: 0 }
  }

  const mostRecentResult = sortedHistory[0].result as 'win' | 'loss'
  let count = 0

  for (const pick of sortedHistory) {
    if (pick.result === mostRecentResult) {
      count++
    } else {
      break
    }
  }

  return { type: mostRecentResult, count }
}

// Data transformation utilities
export function transformPerformanceStats(stats: PerformanceStats | null): PerformanceResponse['stats'] {
  if (!stats) {
    return {
      winRate: 0,
      totalPicks: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      currentStreak: { type: 'none', count: 0 }
    }
  }

  const currentStreak = stats.current_streak as any
  
  return {
    winRate: stats.win_rate || 0,
    totalPicks: stats.total_picks || 0,
    wins: stats.wins || 0,
    losses: stats.losses || 0,
    pushes: stats.pushes || 0,
    currentStreak: currentStreak || { type: 'none', count: 0 }
  }
}

export function transformPerformanceHistory(history: PerformanceHistory[]): PerformanceResponse['history'] {
  return history.map(h => ({
    id: `${h.pick_date}`, // Use date as ID since we don't have pick ID in view
    date: h.pick_date || '',
    selection: h.selection || '',
    odds: h.odds || 0,
    confidence: h.confidence || 0,
    result: h.result,
    settledAt: h.settled_at
  }))
}

export function transformChartData(history: PerformanceHistory[]): PerformanceResponse['chartData'] {
  return history
    .filter(h => h.running_win_rate !== null)
    .map(h => ({
      date: h.pick_date || '',
      winRate: h.running_win_rate || 0,
      cumulativeWins: h.cumulative_wins || 0,
      cumulativeLosses: h.cumulative_losses || 0
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// Rationale utilities
export function parseRationale(rationale: any): PickRationale {
  if (typeof rationale === 'string') {
    try {
      rationale = JSON.parse(rationale)
    } catch {
      return {
        topFactors: ['Analysis unavailable'],
        reasoning: rationale
      }
    }
  }

  return {
    topFactors: rationale?.topFactors || ['Analysis unavailable'],
    reasoning: rationale?.reasoning || 'No reasoning provided',
    confidence_factors: rationale?.confidence_factors
  }
}

export function formatRationale(rationale: PickRationale): string {
  const factors = rationale.topFactors.join(', ')
  return `Key factors: ${factors}. ${rationale.reasoning}`
}

// Error handling utilities
export function createErrorResponse(message: string, code: string = 'UNKNOWN_ERROR', details?: any) {
  return {
    error: message,
    code,
    details
  }
}

export function isApiError(response: any): response is { error: string; code: string } {
  return response && typeof response.error === 'string'
}

// Validation utilities
export function validateEnvironmentVariables() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Confidence utilities
export function getConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' {
  if (confidence < 60) return 'low'
  if (confidence < 80) return 'medium'
  return 'high'
}

export function getConfidenceColor(confidence: number): string {
  if (confidence < 60) return 'text-yellow-600'
  if (confidence < 80) return 'text-blue-600'
  return 'text-green-600'
}

// League utilities
export function formatLeague(league: string): string {
  const leagueMap: Record<string, string> = {
    'nfl': 'NFL',
    'nba': 'NBA',
    'mlb': 'MLB',
    'nhl': 'NHL',
    'ncaaf': 'College Football',
    'ncaab': 'College Basketball'
  }
  
  return leagueMap[league.toLowerCase()] || league.toUpperCase()
}

// Market utilities
export function formatMarket(market: string): string {
  const marketMap: Record<string, string> = {
    'moneyline': 'Moneyline',
    'spread': 'Point Spread',
    'total': 'Over/Under',
    'h2h': 'Head to Head'
  }
  
  return marketMap[market.toLowerCase()] || market
}

// API response utilities
export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    data,
    error: null,
    message
  }
}

export function createApiErrorResponse(message: string, code: string = 'API_ERROR', statusCode: number = 400) {
  return {
    error: message,
    code,
    statusCode,
    timestamp: new Date().toISOString()
  }
}

// Pagination utilities
export function calculatePagination(page: number, limit: number, total: number) {
  const offset = (page - 1) * limit
  const totalPages = Math.ceil(total / limit)
  const hasMore = page < totalPages
  
  return {
    page,
    limit,
    offset,
    total,
    totalPages,
    hasMore,
    hasPrevious: page > 1
  }
}

// Data sanitization utilities
export function sanitizePickData(data: any): Partial<any> {
  return {
    ...data,
    league: data.league?.trim(),
    home_team: data.home_team?.trim(),
    away_team: data.away_team?.trim(),
    selection: data.selection?.trim(),
    market: data.market?.trim() || 'moneyline'
  }
}

// Performance calculation utilities
export function calculateExpectedValue(odds: number, winProbability: number): number {
  const impliedProb = oddsToImpliedProbability(odds)
  if (winProbability > impliedProb) {
    // Positive expected value
    if (odds > 0) {
      return winProbability * odds - (1 - winProbability) * 100
    } else {
      return winProbability * (100 / Math.abs(odds)) * 100 - (1 - winProbability) * 100
    }
  }
  return 0 // No positive expected value
}

// Time utilities for cron jobs and scheduling
export function isWithinTimeWindow(startHour: number, endHour: number, timezone: string = 'America/Denver'): boolean {
  const now = new Date()
  const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
  const currentHour = timeInZone.getHours()
  
  if (startHour <= endHour) {
    return currentHour >= startHour && currentHour < endHour
  } else {
    // Handle overnight window (e.g., 22:00 to 06:00)
    return currentHour >= startHour || currentHour < endHour
  }
}

export function getNextScheduledTime(hour: number, minute: number = 0, timezone: string = 'America/Denver'): Date {
  const now = new Date()
  const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
  
  const scheduled = new Date(timeInZone)
  scheduled.setHours(hour, minute, 0, 0)
  
  // If the scheduled time has passed today, schedule for tomorrow
  if (scheduled <= timeInZone) {
    scheduled.setDate(scheduled.getDate() + 1)
  }
  
  return scheduled
}
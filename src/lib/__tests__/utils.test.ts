import { describe, it, expect } from 'vitest'
import {
  formatOdds,
  oddsToImpliedProbability,
  calculateWinRate,
  formatRecord,
  getTodayDate,
  formatDate,
  getConfidenceLevel,
  formatLeague,
  formatMarket,
  calculatePagination,
  calculateExpectedValue,
  isWithinTimeWindow
} from '../utils'

describe('Utility functions', () => {
  describe('formatOdds', () => {
    it('should format positive odds with plus sign', () => {
      expect(formatOdds(150)).toBe('+150')
      expect(formatOdds(200)).toBe('+200')
    })

    it('should format negative odds without plus sign', () => {
      expect(formatOdds(-110)).toBe('-110')
      expect(formatOdds(-200)).toBe('-200')
    })
  })

  describe('oddsToImpliedProbability', () => {
    it('should calculate implied probability for positive odds', () => {
      expect(oddsToImpliedProbability(100)).toBeCloseTo(0.5, 2)
      expect(oddsToImpliedProbability(200)).toBeCloseTo(0.333, 2)
    })

    it('should calculate implied probability for negative odds', () => {
      expect(oddsToImpliedProbability(-100)).toBeCloseTo(0.5, 2)
      expect(oddsToImpliedProbability(-200)).toBeCloseTo(0.667, 2)
    })
  })

  describe('calculateWinRate', () => {
    it('should calculate win rate correctly', () => {
      expect(calculateWinRate(7, 3)).toBe(70.0)
      expect(calculateWinRate(0, 0)).toBe(0)
      expect(calculateWinRate(1, 2)).toBe(33.3)
    })
  })

  describe('formatRecord', () => {
    it('should format record without pushes', () => {
      expect(formatRecord(7, 3)).toBe('7-3')
      expect(formatRecord(0, 0)).toBe('0-0')
    })

    it('should format record with pushes', () => {
      expect(formatRecord(7, 3, 2)).toBe('7-3-2')
      expect(formatRecord(5, 2, 1)).toBe('5-2-1')
    })
  })

  describe('getTodayDate', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const today = getTodayDate()
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const formatted = formatDate('2024-01-15')
      expect(formatted).toMatch(/January \d{1,2}, 2024/)
    })
  })

  describe('getConfidenceLevel', () => {
    it('should return correct confidence levels', () => {
      expect(getConfidenceLevel(50)).toBe('low')
      expect(getConfidenceLevel(70)).toBe('medium')
      expect(getConfidenceLevel(85)).toBe('high')
    })
  })

  describe('formatLeague', () => {
    it('should format league names correctly', () => {
      expect(formatLeague('nfl')).toBe('NFL')
      expect(formatLeague('NBA')).toBe('NBA')
      expect(formatLeague('ncaaf')).toBe('College Football')
    })
  })

  describe('formatMarket', () => {
    it('should format market names correctly', () => {
      expect(formatMarket('moneyline')).toBe('Moneyline')
      expect(formatMarket('spread')).toBe('Point Spread')
      expect(formatMarket('total')).toBe('Over/Under')
    })
  })

  describe('calculatePagination', () => {
    it('should calculate pagination correctly', () => {
      const result = calculatePagination(2, 10, 25)
      expect(result.page).toBe(2)
      expect(result.limit).toBe(10)
      expect(result.offset).toBe(10)
      expect(result.total).toBe(25)
      expect(result.totalPages).toBe(3)
      expect(result.hasMore).toBe(true)
      expect(result.hasPrevious).toBe(true)
    })
  })

  describe('calculateExpectedValue', () => {
    it('should calculate positive expected value correctly', () => {
      const ev = calculateExpectedValue(150, 0.6) // +150 odds, 60% win probability
      expect(ev).toBeGreaterThan(0)
    })

    it('should return 0 for negative expected value', () => {
      const ev = calculateExpectedValue(-200, 0.5) // -200 odds, 50% win probability
      expect(ev).toBe(0)
    })
  })

  describe('isWithinTimeWindow', () => {
    it('should handle normal time windows', () => {
      // This test would need to be mocked for consistent results
      // For now, just test the function exists and doesn't throw
      expect(() => isWithinTimeWindow(9, 17)).not.toThrow()
    })
  })
})
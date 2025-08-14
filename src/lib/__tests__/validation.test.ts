import { describe, it, expect } from 'vitest'
import {
  validatePickInsert,
  validateSettleRequest,
  validateMLRequest,
  isValidDate,
  isValidUUID,
  validateOdds,
  validateConfidence,
  validatePickDate,
  validateTeamNames,
  validateOddsRange
} from '../validation'

describe('Validation utilities', () => {
  describe('validatePickInsert', () => {
    it('should validate a correct pick insert', () => {
      const validPick = {
        pick_date: '2024-01-15',
        league: 'NFL',
        home_team: 'Kansas City Chiefs',
        away_team: 'Buffalo Bills',
        selection: 'Kansas City Chiefs',
        odds: -110,
        confidence: 75,
        rationale: {
          topFactors: ['Strong home record', 'Key player healthy'],
          reasoning: 'Chiefs have been dominant at home this season'
        }
      }

      const result = validatePickInsert(validPick)
      expect(result.success).toBe(true)
    })

    it('should reject invalid pick insert', () => {
      const invalidPick = {
        pick_date: 'invalid-date',
        league: '',
        odds: 'not-a-number',
        confidence: 150
      }

      const result = validatePickInsert(invalidPick)
      expect(result.success).toBe(false)
    })
  })

  describe('validateSettleRequest', () => {
    it('should validate a correct settle request', () => {
      const validRequest = {
        pickId: '123e4567-e89b-12d3-a456-426614174000',
        result: 'win' as const,
        notes: 'Won by 7 points'
      }

      const result = validateSettleRequest(validRequest)
      expect(result.success).toBe(true)
    })

    it('should reject invalid settle request', () => {
      const invalidRequest = {
        pickId: 'invalid-uuid',
        result: 'invalid-result'
      }

      const result = validateSettleRequest(invalidRequest)
      expect(result.success).toBe(false)
    })
  })

  describe('isValidDate', () => {
    it('should validate correct date format', () => {
      expect(isValidDate('2024-01-15')).toBe(true)
      expect(isValidDate('2024-12-31')).toBe(true)
    })

    it('should reject invalid date format', () => {
      expect(isValidDate('2024/01/15')).toBe(false)
      expect(isValidDate('invalid-date')).toBe(false)
      expect(isValidDate('2024-13-01')).toBe(false)
    })
  })

  describe('isValidUUID', () => {
    it('should validate correct UUID format', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    })

    it('should reject invalid UUID format', () => {
      expect(isValidUUID('invalid-uuid')).toBe(false)
      expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false)
    })
  })

  describe('validateOdds', () => {
    it('should validate correct odds', () => {
      expect(validateOdds(-110)).toBe(true)
      expect(validateOdds(150)).toBe(true)
      expect(validateOdds(-200)).toBe(true)
    })

    it('should reject invalid odds', () => {
      expect(validateOdds(0)).toBe(false)
      expect(validateOdds(-1001)).toBe(false)
      expect(validateOdds(1001)).toBe(false)
    })
  })

  describe('validateConfidence', () => {
    it('should validate correct confidence', () => {
      expect(validateConfidence(0)).toBe(true)
      expect(validateConfidence(50)).toBe(true)
      expect(validateConfidence(100)).toBe(true)
    })

    it('should reject invalid confidence', () => {
      expect(validateConfidence(-1)).toBe(false)
      expect(validateConfidence(101)).toBe(false)
    })
  })

  describe('validatePickDate', () => {
    it('should validate correct pick dates', () => {
      const today = new Date().toISOString().split('T')[0]
      const result = validatePickDate(today)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid date formats', () => {
      const result = validatePickDate('invalid-date')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid date format')
    })

    it('should reject dates too far in future', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const result = validatePickDate(futureDate.toISOString().split('T')[0])
      expect(result.valid).toBe(false)
      expect(result.error).toContain('more than 7 days in the future')
    })
  })

  describe('validateTeamNames', () => {
    it('should validate different team names', () => {
      const result = validateTeamNames('Team A', 'Team B')
      expect(result.valid).toBe(true)
    })

    it('should reject same team names', () => {
      const result = validateTeamNames('Team A', 'Team A')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('cannot be the same')
    })

    it('should reject short team names', () => {
      const result = validateTeamNames('A', 'Team B')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('at least 2 characters')
    })
  })

  describe('validateOddsRange', () => {
    it('should validate correct odds', () => {
      const result = validateOddsRange(-110)
      expect(result.valid).toBe(true)
    })

    it('should reject odds of 0', () => {
      const result = validateOddsRange(0)
      expect(result.valid).toBe(false)
    })

    it('should reject odds between -100 and +100 (exclusive)', () => {
      const result = validateOddsRange(-50)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('between -100 and +100')
    })
  })
})
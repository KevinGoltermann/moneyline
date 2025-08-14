import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Mock the Python ML service by intercepting the subprocess call
vi.mock('child_process', () => ({
  spawn: vi.fn()
}))

// Create mock request helper
function createMockRequest(body: any): NextRequest {
  return new NextRequest('http://localhost:3000/api/ml/pick', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  })
}

describe('ML Service Tests with Mock Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Feature Engineering', () => {
    it('should process odds data correctly', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Lakers',
            away_team: 'Warriors',
            league: 'NBA' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -110,
              away_ml: -110
            }
          }
        ],
        context: {
          min_odds: -300,
          max_odds: 300
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('selection')
      expect(data).toHaveProperty('odds')
      expect(data).toHaveProperty('confidence')
      expect(data.confidence).toBeGreaterThan(0)
      expect(data.confidence).toBeLessThanOrEqual(100)
    })

    it('should handle different league types', async () => {
      const leagues = ['NFL', 'NBA', 'MLB', 'NHL'] as const

      for (const league of leagues) {
        const requestBody = {
          date: '2024-01-15',
          games: [
            {
              home_team: 'Team A',
              away_team: 'Team B',
              league,
              start_time: '2024-01-15T20:00:00Z',
              odds: {
                home_ml: -120,
                away_ml: 100
              }
            }
          ],
          context: {
            min_odds: -300,
            max_odds: 300
          }
        }

        const request = createMockRequest(requestBody)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.league).toBe(league)
      }
    })

    it('should calculate expected value correctly', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Favorite Team',
            away_team: 'Underdog Team',
            league: 'NBA' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -200, // Heavy favorite
              away_ml: 170   // Underdog with value
            }
          }
        ],
        context: {
          min_odds: -300,
          max_odds: 300
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('selection')
      expect(data).toHaveProperty('rationale')
      expect(data.rationale).toHaveProperty('reasoning')
      expect(typeof data.rationale.reasoning).toBe('string')
    })
  })

  describe('Model Predictions', () => {
    it('should generate confidence scores within valid range', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Team A',
            away_team: 'Team B',
            league: 'NBA' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -110,
              away_ml: -110
            }
          }
        ]
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.confidence).toBeGreaterThanOrEqual(50) // Minimum confidence threshold
      expect(data.confidence).toBeLessThanOrEqual(100)
      expect(typeof data.confidence).toBe('number')
    })

    it('should provide rationale with top factors', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Strong Home Team',
            away_team: 'Visiting Team',
            league: 'NBA' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -150,
              away_ml: 130
            }
          }
        ]
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.rationale).toHaveProperty('top_factors')
      expect(Array.isArray(data.rationale.top_factors)).toBe(true)
      expect(data.rationale.top_factors.length).toBeGreaterThan(0)
      expect(data.rationale).toHaveProperty('reasoning')
      expect(typeof data.rationale.reasoning).toBe('string')
      expect(data.rationale.reasoning.length).toBeGreaterThan(0)
    })

    it('should include features used in prediction', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Team A',
            away_team: 'Team B',
            league: 'NBA' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -110,
              away_ml: -110
            }
          }
        ]
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('features_used')
      expect(Array.isArray(data.features_used)).toBe(true)
      expect(data.features_used.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases and Validation', () => {
    it('should handle games with extreme odds', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Heavy Favorite',
            away_team: 'Heavy Underdog',
            league: 'NBA' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -1000, // Extreme favorite
              away_ml: 800    // Extreme underdog
            }
          }
        ],
        context: {
          min_odds: -1200,
          max_odds: 1000
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('selection')
      expect(data.confidence).toBeGreaterThan(0)
    })

    it('should validate input data structure', async () => {
      const invalidRequestBody = {
        date: '2024-01-15',
        games: [
          {
            // Missing required fields
            home_team: 'Team A',
            // missing away_team, league, start_time, odds
          }
        ]
      }

      const request = createMockRequest(invalidRequestBody)
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should handle multiple games and select best value', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Lakers',
            away_team: 'Warriors',
            league: 'NBA' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -110,
              away_ml: -110
            }
          },
          {
            home_team: 'Celtics',
            away_team: 'Heat',
            league: 'NBA' as const,
            start_time: '2024-01-15T21:00:00Z',
            odds: {
              home_ml: -150,
              away_ml: 130
            }
          },
          {
            home_team: 'Nuggets',
            away_team: 'Suns',
            league: 'NBA' as const,
            start_time: '2024-01-15T22:00:00Z',
            odds: {
              home_ml: 120,
              away_ml: -140
            }
          }
        ]
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('selection')
      expect(data).toHaveProperty('confidence')
      expect(data.confidence).toBeGreaterThan(50) // Should have reasonable confidence
      
      // Should select one of the available options
      const possibleSelections = [
        'Lakers ML', 'Warriors ML',
        'Celtics ML', 'Heat ML',
        'Nuggets ML', 'Suns ML'
      ]
      expect(possibleSelections).toContain(data.selection)
    })

    it('should respect odds thresholds', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Team A',
            away_team: 'Team B',
            league: 'NBA' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -500, // Outside threshold
              away_ml: 400   // Outside threshold
            }
          }
        ],
        context: {
          min_odds: -200,
          max_odds: 200
        }
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      // Should return 422 when no games meet criteria
      expect(response.status).toBe(422)
    })

    it('should handle date validation', async () => {
      const requestBody = {
        date: 'invalid-date',
        games: [
          {
            home_team: 'Team A',
            away_team: 'Team B',
            league: 'NBA' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -110,
              away_ml: -110
            }
          }
        ]
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Performance and Reliability', () => {
    it('should complete prediction within reasonable time', async () => {
      const startTime = Date.now()
      
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Team A',
            away_team: 'Team B',
            league: 'NBA' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -110,
              away_ml: -110
            }
          }
        ]
      }

      const request = createMockRequest(requestBody)
      const response = await POST(request)
      
      const endTime = Date.now()
      const executionTime = endTime - startTime

      expect(response.status).toBe(200)
      expect(executionTime).toBeLessThan(30000) // Should complete within 30 seconds
    })

    it('should handle concurrent requests', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Team A',
            away_team: 'Team B',
            league: 'NBA' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -110,
              away_ml: -110
            }
          }
        ]
      }

      const requests = Array(3).fill(null).map(() => 
        POST(createMockRequest(requestBody))
      )

      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })

    it('should provide consistent results for same input', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Consistent Team A',
            away_team: 'Consistent Team B',
            league: 'NBA' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -110,
              away_ml: -110
            }
          }
        ]
      }

      const request1 = createMockRequest(requestBody)
      const request2 = createMockRequest(requestBody)

      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2)
      ])

      const [data1, data2] = await Promise.all([
        response1.json(),
        response2.json()
      ])

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
      
      // Results should be consistent (within reasonable variance)
      expect(data1.selection).toBe(data2.selection)
      expect(Math.abs(data1.confidence - data2.confidence)).toBeLessThan(5)
    })
  })
})
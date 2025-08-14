/**
 * Unit tests for ML Pick Generation API endpoint
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET, OPTIONS } from '../route';

// Mock console methods to avoid noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = vi.fn();
  console.error = vi.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Helper function to create mock NextRequest
function createMockRequest(body?: any, method: string = 'POST'): NextRequest {
  const url = 'http://localhost:3000/api/ml/pick';
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(url, init);
}

describe('/api/ml/pick', () => {
  describe('POST endpoint', () => {
    it('should generate a valid ML pick for valid request', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Kansas City Chiefs',
            away_team: 'Buffalo Bills',
            league: 'NFL' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -120,
              away_ml: +100
            },
            venue: 'Arrowhead Stadium'
          }
        ],
        min_confidence: 50.0
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('selection');
      expect(data).toHaveProperty('market');
      expect(data).toHaveProperty('league');
      expect(data).toHaveProperty('odds');
      expect(data).toHaveProperty('confidence');
      expect(data).toHaveProperty('rationale');
      expect(data).toHaveProperty('features_used');
      expect(data).toHaveProperty('generated_at');
      expect(data).toHaveProperty('model_version');

      expect(data.market).toBe('moneyline');
      expect(data.league).toBe('NFL');
      expect(data.confidence).toBeGreaterThanOrEqual(50);
      expect(data.confidence).toBeLessThanOrEqual(100);
      expect(Array.isArray(data.features_used)).toBe(true);
      expect(Array.isArray(data.rationale.top_factors)).toBe(true);
    });

    it('should handle multiple games and select viable option', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Team A',
            away_team: 'Team B',
            league: 'NFL' as const,
            start_time: '2024-01-15T16:00:00Z',
            odds: {
              home_ml: -500, // Too heavy favorite (outside default range)
              away_ml: +400  // Too high underdog (outside default range)
            }
          },
          {
            home_team: 'Kansas City Chiefs',
            away_team: 'Buffalo Bills',
            league: 'NFL' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -120, // Viable option
              away_ml: +100
            }
          }
        ]
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.selection).toContain('Chiefs'); // Should pick the viable game
    });

    it('should return 400 for missing required fields', async () => {
      const requestBody = {
        date: '2024-01-15'
        // Missing games array
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty games array', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: []
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should return 500 when no viable games are found', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Team A',
            away_team: 'Team B',
            league: 'NFL' as const,
            start_time: '2024-01-15T16:00:00Z',
            odds: {
              home_ml: -500, // Too heavy favorite
              away_ml: +400  // Too high underdog
            }
          }
        ],
        min_odds: -200,
        max_odds: 300
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(data.code).toBe('ML_SERVICE_ERROR');
    });

    it('should respect custom odds thresholds', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Kansas City Chiefs',
            away_team: 'Buffalo Bills',
            league: 'NFL' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -150,
              away_ml: +130
            }
          }
        ],
        min_odds: -200,
        max_odds: 200
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Math.abs(data.odds)).toBeLessThanOrEqual(200);
    });

    it('should handle malformed JSON gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/ml/pick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code');
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('should include proper timestamp and version info', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Kansas City Chiefs',
            away_team: 'Buffalo Bills',
            league: 'NFL' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -120,
              away_ml: +100
            }
          }
        ]
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.model_version).toBe('1.0.0');
      expect(data.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp
    });
  });

  describe('GET endpoint (health check)', () => {
    it('should return healthy status', async () => {
      const request = createMockRequest(undefined, 'GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('service');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('ml_engine');

      expect(data.status).toBe('healthy');
      expect(data.service).toBe('ML Pick Generation');
      expect(data.version).toBe('1.0.0');
      expect(data.ml_engine).toBe('ready');
    });

    it('should include proper timestamp in health check', async () => {
      const request = createMockRequest(undefined, 'GET');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('OPTIONS endpoint (CORS)', () => {
    it('should handle CORS preflight requests', async () => {
      const request = createMockRequest(undefined, 'OPTIONS');
      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle games with missing odds gracefully', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Kansas City Chiefs',
            away_team: 'Buffalo Bills',
            league: 'NFL' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {} // Empty odds object
          }
        ]
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422); // Should fail gracefully
      expect(data).toHaveProperty('error');
    });

    it('should handle different league types', async () => {
      const leagues = ['NFL', 'NBA', 'MLB', 'NHL'] as const;
      
      for (const league of leagues) {
        const requestBody = {
          date: '2024-01-15',
          games: [
            {
              home_team: 'Home Team',
              away_team: 'Away Team',
              league,
              start_time: '2024-01-15T20:00:00Z',
              odds: {
                home_ml: -120,
                away_ml: +100
              }
            }
          ]
        };

        const request = createMockRequest(requestBody);
        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.league).toBe(league);
      }
    });

    it('should calculate expected value correctly', async () => {
      const requestBody = {
        date: '2024-01-15',
        games: [
          {
            home_team: 'Kansas City Chiefs',
            away_team: 'Buffalo Bills',
            league: 'NFL' as const,
            start_time: '2024-01-15T20:00:00Z',
            odds: {
              home_ml: -120,
              away_ml: +100
            }
          }
        ]
      };

      const request = createMockRequest(requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('expected_value');
      expect(typeof data.expected_value).toBe('number');
      expect(data.expected_value).toBeGreaterThan(-1);
      expect(data.expected_value).toBeLessThan(1);
    });
  });
});
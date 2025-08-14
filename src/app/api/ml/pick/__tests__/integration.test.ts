/**
 * Integration tests for ML Pick Generation API endpoint
 */

import { describe, it, expect } from 'vitest';

describe('/api/ml/pick Integration Tests', () => {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  it('should handle a realistic betting scenario', async () => {
    const requestBody = {
      date: '2024-01-21',
      games: [
        {
          home_team: 'Kansas City Chiefs',
          away_team: 'Buffalo Bills',
          league: 'NFL',
          start_time: '2024-01-21T18:30:00Z',
          odds: {
            home_ml: -115,
            away_ml: -105,
            home_spread: -1.5,
            away_spread: +1.5
          },
          venue: 'Arrowhead Stadium',
          weather: {
            temperature: 32,
            wind_speed: 15,
            precipitation: 0.0,
            conditions: 'Clear'
          }
        },
        {
          home_team: 'San Francisco 49ers',
          away_team: 'Detroit Lions',
          league: 'NFL',
          start_time: '2024-01-21T15:00:00Z',
          odds: {
            home_ml: -130,
            away_ml: +110
          },
          venue: "Levi's Stadium"
        }
      ],
      context: {
        season: '2023-2024',
        week: 'Championship'
      },
      min_confidence: 50.0,
      min_odds: -200,
      max_odds: 250
    };

    // Test the actual API endpoint structure
    const response = await fetch(`${API_BASE_URL}/api/ml/pick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }).catch(() => {
      // If fetch fails (e.g., server not running), skip this test
      return null;
    });

    if (!response) {
      console.log('Skipping integration test - server not available');
      return;
    }

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
    // Validate response structure
    expect(data).toHaveProperty('selection');
    expect(data).toHaveProperty('market');
    expect(data).toHaveProperty('league');
    expect(data).toHaveProperty('odds');
    expect(data).toHaveProperty('confidence');
    expect(data).toHaveProperty('rationale');
    expect(data).toHaveProperty('features_used');
    expect(data).toHaveProperty('generated_at');
    expect(data).toHaveProperty('model_version');

    // Validate data types and ranges
    expect(typeof data.selection).toBe('string');
    expect(data.market).toBe('moneyline');
    expect(['NFL', 'NBA', 'MLB', 'NHL']).toContain(data.league);
    expect(typeof data.odds).toBe('number');
    expect(data.confidence).toBeGreaterThanOrEqual(50);
    expect(data.confidence).toBeLessThanOrEqual(100);
    expect(Array.isArray(data.rationale.top_factors)).toBe(true);
    expect(Array.isArray(data.features_used)).toBe(true);
    expect(data.model_version).toBe('1.0.0');

    // Validate timestamp format
    expect(data.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should handle health check endpoint', async () => {
    const response = await fetch(`${API_BASE_URL}/api/ml/pick`, {
      method: 'GET',
    }).catch(() => null);

    if (!response) {
      console.log('Skipping health check test - server not available');
      return;
    }

    expect(response.status).toBe(200);
    
    const data = await response.json();
    
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

  it('should handle CORS preflight requests', async () => {
    const response = await fetch(`${API_BASE_URL}/api/ml/pick`, {
      method: 'OPTIONS',
    }).catch(() => null);

    if (!response) {
      console.log('Skipping CORS test - server not available');
      return;
    }

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
  });

  it('should validate request data properly', async () => {
    const invalidRequestBody = {
      date: '2024-01-21',
      // Missing games array
    };

    const response = await fetch(`${API_BASE_URL}/api/ml/pick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidRequestBody),
    }).catch(() => null);

    if (!response) {
      console.log('Skipping validation test - server not available');
      return;
    }

    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('code');
    expect(data.code).toBe('VALIDATION_ERROR');
  });
});
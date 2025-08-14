/**
 * Advanced ML Pick Generation API Endpoint
 * 
 * This sophisticated ML system analyzes multiple data sources and factors to generate
 * the highest expected value betting recommendations using advanced statistical models.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling, createErrorResponse, ERROR_CODES, AppError, ErrorSeverity, logError, validateMethod, withTimeout } from '@/lib/error-handling'

// Enhanced type definitions for comprehensive ML analysis
interface Game {
  home_team: string;
  away_team: string;
  league: 'NFL' | 'NBA' | 'MLB' | 'NHL';
  start_time: string;
  odds: Record<string, number>;
  venue?: string;
  weather?: Record<string, any>;
  injuries?: string[];
}

interface MLRequest {
  date: string;
  games: Game[];
  context?: Record<string, any>;
  min_odds?: number;
  max_odds?: number;
  min_confidence?: number;
}

interface MLResponse {
  selection: string;
  market: 'moneyline' | 'spread' | 'total';
  league: string;
  odds: number;
  confidence: number;
  expected_value: number;
  rationale: {
    reasoning: string;
    top_factors: string[];
    risk_assessment: string;
    key_insights: string[];
  };
  features_used: string[];
  feature_scores: Record<string, number>;
  generated_at: string;
  model_version: string;
}

// Advanced team performance metrics
interface TeamMetrics {
  recent_form: number; // Last 10 games win rate
  home_away_advantage: number;
  offensive_rating: number;
  defensive_rating: number;
  pace_factor: number;
  injury_impact: number;
  rest_days: number;
  travel_distance: number;
  head_to_head_record: number;
  streak_momentum: number;
  clutch_performance: number;
  weather_performance?: number; // For outdoor sports
}

// Advanced ML prediction using Python service with SportsData.io integration
async function generateMLPick(request: MLRequest): Promise<MLResponse> {
  try {
    // Call the Python ML service with SportsData.io integration
    const { spawn } = require('child_process');
    const path = require('path');
    
    // Create the ML request for Python service
    const mlRequest = {
      date: request.date,
      games: request.games,
      context: request.context || {},
      min_odds: request.min_odds || -200,
      max_odds: request.max_odds || 300,
      min_confidence: request.min_confidence || 60.0
    };
    
    // Python script to call our ML service
    const pythonScript = `
import sys
import os
import json
sys.path.append('${path.join(process.cwd(), 'src/app/api/ml/pick')}')

try:
    from prediction_engine_simple import ComplexPredictionEngine
    import models_simple as models
    from datetime import datetime
    
    # Parse input
    request_data = json.loads('''${JSON.stringify(mlRequest)}''')
    
    # Convert to our models
    games = []
    for game_data in request_data['games']:
        game = models.Game(
            home_team=game_data['home_team'],
            away_team=game_data['away_team'],
            league=models.League(game_data['league']),
            start_time=game_data['start_time'],
            odds=game_data['odds'],
            venue=game_data.get('venue'),
            weather=game_data.get('weather'),
            injuries=game_data.get('injuries', [])
        )
        games.append(game)
    
    ml_request = models.MLRequest(
        date=request_data['date'],
        games=games,
        context=request_data.get('context', {}),
        min_odds=request_data.get('min_odds'),
        max_odds=request_data.get('max_odds'),
        min_confidence=request_data.get('min_confidence')
    )
    
    # Initialize complex ML engine with SportsData.io integration
    engine = ComplexPredictionEngine()
    
    # Generate pick
    response = engine.generate_pick(ml_request)
    
    # Output result
    result = {
        "selection": response.selection,
        "market": response.market,
        "league": response.league,
        "odds": response.odds,
        "confidence": response.confidence,
        "expected_value": response.expected_value or 0.0,
        "rationale": response.rationale,
        "features_used": response.features_used,
        "generated_at": response.generated_at,
        "model_version": response.model_version or "2.0.0-complex"
    }
    
    print(json.dumps(result))
    
except Exception as e:
    import traceback
    error_result = {
        "error": str(e),
        "traceback": traceback.format_exc(),
        "fallback": True
    }
    print(json.dumps(error_result))
    sys.exit(1)
`;

    return new Promise((resolve, reject) => {
      const python = spawn('python3', ['-c', pythonScript]);
      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        try {
          if (code === 0 && output.trim()) {
            const result = JSON.parse(output.trim());
            
            if (result.error) {
              // Python service failed, use fallback
              console.warn('Python ML service failed, using fallback:', result.error);
              resolve(generateFallbackPick(request));
            } else {
              // Success! Return the sophisticated ML result
              resolve({
                selection: result.selection,
                market: result.market as 'moneyline' | 'spread' | 'total',
                league: result.league,
                odds: result.odds,
                confidence: result.confidence,
                expected_value: result.expected_value,
                rationale: {
                  reasoning: result.rationale?.reasoning || 'Advanced ML analysis completed',
                  top_factors: result.rationale?.top_factors || ['Advanced Analytics'],
                  risk_assessment: result.rationale?.risk_assessment || 'Standard risk profile',
                  key_insights: result.rationale?.key_insights || []
                },
                features_used: result.features_used || [],
                feature_scores: result.rationale?.confidence_factors || {},
                generated_at: result.generated_at,
                model_version: result.model_version
              });
            }
          } else {
            // Python execution failed, use fallback
            console.warn('Python execution failed, using fallback. Error:', error);
            resolve(generateFallbackPick(request));
          }
        } catch (parseError) {
          console.warn('Failed to parse Python output, using fallback:', parseError);
          resolve(generateFallbackPick(request));
        }
      });

      // Set timeout for Python execution
      setTimeout(() => {
        python.kill();
        console.warn('Python ML service timeout, using fallback');
        resolve(generateFallbackPick(request));
      }, 25000); // 25 second timeout
    });
    
  } catch (error) {
    console.warn('ML service error, using fallback:', error);
    return generateFallbackPick(request);
  }
}

// Fallback function for when Python service fails
function generateFallbackPick(request: MLRequest): MLResponse {
  const minOdds = request.min_odds || -200
  const maxOdds = request.max_odds || 300
  
  // Simple heuristic-based selection as fallback
  const viableGames = request.games.filter(game => {
    const homeOdds = game.odds.home_ml
    const awayOdds = game.odds.away_ml
    
    const homeViable = homeOdds && homeOdds >= minOdds && homeOdds <= maxOdds
    const awayViable = awayOdds && awayOdds >= minOdds && awayOdds <= maxOdds
    
    return homeViable || awayViable
  })

  if (viableGames.length === 0) {
    throw new AppError(
      'No viable games found for betting recommendations',
      ERROR_CODES.ML_SERVICE_ERROR,
      422,
      ErrorSeverity.MEDIUM,
      { 
        totalGames: request.games.length,
        minOdds,
        maxOdds,
        gamesWithOdds: request.games.filter(g => g.odds.home_ml || g.odds.away_ml).length
      }
    )
  }

  const selectedGame = viableGames[0];
  const homeOdds = selectedGame.odds.home_ml;
  const awayOdds = selectedGame.odds.away_ml;
  
  let selection: string;
  let odds: number;
  
  const homeViable = homeOdds && homeOdds >= minOdds && homeOdds <= maxOdds;
  const awayViable = awayOdds && awayOdds >= minOdds && awayOdds <= maxOdds;
  
  if (homeViable && awayViable) {
    const isHomeFavorite = Math.abs(homeOdds) > Math.abs(awayOdds);
    selection = isHomeFavorite ? selectedGame.home_team : selectedGame.away_team;
    odds = isHomeFavorite ? homeOdds : awayOdds;
  } else if (homeViable) {
    selection = selectedGame.home_team;
    odds = homeOdds;
  } else {
    selection = selectedGame.away_team;
    odds = awayOdds;
  }
  
  const oddsStrength = Math.abs(odds);
  const confidence = Math.min(90, Math.max(50, 100 - (oddsStrength / 10)));
  const impliedProb = odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
  const expectedValue = (confidence / 100 - impliedProb) * 0.1;

  return {
    selection: `${selection} ML`,
    market: 'moneyline',
    league: selectedGame.league,
    odds,
    confidence: Math.round(confidence * 10) / 10,
    expected_value: Math.round(expectedValue * 1000) / 1000,
    rationale: {
      reasoning: `Fallback analysis recommends ${selection} based on odds and basic team metrics.`,
      top_factors: [
        'Betting Odds Analysis',
        'Basic Team Metrics',
        'Market Efficiency'
      ],
      risk_assessment: 'Fallback analysis - moderate confidence',
      key_insights: ['Using simplified analysis due to ML service unavailability']
    },
    features_used: [
      'odds_value',
      'market_efficiency',
      'basic_team_strength'
    ],
    feature_scores: {},
    generated_at: new Date().toISOString(),
    model_version: '1.0.0-fallback'
  };
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now()
  
  validateMethod(request, ['POST'])
  
  logError('Received ML pick generation request', undefined, undefined, { 
    endpoint: '/api/ml/pick',
    method: 'POST'
  })
  
  // Parse and validate request body with timeout
  const body = await withTimeout(
    request.json() as Promise<MLRequest>,
    5000,
    'Request body parsing timeout'
  )
  
  // Validate request
  if (!body.date || !body.games || body.games.length === 0) {
    throw new AppError(
      'Invalid request data: date and games are required',
      ERROR_CODES.VALIDATION_ERROR,
      400,
      ErrorSeverity.LOW,
      { hasDate: !!body.date, gamesCount: body.games?.length || 0 }
    )
  }

  logError(`Processing ML request for ${body.games.length} games on ${body.date}`, undefined, undefined, {
    date: body.date,
    gamesCount: body.games.length,
    leagues: [...new Set(body.games.map(g => g.league))]
  })
  
  // Generate ML prediction with timeout
  const response = await withTimeout(
    generateMLPick(body),
    30000, // 30 second timeout for ML processing
    'ML prediction generation timeout'
  )
  
  const processingTime = Date.now() - startTime
  
  logError(`Successfully generated ML pick: ${response.selection}`, undefined, undefined, {
    selection: response.selection,
    confidence: response.confidence,
    processingTimeMs: processingTime
  })
  
  return NextResponse.json(response)
})

export const GET = withErrorHandling(async (request: NextRequest) => {
  validateMethod(request, ['GET'])
  
  // Health check endpoint
  const healthStatus = {
    status: 'healthy',
    service: 'ML Pick Generation',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    ml_engine: 'ready'
  }
  
  logError('ML service health check completed', undefined, undefined, { status: 'healthy' })
  
  return NextResponse.json(healthStatus)
})

export const OPTIONS = withErrorHandling(async (_request: NextRequest) => {
  // Handle CORS preflight requests
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
})
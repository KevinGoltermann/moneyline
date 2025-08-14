# ML Pick Generation API

This API endpoint provides machine learning-powered betting recommendations for sports games.

## Endpoint

`POST /api/ml/pick`

## Features

- **Intelligent Game Analysis**: Processes multiple games and selects the highest expected value bet
- **Odds Filtering**: Respects minimum and maximum odds thresholds
- **Confidence Scoring**: Provides confidence percentages for each recommendation
- **Expected Value Calculation**: Calculates expected value for betting decisions
- **Comprehensive Error Handling**: Includes timeout management and graceful error responses
- **CORS Support**: Handles cross-origin requests for web applications
- **Health Check**: GET endpoint for service monitoring

## Request Format

```json
{
  "date": "2024-01-21",
  "games": [
    {
      "home_team": "Kansas City Chiefs",
      "away_team": "Buffalo Bills",
      "league": "NFL",
      "start_time": "2024-01-21T18:30:00Z",
      "odds": {
        "home_ml": -115,
        "away_ml": -105
      },
      "venue": "Arrowhead Stadium",
      "weather": {
        "temperature": 32,
        "wind_speed": 15,
        "conditions": "Clear"
      },
      "injuries": ["Player Name (Questionable)"]
    }
  ],
  "context": {
    "season": "2023-2024",
    "week": "Championship"
  },
  "min_odds": -200,
  "max_odds": 300,
  "min_confidence": 60.0
}
```

### Required Fields

- `date`: Date for pick generation (YYYY-MM-DD format)
- `games`: Array of game objects (minimum 1 game)
  - `home_team`: Home team name
  - `away_team`: Away team name
  - `league`: Sports league (NFL, NBA, MLB, NHL)
  - `start_time`: Game start time (ISO 8601 format)
  - `odds`: Betting odds object with at least `home_ml` and/or `away_ml`

### Optional Fields

- `context`: Additional context data
- `min_odds`: Minimum odds threshold (default: -200)
- `max_odds`: Maximum odds threshold (default: 300)
- `min_confidence`: Minimum confidence threshold (default: 60.0)
- `venue`: Game venue/stadium
- `weather`: Weather conditions object
- `injuries`: Array of injury reports

## Response Format

```json
{
  "selection": "Kansas City Chiefs ML",
  "market": "moneyline",
  "league": "NFL",
  "odds": -115,
  "confidence": 72.5,
  "expected_value": 0.045,
  "rationale": {
    "reasoning": "ML model recommends Kansas City Chiefs based on comprehensive analysis.",
    "top_factors": [
      "Betting Odds Analysis",
      "Team Performance Metrics",
      "Market Efficiency"
    ],
    "risk_assessment": "Low risk factors identified"
  },
  "features_used": [
    "odds_value",
    "market_efficiency",
    "team_strength"
  ],
  "generated_at": "2024-01-21T15:30:45.123Z",
  "model_version": "1.0.0"
}
```

## Health Check

`GET /api/ml/pick`

Returns service status and health information:

```json
{
  "status": "healthy",
  "service": "ML Pick Generation",
  "timestamp": "2024-01-21T15:30:45.123Z",
  "version": "1.0.0",
  "ml_engine": "ready"
}
```

## Error Responses

### Validation Error (400)

```json
{
  "error": "Invalid request data: date and games are required",
  "code": "VALIDATION_ERROR"
}
```

### Timeout Error (408)

```json
{
  "error": "Request timeout: Request timeout",
  "code": "TIMEOUT_ERROR",
  "timestamp": "2024-01-21T15:30:45.123Z",
  "processing_time_ms": 30000
}
```

### Internal Server Error (500)

```json
{
  "error": "Internal server error: No viable games found for betting recommendations",
  "code": "INTERNAL_ERROR",
  "timestamp": "2024-01-21T15:30:45.123Z",
  "processing_time_ms": 1250
}
```

## CORS Support

The API supports cross-origin requests with the following headers:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

## Usage Examples

### Basic Request

```javascript
const response = await fetch('/api/ml/pick', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    date: '2024-01-21',
    games: [
      {
        home_team: 'Kansas City Chiefs',
        away_team: 'Buffalo Bills',
        league: 'NFL',
        start_time: '2024-01-21T18:30:00Z',
        odds: {
          home_ml: -115,
          away_ml: -105
        }
      }
    ]
  })
});

const pick = await response.json();
console.log(`Recommended pick: ${pick.selection} with ${pick.confidence}% confidence`);
```

### Health Check

```javascript
const response = await fetch('/api/ml/pick', {
  method: 'GET'
});

const health = await response.json();
console.log(`Service status: ${health.status}`);
```

## Performance

- **Timeout**: 30 seconds maximum processing time
- **Response Time**: Typically < 1 second for standard requests
- **Throughput**: Optimized for concurrent requests
- **Memory Usage**: Minimal memory footprint with efficient algorithms

## Testing

The API includes comprehensive test coverage:

- Unit tests for all endpoint functionality
- Integration tests for end-to-end scenarios
- Error handling and edge case validation
- CORS and timeout testing

Run tests with:

```bash
npm test -- src/app/api/ml/pick/__tests__/ --run
```

## Implementation Notes

- Currently uses heuristic-based selection logic as a placeholder
- Designed to integrate with Python ML services for production use
- Supports multiple sports leagues (NFL, NBA, MLB, NHL)
- Implements proper error boundaries and graceful degradation
- Includes detailed logging for debugging and monitoring
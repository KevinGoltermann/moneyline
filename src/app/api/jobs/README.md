# Daily Pick Cron Job

This directory contains the automated daily pick generation system that runs as a scheduled cron job on Vercel.

## Overview

The daily pick cron job (`/api/jobs/daily-pick`) is responsible for:

1. **Security Validation**: Validates the cron secret token to ensure only authorized requests
2. **Duplicate Prevention**: Checks if a pick already exists for the current date
3. **Game Data Fetching**: Retrieves current games and odds from external APIs
4. **ML Processing**: Calls the ML service to generate the best betting recommendation
5. **Data Storage**: Stores the generated pick in the database with all relevant metadata

## API Endpoints

### POST /api/jobs/daily-pick

**Purpose**: Generate and store today's betting pick (cron job endpoint)

**Authentication**: Requires `Authorization: Bearer {CRON_SECRET}` header

**Response Format**:
```json
{
  "success": true,
  "message": "Daily pick generated and stored successfully",
  "execution_time": 1234,
  "pick_generated": {
    "id": "uuid",
    "date": "2024-01-15",
    "selection": "Lakers ML",
    "confidence": 75.5
  }
}
```

**Error Responses**:
- `401`: Unauthorized (missing or invalid cron secret)
- `500`: Server error (database, ML service, or external API failure)

### GET /api/jobs/daily-pick

**Purpose**: Health check for the cron job service

**Authentication**: None required

**Response Format**:
```json
{
  "status": "healthy",
  "service": "Daily Pick Cron Job",
  "timestamp": "2024-01-15T10:00:00Z",
  "today_date": "2024-01-15",
  "pick_exists_today": true,
  "environment": "production"
}
```

## Configuration

### Environment Variables

- `CRON_SECRET`: Secret token for authenticating cron job requests
- `ODDS_API_KEY`: API key for The Odds API (optional, falls back to mock data)
- `WEATHER_API_KEY`: API key for weather data (optional)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for database operations

### Vercel Cron Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/jobs/daily-pick",
      "schedule": "0 15 * * *"
    }
  ]
}
```

This runs daily at 9:00 AM Mountain Time (3:00 PM UTC).

## Workflow

1. **Cron Trigger**: Vercel triggers the endpoint daily at the scheduled time
2. **Authentication**: Validates the cron secret token
3. **Duplicate Check**: Verifies no pick exists for today's date
4. **Game Fetching**: Retrieves available games from external APIs or mock data
5. **ML Processing**: Calls the ML service with game data and context
6. **Pick Storage**: Stores the generated pick with all metadata in the database
7. **Response**: Returns success status and execution details

## Error Handling

The system includes comprehensive error handling for:

- **Authentication Failures**: Invalid or missing cron secrets
- **Database Errors**: Connection issues, constraint violations, storage failures
- **External API Failures**: Odds API timeouts, invalid responses, rate limits
- **ML Service Errors**: Model failures, timeout issues, invalid responses
- **Data Validation**: Invalid game data, missing required fields

## Testing

### Unit Tests

Run the unit tests:
```bash
npm test src/app/api/jobs/__tests__/daily-pick.test.ts
```

### Integration Tests

Run the integration tests (requires test database):
```bash
npm test src/app/api/jobs/__tests__/daily-pick.integration.test.ts
```

### Manual Testing

Use the test script to verify the complete flow:

```bash
# Start the development server
npm run dev

# In another terminal, run the test script
node scripts/test-daily-pick.js
```

### Testing Against Production

```bash
TEST_URL=https://your-app.vercel.app node scripts/test-daily-pick.js
```

## Monitoring

### Logs

The cron job produces detailed logs for monitoring:

- Execution start/completion times
- Game fetching results
- ML service calls and responses
- Database operations
- Error conditions and stack traces

### Health Checks

Use the GET endpoint to monitor service health:

```bash
curl https://your-app.vercel.app/api/jobs/daily-pick
```

### Vercel Dashboard

Monitor cron job executions in the Vercel dashboard under Functions > Cron Jobs.

## Troubleshooting

### Common Issues

1. **Pick Already Exists**: The job skips generation if a pick already exists for today
2. **No Games Available**: Returns success but no pick when no games are scheduled
3. **ML Service Timeout**: Falls back to error response if ML processing takes too long
4. **External API Limits**: Uses mock data when external APIs are unavailable

### Debug Mode

Set `NODE_ENV=development` for additional debug logging.

### Manual Execution

You can manually trigger the cron job for testing:

```bash
curl -X POST https://your-app.vercel.app/api/jobs/daily-pick \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"
```

## Security

- **Token Authentication**: All cron requests must include valid authorization header
- **IP Restrictions**: Consider adding IP allowlisting for additional security
- **Rate Limiting**: Built-in protection against abuse
- **Error Sanitization**: Sensitive information is not exposed in error responses

## Performance

- **Execution Time**: Typically completes in 5-15 seconds
- **Timeout Handling**: 30-second timeout for ML service calls
- **Resource Usage**: Minimal memory footprint, suitable for serverless execution
- **Caching**: No caching required as this runs once per day

## Future Enhancements

- **Multiple Picks**: Support for generating multiple daily picks
- **League Filtering**: Allow configuration of which leagues to include
- **Confidence Thresholds**: Skip picks below minimum confidence levels
- **Notification System**: Send alerts when picks are generated or errors occur
- **Backup Scheduling**: Secondary cron job for redundancy
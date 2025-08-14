# DailyBet AI Deployment Guide

This guide covers deploying DailyBet AI to Vercel with proper configuration, monitoring, and troubleshooting.

## Prerequisites

- Node.js 18+ installed locally
- Vercel CLI installed (`npm i -g vercel`)
- Supabase project set up
- External API keys (The Odds API, Weather API)

## Environment Variables

### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Cron Security
CRON_SECRET=your_secure_random_string_32_chars_min

# External APIs
ODDS_API_KEY=your_odds_api_key
WEATHER_API_KEY=your_weather_api_key

# Admin Configuration
ADMIN_SECRET=your_admin_secret_key
```

### Optional Variables (Alerting)

```bash
# Alerting Configuration
ALERT_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
EMAIL_ALERT_ENDPOINT=https://your-email-service.com/send
ALERT_EMAIL=admin@yourdomain.com
```

## Deployment Steps

### 1. Initial Setup

```bash
# Clone and install dependencies
git clone <your-repo>
cd dailybet-ai
npm install

# Build and test locally
npm run build
npm run test
```

### 2. Vercel Deployment

```bash
# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 3. Configure Environment Variables

In Vercel Dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add all required variables from the list above
4. Ensure variables are set for "Production", "Preview", and "Development" as needed

### 4. Verify Cron Job Configuration

The `vercel.json` file should contain:

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

This runs daily at 3:00 PM UTC (9:00 AM Denver time).

### 5. Database Setup

Ensure your Supabase database has the required tables:

```sql
-- Run these migrations in Supabase SQL editor
-- (These should already be in supabase/migrations/)

-- Picks table
CREATE TABLE picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_date DATE NOT NULL UNIQUE,
    league TEXT NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    market TEXT NOT NULL DEFAULT 'moneyline',
    selection TEXT NOT NULL,
    odds NUMERIC(5,2) NOT NULL,
    confidence NUMERIC(3,1) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    rationale JSONB NOT NULL,
    features_used JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Results table
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_id UUID NOT NULL REFERENCES picks(id) ON DELETE CASCADE,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'push')),
    settled_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Performance view
CREATE VIEW v_performance AS
SELECT 
    COUNT(*) as total_picks,
    COUNT(CASE WHEN r.result = 'win' THEN 1 END) as wins,
    COUNT(CASE WHEN r.result = 'loss' THEN 1 END) as losses,
    COUNT(CASE WHEN r.result = 'push' THEN 1 END) as pushes,
    ROUND(
        COUNT(CASE WHEN r.result = 'win' THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(CASE WHEN r.result IN ('win', 'loss') THEN 1 END), 0) * 100, 
        1
    ) as win_rate
FROM picks p
LEFT JOIN results r ON p.id = r.pick_id
WHERE r.result IS NOT NULL;
```

## Post-Deployment Verification

### 1. Health Check

Visit `https://your-domain.vercel.app/api/health` to verify system health.

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "checks": [
    {
      "service": "database",
      "status": "healthy",
      "response_time": 150
    },
    {
      "service": "ml_service",
      "status": "healthy",
      "response_time": 2500
    },
    {
      "service": "external_apis",
      "status": "healthy",
      "response_time": 100
    }
  ],
  "today_pick_status": {
    "exists": true,
    "generated_at": "2024-01-01T15:00:00.000Z"
  }
}
```

### 2. Test Cron Job

```bash
# Test cron job manually
curl -X POST https://your-domain.vercel.app/api/jobs/daily-pick \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### 3. Verify Public Endpoints

- Home page: `https://your-domain.vercel.app/`
- Performance: `https://your-domain.vercel.app/performance`
- Today's pick API: `https://your-domain.vercel.app/api/today`
- Performance API: `https://your-domain.vercel.app/api/performance`

## Monitoring and Alerting

### Built-in Monitoring

The application includes several monitoring endpoints:

1. **Health Check**: `/api/health`
   - System-wide health status
   - Database connectivity
   - ML service availability
   - External API status

2. **Admin Monitoring**: `/api/admin/monitoring`
   - Requires admin authentication
   - Detailed system metrics
   - Recent picks and performance
   - Error logs

### Setting Up Alerts

1. **Slack Integration**:
   - Create a Slack webhook URL
   - Add `SLACK_WEBHOOK_URL` environment variable
   - Alerts will be sent to your Slack channel

2. **Custom Webhooks**:
   - Set up your webhook endpoint
   - Add `ALERT_WEBHOOK_URL` environment variable
   - Receive JSON alerts at your endpoint

3. **Email Alerts**:
   - Configure email service endpoint
   - Add `EMAIL_ALERT_ENDPOINT` and `ALERT_EMAIL` variables

### Monitoring Dashboard

Access the admin monitoring dashboard:

```bash
curl -X GET https://your-domain.vercel.app/api/admin/monitoring \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

## Troubleshooting

### Common Issues

#### 1. Cron Job Not Running

**Symptoms**: No daily picks generated, health check shows no pick for today

**Solutions**:
- Verify `CRON_SECRET` environment variable is set
- Check Vercel Functions logs for cron execution
- Manually test cron endpoint with correct authorization
- Ensure cron schedule in `vercel.json` is correct

**Debug Commands**:
```bash
# Check cron job health
curl https://your-domain.vercel.app/api/jobs/daily-pick

# Test manual execution
curl -X POST https://your-domain.vercel.app/api/jobs/daily-pick \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

#### 2. ML Service Timeout

**Symptoms**: 500 errors from `/api/ml/pick`, cron job fails with ML service error

**Solutions**:
- Check external API rate limits
- Verify API keys are valid
- Increase function timeout in `vercel.json`
- Check Python dependencies in `requirements.txt`

**Debug Commands**:
```bash
# Test ML service directly
curl -X POST https://your-domain.vercel.app/api/ml/pick \
  -H "Content-Type: application/json" \
  -d '{"date":"2024-01-01","games":[],"context":{"health_check":true}}'
```

#### 3. Database Connection Issues

**Symptoms**: Health check shows database unhealthy, API errors

**Solutions**:
- Verify Supabase URL and keys
- Check Supabase project status
- Ensure database tables exist
- Check connection limits

**Debug Commands**:
```bash
# Test database connectivity
curl https://your-domain.vercel.app/api/health
```

#### 4. External API Failures

**Symptoms**: No games data, ML service errors, degraded health status

**Solutions**:
- Verify API keys are valid and not expired
- Check API rate limits and quotas
- Ensure API endpoints are accessible
- Review fallback to mock data

#### 5. Environment Variable Issues

**Symptoms**: Various authentication errors, service unavailable

**Solutions**:
- Verify all required environment variables are set
- Check variable names match exactly
- Ensure variables are set for correct environment (production/preview)
- Redeploy after environment variable changes

### Debugging Tools

#### 1. Health Check Endpoint

```bash
curl https://your-domain.vercel.app/api/health
```

#### 2. Admin Monitoring

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  https://your-domain.vercel.app/api/admin/monitoring
```

#### 3. Vercel Logs

```bash
# View function logs
vercel logs

# View specific function logs
vercel logs --follow
```

#### 4. Manual Testing

```bash
# Test today's pick API
curl https://your-domain.vercel.app/api/today

# Test performance API
curl https://your-domain.vercel.app/api/performance

# Test admin settle
curl -X POST https://your-domain.vercel.app/api/admin/settle \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"pickId":"uuid","result":"win"}'
```

### Performance Optimization

#### 1. Function Configuration

Optimize function settings in `vercel.json`:

```json
{
  "functions": {
    "src/app/api/ml/pick/route.py": {
      "maxDuration": 30,
      "memory": 1024
    },
    "src/app/api/jobs/daily-pick/route.ts": {
      "maxDuration": 60
    }
  }
}
```

#### 2. Database Optimization

- Add indexes for frequently queried columns
- Use database connection pooling
- Optimize query patterns

#### 3. Caching Strategy

- Implement response caching for static data
- Use Vercel Edge Caching for public endpoints
- Cache external API responses when appropriate

### Security Checklist

- [ ] All environment variables are set and secure
- [ ] CRON_SECRET is sufficiently random (32+ characters)
- [ ] ADMIN_SECRET is secure and not shared
- [ ] API keys are valid and have appropriate permissions
- [ ] Database access is properly configured
- [ ] CORS settings are appropriate for public access
- [ ] Rate limiting is configured for public endpoints

### Maintenance Tasks

#### Daily
- Monitor health check endpoint
- Review alert notifications
- Check cron job execution logs

#### Weekly
- Review performance metrics
- Check external API usage and limits
- Update ML model if needed

#### Monthly
- Review and rotate secrets if needed
- Update dependencies
- Analyze system performance trends
- Review and optimize database queries

## Support and Monitoring

### Key Metrics to Monitor

1. **System Health**: Overall system status from `/api/health`
2. **Daily Pick Generation**: Success rate of cron job execution
3. **ML Service Performance**: Response times and success rates
4. **Database Performance**: Query response times and connection health
5. **External API Health**: Availability and response times
6. **User Traffic**: Page views and API usage

### Alert Conditions

The system will automatically alert on:
- System health status becomes unhealthy or degraded
- Daily pick not generated by 3 PM Denver time
- ML service failures or timeouts
- Database connectivity issues
- External API failures

### Getting Help

1. Check this troubleshooting guide first
2. Review Vercel function logs
3. Check system health and monitoring endpoints
4. Review environment variable configuration
5. Test individual components manually

For additional support, ensure you have:
- Vercel deployment URL
- Recent error logs
- Environment variable configuration (without sensitive values)
- Description of the issue and steps to reproduce
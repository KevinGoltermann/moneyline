# 🚀 Production Deployment Checklist

## Pre-Deployment Testing

### 1. 🧪 Run Test Suite
```bash
# Start your development server
npm run dev

# Run comprehensive tests
python test_production_readiness.py
```

**Requirements:**
- ✅ All tests pass
- ⚠️  Max 2 warnings acceptable
- ❌ Zero failed tests

### 2. 🔍 Manual Testing
```bash
# Test ML endpoint directly
python test_ml_endpoint.py

# Test backtest functionality
python backtest_mlb_today.py

# Test individual components
python test_working_complex.py
```

### 3. 📊 Performance Validation
- ✅ API response time < 10 seconds
- ✅ Memory usage reasonable
- ✅ No memory leaks during extended use
- ✅ Handles multiple concurrent requests

---

## Environment Configuration

### 4. 🔐 Environment Variables
Verify all required variables are set:

```bash
# Required for production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
CRON_SECRET=your_secure_cron_secret
ADMIN_SECRET=your_admin_secret

# External APIs
ODDS_API_KEY=your_odds_api_key
WEATHER_API_KEY=your_weather_api_key
SPORTS_DATA_API_KEY=your_sports_data_key

# Production environment
NODE_ENV=production
```

### 5. 🗄️  Database Setup
- ✅ Supabase project created
- ✅ Database tables created (`picks`, `results`)
- ✅ Indexes created for performance
- ✅ Row Level Security (RLS) configured
- ✅ Database connection tested

---

## Deployment Steps

### 6. 🌐 Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Configure environment variables in Vercel dashboard
```

### 7. ⏰ Cron Job Configuration
Verify `vercel.json` contains:
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

### 8. 🔒 Security Configuration
- ✅ API routes protected with secrets
- ✅ CORS configured properly
- ✅ Rate limiting enabled
- ✅ Input validation in place
- ✅ Error messages don't expose sensitive data

---

## Post-Deployment Validation

### 9. 🎯 Production Testing
```bash
# Test production API
curl -X POST https://your-domain.vercel.app/api/ml/pick \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-13",
    "games": [{
      "home_team": "Kansas City Chiefs",
      "away_team": "Buffalo Bills",
      "league": "NFL",
      "start_time": "2025-01-13T20:00:00Z",
      "odds": {"home_ml": -120, "away_ml": 100}
    }]
  }'
```

### 10. 📈 Monitoring Setup
- ✅ Vercel analytics enabled
- ✅ Error tracking configured
- ✅ Performance monitoring active
- ✅ Cron job execution logs reviewed
- ✅ Database query performance monitored

### 11. 🔄 Cron Job Validation
- ✅ First cron execution successful
- ✅ Daily pick generated and stored
- ✅ Website displays pick correctly
- ✅ No errors in Vercel function logs

---

## Rollback Plan

### 12. 🚨 Emergency Procedures
If issues occur:

1. **Immediate Rollback**
   ```bash
   # Rollback to previous deployment
   vercel rollback
   ```

2. **Disable Cron Jobs**
   - Remove cron configuration from `vercel.json`
   - Redeploy to stop automated picks

3. **Fallback Mode**
   - System automatically uses fallback logic
   - Manual pick generation available via admin

---

## Success Criteria

### 13. ✅ Production Ready When:
- [ ] All automated tests pass
- [ ] Manual testing successful
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Environment variables configured
- [ ] Database properly set up
- [ ] Cron jobs working correctly
- [ ] Monitoring and alerts active
- [ ] Rollback plan tested
- [ ] Documentation updated

---

## 🎉 Go Live Process

### Final Steps:
1. **Announce maintenance window** (if needed)
2. **Deploy to production** with `vercel --prod`
3. **Verify first cron execution** at 9 AM Denver time
4. **Monitor for 24 hours** for any issues
5. **Validate pick accuracy** with backtest tools
6. **Announce system is live** 🚀

---

## 📞 Support Contacts

**Technical Issues:**
- Check Vercel function logs
- Review Supabase database logs
- Monitor SportsData.io API usage

**Emergency Contacts:**
- Vercel support for deployment issues
- Supabase support for database issues
- SportsData.io support for API issues

---

## 📚 Additional Resources

- [Vercel Deployment Guide](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [SportsData.io API Docs](https://sportsdata.io/developers)
- [Next.js Production Guide](https://nextjs.org/docs/deployment)

**Remember:** Test everything twice, deploy once! 🎯
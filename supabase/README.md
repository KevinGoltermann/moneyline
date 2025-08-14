# Database Setup

This directory contains the database schema and migration files for DailyBet AI.

## Migration Files

1. **001_create_picks_table.sql** - Creates the main picks table for storing daily ML recommendations
2. **002_create_results_table.sql** - Creates the results table for tracking pick outcomes
3. **003_create_performance_view.sql** - Creates performance views and materialized views for analytics

## Setup Instructions

### For Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run each migration file in order (001, 002, 003)
4. Verify tables and views are created successfully

### For Supabase CLI (if using local development)

```bash
# Initialize Supabase (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## Database Schema Overview

### Tables

- **picks**: Stores daily ML-powered betting recommendations
  - Unique constraint on `pick_date` (one pick per day)
  - JSONB fields for rationale and features
  - Automatic timestamp management

- **results**: Tracks outcomes for picks
  - Foreign key relationship to picks
  - Constraint ensuring valid result values (win/loss/push)
  - Unique constraint (one result per pick)

### Views

- **v_performance**: Real-time aggregated statistics
- **mv_performance_history**: Materialized view with historical data and running calculations

### Indexes

- Optimized for date-based queries
- Performance indexes on foreign keys
- Composite indexes for common query patterns

## Environment Variables Required

Make sure these are set in your Supabase project:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Row Level Security (RLS)

The current schema allows public read access to picks and results data, with write operations restricted to service role. If you need to implement RLS policies:

```sql
-- Enable RLS on tables
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on picks" ON picks FOR SELECT USING (true);
CREATE POLICY "Allow public read access on results" ON results FOR SELECT USING (true);
```

## Maintenance

The materialized view `mv_performance_history` is automatically refreshed when results are updated via triggers. For manual refresh:

```sql
SELECT refresh_performance_history();
```
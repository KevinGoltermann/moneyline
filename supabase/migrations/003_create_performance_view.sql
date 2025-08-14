-- Create performance view for aggregated statistics
CREATE VIEW v_performance AS
SELECT 
    COUNT(*) as total_picks,
    COUNT(CASE WHEN r.result = 'win' THEN 1 END) as wins,
    COUNT(CASE WHEN r.result = 'loss' THEN 1 END) as losses,
    COUNT(CASE WHEN r.result = 'push' THEN 1 END) as pushes,
    COUNT(CASE WHEN r.result IS NOT NULL THEN 1 END) as settled_picks,
    ROUND(
        COUNT(CASE WHEN r.result = 'win' THEN 1 END)::NUMERIC / 
        NULLIF(COUNT(CASE WHEN r.result IN ('win', 'loss') THEN 1 END), 0) * 100, 
        1
    ) as win_rate,
    -- Calculate current streak
    (
        WITH recent_results AS (
            SELECT r.result, p.pick_date,
                   ROW_NUMBER() OVER (ORDER BY p.pick_date DESC) as rn
            FROM picks p
            JOIN results r ON p.id = r.pick_id
            WHERE r.result IN ('win', 'loss')
            ORDER BY p.pick_date DESC
        ),
        streak_calc AS (
            SELECT result,
                   COUNT(*) as streak_length
            FROM recent_results
            WHERE rn <= (
                SELECT MIN(rn) - 1
                FROM recent_results r1
                WHERE r1.result != (SELECT result FROM recent_results WHERE rn = 1)
            )
            GROUP BY result
        )
        SELECT COALESCE(
            (SELECT json_build_object(
                'type', result,
                'count', streak_length
            ) FROM streak_calc),
            json_build_object('type', 'none', 'count', 0)
        )
    ) as current_streak
FROM picks p
LEFT JOIN results r ON p.id = r.pick_id;

-- Add comment for documentation
COMMENT ON VIEW v_performance IS 'Aggregated performance statistics for ML picks';

-- Create materialized view for better performance on large datasets
CREATE MATERIALIZED VIEW mv_performance_history AS
SELECT 
    p.pick_date,
    p.league,
    p.selection,
    p.odds,
    p.confidence,
    r.result,
    r.settled_at,
    -- Running totals for chart data
    SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END) 
        OVER (ORDER BY p.pick_date ROWS UNBOUNDED PRECEDING) as cumulative_wins,
    SUM(CASE WHEN r.result = 'loss' THEN 1 ELSE 0 END) 
        OVER (ORDER BY p.pick_date ROWS UNBOUNDED PRECEDING) as cumulative_losses,
    SUM(CASE WHEN r.result = 'push' THEN 1 ELSE 0 END) 
        OVER (ORDER BY p.pick_date ROWS UNBOUNDED PRECEDING) as cumulative_pushes,
    -- Running win rate calculation
    ROUND(
        SUM(CASE WHEN r.result = 'win' THEN 1 ELSE 0 END) 
            OVER (ORDER BY p.pick_date ROWS UNBOUNDED PRECEDING)::NUMERIC /
        NULLIF(
            SUM(CASE WHEN r.result IN ('win', 'loss') THEN 1 ELSE 0 END) 
                OVER (ORDER BY p.pick_date ROWS UNBOUNDED PRECEDING), 
            0
        ) * 100, 
        1
    ) as running_win_rate
FROM picks p
LEFT JOIN results r ON p.id = r.pick_id
WHERE r.result IS NOT NULL
ORDER BY p.pick_date;

-- Add comment for materialized view
COMMENT ON MATERIALIZED VIEW mv_performance_history IS 'Historical performance data with running calculations for charts';

-- Create index on materialized view
CREATE INDEX idx_mv_performance_history_date ON mv_performance_history(pick_date);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_performance_history()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_performance_history;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh materialized view when results are updated
CREATE OR REPLACE FUNCTION trigger_refresh_performance_history()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_performance_history();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_performance_on_result_change
    AFTER INSERT OR UPDATE OR DELETE ON results
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_performance_history();
-- Create picks table to store daily ML recommendations
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

-- Add comments for documentation
COMMENT ON TABLE picks IS 'Daily ML-powered betting recommendations';
COMMENT ON COLUMN picks.pick_date IS 'Date for which this pick is made (unique per day)';
COMMENT ON COLUMN picks.league IS 'Sports league (e.g., NFL, NBA, MLB)';
COMMENT ON COLUMN picks.market IS 'Betting market type (moneyline, spread, total)';
COMMENT ON COLUMN picks.selection IS 'The actual pick (team name or over/under)';
COMMENT ON COLUMN picks.odds IS 'Decimal odds for the selection';
COMMENT ON COLUMN picks.confidence IS 'ML confidence percentage (0-100)';
COMMENT ON COLUMN picks.rationale IS 'JSON object with reasoning and top factors';
COMMENT ON COLUMN picks.features_used IS 'JSON array of features used in ML model';

-- Create index for efficient date-based queries
CREATE INDEX idx_picks_date ON picks(pick_date DESC);

-- Create index for league filtering
CREATE INDEX idx_picks_league ON picks(league);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_picks_updated_at 
    BEFORE UPDATE ON picks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
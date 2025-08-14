-- Create results table to track pick outcomes
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pick_id UUID NOT NULL REFERENCES picks(id) ON DELETE CASCADE,
    result TEXT NOT NULL CHECK (result IN ('win', 'loss', 'push')),
    settled_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Add comments for documentation
COMMENT ON TABLE results IS 'Outcomes for betting picks';
COMMENT ON COLUMN results.pick_id IS 'Foreign key reference to picks table';
COMMENT ON COLUMN results.result IS 'Outcome: win, loss, or push';
COMMENT ON COLUMN results.settled_at IS 'When the result was determined';
COMMENT ON COLUMN results.notes IS 'Optional notes about the result';

-- Create indexes for performance
CREATE INDEX idx_results_pick_id ON results(pick_id);
CREATE INDEX idx_results_settled_at ON results(settled_at DESC);
CREATE INDEX idx_results_result ON results(result);

-- Ensure one result per pick
CREATE UNIQUE INDEX idx_results_unique_pick ON results(pick_id);

-- Add constraint to ensure pick exists
ALTER TABLE results ADD CONSTRAINT fk_results_pick_id 
    FOREIGN KEY (pick_id) REFERENCES picks(id) ON DELETE CASCADE;
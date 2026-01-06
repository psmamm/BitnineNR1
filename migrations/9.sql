-- Tournament Entry Fee and Prize Pool Migration
-- Add entry_fee, prize_pool, and tournament_tier columns to tournaments table

ALTER TABLE tournaments ADD COLUMN entry_fee REAL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN prize_pool REAL DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN tournament_tier TEXT DEFAULT 'SUPER 8';

-- Update default max_participants to 8 for new tournaments
-- Note: This doesn't change existing tournaments, only affects new ones
-- The default in CREATE TABLE is already set, but we ensure consistency




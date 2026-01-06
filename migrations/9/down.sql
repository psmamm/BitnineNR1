-- Rollback Tournament Entry Fee and Prize Pool Migration

ALTER TABLE tournaments DROP COLUMN entry_fee;
ALTER TABLE tournaments DROP COLUMN prize_pool;
ALTER TABLE tournaments DROP COLUMN tournament_tier;




-- Rollback Migration 7
DROP INDEX IF EXISTS idx_tournament_chat_tournament_id;
DROP INDEX IF EXISTS idx_matchmaking_queue_match_type;
DROP INDEX IF EXISTS idx_matchmaking_queue_elo;
DROP INDEX IF EXISTS idx_tournament_participants_tournament_id;
DROP INDEX IF EXISTS idx_tournaments_status;
DROP INDEX IF EXISTS idx_daily_challenge_participants_challenge_id;
DROP INDEX IF EXISTS idx_daily_challenges_date;
DROP INDEX IF EXISTS idx_match_positions_match_id;
DROP INDEX IF EXISTS idx_matches_player2_id;
DROP INDEX IF EXISTS idx_matches_player1_id;
DROP INDEX IF EXISTS idx_matches_status;
DROP INDEX IF EXISTS idx_player_elo_elo;
DROP INDEX IF EXISTS idx_player_elo_user_id;

DROP TABLE IF EXISTS tournament_chat;
DROP TABLE IF EXISTS tournament_participants;
DROP TABLE IF EXISTS tournaments;
DROP TABLE IF EXISTS daily_challenge_participants;
DROP TABLE IF EXISTS daily_challenges;
DROP TABLE IF EXISTS match_positions;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS matchmaking_queue;
DROP TABLE IF EXISTS friends;
DROP TABLE IF EXISTS player_elo;


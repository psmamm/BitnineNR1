-- Seed Example Tournaments
-- This script creates example tournaments for users to join

-- SUPER 8 Tournaments (8 participants, lower entry fees)
INSERT INTO tournaments (creator_id, name, symbol, description, time_limit, max_participants, entry_fee, prize_pool, tournament_tier, status, created_at)
VALUES 
    ('system', 'BTC Quick Challenge', 'BTCUSDT', 'Fast-paced Bitcoin trading tournament. Show your skills!', 15, 8, 25.00, 200.00, 'SUPER 8', 'ready', datetime('now')),
    ('system', 'ETH Speed Run', 'ETHUSDT', 'Ethereum trading speed challenge. 15 minutes to prove yourself!', 15, 8, 30.00, 240.00, 'SUPER 8', 'ready', datetime('now')),
    ('system', 'BNB Beginner Battle', 'BNBUSDT', 'Perfect for beginners. Low entry, high learning!', 15, 8, 20.00, 160.00, 'SUPER 8', 'ready', datetime('now'));

-- SWEET 16 Tournaments (16 participants, medium entry fees)
INSERT INTO tournaments (creator_id, name, symbol, description, time_limit, max_participants, entry_fee, prize_pool, tournament_tier, status, created_at)
VALUES 
    ('system', 'BTC Championship', 'BTCUSDT', 'Competitive Bitcoin tournament. 16 traders, one winner!', 20, 16, 100.00, 1600.00, 'SWEET 16', 'ready', datetime('now')),
    ('system', 'ETH Elite Challenge', 'ETHUSDT', 'Elite Ethereum trading competition. Are you ready?', 20, 16, 75.00, 1200.00, 'SWEET 16', 'ready', datetime('now')),
    ('system', 'Multi-Coin Showdown', 'BTCUSDT', 'Trade multiple coins in this exciting tournament!', 25, 16, 50.00, 800.00, 'SWEET 16', 'ready', datetime('now'));

-- ROYAL 8 Tournaments (8 participants, high entry fees, premium)
INSERT INTO tournaments (creator_id, name, symbol, description, time_limit, max_participants, entry_fee, prize_pool, tournament_tier, status, created_at)
VALUES 
    ('system', 'BTC Royal Tournament', 'BTCUSDT', 'Premium Bitcoin tournament. High stakes, high rewards!', 15, 8, 250.00, 2000.00, 'ROYAL 8', 'ready', datetime('now')),
    ('system', 'ETH Crown Challenge', 'ETHUSDT', 'The ultimate Ethereum trading challenge. Only for the best!', 15, 8, 200.00, 1600.00, 'ROYAL 8', 'ready', datetime('now'));

-- Active Tournaments (already started, users can still join if not full)
INSERT INTO tournaments (creator_id, name, symbol, description, time_limit, max_participants, entry_fee, prize_pool, tournament_tier, status, started_at, created_at)
VALUES 
    ('system', 'BTC Live Battle', 'BTCUSDT', 'Live Bitcoin trading battle. Join now!', 30, 8, 40.00, 320.00, 'SUPER 8', 'active', datetime('now', '-5 minutes'), datetime('now', '-10 minutes')),
    ('system', 'ETH Active Challenge', 'ETHUSDT', 'Active Ethereum tournament. Still accepting participants!', 25, 16, 60.00, 960.00, 'SWEET 16', 'active', datetime('now', '-3 minutes'), datetime('now', '-8 minutes'));




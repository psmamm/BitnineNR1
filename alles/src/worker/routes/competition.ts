import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";
import { getCookie } from "hono/cookie";

const competitionRouter = new Hono<{ Bindings: any }>();

// Combined auth middleware that supports both mocha sessions and Firebase sessions
const combinedAuthMiddleware = async (c: any, next: any) => {
    // First try the mocha auth middleware
    try {
        await authMiddleware(c, async () => {});
        if (c.get('user')) {
            return next();
        }
    } catch (e) {
        // Mocha auth failed, try Firebase session
    }

    // Try Firebase session as fallback
    const firebaseSession = getCookie(c, 'firebase_session');
    if (firebaseSession) {
        try {
            const userData = JSON.parse(firebaseSession);
            // Set user in context in the format expected by routes
            c.set('user', {
                google_user_data: {
                    sub: userData.google_user_id || userData.sub,
                    email: userData.email,
                    name: userData.name,
                },
                firebase_user_id: userData.google_user_id || userData.sub,
                email: userData.email,
            });
            return next();
        } catch (e) {
            console.error('Error parsing Firebase session:', e);
        }
    }

    // Both auth methods failed
    return c.json({ error: 'Unauthorized' }, 401);
};

// Helper: Get or create player ELO
async function getOrCreatePlayerELO(db: any, userId: string, username: string) {
    let player = await db.prepare(`
        SELECT * FROM player_elo WHERE user_id = ?
    `).bind(userId).first();

    if (!player) {
        await db.prepare(`
            INSERT INTO player_elo (user_id, username, elo, division)
            VALUES (?, ?, 500, 'Bronze')
        `).bind(userId, username).run();
        
        player = await db.prepare(`
            SELECT * FROM player_elo WHERE user_id = ?
        `).bind(userId).first();
    }

    return player;
}

// Helper: Calculate division from ELO
function getDivision(elo: number): string {
    if (elo >= 1600) return 'Grandmaster';
    if (elo >= 1400) return 'Master';
    if (elo >= 1200) return 'Diamond';
    if (elo >= 1000) return 'Platinum';
    if (elo >= 800) return 'Gold';
    if (elo >= 600) return 'Silver';
    return 'Bronze';
}

// Helper: Calculate ELO change
function calculateELOChange(playerELO: number, opponentELO: number, won: boolean, pnlDiff: number): number {
    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, (opponentELO - playerELO) / 400));
    const actualScore = won ? 1 : 0;
    
    // Bonus for large PnL difference (max +5 ELO bonus)
    const pnlBonus = Math.min(5, Math.max(0, Math.abs(pnlDiff) / 1000));
    const eloChange = Math.round(K * (actualScore - expectedScore) + (won ? pnlBonus : -pnlBonus));
    
    return eloChange;
}

// ==================== ELO SYSTEM ====================

// Get user ELO
competitionRouter.get('/elo', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    const username = user.google_user_data?.name || user.email?.split('@')[0] || 'Anonymous';

    try {
        const player = await getOrCreatePlayerELO(c.env.DB, userId, username);
        return c.json({ 
            elo: player.elo,
            division: player.division,
            totalMatches: player.total_matches,
            wins: player.wins,
            losses: player.losses,
            bestElo: player.best_elo
        });
    } catch (error) {
        console.error('Error fetching ELO:', error);
        return c.json({ error: 'Failed to fetch ELO' }, 500);
    }
});

// Get ELO leaderboard
competitionRouter.get('/elo/leaderboard', async (c) => {
    const limit = parseInt(c.req.query('limit') || '100');

    try {
        const players = await c.env.DB.prepare(`
            SELECT user_id, username, elo, division, total_matches, wins, losses
            FROM player_elo
            ORDER BY elo DESC
            LIMIT ?
        `).bind(limit).all();

        return c.json({ players: players.results });
    } catch (error) {
        console.error('Error fetching ELO leaderboard:', error);
        return c.json({ error: 'Failed to fetch leaderboard' }, 500);
    }
});

// ==================== MATCHMAKING ====================

// Get online players count
competitionRouter.get('/matchmaking/online', async (c) => {
    try {
        const count = await c.env.DB.prepare(`
            SELECT COUNT(*) as count FROM matchmaking_queue
        `).first();
        
        const activeMatches = await c.env.DB.prepare(`
            SELECT COUNT(*) as count FROM matches WHERE status = 'active'
        `).first();

        return c.json({ 
            online: (count?.count || 0) + ((activeMatches?.count || 0) * 2)
        });
    } catch (error) {
        console.error('Error fetching online count:', error);
        return c.json({ online: 0 });
    }
});

// Join matchmaking queue
competitionRouter.post('/matchmaking/join', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    const username = user.google_user_data?.name || user.email?.split('@')[0] || 'Anonymous';
    const { matchType, symbol } = await c.req.json();

    try {
        // Get player ELO
        const player = await getOrCreatePlayerELO(c.env.DB, userId, username);

        // Remove from queue if already in
        await c.env.DB.prepare(`
            DELETE FROM matchmaking_queue WHERE user_id = ?
        `).bind(userId).run();

        // Add to queue
        await c.env.DB.prepare(`
            INSERT INTO matchmaking_queue (user_id, username, elo, match_type, symbol)
            VALUES (?, ?, ?, ?, ?)
        `).bind(userId, username, player.elo, matchType || 'ranked', symbol || 'BTCUSDT').run();

        // Try to find match
        if (matchType === 'ranked') {
            const opponent = await c.env.DB.prepare(`
                SELECT * FROM matchmaking_queue
                WHERE user_id != ? AND match_type = 'ranked' AND symbol = ?
                ORDER BY ABS(elo - ?) ASC
                LIMIT 1
            `).bind(userId, symbol || 'BTCUSDT', player.elo).first();

            if (opponent) {
                // Create match
                const matchResult = await c.env.DB.prepare(`
                    INSERT INTO matches (match_type, status, symbol, player1_id, player2_id, started_at)
                    VALUES (?, 'active', ?, ?, ?, CURRENT_TIMESTAMP)
                `).bind('ranked', symbol || 'BTCUSDT', userId, opponent.user_id).run();

                // Remove both from queue
                await c.env.DB.prepare(`
                    DELETE FROM matchmaking_queue WHERE user_id IN (?, ?)
                `).bind(userId, opponent.user_id).run();

                return c.json({ 
                    matchFound: true, 
                    matchId: matchResult.meta.last_row_id 
                });
            }
        }

        return c.json({ matchFound: false, inQueue: true });
    } catch (error) {
        console.error('Error joining matchmaking:', error);
        return c.json({ error: 'Failed to join matchmaking' }, 500);
    }
});

// Cancel matchmaking
competitionRouter.post('/matchmaking/cancel', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;

    try {
        await c.env.DB.prepare(`
            DELETE FROM matchmaking_queue WHERE user_id = ?
        `).bind(userId).run();

        return c.json({ success: true });
    } catch (error) {
        console.error('Error canceling matchmaking:', error);
        return c.json({ error: 'Failed to cancel matchmaking' }, 500);
    }
});

// Get matchmaking status
competitionRouter.get('/matchmaking/status', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;

    try {
        const queueEntry = await c.env.DB.prepare(`
            SELECT * FROM matchmaking_queue WHERE user_id = ?
        `).bind(userId).first();

        if (!queueEntry) {
            return c.json({ inQueue: false });
        }

        const elapsed = Math.floor((Date.now() - new Date(queueEntry.joined_at).getTime()) / 1000);
        const estimated = 35; // Estimated wait time

        return c.json({ 
            inQueue: true,
            elapsed,
            estimated,
            matchType: queueEntry.match_type,
            symbol: queueEntry.symbol
        });
    } catch (error) {
        console.error('Error fetching matchmaking status:', error);
        return c.json({ error: 'Failed to fetch status' }, 500);
    }
});

// ==================== MATCHES ====================

// Get match details
competitionRouter.get('/matches/:id', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const matchId = c.req.param('id');
    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;

    try {
        const match = await c.env.DB.prepare(`
            SELECT * FROM matches WHERE id = ?
        `).bind(matchId).first();

        if (!match) {
            return c.json({ error: 'Match not found' }, 404);
        }

        // Check if user is part of match
        if (match.player1_id !== userId && match.player2_id !== userId) {
            return c.json({ error: 'Unauthorized' }, 403);
        }

        return c.json({ match });
    } catch (error) {
        console.error('Error fetching match:', error);
        return c.json({ error: 'Failed to fetch match' }, 500);
    }
});

// Complete match
competitionRouter.post('/matches/:id/complete', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const matchId = c.req.param('id');
    const { 
        player1Balance, player1PnL, player1Trades, player1WinRate,
        player2Balance, player2PnL, player2Trades, player2WinRate
    } = await c.req.json();

    try {
        const match = await c.env.DB.prepare(`
            SELECT * FROM matches WHERE id = ? AND status = 'active'
        `).bind(matchId).first();

        if (!match) {
            return c.json({ error: 'Match not found or already completed' }, 404);
        }

        // Determine winner
        const player1Won = player1PnL > player2PnL;
        const winnerId = player1Won ? match.player1_id : match.player2_id;

        // Calculate ELO changes if ranked match
        let player1EloChange = 0;
        let player2EloChange = 0;

        if (match.match_type === 'ranked' && match.player2_id) {
            const player1 = await getOrCreatePlayerELO(c.env.DB, match.player1_id, '');
            const player2 = await getOrCreatePlayerELO(c.env.DB, match.player2_id, '');
            
            const pnlDiff = player1PnL - player2PnL;
            player1EloChange = calculateELOChange(player1.elo, player2.elo, player1Won, pnlDiff);
            player2EloChange = calculateELOChange(player2.elo, player1.elo, !player1Won, -pnlDiff);

            // Update ELO
            const newPlayer1Elo = Math.max(0, player1.elo + player1EloChange);
            const newPlayer2Elo = Math.max(0, player2.elo + player2EloChange);

            await c.env.DB.prepare(`
                UPDATE player_elo 
                SET elo = ?, division = ?, total_matches = total_matches + 1, 
                    wins = wins + ?, losses = losses + ?,
                    best_elo = MAX(best_elo, ?), updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `).bind(
                newPlayer1Elo, 
                getDivision(newPlayer1Elo),
                player1Won ? 1 : 0,
                player1Won ? 0 : 1,
                newPlayer1Elo,
                match.player1_id
            ).run();

            await c.env.DB.prepare(`
                UPDATE player_elo 
                SET elo = ?, division = ?, total_matches = total_matches + 1, 
                    wins = wins + ?, losses = losses + ?,
                    best_elo = MAX(best_elo, ?), updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            `).bind(
                newPlayer2Elo, 
                getDivision(newPlayer2Elo),
                player1Won ? 0 : 1,
                player1Won ? 1 : 0,
                newPlayer2Elo,
                match.player2_id
            ).run();
        }

        // Update match
        await c.env.DB.prepare(`
            UPDATE matches 
            SET status = 'completed',
                player1_balance = ?, player1_pnl = ?, player1_trades = ?, player1_win_rate = ?, player1_elo_change = ?,
                player2_balance = ?, player2_pnl = ?, player2_trades = ?, player2_win_rate = ?, player2_elo_change = ?,
                winner_id = ?, completed_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(
            player1Balance, player1PnL, player1Trades, player1WinRate, player1EloChange,
            player2Balance || 0, player2PnL || 0, player2Trades || 0, player2WinRate || 0, player2EloChange,
            winnerId, matchId
        ).run();

        return c.json({ 
            success: true,
            player1EloChange,
            player2EloChange,
            winnerId
        });
    } catch (error) {
        console.error('Error completing match:', error);
        return c.json({ error: 'Failed to complete match' }, 500);
    }
});

// Get match positions (for analytics)
competitionRouter.get('/matches/:id/positions', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const matchId = c.req.param('id');
    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;

    try {
        const match = await c.env.DB.prepare(`
            SELECT * FROM matches WHERE id = ?
        `).bind(matchId).first();

        if (!match || (match.player1_id !== userId && match.player2_id !== userId)) {
            return c.json({ error: 'Unauthorized' }, 403);
        }

        const positions = await c.env.DB.prepare(`
            SELECT * FROM match_positions 
            WHERE match_id = ? AND user_id = ?
            ORDER BY opened_at ASC
        `).bind(matchId, userId).all();

        return c.json({ positions: positions.results });
    } catch (error) {
        console.error('Error fetching match positions:', error);
        return c.json({ error: 'Failed to fetch positions' }, 500);
    }
});

// ==================== DAILY CHALLENGE ====================

// Get current daily challenge
competitionRouter.get('/daily-challenge', async (c) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        let challenge = await c.env.DB.prepare(`
            SELECT * FROM daily_challenges WHERE challenge_date = ?
        `).bind(today).first();

        if (!challenge) {
            // Create today's challenge
            const result = await c.env.DB.prepare(`
                INSERT INTO daily_challenges (challenge_date, status, started_at)
                VALUES (?, 'active', CURRENT_TIMESTAMP)
            `).bind(today).run();

            challenge = await c.env.DB.prepare(`
                SELECT * FROM daily_challenges WHERE id = ?
            `).bind(result.meta.last_row_id).first();
        }

        // Get participant count
        const participantCount = await c.env.DB.prepare(`
            SELECT COUNT(*) as count FROM daily_challenge_participants WHERE challenge_id = ?
        `).bind(challenge.id).first();

        return c.json({ 
            challenge: {
                ...challenge,
                participantCount: participantCount?.count || 0
            }
        });
    } catch (error) {
        console.error('Error fetching daily challenge:', error);
        return c.json({ error: 'Failed to fetch daily challenge' }, 500);
    }
});

// Join daily challenge
competitionRouter.post('/daily-challenge/join', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    const username = user.google_user_data?.name || user.email?.split('@')[0] || 'Anonymous';

    try {
        const today = new Date().toISOString().split('T')[0];
        const challenge = await c.env.DB.prepare(`
            SELECT * FROM daily_challenges WHERE challenge_date = ?
        `).bind(today).first();

        if (!challenge) {
            return c.json({ error: 'Daily challenge not found' }, 404);
        }

        // Check if already joined
        const existing = await c.env.DB.prepare(`
            SELECT * FROM daily_challenge_participants 
            WHERE challenge_id = ? AND user_id = ?
        `).bind(challenge.id, userId).first();

        if (existing) {
            return c.json({ success: true, alreadyJoined: true });
        }

        // Join challenge
        await c.env.DB.prepare(`
            INSERT INTO daily_challenge_participants (challenge_id, user_id, username)
            VALUES (?, ?, ?)
        `).bind(challenge.id, userId, username).run();

        return c.json({ success: true });
    } catch (error) {
        console.error('Error joining daily challenge:', error);
        return c.json({ error: 'Failed to join daily challenge' }, 500);
    }
});

// Get daily challenge leaderboard
competitionRouter.get('/daily-challenge/leaderboard', async (c) => {
    const limit = parseInt(c.req.query('limit') || '100');

    try {
        const today = new Date().toISOString().split('T')[0];
        const challenge = await c.env.DB.prepare(`
            SELECT * FROM daily_challenges WHERE challenge_date = ?
        `).bind(today).first();

        if (!challenge) {
            return c.json({ participants: [] });
        }

        const participants = await c.env.DB.prepare(`
            SELECT p.*, pe.elo
            FROM daily_challenge_participants p
            LEFT JOIN player_elo pe ON p.user_id = pe.user_id
            WHERE p.challenge_id = ?
            ORDER BY p.pnl DESC
            LIMIT ?
        `).bind(challenge.id, limit).all();

        // Update ranks
        participants.results.forEach((p: any, idx: number) => {
            p.rank = idx + 1;
        });

        return c.json({ participants: participants.results });
    } catch (error) {
        console.error('Error fetching daily challenge leaderboard:', error);
        return c.json({ error: 'Failed to fetch leaderboard' }, 500);
    }
});

// ==================== TOURNAMENTS ====================

// List tournaments
competitionRouter.get('/tournaments', async (c) => {
    const status = c.req.query('status'); // 'active' | 'ready' | 'completed' | null (all)

    try {
        let query = 'SELECT * FROM tournaments';
        const params: any[] = [];

        if (status) {
            query += ' WHERE status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT 50';

        const tournaments = await c.env.DB.prepare(query).bind(...params).all();

        // Get participant counts
        for (const tournament of tournaments.results) {
            const count = await c.env.DB.prepare(`
                SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?
            `).bind(tournament.id).first();
            (tournament as any).participantCount = count?.count || 0;
        }

        return c.json({ tournaments: tournaments.results });
    } catch (error) {
        console.error('Error fetching tournaments:', error);
        return c.json({ error: 'Failed to fetch tournaments' }, 500);
    }
});

// Create tournament
competitionRouter.post('/tournaments', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    const { name, symbol, description, timeLimit, maxDrawdown, maxParticipants } = await c.req.json();

    try {
        const result = await c.env.DB.prepare(`
            INSERT INTO tournaments (creator_id, name, symbol, description, time_limit, max_drawdown, max_participants)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            userId,
            name,
            symbol || 'BTCUSDT',
            description || '',
            timeLimit || 60,
            maxDrawdown || null,
            maxParticipants || 1000
        ).run();

        return c.json({ success: true, tournamentId: result.meta.last_row_id });
    } catch (error) {
        console.error('Error creating tournament:', error);
        return c.json({ error: 'Failed to create tournament' }, 500);
    }
});

// Get tournament details
competitionRouter.get('/tournaments/:id', async (c) => {
    const tournamentId = c.req.param('id');

    try {
        const tournament = await c.env.DB.prepare(`
            SELECT * FROM tournaments WHERE id = ?
        `).bind(tournamentId).first();

        if (!tournament) {
            return c.json({ error: 'Tournament not found' }, 404);
        }

        const participantCount = await c.env.DB.prepare(`
            SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?
        `).bind(tournamentId).first();

        return c.json({ 
            tournament: {
                ...tournament,
                participantCount: participantCount?.count || 0
            }
        });
    } catch (error) {
        console.error('Error fetching tournament:', error);
        return c.json({ error: 'Failed to fetch tournament' }, 500);
    }
});

// Join tournament
competitionRouter.post('/tournaments/:id/join', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    const username = user.google_user_data?.name || user.email?.split('@')[0] || 'Anonymous';
    const tournamentId = c.req.param('id');

    try {
        const tournament = await c.env.DB.prepare(`
            SELECT * FROM tournaments WHERE id = ?
        `).bind(tournamentId).first();

        if (!tournament) {
            return c.json({ error: 'Tournament not found' }, 404);
        }

        // Check if already joined
        const existing = await c.env.DB.prepare(`
            SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?
        `).bind(tournamentId, userId).first();

        if (existing) {
            return c.json({ success: true, alreadyJoined: true });
        }

        // Check max participants
        const currentCount = await c.env.DB.prepare(`
            SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?
        `).bind(tournamentId).first();

        if ((currentCount?.count || 0) >= tournament.max_participants) {
            return c.json({ error: 'Tournament is full' }, 400);
        }

        // Join tournament
        await c.env.DB.prepare(`
            INSERT INTO tournament_participants (tournament_id, user_id, username)
            VALUES (?, ?, ?)
        `).bind(tournamentId, userId, username).run();

        return c.json({ success: true });
    } catch (error) {
        console.error('Error joining tournament:', error);
        return c.json({ error: 'Failed to join tournament' }, 500);
    }
});

// Get tournament leaderboard
competitionRouter.get('/tournaments/:id/leaderboard', async (c) => {
    const tournamentId = c.req.param('id');

    try {
        const participants = await c.env.DB.prepare(`
            SELECT p.*, pe.elo
            FROM tournament_participants p
            LEFT JOIN player_elo pe ON p.user_id = pe.user_id
            WHERE p.tournament_id = ?
            ORDER BY p.pnl DESC
        `).bind(tournamentId).all();

        // Update ranks
        participants.results.forEach((p: any, idx: number) => {
            p.rank = idx + 1;
        });

        return c.json({ participants: participants.results });
    } catch (error) {
        console.error('Error fetching tournament leaderboard:', error);
        return c.json({ error: 'Failed to fetch leaderboard' }, 500);
    }
});

// Get tournament chat
competitionRouter.get('/tournaments/:id/chat', async (c) => {
    const tournamentId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '50');

    try {
        const messages = await c.env.DB.prepare(`
            SELECT * FROM tournament_chat
            WHERE tournament_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `).bind(tournamentId, limit).all();

        return c.json({ messages: messages.results.reverse() });
    } catch (error) {
        console.error('Error fetching tournament chat:', error);
        return c.json({ error: 'Failed to fetch chat' }, 500);
    }
});

// Send tournament chat message
competitionRouter.post('/tournaments/:id/chat', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    const username = user.google_user_data?.name || user.email?.split('@')[0] || 'Anonymous';
    const tournamentId = c.req.param('id');
    const { message } = await c.req.json();

    try {
        await c.env.DB.prepare(`
            INSERT INTO tournament_chat (tournament_id, user_id, username, message)
            VALUES (?, ?, ?, ?)
        `).bind(tournamentId, userId, username, message).run();

        return c.json({ success: true });
    } catch (error) {
        console.error('Error sending chat message:', error);
        return c.json({ error: 'Failed to send message' }, 500);
    }
});

// ==================== LEGACY (Keep for backward compatibility) ====================

// Submit a new score
competitionRouter.post('/score', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const { finalBalance, pnl, totalTrades, maxDrawdown, gameMode } = await c.req.json();
    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    const username = user.google_user_data?.name || 'Anonymous';

    try {
        const result = await c.env.DB.prepare(`
      INSERT INTO competition_scores (user_id, username, final_balance, pnl, total_trades, max_drawdown, game_mode)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
            userId,
            username,
            finalBalance,
            pnl,
            totalTrades,
            maxDrawdown,
            gameMode
        ).run();

        if (!result.success) {
            throw new Error('Failed to insert score');
        }

        return c.json({ success: true });
    } catch (error) {
        console.error('Error saving score:', error);
        return c.json({ error: 'Failed to save score' }, 500);
    }
});

// Get leaderboard
competitionRouter.get('/leaderboard', async (c) => {
    const mode = c.req.query('mode') || 'speed';
    const limit = 20;

    try {
        // Get top scores by PnL
        const scores = await c.env.DB.prepare(`
      SELECT username, pnl, final_balance, total_trades, created_at
      FROM competition_scores
      WHERE game_mode = ?
      ORDER BY pnl DESC
      LIMIT ?
    `).bind(mode, limit).all();

        return c.json({ scores: scores.results });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return c.json({ error: 'Failed to fetch leaderboard' }, 500);
    }
});

// Get user's best score
competitionRouter.get('/my-best', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    const mode = c.req.query('mode') || 'speed';

    try {
        const bestScore = await c.env.DB.prepare(`
      SELECT * FROM competition_scores
      WHERE user_id = ? AND game_mode = ?
      ORDER BY pnl DESC
      LIMIT 1
    `).bind(userId, mode).first();

        return c.json({ bestScore });
    } catch (error) {
        console.error('Error fetching user best score:', error);
        return c.json({ error: 'Failed to fetch score' }, 500);
    }
});

// ==================== FRIENDS SYSTEM ====================

// Get friends list
competitionRouter.get('/friends', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;

    try {
        // Get accepted friends (both directions)
        const friends = await c.env.DB.prepare(`
            SELECT f.*, 
                   CASE 
                       WHEN f.user_id = ? THEN u2.name
                       ELSE u1.name
                   END as username
            FROM friends f
            LEFT JOIN users u1 ON f.user_id = u1.google_user_id
            LEFT JOIN users u2 ON f.friend_id = u2.google_user_id
            WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'
        `).bind(userId, userId, userId).all();

        // Get pending requests (where user is the recipient)
        const pendingRequests = await c.env.DB.prepare(`
            SELECT f.*, u.name as username
            FROM friends f
            LEFT JOIN users u ON f.user_id = u.google_user_id
            WHERE f.friend_id = ? AND f.status = 'pending'
        `).bind(userId).all();

        return c.json({ 
            friends: friends.results,
            pendingRequests: pendingRequests.results
        });
    } catch (error) {
        console.error('Error fetching friends:', error);
        return c.json({ error: 'Failed to fetch friends' }, 500);
    }
});

// Send friend request
competitionRouter.post('/friends/request', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    const { friendId } = await c.req.json();

    if (!friendId) {
        return c.json({ error: 'Friend ID is required' }, 400);
    }

    if (userId === friendId) {
        return c.json({ error: 'Cannot add yourself as a friend' }, 400);
    }

    try {
        // Check if request already exists
        const existing = await c.env.DB.prepare(`
            SELECT * FROM friends 
            WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
        `).bind(userId, friendId, friendId, userId).first();

        if (existing) {
            return c.json({ error: 'Friend request already exists' }, 400);
        }

        // Create friend request
        await c.env.DB.prepare(`
            INSERT INTO friends (user_id, friend_id, status)
            VALUES (?, ?, 'pending')
        `).bind(userId, friendId).run();

        return c.json({ success: true });
    } catch (error) {
        console.error('Error sending friend request:', error);
        return c.json({ error: 'Failed to send friend request' }, 500);
    }
});

// Accept friend request
competitionRouter.post('/friends/accept', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    const { friendId } = await c.req.json();

    if (!friendId) {
        return c.json({ error: 'Friend ID is required' }, 400);
    }

    try {
        // Update friend request to accepted
        const result = await c.env.DB.prepare(`
            UPDATE friends 
            SET status = 'accepted'
            WHERE user_id = ? AND friend_id = ? AND status = 'pending'
        `).bind(friendId, userId).run();

        if (!result.success) {
            return c.json({ error: 'Friend request not found' }, 404);
        }

        return c.json({ success: true });
    } catch (error) {
        console.error('Error accepting friend request:', error);
        return c.json({ error: 'Failed to accept friend request' }, 500);
    }
});

// Remove friend
competitionRouter.post('/friends/remove', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    const { friendId } = await c.req.json();

    if (!friendId) {
        return c.json({ error: 'Friend ID is required' }, 400);
    }

    try {
        // Remove friend relationship (both directions)
        await c.env.DB.prepare(`
            DELETE FROM friends 
            WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
        `).bind(userId, friendId, friendId, userId).run();

        return c.json({ success: true });
    } catch (error) {
        console.error('Error removing friend:', error);
        return c.json({ error: 'Failed to remove friend' }, 500);
    }
});

// Generate invite link
competitionRouter.get('/friends/invite-link', combinedAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!user) {
        return c.json({ error: 'User not found' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    const baseUrl = c.req.url.split('/api')[0];
    const inviteLink = `${baseUrl}/competition?ref=${userId}`;

    return c.json({ inviteLink });
});

export { competitionRouter };

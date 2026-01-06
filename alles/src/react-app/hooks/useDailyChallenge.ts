import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from './useApi';

interface DailyChallenge {
    id: number;
    challenge_date: string;
    symbol: string;
    time_limit: number;
    status: string;
    started_at: string;
    ended_at: string | null;
    participantCount: number;
}

interface Participant {
    id: number;
    user_id: string;
    username: string;
    final_balance: number;
    pnl: number;
    total_trades: number;
    win_rate: number;
    rank: number;
    elo?: number;
}

export function useDailyChallenge() {
    const { user } = useAuth();
    const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joined, setJoined] = useState(false);

    const fetchChallenge = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(buildApiUrl('/api/competition/daily-challenge'));

            if (!response.ok) {
                throw new Error('Failed to fetch daily challenge');
            }

            const data = await response.json();
            setChallenge(data.challenge);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch challenge');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchLeaderboard = useCallback(async () => {
        try {
            const response = await fetch(buildApiUrl('/api/competition/daily-challenge/leaderboard'));

            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }

            const data = await response.json();
            setParticipants(data.participants || []);
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
        }
    }, []);

    const joinChallenge = async () => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        try {
            const response = await fetch(buildApiUrl('/api/competition/daily-challenge/join'), {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to join daily challenge');
            }

            const data = await response.json();
            setJoined(true);
            await fetchChallenge();
            await fetchLeaderboard();
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to join challenge';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    useEffect(() => {
        fetchChallenge();
        fetchLeaderboard();

        // Refresh leaderboard every 10 seconds
        const interval = setInterval(() => {
            fetchLeaderboard();
        }, 10000);

        return () => clearInterval(interval);
    }, [fetchChallenge, fetchLeaderboard]);

    // Check if user has joined
    useEffect(() => {
        if (user && participants.length > 0) {
            const userParticipant = participants.find(p => p.user_id === (user.google_user_data?.sub || (user as any).firebase_user_id));
            setJoined(!!userParticipant);
        }
    }, [user, participants]);

    const getTimeRemaining = () => {
        if (!challenge) return 0;
        
        const now = Date.now();
        const startTime = new Date(challenge.started_at).getTime();
        const endTime = startTime + (challenge.time_limit * 1000);
        
        return Math.max(0, Math.floor((endTime - now) / 1000));
    };

    return {
        challenge,
        participants,
        loading,
        error,
        joined,
        joinChallenge,
        refetch: fetchChallenge,
        refetchLeaderboard: fetchLeaderboard,
        timeRemaining: getTimeRemaining()
    };
}


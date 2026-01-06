import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from './useApi';

interface MatchmakingStatus {
    inQueue: boolean;
    elapsed: number;
    estimated: number;
    matchType: string;
    symbol: string;
}

interface MatchFound {
    matchFound: boolean;
    matchId?: number;
    inQueue?: boolean;
}

export function useMatchmaking() {
    const { user } = useAuth();
    const [status, setStatus] = useState<MatchmakingStatus | null>(null);
    const [onlineCount, setOnlineCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchOnlineCount = useCallback(async () => {
        try {
            const response = await fetch(buildApiUrl('/api/competition/matchmaking/online'));
            const data = await response.json();
            setOnlineCount(data.online || 0);
        } catch (err) {
            console.error('Failed to fetch online count:', err);
        }
    }, []);

    const fetchStatus = useCallback(async () => {
        if (!user) return;

        try {
            const response = await fetch(buildApiUrl('/api/competition/matchmaking/status'), {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch matchmaking status');
            }

            const data = await response.json();
            setStatus(data.inQueue ? data : null);
        } catch (err) {
            console.error('Failed to fetch matchmaking status:', err);
        }
    }, [user]);

    const joinQueue = async (matchType: 'ranked' | 'practice', symbol: string = 'BTCUSDT'): Promise<MatchFound> => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(buildApiUrl('/api/competition/matchmaking/join'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ matchType, symbol })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to join matchmaking');
            }

            const data = await response.json();
            
            if (data.matchFound) {
                setStatus(null);
                return { matchFound: true, matchId: data.matchId };
            } else {
                await fetchStatus();
                return { matchFound: false, inQueue: true };
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to join matchmaking';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const cancelQueue = async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(buildApiUrl('/api/competition/matchmaking/cancel'), {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to cancel matchmaking');
            }

            setStatus(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to cancel matchmaking';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Poll for status and online count
    useEffect(() => {
        if (!user) return;

        fetchStatus();
        fetchOnlineCount();

        const statusInterval = setInterval(() => {
            fetchStatus();
        }, 2000); // Poll every 2 seconds

        const onlineInterval = setInterval(() => {
            fetchOnlineCount();
        }, 5000); // Poll every 5 seconds

        return () => {
            clearInterval(statusInterval);
            clearInterval(onlineInterval);
        };
    }, [user, fetchStatus, fetchOnlineCount]);

    return {
        status,
        onlineCount,
        loading,
        error,
        joinQueue,
        cancelQueue,
        refetchStatus: fetchStatus
    };
}


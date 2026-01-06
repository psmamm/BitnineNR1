import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from './useApi';

interface Tournament {
    id: number;
    creator_id: string;
    name: string;
    symbol: string;
    description: string;
    time_limit: number;
    max_drawdown: number | null;
    max_participants: number;
    status: string;
    started_at: string | null;
    ended_at: string | null;
    created_at: string;
    participantCount?: number;
    entry_fee?: number;
    prize_pool?: number;
    tournament_tier?: string;
}

interface TournamentParticipant {
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

interface ChatMessage {
    id: number;
    tournament_id: number;
    user_id: string;
    username: string;
    message: string;
    created_at: string;
}

export function useTournaments(status?: string) {
    const { user } = useAuth();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTournaments = useCallback(async () => {
        try {
            setLoading(true);
            const url = status 
                ? buildApiUrl(`/api/competition/tournaments?status=${status}`)
                : buildApiUrl('/api/competition/tournaments');
            
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch tournaments');
            }

            const data = await response.json();
            setTournaments(data.tournaments || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch tournaments');
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        fetchTournaments();
    }, [fetchTournaments]);

    return { tournaments, loading, error, refetch: fetchTournaments };
}

export function useTournament(tournamentId: number | null) {
    const { user } = useAuth();
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [joined, setJoined] = useState(false);

    const fetchTournament = useCallback(async () => {
        if (!tournamentId) return;

        try {
            setLoading(true);
            const response = await fetch(buildApiUrl(`/api/competition/tournaments/${tournamentId}`));

            if (!response.ok) {
                throw new Error('Failed to fetch tournament');
            }

            const data = await response.json();
            setTournament(data.tournament);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch tournament');
        } finally {
            setLoading(false);
        }
    }, [tournamentId]);

    const fetchParticipants = useCallback(async () => {
        if (!tournamentId) return;

        try {
            const response = await fetch(buildApiUrl(`/api/competition/tournaments/${tournamentId}/leaderboard`));

            if (!response.ok) {
                throw new Error('Failed to fetch participants');
            }

            const data = await response.json();
            setParticipants(data.participants || []);
        } catch (err) {
            console.error('Failed to fetch participants:', err);
        }
    }, [tournamentId]);

    const fetchChat = useCallback(async () => {
        if (!tournamentId) return;

        try {
            const response = await fetch(buildApiUrl(`/api/competition/tournaments/${tournamentId}/chat`));

            if (!response.ok) {
                throw new Error('Failed to fetch chat');
            }

            const data = await response.json();
            setChatMessages(data.messages || []);
        } catch (err) {
            console.error('Failed to fetch chat:', err);
        }
    }, [tournamentId]);

    const joinTournament = async () => {
        if (!user || !tournamentId) {
            throw new Error('User not authenticated or tournament not found');
        }

        try {
            const response = await fetch(buildApiUrl(`/api/competition/tournaments/${tournamentId}/join`), {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to join tournament');
            }

            const data = await response.json();
            setJoined(true);
            await fetchTournament();
            await fetchParticipants();
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to join tournament';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const sendChatMessage = async (message: string) => {
        if (!user || !tournamentId) {
            throw new Error('User not authenticated or tournament not found');
        }

        try {
            const response = await fetch(buildApiUrl(`/api/competition/tournaments/${tournamentId}/chat`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            await fetchChat();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
            throw new Error(errorMessage);
        }
    };

    const createTournament = async (tournamentData: {
        name: string;
        symbol: string;
        description?: string;
        timeLimit: number;
        maxDrawdown?: number;
        maxParticipants?: number;
        entryFee?: number;
        prizePool?: number;
        tournamentTier?: string;
    }) => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        try {
            const response = await fetch(buildApiUrl('/api/competition/tournaments'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(tournamentData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create tournament');
            }

            const data = await response.json();
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create tournament';
            throw new Error(errorMessage);
        }
    };

    useEffect(() => {
        fetchTournament();
        fetchParticipants();
        fetchChat();

        // Refresh chat every 3 seconds
        const chatInterval = setInterval(() => {
            fetchChat();
        }, 3000);

        // Refresh participants every 10 seconds
        const participantsInterval = setInterval(() => {
            fetchParticipants();
        }, 10000);

        return () => {
            clearInterval(chatInterval);
            clearInterval(participantsInterval);
        };
    }, [tournamentId, fetchTournament, fetchParticipants, fetchChat]);

    // Check if user has joined
    useEffect(() => {
        if (user && participants.length > 0) {
            const userParticipant = participants.find(p => p.user_id === (user.google_user_data?.sub || (user as any).firebase_user_id));
            setJoined(!!userParticipant);
        }
    }, [user, participants]);

    return {
        tournament,
        participants,
        chatMessages,
        loading,
        error,
        joined,
        joinTournament,
        sendChatMessage,
        createTournament,
        refetch: fetchTournament,
        refetchParticipants: fetchParticipants,
        refetchChat: fetchChat
    };
}


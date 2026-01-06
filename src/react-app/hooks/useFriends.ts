import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from './useApi';

interface Friend {
    id: string;
    user_id: string;
    friend_id: string;
    username: string;
    status: 'pending' | 'accepted' | 'blocked';
    created_at: string;
}

export function useFriends() {
    const { user } = useAuth();
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFriends = useCallback(async () => {
        if (!user) return;

        try {
            setLoading(true);
            const response = await fetch(buildApiUrl('/api/competition/friends'), {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch friends');
            }

            const data = await response.json();
            setFriends(data.friends || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch friends');
        } finally {
            setLoading(false);
        }
    }, [user]);

    const sendFriendRequest = async (friendId: string) => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        try {
            const response = await fetch(buildApiUrl('/api/competition/friends/request'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ friendId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send friend request');
            }

            await fetchFriends();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send friend request';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const acceptFriendRequest = async (friendId: string) => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        try {
            const response = await fetch(buildApiUrl('/api/competition/friends/accept'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ friendId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to accept friend request');
            }

            await fetchFriends();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to accept friend request';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const removeFriend = async (friendId: string) => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        try {
            const response = await fetch(buildApiUrl('/api/competition/friends/remove'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ friendId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to remove friend');
            }

            await fetchFriends();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to remove friend';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    const generateInviteLink = async () => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        try {
            const response = await fetch(buildApiUrl('/api/competition/friends/invite-link'), {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to generate invite link');
            }

            const data = await response.json();
            return data.inviteLink;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate invite link';
            throw new Error(errorMessage);
        }
    };

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    return {
        friends,
        loading,
        error,
        sendFriendRequest,
        acceptFriendRequest,
        removeFriend,
        generateInviteLink,
        refetch: fetchFriends
    };
}


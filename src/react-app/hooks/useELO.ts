import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from './useApi';

interface ELOData {
    elo: number;
    division: string;
    totalMatches: number;
    wins: number;
    losses: number;
    bestElo: number;
}

export function useELO() {
    const { user } = useAuth();
    const [eloData, setEloData] = useState<ELOData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchELO = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const response = await fetch(buildApiUrl('/api/competition/elo'), {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch ELO');
            }

            const data = await response.json();
            setEloData(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch ELO');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchELO();
    }, [user]);

    return { eloData, loading, error, refetch: fetchELO };
}

export function getDivisionColor(division: string): string {
    const colors: Record<string, string> = {
        'Bronze': '#CD7F32',
        'Silver': '#C0C0C0',
        'Gold': '#FFD700',
        'Platinum': '#E5E4E2',
        'Diamond': '#B9F2FF',
        'Master': '#9B59B6',
        'Grandmaster': '#E74C3C'
    };
    return colors[division] || '#6A3DF4';
}


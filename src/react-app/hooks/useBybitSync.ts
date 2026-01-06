// Hook to sync Bybit trades
import { useState } from 'react';

export interface BybitTrade {
    id: string;
    symbol: string;
    side: 'Buy' | 'Sell';
    price: number;
    qty: number;
    timestamp: number;
}

export function useBybitSync() {
    const [trades, setTrades] = useState<BybitTrade[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const syncTrades = async (apiKey: string, apiSecret: string) => {
        setLoading(true);
        setError(null);
        try {
            // In a real app this would call a backend that signs the request.
            // Here we call a placeholder endpoint.
            const response = await fetch('/api/bybit/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey, apiSecret }),
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            const data: BybitTrade[] = await response.json();
            setTrades(data);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to sync trades';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return { trades, loading, error, syncTrades };
}

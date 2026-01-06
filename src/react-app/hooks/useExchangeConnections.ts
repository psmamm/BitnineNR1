import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from './useApi';

export interface ExchangeConnection {
  id: number;
  user_id: string;
  exchange_id: string;
  exchange_name?: string;
  api_key: string;
  api_secret: string;
  passphrase?: string;
  auto_sync_enabled: boolean;
  sync_interval_hours: number;
  last_sync_at?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupportedExchange {
  id: string;
  name: string;
  logo?: string;
}

export interface CreateExchangeConnectionData {
  exchange_id: string;
  api_key: string;
  api_secret: string;
  passphrase?: string;
  auto_sync_enabled?: boolean;
  sync_interval_hours?: number;
}

export interface SyncResult {
  imported: number;
  mapped: number;
  errors: string[];
  debug?: any;
}

export function useExchangeConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState<Record<number, boolean>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [supportedExchanges, setSupportedExchanges] = useState<SupportedExchange[]>([]);

  const fetchConnections = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(buildApiUrl('/api/exchange-connections'), {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections || []);
      } else if (response.status === 404) {
        // Endpoint doesn't exist yet - return empty array
        setConnections([]);
      } else {
        console.error('Failed to fetch exchange connections:', response.status);
        setConnections([]);
      }
    } catch (error) {
      console.error('Error fetching exchange connections:', error);
      // Don't crash - just return empty array
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getSupportedExchanges = useCallback(async (): Promise<SupportedExchange[]> => {
    try {
      const response = await fetch(buildApiUrl('/api/exchange-connections/supported'), {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const exchanges = data.exchanges || [
          { id: 'binance', name: 'Binance' },
          { id: 'bybit', name: 'Bybit' },
        ];
        setSupportedExchanges(exchanges);
        return exchanges;
      }
    } catch (error) {
      console.error('Error fetching supported exchanges:', error);
    }

    // Fallback
    const fallback: SupportedExchange[] = [
      { id: 'binance', name: 'Binance' },
      { id: 'bybit', name: 'Bybit' },
    ];
    setSupportedExchanges(fallback);
    return fallback;
  }, []);

  const create = useCallback(
    async (data: CreateExchangeConnectionData): Promise<ExchangeConnection> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      try {
        setCreating(true);
        setCreateError(null);

        const response = await fetch(buildApiUrl('/api/exchange-connections'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          if (response.status === 404) {
            const errorMessage = 'Exchange connections API not yet implemented. Please check back later.';
            setCreateError(errorMessage);
            throw new Error(errorMessage);
          }
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || errorData.error || 'Failed to create connection';
          setCreateError(errorMessage);
          throw new Error(errorMessage);
        }

        const result = await response.json();
        await fetchConnections();
        return result.connection;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create connection';
        setCreateError(errorMessage);
        throw error;
      } finally {
        setCreating(false);
      }
    },
    [user, fetchConnections]
  );

  const remove = useCallback(
    async (connectionId: number): Promise<void> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      try {
        const response = await fetch(buildApiUrl(`/api/exchange-connections/${connectionId}`), {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to delete connection');
        }

        await fetchConnections();
      } catch (error) {
        console.error('Error deleting connection:', error);
        throw error;
      }
    },
    [user, fetchConnections]
  );

  const sync = useCallback(
    async (connectionId: number): Promise<SyncResult> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      try {
        setSyncing((prev) => ({ ...prev, [connectionId]: true }));

        const response = await fetch(buildApiUrl(`/api/exchange-connections/${connectionId}/sync`), {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Exchange sync API not yet implemented. Please check back later.');
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || 'Failed to sync');
        }

        const result = await response.json();
        await fetchConnections();
        return result;
      } catch (error) {
        console.error('Error syncing connection:', error);
        throw error;
      } finally {
        setSyncing((prev) => ({ ...prev, [connectionId]: false }));
      }
    },
    [user, fetchConnections]
  );

  useEffect(() => {
    fetchConnections();
    getSupportedExchanges();
  }, [fetchConnections, getSupportedExchanges]);

  return {
    connections,
    loading,
    creating,
    syncing,
    createError,
    create,
    remove,
    sync,
    getSupportedExchanges: supportedExchanges.length > 0 ? supportedExchanges : [
      { id: 'binance', name: 'Binance' },
      { id: 'bybit', name: 'Bybit' },
    ],
    refetch: fetchConnections,
  };
}


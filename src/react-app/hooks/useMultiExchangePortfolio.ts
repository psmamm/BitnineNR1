/**
 * useMultiExchangePortfolio Hook
 *
 * Fetches and aggregates portfolio balances from all connected exchanges.
 * Features:
 * - Real-time balance updates (30s interval)
 * - Aggregated total equity in USD
 * - Per-exchange breakdown
 * - 24h change calculation
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from './useApi';

interface ExchangeBalance {
  exchange: string;
  exchangeIcon: string;
  totalEquityUsd: number;
  availableMarginUsd: number;
  usedMarginUsd: number;
  unrealizedPnl: number;
  isConnected: boolean;
}

interface PortfolioData {
  totalEquityUsd: number;
  availableBalanceUsd: number;
  unrealizedPnl: number;
  pnlPercentage24h: number;
  exchanges: ExchangeBalance[];
  lastUpdated: Date | null;
}

const EXCHANGE_ICONS: Record<string, string> = {
  binance: '🔶',
  bybit: '⬡',
  coinbase: '🔵',
  kraken: '🦑',
  okx: '⭕',
};

const REFRESH_INTERVAL = 30000; // 30 seconds

export function useMultiExchangePortfolio() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    totalEquityUsd: 0,
    availableBalanceUsd: 0,
    unrealizedPnl: 0,
    pnlPercentage24h: 0,
    exchanges: [],
    lastUpdated: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return await user.getIdToken();
  }, [user]);

  const fetchPortfolio = useCallback(async () => {
    if (!user) return;

    try {
      const token = await getToken();
      if (!token) return;

      // First, get connected exchanges
      const connectionsRes = await fetch(buildApiUrl('/api/exchange-connections'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!connectionsRes.ok) {
        throw new Error('Failed to fetch exchange connections');
      }

      const { connections } = await connectionsRes.json();

      if (!connections || connections.length === 0) {
        setPortfolio({
          totalEquityUsd: 0,
          availableBalanceUsd: 0,
          unrealizedPnl: 0,
          pnlPercentage24h: 0,
          exchanges: [],
          lastUpdated: new Date(),
        });
        setLoading(false);
        return;
      }

      // Fetch balances from each connected exchange
      const balancePromises = connections.map(async (conn: { id: string; exchange: string; is_active: boolean }) => {
        if (!conn.is_active) {
          return {
            exchange: conn.exchange,
            exchangeIcon: EXCHANGE_ICONS[conn.exchange.toLowerCase()] || '💱',
            totalEquityUsd: 0,
            availableMarginUsd: 0,
            usedMarginUsd: 0,
            unrealizedPnl: 0,
            isConnected: false,
          };
        }

        try {
          const balanceRes = await fetch(buildApiUrl(`/api/exchange-connections/${conn.id}/balance`), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (balanceRes.ok) {
            const balance = await balanceRes.json();
            return {
              exchange: conn.exchange,
              exchangeIcon: EXCHANGE_ICONS[conn.exchange.toLowerCase()] || '💱',
              totalEquityUsd: balance.totalEquityUsd || 0,
              availableMarginUsd: balance.availableMarginUsd || 0,
              usedMarginUsd: balance.usedMarginUsd || 0,
              unrealizedPnl: balance.unrealizedPnl || 0,
              isConnected: true,
            };
          }
        } catch {
          // Connection failed, mark as disconnected
        }

        return {
          exchange: conn.exchange,
          exchangeIcon: EXCHANGE_ICONS[conn.exchange.toLowerCase()] || '💱',
          totalEquityUsd: 0,
          availableMarginUsd: 0,
          usedMarginUsd: 0,
          unrealizedPnl: 0,
          isConnected: false,
        };
      });

      const exchangeBalances = await Promise.all(balancePromises);

      // Calculate totals
      const totalEquityUsd = exchangeBalances.reduce((sum, e) => sum + e.totalEquityUsd, 0);
      const availableBalanceUsd = exchangeBalances.reduce((sum, e) => sum + e.availableMarginUsd, 0);
      const unrealizedPnl = exchangeBalances.reduce((sum, e) => sum + e.unrealizedPnl, 0);

      // Calculate 24h PnL percentage (simplified - would need historical data)
      const pnlPercentage24h = totalEquityUsd > 0 ? (unrealizedPnl / totalEquityUsd) * 100 : 0;

      setPortfolio({
        totalEquityUsd,
        availableBalanceUsd,
        unrealizedPnl,
        pnlPercentage24h,
        exchanges: exchangeBalances,
        lastUpdated: new Date(),
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  // Initial fetch
  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchPortfolio, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPortfolio]);

  return {
    portfolio,
    loading,
    error,
    refresh: fetchPortfolio,
  };
}

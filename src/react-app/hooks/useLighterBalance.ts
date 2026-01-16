/**
 * useLighterBalance Hook
 *
 * Fetch and manage Lighter DEX account balance.
 *
 * Features:
 * - REST API for balance data
 * - Auto-refresh on interval
 * - Connection status tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/react-app/utils/logger';
import { useAuth } from '../contexts/AuthContext';

export interface LighterBalance {
  currency: string;
  total: number;
  available: number;
  locked: number;
}

export interface LighterAccountInfo {
  accountIndex: number;
  walletAddress: string;
  totalValue: number;
  availableMargin: number;
  usedMargin: number;
  balances: LighterBalance[];
}

interface UseLighterBalanceResult {
  account: LighterAccountInfo | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  needsSetup: boolean;
  refetch: () => Promise<void>;
}

const API_BASE = import.meta.env.VITE_API_URL || '';
const REFRESH_INTERVAL = 30000; // 30 seconds

export function useLighterBalance(): UseLighterBalanceResult {
  const [account, setAccount] = useState<LighterAccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const { user } = useAuth();
  const intervalRef = useRef<number | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      const token = await user?.getIdToken();
      const response = await fetch(`${API_BASE}/api/lighter/account`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Account not connected
          setNeedsSetup(true);
          setIsConnected(false);
          setAccount(null);
          return;
        }
        throw new Error(`Failed to fetch balance: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.account) {
        const accountData: LighterAccountInfo = {
          accountIndex: data.account.account_index,
          walletAddress: data.account.wallet_address,
          totalValue: data.account.total_value,
          availableMargin: data.account.available_margin,
          usedMargin: data.account.used_margin,
          balances: data.account.balances || []
        };
        setAccount(accountData);
        setIsConnected(true);
        setNeedsSetup(false);
      }
    } catch (err) {
      logger.error('Error fetching Lighter balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBalance();

    // Set up auto-refresh
    intervalRef.current = window.setInterval(fetchBalance, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchBalance]);

  return {
    account,
    isLoading,
    error,
    isConnected,
    needsSetup,
    refetch: fetchBalance
  };
}

/**
 * Hook to check Lighter connection status
 */
export function useLighterConnectionStatus() {
  const [status, setStatus] = useState<{
    connected: boolean;
    walletAddress?: string;
    accountIndex?: number;
    connectedAt?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuth();

  const checkStatus = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const token = await user?.getIdToken();
      const response = await fetch(`${API_BASE}/api/lighter/connection-status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (err) {
      logger.error('Error checking Lighter connection status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    status,
    isLoading,
    refetch: checkStatus
  };
}

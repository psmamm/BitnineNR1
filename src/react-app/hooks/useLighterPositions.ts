/**
 * useLighterPositions Hook
 *
 * Fetch and manage Lighter DEX positions with real-time WebSocket updates.
 *
 * Features:
 * - REST API polling for initial data
 * - WebSocket subscription for real-time P&L updates
 * - Position interface mapping to existing types
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { lighterWebSocket } from '../services/lighterWebSocket';
import { logger } from '@/react-app/utils/logger';
import { useAuth } from '../contexts/AuthContext';

export interface LighterPosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  leverage: number;
  marginMode: 'isolated' | 'cross';
  liquidationPrice?: number;
  marginUsed: number;
  createdAt: Date;
}

interface UseLighterPositionsResult {
  positions: LighterPosition[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface PositionUpdate {
  type: 'position_update';
  position: {
    market: string;
    side: 'long' | 'short';
    size: string;
    entry_price: string;
    mark_price: string;
    unrealized_pnl: string;
    realized_pnl: string;
    leverage: string;
    margin_mode: 'isolated' | 'cross';
    liquidation_price: string;
    margin_used: string;
    created_at: number;
  };
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useLighterPositions(): UseLighterPositionsResult {
  const [positions, setPositions] = useState<LighterPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchPositions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = await user?.getIdToken();
      const response = await fetch(`${API_BASE}/api/lighter/positions`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Account not connected
          setPositions([]);
          return;
        }
        throw new Error(`Failed to fetch positions: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.positions) {
        const mappedPositions: LighterPosition[] = data.positions.map(
          (p: LighterPosition) => ({
            ...p,
            createdAt: new Date(p.createdAt)
          })
        );
        setPositions(mappedPositions);
      }
    } catch (err) {
      logger.error('Error fetching Lighter positions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch positions');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handlePositionUpdate = useCallback((data: unknown) => {
    const update = data as PositionUpdate;

    if (update.type !== 'position_update') return;

    setPositions((prev) => {
      const pos = update.position;
      const existingIndex = prev.findIndex((p) => p.symbol === pos.market);

      const newPosition: LighterPosition = {
        id: `${pos.market}-position`,
        symbol: pos.market,
        side: pos.side,
        size: parseFloat(pos.size),
        entryPrice: parseFloat(pos.entry_price),
        markPrice: parseFloat(pos.mark_price),
        unrealizedPnl: parseFloat(pos.unrealized_pnl),
        realizedPnl: parseFloat(pos.realized_pnl),
        leverage: parseFloat(pos.leverage),
        marginMode: pos.margin_mode,
        liquidationPrice: parseFloat(pos.liquidation_price) || undefined,
        marginUsed: parseFloat(pos.margin_used),
        createdAt: new Date(pos.created_at)
      };

      // If size is 0, remove the position
      if (newPosition.size === 0) {
        return prev.filter((_, i) => i !== existingIndex);
      }

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = newPosition;
        return updated;
      } else {
        return [...prev, newPosition];
      }
    });
  }, []);

  useEffect(() => {
    fetchPositions();

    // Subscribe to position updates
    lighterWebSocket
      .subscribePositions(handlePositionUpdate)
      .then((unsubscribe) => {
        unsubscribeRef.current = unsubscribe;
      })
      .catch((err) => {
        logger.error('Error subscribing to positions:', err);
      });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [fetchPositions, handlePositionUpdate]);

  return {
    positions,
    isLoading,
    error,
    refetch: fetchPositions
  };
}

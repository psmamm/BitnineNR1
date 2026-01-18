/**
 * useLighterOrderbook Hook
 *
 * Lighter DEX WebSocket integration for real-time orderbook data.
 * Endpoint: wss://mainnet.zklighter.elliot.ai/ws
 *
 * Features:
 * - WebSocket subscription via centralized service
 * - Snapshot + delta updates
 * - Price format conversion (1e8 integer to decimal)
 * - Automatic reconnection handling
 * - REST API fallback when WebSocket fails
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { OrderbookData, OrderbookLevel, Symbol } from '../types/terminal';
import { lighterWebSocket } from '../services/lighterWebSocket';
import { logger } from '@/react-app/utils/logger';

const API_BASE = import.meta.env.VITE_API_URL || '';
const REST_POLL_INTERVAL = 3000; // Poll every 3 seconds in fallback mode

interface UseLighterOrderbookResult {
  orderbook: OrderbookData | null;
  isLoading: boolean;
  error: string | null;
  reconnect: () => void;
  isFallbackMode: boolean;
}

interface LighterOrderbookSnapshot {
  type: 'snapshot';
  symbol: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  timestamp: number;
  sequence: number;
}

interface LighterOrderbookDelta {
  type: 'delta';
  symbol: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  timestamp: number;
  sequence: number;
}

type LighterOrderbookUpdate = LighterOrderbookSnapshot | LighterOrderbookDelta;

// Lighter uses 1e8 precision for prices
const PRICE_PRECISION = 1e8;

function fromIntegerPrice(intPrice: string): number {
  return parseInt(intPrice) / PRICE_PRECISION;
}

function fromIntegerSize(intSize: string): number {
  return parseInt(intSize) / PRICE_PRECISION;
}

export function useLighterOrderbook(symbol: string): UseLighterOrderbookResult {
  const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const snapshotRef = useRef<OrderbookData | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const errorUnsubscribeRef = useRef<(() => void) | null>(null);

  const processSnapshot = useCallback(
    (snapshot: LighterOrderbookSnapshot) => {
      const bids: OrderbookLevel[] = snapshot.bids
        .map((item) => ({
          price: fromIntegerPrice(item.price),
          size: fromIntegerSize(item.size),
          total: 0
        }))
        .sort((a, b) => b.price - a.price);

      const asks: OrderbookLevel[] = snapshot.asks
        .map((item) => ({
          price: fromIntegerPrice(item.price),
          size: fromIntegerSize(item.size),
          total: 0
        }))
        .sort((a, b) => a.price - b.price);

      // Calculate cumulative totals
      let bidTotal = 0;
      bids.forEach((bid) => {
        bidTotal += bid.size;
        bid.total = bidTotal;
      });

      let askTotal = 0;
      asks.forEach((ask) => {
        askTotal += ask.size;
        ask.total = askTotal;
      });

      const orderbookData: OrderbookData = {
        bids,
        asks,
        timestamp: snapshot.timestamp,
        symbol: snapshot.symbol as Symbol,
        lastUpdateId: snapshot.sequence
      };

      snapshotRef.current = orderbookData;
      setOrderbook(orderbookData);
      setIsLoading(false);
      setError(null);
    },
    []
  );

  const processDelta = useCallback((delta: LighterOrderbookDelta) => {
    if (!snapshotRef.current) return;

    const updatedBids = [...snapshotRef.current.bids];
    const updatedAsks = [...snapshotRef.current.asks];

    // Update bids
    delta.bids.forEach((update) => {
      const price = fromIntegerPrice(update.price);
      const size = fromIntegerSize(update.size);
      const index = updatedBids.findIndex((b) => b.price === price);

      if (size === 0) {
        // Remove level
        if (index !== -1) {
          updatedBids.splice(index, 1);
        }
      } else {
        // Update or add level
        if (index !== -1) {
          updatedBids[index].size = size;
        } else {
          updatedBids.push({ price, size, total: 0 });
          updatedBids.sort((a, b) => b.price - a.price);
        }
      }
    });

    // Update asks
    delta.asks.forEach((update) => {
      const price = fromIntegerPrice(update.price);
      const size = fromIntegerSize(update.size);
      const index = updatedAsks.findIndex((a) => a.price === price);

      if (size === 0) {
        // Remove level
        if (index !== -1) {
          updatedAsks.splice(index, 1);
        }
      } else {
        // Update or add level
        if (index !== -1) {
          updatedAsks[index].size = size;
        } else {
          updatedAsks.push({ price, size, total: 0 });
          updatedAsks.sort((a, b) => a.price - b.price);
        }
      }
    });

    // Recalculate cumulative totals
    let bidTotal = 0;
    updatedBids.forEach((bid) => {
      bidTotal += bid.size;
      bid.total = bidTotal;
    });

    let askTotal = 0;
    updatedAsks.forEach((ask) => {
      askTotal += ask.size;
      ask.total = askTotal;
    });

    const updatedOrderbook: OrderbookData = {
      bids: updatedBids,
      asks: updatedAsks,
      timestamp: delta.timestamp,
      symbol: delta.symbol as Symbol,
      lastUpdateId: delta.sequence
    };

    snapshotRef.current = updatedOrderbook;
    setOrderbook(updatedOrderbook);
  }, []);

  const handleMessage = useCallback(
    (data: unknown) => {
      const update = data as LighterOrderbookUpdate;

      if (update.type === 'snapshot') {
        processSnapshot(update as LighterOrderbookSnapshot);
      } else if (update.type === 'delta') {
        processDelta(update as LighterOrderbookDelta);
      }
    },
    [processSnapshot, processDelta]
  );

  // REST API fallback for when WebSocket fails
  const fetchOrderbookREST = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/lighter/orderbook/${symbol}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.orderbook) {
        const bids: OrderbookLevel[] = (data.orderbook.bids || [])
          .map((item: { price: string | number; size: string | number }) => ({
            price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
            size: typeof item.size === 'string' ? parseFloat(item.size) : item.size,
            total: 0
          }))
          .sort((a: OrderbookLevel, b: OrderbookLevel) => b.price - a.price);

        const asks: OrderbookLevel[] = (data.orderbook.asks || [])
          .map((item: { price: string | number; size: string | number }) => ({
            price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
            size: typeof item.size === 'string' ? parseFloat(item.size) : item.size,
            total: 0
          }))
          .sort((a: OrderbookLevel, b: OrderbookLevel) => a.price - b.price);

        // Calculate cumulative totals
        let bidTotal = 0;
        bids.forEach((bid) => {
          bidTotal += bid.size;
          bid.total = bidTotal;
        });

        let askTotal = 0;
        asks.forEach((ask) => {
          askTotal += ask.size;
          ask.total = askTotal;
        });

        const orderbookData: OrderbookData = {
          bids,
          asks,
          timestamp: Date.now(),
          symbol: symbol as Symbol,
          lastUpdateId: data.orderbook.sequence || Date.now()
        };

        snapshotRef.current = orderbookData;
        setOrderbook(orderbookData);
        setIsLoading(false);
        setError(null);
      }
    } catch (err) {
      logger.error('REST orderbook fetch error:', err);
      // Don't set error state in fallback - just keep retrying
    }
  }, [symbol]);

  // Start REST polling fallback
  const startFallbackPolling = useCallback(() => {
    if (pollIntervalRef.current) return; // Already polling

    logger.log('[Orderbook] Starting REST fallback polling');
    setIsFallbackMode(true);

    // Fetch immediately
    fetchOrderbookREST();

    // Then poll at interval
    pollIntervalRef.current = window.setInterval(() => {
      fetchOrderbookREST();
    }, REST_POLL_INTERVAL);
  }, [fetchOrderbookREST]);

  // Stop REST polling
  const stopFallbackPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsFallbackMode(false);
  }, []);

  const subscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if WebSocket already failed
      if (lighterWebSocket.hasConnectionFailed()) {
        logger.log('[Orderbook] WebSocket failed, using REST fallback');
        startFallbackPolling();
        return;
      }

      const unsubscribe = await lighterWebSocket.subscribeOrderbook(
        symbol,
        handleMessage
      );

      unsubscribeRef.current = unsubscribe;

      // Subscribe to WebSocket errors
      errorUnsubscribeRef.current = lighterWebSocket.onError(() => {
        logger.log('[Orderbook] WebSocket error detected, switching to REST fallback');
        startFallbackPolling();
      });
    } catch (err) {
      logger.error('Lighter orderbook subscription error:', err);
      // WebSocket failed, switch to REST fallback
      startFallbackPolling();
    }
  }, [symbol, handleMessage, startFallbackPolling]);

  const reconnect = useCallback(() => {
    // Stop fallback polling
    stopFallbackPolling();

    // Unsubscribe from WebSocket
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (errorUnsubscribeRef.current) {
      errorUnsubscribeRef.current();
      errorUnsubscribeRef.current = null;
    }

    // Reset WebSocket failure state
    lighterWebSocket.resetConnectionFailure();

    // Clear state
    snapshotRef.current = null;
    setOrderbook(null);

    // Resubscribe
    subscribe();
  }, [subscribe, stopFallbackPolling]);

  useEffect(() => {
    subscribe();

    return () => {
      stopFallbackPolling();

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      if (errorUnsubscribeRef.current) {
        errorUnsubscribeRef.current();
        errorUnsubscribeRef.current = null;
      }
    };
  }, [subscribe, stopFallbackPolling]);

  return { orderbook, isLoading, error, reconnect, isFallbackMode };
}

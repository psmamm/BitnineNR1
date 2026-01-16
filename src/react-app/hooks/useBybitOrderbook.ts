/**
 * useBybitOrderbook Hook
 * 
 * Bybit V5 WebSocket integration for real-time orderbook data.
 * Endpoint: wss://stream.bybit.com/v5/public/linear
 * Subscription: orderbook.50.{symbol} (Level 50)
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Snapshot + delta updates
 * - 20+ updates per second support
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { OrderbookData, OrderbookLevel, BybitOrderbookSnapshot, BybitOrderbookDelta, Symbol } from '../types/terminal';
import { logger } from '@/react-app/utils/logger';

interface UseBybitOrderbookResult {
  orderbook: OrderbookData | null;
  isLoading: boolean;
  error: string | null;
  reconnect: () => void;
}

const WS_URL = 'wss://stream.bybit.com/v5/public/linear';
const RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]; // Exponential backoff
const MAX_RECONNECT_ATTEMPTS = 5;

export function useBybitOrderbook(symbol: string): UseBybitOrderbookResult {
  const [orderbook, setOrderbook] = useState<OrderbookData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const snapshotRef = useRef<OrderbookData | null>(null);

  const processSnapshot = useCallback((snapshot: BybitOrderbookSnapshot) => {
    const bids: OrderbookLevel[] = snapshot.data.b.map(([price, size]) => ({
      price: parseFloat(price),
      size: parseFloat(size),
      total: 0, // Will be calculated
    })).sort((a, b) => b.price - a.price);

    const asks: OrderbookLevel[] = snapshot.data.a.map(([price, size]) => ({
      price: parseFloat(price),
      size: parseFloat(size),
      total: 0, // Will be calculated
    })).sort((a, b) => a.price - b.price);

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
      timestamp: snapshot.ts,
      symbol: snapshot.data.s as Symbol,
      lastUpdateId: snapshot.data.u,
    };

    snapshotRef.current = orderbookData;
    setOrderbook(orderbookData);
    setIsLoading(false);
    setError(null);
  }, []);

  const processDelta = useCallback((delta: BybitOrderbookDelta) => {
    if (!snapshotRef.current) return;

    // Apply delta updates to existing orderbook (incremental update)
    // Use object references where possible to minimize allocations
    const updatedBids = [...snapshotRef.current.bids];
    const updatedAsks = [...snapshotRef.current.asks];

    // Update bids
    delta.data.b.forEach(([priceStr, sizeStr]) => {
      const price = parseFloat(priceStr);
      const size = parseFloat(sizeStr);
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
    delta.data.a.forEach(([priceStr, sizeStr]) => {
      const price = parseFloat(priceStr);
      const size = parseFloat(sizeStr);
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
      timestamp: delta.ts,
      symbol: delta.data.s as Symbol,
      lastUpdateId: delta.data.u,
    };

    snapshotRef.current = updatedOrderbook;
    setOrderbook(updatedOrderbook);
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Bybit WebSocket connected');
        setIsLoading(true);
        setError(null);
        reconnectAttemptRef.current = 0;

        // Subscribe to orderbook stream
        const subscribeMsg = {
          op: 'subscribe',
          args: [`orderbook.50.${symbol}`],
        };
        ws.send(JSON.stringify(subscribeMsg));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.topic && data.topic.startsWith('orderbook')) {
            if (data.type === 'snapshot') {
              processSnapshot(data as BybitOrderbookSnapshot);
            } else if (data.type === 'delta') {
              processDelta(data as BybitOrderbookDelta);
            }
          }
        } catch (err) {
          logger.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (err) => {
        logger.error('WebSocket error:', err);
        setError('WebSocket connection error');
        setIsLoading(false);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        wsRef.current = null;
        setIsLoading(false);

        // Attempt reconnection
        if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAYS[reconnectAttemptRef.current] || RECONNECT_DELAYS[RECONNECT_DELAYS.length - 1];
          reconnectAttemptRef.current++;
          
          reconnectTimerRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Failed to reconnect after multiple attempts');
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to establish WebSocket connection');
      setIsLoading(false);
    }
  }, [symbol, processSnapshot, processDelta]);

  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { orderbook, isLoading, error, reconnect };
}

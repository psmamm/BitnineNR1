/**
 * Binance Real-time Orderbook Hook
 *
 * Connects to Binance WebSocket for real-time orderbook depth data.
 * Supports both Spot and Futures markets.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface OrderbookLevel {
  price: string;
  quantity: string;
  total: string; // Cumulative quantity
}

export interface OrderbookData {
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  lastUpdateId: number;
  spread: number;
  spreadPercent: number;
}

interface UseBinanceOrderbookOptions {
  symbol: string;
  limit?: number; // Number of levels to show (default: 15)
  type?: 'spot' | 'futures';
}

const BINANCE_WS_SPOT = 'wss://stream.binance.com:9443/ws';
const BINANCE_WS_FUTURES = 'wss://fstream.binance.com/ws';

export function useBinanceOrderbook({
  symbol,
  limit = 15,
  type = 'futures'
}: UseBinanceOrderbookOptions) {
  const [orderbook, setOrderbook] = useState<OrderbookData>({
    bids: [],
    asks: [],
    lastUpdateId: 0,
    spread: 0,
    spreadPercent: 0
  });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculateTotals = useCallback((levels: [string, string][]): OrderbookLevel[] => {
    let cumulative = 0;
    return levels.map(([price, quantity]) => {
      cumulative += parseFloat(quantity);
      return {
        price,
        quantity,
        total: cumulative.toFixed(4)
      };
    });
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    const wsUrl = type === 'futures' ? BINANCE_WS_FUTURES : BINANCE_WS_SPOT;
    const streamName = `${symbol.toLowerCase()}@depth20@100ms`;

    try {
      const ws = new WebSocket(`${wsUrl}/${streamName}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[Orderbook] Connected to ${type} stream for ${symbol}`);
        setConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Binance depth stream format
          const bids = calculateTotals(data.bids?.slice(0, limit) || data.b?.slice(0, limit) || []);
          const asks = calculateTotals(data.asks?.slice(0, limit) || data.a?.slice(0, limit) || []);

          // Calculate spread
          const bestBid = bids[0] ? parseFloat(bids[0].price) : 0;
          const bestAsk = asks[0] ? parseFloat(asks[0].price) : 0;
          const spread = bestAsk - bestBid;
          const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;

          setOrderbook({
            bids,
            asks: asks.reverse(), // Reverse so highest ask is at bottom
            lastUpdateId: data.lastUpdateId || data.u || Date.now(),
            spread,
            spreadPercent
          });
        } catch (e) {
          console.error('[Orderbook] Parse error:', e);
        }
      };

      ws.onerror = (event) => {
        console.error('[Orderbook] WebSocket error:', event);
        setError('Connection error');
      };

      ws.onclose = (event) => {
        console.log('[Orderbook] WebSocket closed:', event.code, event.reason);
        setConnected(false);

        // Reconnect after 3 seconds if not intentionally closed
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[Orderbook] Reconnecting...');
            connect();
          }, 3000);
        }
      };
    } catch (e) {
      console.error('[Orderbook] Connection error:', e);
      setError('Failed to connect');
    }
  }, [symbol, limit, type, calculateTotals]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  return {
    orderbook,
    connected,
    error,
    reconnect: connect
  };
}

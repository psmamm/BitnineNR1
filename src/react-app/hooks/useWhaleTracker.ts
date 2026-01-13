import { useState, useEffect, useCallback, useRef } from 'react';

export interface WhaleTransaction {
  id: string;
  timestamp: Date;
  coin: string;
  amount: number;
  usdValue: number;
  transferType: 'wallet_to_exchange' | 'exchange_to_wallet' | 'whale_to_whale';
  hash: string;
  fromAddress?: string;
  toAddress?: string;
  blockchainExplorerUrl: string;
  chain: string;
}

interface BybitTradeMessage {
  topic: string;
  type: string;
  ts: number;
  data: Array<{
    T: number;      // timestamp
    s: string;      // symbol (e.g., "BTCUSDT")
    S: string;      // side ("Buy" or "Sell")
    v: string;      // quantity
    p: string;      // price
    i: string;      // trade ID
  }>;
}

export function useWhaleTracker() {
  const [transactions, setTransactions] = useState<WhaleTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Price cache for USD value calculation
  const priceCache = useRef<Record<string, number>>({});

  // Fetch current prices for major coins
  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch('https://api.binance.com/api/v3/ticker/price');
      const prices = await response.json() as Array<{ symbol: string; price: string }>;

      prices.forEach(({ symbol, price }) => {
        if (symbol.endsWith('USDT')) {
          const coin = symbol.replace('USDT', '');
          priceCache.current[coin] = parseFloat(price);
        }
      });

      console.log('💰 Price cache updated:', Object.keys(priceCache.current).length, 'coins');
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    }
  }, []);

  // Connect to Bybit WebSocket for real-time trades
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('🐋 Connecting to Bybit WebSocket...');

    try {
      // Bybit public spot WebSocket
      const ws = new WebSocket('wss://stream.bybit.com/v5/public/spot');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Bybit WebSocket connected');
        setIsConnected(true);
        setError(null);
        setLoading(false);
        reconnectAttempts.current = 0;

        // Subscribe to major pairs trade stream
        const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT'];
        const subscribeMsg = {
          op: 'subscribe',
          args: symbols.map(s => `publicTrade.${s}`)
        };

        ws.send(JSON.stringify(subscribeMsg));
        console.log('📡 Subscribed to:', symbols.join(', '));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as BybitTradeMessage | { op: string; success: boolean };

          // Skip subscription confirmations
          if ('op' in message) {
            return;
          }

          if ('data' in message && Array.isArray(message.data)) {
            message.data.forEach(trade => {
              const coin = trade.s.replace('USDT', '');
              const amount = parseFloat(trade.v);
              const price = parseFloat(trade.p);
              const usdValue = amount * price;

              // Only track whale transactions > $100K
              if (usdValue >= 100000) {
                const newTx: WhaleTransaction = {
                  id: `bybit-${trade.i}-${Date.now()}`,
                  timestamp: new Date(trade.T),
                  coin: coin,
                  amount: amount,
                  usdValue: usdValue,
                  transferType: trade.S === 'Buy' ? 'exchange_to_wallet' : 'wallet_to_exchange',
                  hash: trade.i,
                  blockchainExplorerUrl: `https://www.bybit.com/trade/spot/${trade.s}`,
                  chain: 'BYBIT',
                };

                console.log(`🐋 WHALE ALERT: ${trade.S} ${amount.toLocaleString()} ${coin} ($${usdValue.toLocaleString()})`);

                setTransactions(prev => {
                  // Keep last 50 transactions
                  const updated = [newTx, ...prev].slice(0, 50);
                  return updated;
                });
              }
            });
          }
        } catch (err) {
          // Ignore parse errors for heartbeat messages
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        setError('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          console.log(`⏳ Reconnecting in ${delay/1000}s (attempt ${reconnectAttempts.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        } else {
          setError('Unable to connect to whale tracker. Please refresh the page.');
          setLoading(false);
        }
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('Failed to connect to whale tracker');
      setLoading(false);
    }
  }, []);

  // Manual refresh - refetch prices and reconnect if needed
  const refetch = useCallback(() => {
    setLoading(true);
    fetchPrices();

    if (!isConnected) {
      reconnectAttempts.current = 0;
      connectWebSocket();
    } else {
      setLoading(false);
    }
  }, [fetchPrices, isConnected, connectWebSocket]);

  // Initialize
  useEffect(() => {
    fetchPrices();
    connectWebSocket();

    // Refresh prices every 5 minutes
    const priceInterval = setInterval(fetchPrices, 5 * 60 * 1000);

    // Cleanup
    return () => {
      clearInterval(priceInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchPrices, connectWebSocket]);

  return {
    transactions,
    loading,
    error,
    isConnected,
    refetch,
  };
}

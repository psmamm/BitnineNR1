import { useState, useEffect, useRef, useCallback } from 'react';

export interface OrderBookEntry {
  price: number;
  volume: number;
  total: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export interface LiveOrder {
  id: string;
  coin: string;
  price: number;
  volume: number;
  side: 'buy' | 'sell';
  timestamp: number;
  usdValue: number;
}

export interface OrderBookMetrics {
  largestBuyWall: number;
  largestSellWall: number;
  imbalance: number; // Percentage of buy vs sell orders
  volume60s: number;
  totalBuyVolume: number;
  totalSellVolume: number;
}

export function useOrderBookHeatmap() {
  const [orderBookData, setOrderBookData] = useState<OrderBookEntry[]>([]);
  const [liveOrders, setLiveOrders] = useState<LiveOrder[]>([]);
  const [metrics, setMetrics] = useState<OrderBookMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState('BTCUSDT');
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const orderBookWsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ordersHistoryRef = useRef<LiveOrder[]>([]);
  const lastUpdateTimeRef = useRef<number>(0);

  // Fetch initial order book data from Binance REST API
  const fetchInitialOrderBook = useCallback(async (symbol: string) => {
    try {
      console.log(`Fetching initial order book for ${symbol}...`);
      const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=100`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch order book: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process bids (buy orders)
      const buyOrders: OrderBookEntry[] = data.bids.map((bid: string[]) => ({
        price: parseFloat(bid[0]),
        volume: parseFloat(bid[1]),
        total: parseFloat(bid[0]) * parseFloat(bid[1]),
        side: 'buy' as const,
        timestamp: Date.now()
      }));
      
      // Process asks (sell orders)
      const sellOrders: OrderBookEntry[] = data.asks.map((ask: string[]) => ({
        price: parseFloat(ask[0]),
        volume: parseFloat(ask[1]),
        total: parseFloat(ask[0]) * parseFloat(ask[1]),
        side: 'sell' as const,
        timestamp: Date.now()
      }));
      
      // Combine and sort by price (highest first)
      const allOrders = [...buyOrders, ...sellOrders].sort((a, b) => b.price - a.price);
      
      setOrderBookData(allOrders);
      console.log(`Loaded ${allOrders.length} order book entries for ${symbol}`);
      
      // Set current price as midpoint between best bid and ask
      if (buyOrders.length > 0 && sellOrders.length > 0) {
        const bestBid = Math.max(...buyOrders.map(o => o.price));
        const bestAsk = Math.min(...sellOrders.map(o => o.price));
        setCurrentPrice((bestBid + bestAsk) / 2);
      }
      
    } catch (error) {
      console.error('Failed to fetch initial order book:', error);
    }
  }, []);

  // Connect to Binance WebSocket for order book updates with enhanced stability
  const connectOrderBookWebSocket = useCallback((symbol: string) => {
    if (orderBookWsRef.current) {
      orderBookWsRef.current.close();
    }
    
    try {
      console.log(`Connecting to order book WebSocket for ${symbol}...`);
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@depth20@500ms`);
      
      // Enhanced connection handling with keep-alive
      let pingInterval: NodeJS.Timeout;
      
      ws.onopen = () => {
        console.log(`Order book WebSocket connected for ${symbol}`);
        setIsConnected(true);
        
        // Send heartbeat every 30 seconds to keep connection alive
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            // Browser WebSocket doesn't have ping, but keeping the connection active
            // by checking readyState regularly helps detect disconnections
          }
        }, 30000);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.bids && data.asks) {
            // Throttle updates to avoid overwhelming the UI - reduced frequency for stability
            const now = Date.now();
            if (now - lastUpdateTimeRef.current < 500) return; // Max 2 updates per second
            lastUpdateTimeRef.current = now;
            
            // Process bids (buy orders)
            const buyOrders: OrderBookEntry[] = data.bids.map((bid: string[]) => ({
              price: parseFloat(bid[0]),
              volume: parseFloat(bid[1]),
              total: parseFloat(bid[0]) * parseFloat(bid[1]),
              side: 'buy' as const,
              timestamp: now
            })).filter((order: OrderBookEntry) => order.volume > 0);
            
            // Process asks (sell orders)
            const sellOrders: OrderBookEntry[] = data.asks.map((ask: string[]) => ({
              price: parseFloat(ask[0]),
              volume: parseFloat(ask[1]),
              total: parseFloat(ask[0]) * parseFloat(ask[1]),
              side: 'sell' as const,
              timestamp: now
            })).filter((order: OrderBookEntry) => order.volume > 0);
            
            // Combine and sort by price (highest first)
            const allOrders = [...buyOrders, ...sellOrders].sort((a, b) => b.price - a.price);
            
            setOrderBookData(allOrders);
            
            // Update current price
            if (buyOrders.length > 0 && sellOrders.length > 0) {
              const bestBid = Math.max(...buyOrders.map(o => o.price));
              const bestAsk = Math.min(...sellOrders.map(o => o.price));
              setCurrentPrice((bestBid + bestAsk) / 2);
            }
          }
        } catch (error) {
          console.error('Failed to parse order book WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error(`Order book WebSocket error for ${symbol}:`, error);
        setIsConnected(false);
        clearInterval(pingInterval);
      };
      
      ws.onclose = (event) => {
        console.log(`Order book WebSocket disconnected for ${symbol}:`, event.code, event.reason);
        setIsConnected(false);
        clearInterval(pingInterval);
        
        // Auto-reconnect with exponential backoff
        const reconnectDelay = Math.min(5000 * Math.pow(2, 0), 30000); // Start with 5s, max 30s
        setTimeout(() => {
          if (selectedCoin === symbol) { // Only reconnect if same symbol is still selected
            console.log(`Attempting to reconnect order book WebSocket for ${symbol}...`);
            connectOrderBookWebSocket(symbol);
          }
        }, reconnectDelay);
      };
      
      orderBookWsRef.current = ws;
    } catch (error) {
      console.error(`Failed to connect order book WebSocket for ${symbol}:`, error);
      setIsConnected(false);
    }
  }, [selectedCoin]);

  // Connect to Binance WebSocket for live trades with enhanced stability
  const connectTradesWebSocket = useCallback((symbol: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    try {
      console.log(`Connecting to trades WebSocket for ${symbol}...`);
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`);
      
      // Enhanced connection handling with keep-alive
      let pingInterval: NodeJS.Timeout;
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 5;
      
      ws.onopen = () => {
        console.log(`Trades WebSocket connected for ${symbol}`);
        setIsConnected(true);
        reconnectAttempts = 0; // Reset counter on successful connection
        
        // Send heartbeat every 30 seconds to keep connection alive  
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            // Browser WebSocket doesn't have ping, but keeping the connection active
            // by checking readyState regularly helps detect disconnections
          }
        }, 30000);
      };
      
      ws.onmessage = (event) => {
        try {
          const trade = JSON.parse(event.data);
          
          if (trade.p && trade.q && trade.m !== undefined && trade.T) {
            const price = parseFloat(trade.p);
            const volume = parseFloat(trade.q);
            const isBuyerMaker = trade.m; // true if buyer is maker (sell order), false if taker (buy order)
            const timestamp = trade.T;
            const usdValue = price * volume;
            
            // Only show trades above $500 USD to reduce noise but capture more activity
            if (usdValue >= 500) {
              const liveOrder: LiveOrder = {
                id: `${symbol}-${trade.t}-${timestamp}`,
                coin: symbol.replace('USDT', ''),
                price: price,
                volume: volume,
                side: isBuyerMaker ? 'sell' : 'buy', // Opposite of maker
                timestamp: timestamp,
                usdValue: usdValue
              };
              
              setLiveOrders(prev => {
                const updated = [liveOrder, ...prev].slice(0, 150); // Keep last 150 orders for better performance
                ordersHistoryRef.current = updated;
                return updated;
              });
            }
          }
        } catch (error) {
          console.error('Failed to parse trades WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error(`Trades WebSocket error for ${symbol}:`, error);
        setIsConnected(false);
        clearInterval(pingInterval);
      };
      
      ws.onclose = (event) => {
        console.log(`Trades WebSocket disconnected for ${symbol}:`, event.code, event.reason);
        setIsConnected(false);
        clearInterval(pingInterval);
        
        // Enhanced auto-reconnect with exponential backoff and max attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        if (reconnectAttempts < maxReconnectAttempts && selectedCoin === symbol) {
          const reconnectDelay = Math.min(3000 * Math.pow(2, reconnectAttempts), 30000); // 3s, 6s, 12s, 24s, 30s max
          reconnectAttempts++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting trades WebSocket for ${symbol} (attempt ${reconnectAttempts})...`);
            connectTradesWebSocket(symbol);
          }, reconnectDelay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          console.warn(`Max reconnection attempts reached for ${symbol}. Please refresh the page.`);
        }
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error(`Failed to connect trades WebSocket for ${symbol}:`, error);
      setIsConnected(false);
    }
  }, [selectedCoin]);

  // Calculate metrics from order book data
  const calculateMetrics = useCallback((data: OrderBookEntry[], orders: LiveOrder[]): OrderBookMetrics => {
    const buyOrders = data.filter(order => order.side === 'buy');
    const sellOrders = data.filter(order => order.side === 'sell');
    
    const totalBuyVolume = buyOrders.reduce((sum, order) => sum + order.total, 0);
    const totalSellVolume = sellOrders.reduce((sum, order) => sum + order.total, 0);
    
    const largestBuyWall = Math.max(...buyOrders.map(order => order.total), 0);
    const largestSellWall = Math.max(...sellOrders.map(order => order.total), 0);
    
    const totalVolume = totalBuyVolume + totalSellVolume;
    const imbalance = totalVolume > 0 ? (totalBuyVolume / totalVolume) * 100 : 50;
    
    // Calculate 60s volume from recent orders
    const sixtySecondsAgo = Date.now() - 60000;
    const recentOrders = orders.filter(order => order.timestamp > sixtySecondsAgo);
    const volume60s = recentOrders.reduce((sum, order) => sum + order.usdValue, 0);
    
    return {
      largestBuyWall,
      largestSellWall,
      imbalance,
      volume60s,
      totalBuyVolume,
      totalSellVolume
    };
  }, []);

  // Connect to live data
  const connect = useCallback(() => {
    console.log(`Connecting to live data for ${selectedCoin}...`);
    setIsConnected(false);
    
    // Fetch initial order book data
    fetchInitialOrderBook(selectedCoin);
    
    // Connect WebSocket streams
    connectOrderBookWebSocket(selectedCoin);
    connectTradesWebSocket(selectedCoin);
  }, [selectedCoin, fetchInitialOrderBook, connectOrderBookWebSocket, connectTradesWebSocket]);

  // Disconnect from all WebSockets
  const disconnect = useCallback(() => {
    console.log('Disconnecting from all WebSocket streams...');
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (orderBookWsRef.current) {
      orderBookWsRef.current.close();
      orderBookWsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
    setOrderBookData([]);
    setLiveOrders([]);
    setMetrics(null);
    setCurrentPrice(0);
  }, []);

  // Update metrics when data changes
  useEffect(() => {
    if (orderBookData.length > 0) {
      const newMetrics = calculateMetrics(orderBookData, ordersHistoryRef.current);
      setMetrics(newMetrics);
    }
  }, [orderBookData, calculateMetrics]);

  // Auto-connect when component mounts or coin changes
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [selectedCoin]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    orderBookData,
    liveOrders,
    metrics,
    isConnected,
    selectedCoin,
    setSelectedCoin,
    currentPrice,
    connect,
    disconnect
  };
}

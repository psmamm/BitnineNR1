import { useState, useEffect, useCallback, useRef } from 'react';
import { apiConfig } from '@/react-app/config/apiConfig';

export interface CoinDetailData {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: string;
  priceChangePercent: string;
  priceChangePercent1h?: number;
  priceChangePercent7d?: number;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  lastUpdateTime: number;
}

export interface OrderBookEntry {
  price: string;
  quantity: string;
}

export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  lastUpdateId: number;
}

export interface RecentTrade {
  id: number;
  price: string;
  qty: string;
  time: number;
  isBuyerMaker: boolean;
}

export interface KlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
}

export interface TechnicalIndicators {
  sma7?: number;
  sma25?: number;
  sma99?: number;
  ema20?: number;
  ema50?: number;
  rsi?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
}

export function useCoinDetail(symbol: string) {
  const [coinData, setCoinData] = useState<CoinDetailData | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
  const [klineData, setKlineData] = useState<Record<string, KlineData[]>>({});
  const [technicalIndicators, setTechnicalIndicators] = useState<TechnicalIndicators>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const orderBookIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch coin ticker data
  const fetchCoinData = useCallback(async () => {
    if (!symbol) return;
    
    try {
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch coin data: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Get 1h and 7d changes from klines
      const [hourlyData, dailyData] = await Promise.all([
        fetchKlines(symbol, '1h', 2),
        fetchKlines(symbol, '1d', 8)
      ]);
      
      let priceChangePercent1h, priceChangePercent7d;
      
      if (hourlyData.length >= 2) {
        const current = parseFloat(hourlyData[hourlyData.length - 1].close);
        const previous = parseFloat(hourlyData[hourlyData.length - 2].close);
        priceChangePercent1h = ((current - previous) / previous) * 100;
      }
      
      if (dailyData.length >= 8) {
        const current = parseFloat(dailyData[dailyData.length - 1].close);
        const sevenDaysAgo = parseFloat(dailyData[0].close);
        priceChangePercent7d = ((current - sevenDaysAgo) / sevenDaysAgo) * 100;
      }
      
      const baseAsset = symbol.replace(/USDT|BTC|BNB|FDUSD|TUSD|USDC$/i, '');
      const quoteAsset = symbol.replace(baseAsset, '');
      
      setCoinData({
        symbol: data.symbol,
        baseAsset,
        quoteAsset,
        price: data.lastPrice,
        priceChangePercent: data.priceChangePercent,
        priceChangePercent1h,
        priceChangePercent7d,
        highPrice: data.highPrice,
        lowPrice: data.lowPrice,
        volume: data.volume,
        quoteVolume: data.quoteVolume,
        lastUpdateTime: data.closeTime
      });
      
    } catch (err) {
      console.error('Failed to fetch coin data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch coin data');
    }
  }, [symbol]);

  // Fetch order book
  const fetchOrderBook = useCallback(async () => {
    if (!symbol) return;
    
    try {
      const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=50`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch order book: ${response.status}`);
      }
      
      const data = await response.json();
      
      setOrderBook({
        bids: data.bids.map(([price, quantity]: [string, string]) => ({ price, quantity })),
        asks: data.asks.map(([price, quantity]: [string, string]) => ({ price, quantity })),
        lastUpdateId: data.lastUpdateId
      });
      
    } catch (err) {
      console.error('Failed to fetch order book:', err);
    }
  }, [symbol]);

  // Fetch recent trades
  const fetchRecentTrades = useCallback(async () => {
    if (!symbol) return;
    
    try {
      const response = await fetch(`https://api.binance.com/api/v3/aggTrades?symbol=${symbol}&limit=50`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recent trades: ${response.status}`);
      }
      
      const data = await response.json();
      
      setRecentTrades(data.map((trade: any) => ({
        id: trade.a,
        price: trade.p,
        qty: trade.q,
        time: trade.T,
        isBuyerMaker: trade.m
      })));
      
    } catch (err) {
      console.error('Failed to fetch recent trades:', err);
    }
  }, [symbol]);

  // Fetch klines (candlestick data)
  const fetchKlines = useCallback(async (
    symbolParam: string, 
    interval: string, 
    limit: number = 500
  ): Promise<KlineData[]> => {
    try {
      const response = await fetch(
        apiConfig.binance.endpoints.klines(symbolParam, interval, limit)
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch klines: ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.map((candle: any[]) => ({
        openTime: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
        closeTime: candle[6],
        quoteAssetVolume: candle[7],
        numberOfTrades: candle[8]
      }));
      
    } catch (err) {
      console.error(`Failed to fetch klines for ${symbolParam}:`, err);
      return [];
    }
  }, []);

  // Calculate technical indicators
  const calculateTechnicalIndicators = useCallback((data: KlineData[]) => {
    if (data.length < 99) return {};
    
    const closes = data.map(candle => parseFloat(candle.close));
    const indicators: TechnicalIndicators = {};
    
    // Simple Moving Averages
    if (closes.length >= 7) {
      const sma7 = closes.slice(-7).reduce((sum, price) => sum + price, 0) / 7;
      indicators.sma7 = sma7;
    }
    
    if (closes.length >= 25) {
      const sma25 = closes.slice(-25).reduce((sum, price) => sum + price, 0) / 25;
      indicators.sma25 = sma25;
    }
    
    if (closes.length >= 99) {
      const sma99 = closes.slice(-99).reduce((sum, price) => sum + price, 0) / 99;
      indicators.sma99 = sma99;
    }
    
    // Exponential Moving Averages
    if (closes.length >= 20) {
      const multiplier20 = 2 / (20 + 1);
      let ema20 = closes[closes.length - 20];
      
      for (let i = closes.length - 19; i < closes.length; i++) {
        ema20 = (closes[i] - ema20) * multiplier20 + ema20;
      }
      
      indicators.ema20 = ema20;
    }
    
    if (closes.length >= 50) {
      const multiplier50 = 2 / (50 + 1);
      let ema50 = closes[closes.length - 50];
      
      for (let i = closes.length - 49; i < closes.length; i++) {
        ema50 = (closes[i] - ema50) * multiplier50 + ema50;
      }
      
      indicators.ema50 = ema50;
    }
    
    // RSI calculation
    if (closes.length >= 15) {
      const changes = [];
      for (let i = 1; i < closes.length; i++) {
        changes.push(closes[i] - closes[i - 1]);
      }
      
      const gains = changes.map(change => change > 0 ? change : 0);
      const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);
      
      const avgGain = gains.slice(-14).reduce((sum, gain) => sum + gain, 0) / 14;
      const avgLoss = losses.slice(-14).reduce((sum, loss) => sum + loss, 0) / 14;
      
      if (avgLoss !== 0) {
        const rs = avgGain / avgLoss;
        indicators.rsi = 100 - (100 / (1 + rs));
      }
    }
    
    // MACD calculation (simplified)
    if (indicators.ema20 && indicators.ema50) {
      const macdLine = indicators.ema20 - indicators.ema50;
      // Simplified signal line (would need more data for proper EMA of MACD)
      const signalLine = macdLine * 0.9; // Approximation
      const histogram = macdLine - signalLine;
      
      indicators.macd = {
        macd: macdLine,
        signal: signalLine,
        histogram: histogram
      };
    }
    
    return indicators;
  }, []);

  // Load klines for different intervals
  const loadKlines = useCallback(async (interval: string) => {
    if (!symbol) return;
    
    const data = await fetchKlines(symbol, interval);
    
    setKlineData(prev => ({
      ...prev,
      [interval]: data
    }));
    
    // Calculate technical indicators for daily data
    if (interval === '1d' && data.length > 0) {
      const indicators = calculateTechnicalIndicators(data);
      setTechnicalIndicators(indicators);
    }
  }, [symbol, fetchKlines, calculateTechnicalIndicators]);

  // WebSocket connection for live updates
  const connectWebSocket = useCallback(() => {
    if (!symbol) return;
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    try {
      const streamName = `${symbol.toLowerCase()}@ticker`;
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${streamName}`);
      
      ws.onopen = () => {
        console.log(`WebSocket connected for ${symbol}`);
        setWsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.e === '24hrTicker') {
            setCoinData(prev => prev ? {
              ...prev,
              price: data.c,
              priceChangePercent: data.P,
              highPrice: data.h,
              lowPrice: data.l,
              volume: data.v,
              quoteVolume: data.q,
              lastUpdateTime: data.C
            } : null);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        
        // Reconnect after 5 seconds
        setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      setWsConnected(false);
    }
  }, [symbol]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
  }, []);

  // Initialize data when symbol changes
  useEffect(() => {
    if (!symbol) return;
    
    const initializeData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load initial data in parallel
        await Promise.all([
          fetchCoinData(),
          fetchOrderBook(),
          fetchRecentTrades(),
          loadKlines('1d'),
          loadKlines('4h'),
          loadKlines('1h')
        ]);
        
        // Start WebSocket connection
        connectWebSocket();
        
        // Set up order book polling
        if (orderBookIntervalRef.current) {
          clearInterval(orderBookIntervalRef.current);
        }
        
        orderBookIntervalRef.current = setInterval(() => {
          fetchOrderBook();
        }, 2000); // Update every 2 seconds
        
      } catch (err) {
        console.error('Failed to initialize coin detail data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load coin data');
      } finally {
        setLoading(false);
      }
    };
    
    initializeData();
    
    // Cleanup when symbol changes or component unmounts
    return () => {
      disconnectWebSocket();
      if (orderBookIntervalRef.current) {
        clearInterval(orderBookIntervalRef.current);
        orderBookIntervalRef.current = null;
      }
    };
  }, [symbol, fetchCoinData, fetchOrderBook, fetchRecentTrades, loadKlines, connectWebSocket, disconnectWebSocket]);

  return {
    coinData,
    orderBook,
    recentTrades,
    klineData,
    technicalIndicators,
    loading,
    error,
    wsConnected,
    loadKlines,
    refetch: () => {
      if (symbol) {
        Promise.all([
          fetchCoinData(),
          fetchOrderBook(),
          fetchRecentTrades()
        ]);
      }
    }
  };
}

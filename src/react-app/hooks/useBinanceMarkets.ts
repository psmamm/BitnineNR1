import { useState, useEffect, useCallback, useRef } from 'react';
import { apiConfig } from '@/react-app/config/apiConfig';
import { getLogoUrl } from '@/react-app/utils/coinLogos';

export interface BinanceSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  baseAssetPrecision: number;
  quoteAsset: string;
  quotePrecision: number;
  orderTypes: string[];
  icebergAllowed: boolean;
  ocoAllowed: boolean;
  isSpotTradingAllowed: boolean;
  isMarginTradingAllowed: boolean;
  filters: any[];
  permissions: string[];
}

export interface MarketTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface EnhancedMarketData extends MarketTicker {
  baseAsset: string;
  quoteAsset: string;
  priceChangePercent1h?: number;
  priceChangePercent7d?: number;
  sparklineData?: number[];
  marketCap?: number;
  marketCapRank?: number;
  category?: string[];
  chain?: string;
  isNew?: boolean;
  logo?: string;
}

export interface MarketFilters {
  search: string;
  quoteAssets: string[];
  timeframe: '1h' | '24h' | '7d';
  sortBy: 'symbol' | 'price' | 'change24h' | 'change1h' | 'change7d' | 'volume' | 'quoteVolume' | 'marketCap';
  sortOrder: 'asc' | 'desc';
  pageSize: 25 | 50 | 100;
}

export interface MarketStats {
  totalPairs: number;
  totalQuoteVolume: number;
  topGainer: { symbol: string; change: number } | null;
  topLoser: { symbol: string; change: number } | null;
}

export function useBinanceMarkets() {
  const [symbols, setSymbols] = useState<BinanceSymbol[]>([]);
  const [tickers, setTickers] = useState<Record<string, MarketTicker>>({});
  const [enhancedData, setEnhancedData] = useState<Record<string, EnhancedMarketData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const klinesCache = useRef<Record<string, { data: number[]; timestamp: number }>>({});

  // Fetch exchange info and symbols
  const fetchExchangeInfo = useCallback(async () => {
    try {
      console.log('Fetching Binance exchange info...');
      const response = await fetch(apiConfig.binance.endpoints.exchangeInfo);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch exchange info: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Filter ALL TRADING status symbols - ALL Quote Assets (USDT, BTC, ETH, BNB, etc.)
      const tradingSymbols = data.symbols.filter((symbol: BinanceSymbol) => 
        symbol.status === 'TRADING' && 
        symbol.isSpotTradingAllowed &&
        // ✅ ALL Quote Assets: USDT, BTC, ETH, BNB, USDC, TUSD, PAX, BUSD, etc.
        // Optional: Exclude leveraged tokens
        !symbol.symbol.includes('UP') &&
        !symbol.symbol.includes('DOWN') &&
        !symbol.symbol.includes('BULL') &&
        !symbol.symbol.includes('BEAR')
      );
      
      console.log(`Found ${tradingSymbols.length} trading symbols`);
      setSymbols(tradingSymbols);
      
      return tradingSymbols;
    } catch (err) {
      console.error('Failed to fetch exchange info:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch exchange info');
      return [];
    }
  }, []);

  // Fetch 24hr ticker data
  const fetch24hrTickers = useCallback(async () => {
    try {
      console.log('Fetching 24hr ticker data...');
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ticker data: ${response.status}`);
      }
      
      const data: MarketTicker[] = await response.json();
      
      // Convert to object for easier lookup
      const tickerMap: Record<string, MarketTicker> = {};
      data.forEach(ticker => {
        tickerMap[ticker.symbol] = ticker;
      });
      
      console.log(`Loaded ${data.length} ticker entries`);
      setTickers(tickerMap);
      
      return tickerMap;
    } catch (err) {
      console.error('Failed to fetch 24hr tickers:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ticker data');
      return {};
    }
  }, []);

  // Fetch klines for 1h and 7d calculations - optimized with longer cache
  const fetchKlinesData = useCallback(async (symbol: string, interval: '1h' | '1d', limit: number = 8) => {
    const cacheKey = `${symbol}-${interval}`;
    const cached = klinesCache.current[cacheKey];
    
    // Use cache if less than 15 minutes old (increased cache time)
    if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
      return cached.data;
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(
        apiConfig.binance.endpoints.klines(symbol, interval, limit),
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch klines: ${response.status}`);
      }
      
      const data = await response.json();
      const closes = data.map((candle: any[]) => parseFloat(candle[4])); // Close prices
      
      // Cache the result
      klinesCache.current[cacheKey] = {
        data: closes,
        timestamp: Date.now()
      };
      
      return closes;
    } catch (err) {
      console.error(`Failed to fetch klines for ${symbol}:`, err);
      return [];
    }
  }, []);

  // Calculate percentage changes - optimized with reduced data
  const calculatePercentageChanges = useCallback(async (symbols: string[]) => {
    const enhanced: Record<string, Partial<EnhancedMarketData>> = {};
    
    // Increase batch size and symbols for better coverage
    const batchSize = 10;
    const limitedSymbols = symbols.slice(0, 200); // Process top 200 symbols (increased for all quote assets)
    
    for (let i = 0; i < limitedSymbols.length; i += batchSize) {
      const batch = limitedSymbols.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (symbol) => {
        try {
          // Only fetch essential data for performance
          const [hourlyData, dailyData] = await Promise.allSettled([
            fetchKlinesData(symbol, '1h', 2),
            fetchKlinesData(symbol, '1d', 7)
          ]);
          
          if (hourlyData.status === 'fulfilled' && hourlyData.value.length >= 2) {
            const current = hourlyData.value[hourlyData.value.length - 1];
            const previous = hourlyData.value[hourlyData.value.length - 2];
            enhanced[symbol] = {
              ...enhanced[symbol],
              priceChangePercent1h: ((current - previous) / previous) * 100
            };
          }
          
          if (dailyData.status === 'fulfilled' && dailyData.value.length >= 7) {
            const current = dailyData.value[dailyData.value.length - 1];
            const sevenDaysAgo = dailyData.value[0];
            enhanced[symbol] = {
              ...enhanced[symbol],
              priceChangePercent7d: ((current - sevenDaysAgo) / sevenDaysAgo) * 100,
              sparklineData: dailyData.value
            };
          }
        } catch (err) {
          console.error(`Failed to calculate changes for ${symbol}:`, err);
        }
      });
      
      await Promise.allSettled(batchPromises);
      
      // Shorter delay between batches for faster loading
      if (i + batchSize < limitedSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return enhanced;
  }, [fetchKlinesData]);

  // Enhance market data with additional calculations - optimized loading
  const enhanceMarketData = useCallback(async (symbolsList: BinanceSymbol[], tickerData: Record<string, MarketTicker>) => {
    try {
      console.log('Enhancing market data...');
      
      const enhanced: Record<string, EnhancedMarketData> = {};
      
      // First pass: Create basic enhanced data without percentage calculations
      symbolsList.forEach(symbolInfo => {
        const ticker = tickerData[symbolInfo.symbol];
        if (ticker) {
          // Use CoinMarketCap CDN as primary (best coverage for all Binance coins)
          const logoUrl = getLogoUrl(symbolInfo.baseAsset);
          
          enhanced[symbolInfo.symbol] = {
            ...ticker,
            baseAsset: symbolInfo.baseAsset,
            quoteAsset: symbolInfo.quoteAsset,
            logo: logoUrl
          };
        }
      });
      
      // Set basic data immediately for faster UI rendering
      setEnhancedData(enhanced);
      console.log(`Basic enhanced data set with ${Object.keys(enhanced).length} symbols`);
      
      // Second pass: Add percentage changes for top symbols only
      const topUSDTSymbols = symbolsList
        .filter(s => s.quoteAsset === 'USDT')
        .sort((a, b) => {
          const aVolume = parseFloat(tickerData[a.symbol]?.quoteVolume || '0');
          const bVolume = parseFloat(tickerData[b.symbol]?.quoteVolume || '0');
          return bVolume - aVolume;
        })
        .slice(0, 100) // Process top 100 symbols
        .map(s => s.symbol);
      
      // Calculate percentage changes in background
      const percentageChanges = await calculatePercentageChanges(topUSDTSymbols);
      
      // Update with percentage data
      setEnhancedData(prev => {
        const updated = { ...prev };
        Object.keys(percentageChanges).forEach(symbol => {
          if (updated[symbol]) {
            updated[symbol] = {
              ...updated[symbol],
              ...percentageChanges[symbol]
            };
          }
        });
        return updated;
      });
      
      console.log(`Enhanced data updated with percentage changes for ${Object.keys(percentageChanges).length} symbols`);
      
    } catch (err) {
      console.error('Failed to enhance market data:', err);
    }
  }, [calculatePercentageChanges]);

  // WebSocket connection for live updates
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    try {
      console.log('Connecting to Binance WebSocket...');
      const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (Array.isArray(data)) {
            // Update tickers with live data
            setTickers(prev => {
              const updated = { ...prev };
              
              data.forEach((ticker: any) => {
                if (updated[ticker.s]) {
                  updated[ticker.s] = {
                    ...updated[ticker.s],
                    lastPrice: ticker.c,
                    priceChangePercent: ticker.P,
                    volume: ticker.v,
                    quoteVolume: ticker.q,
                    closeTime: ticker.C
                  };
                }
              });
              
              return updated;
            });
            
            // Update enhanced data
            setEnhancedData(prev => {
              const updated = { ...prev };
              
              data.forEach((ticker: any) => {
                if (updated[ticker.s]) {
                  updated[ticker.s] = {
                    ...updated[ticker.s],
                    lastPrice: ticker.c,
                    priceChangePercent: ticker.P,
                    volume: ticker.v,
                    quoteVolume: ticker.q,
                    closeTime: ticker.C
                  };
                }
              });
              
              return updated;
            });
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
        
        // Reconnect with exponential backoff
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 5000);
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      setWsConnected(false);
    }
  }, []);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setWsConnected(false);
  }, []);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch exchange info and tickers in parallel
        const [symbolsList, tickerData] = await Promise.all([
          fetchExchangeInfo(),
          fetch24hrTickers()
        ]);
        
        if (symbolsList.length > 0 && Object.keys(tickerData).length > 0) {
          // Enhance data with additional calculations
          await enhanceMarketData(symbolsList, tickerData);
          
          // Start WebSocket connection
          connectWebSocket();
        }
      } catch (err) {
        console.error('Failed to initialize market data:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize market data');
      } finally {
        setLoading(false);
      }
    };
    
    initializeData();
    
    // Cleanup on unmount
    return () => {
      disconnectWebSocket();
    };
  }, [fetchExchangeInfo, fetch24hrTickers, enhanceMarketData, connectWebSocket, disconnectWebSocket]);

  // Polling fallback if WebSocket fails - reduced frequency
  useEffect(() => {
    if (!wsConnected && !loading) {
      const interval = setInterval(() => {
        console.log('WebSocket disconnected, polling for updates...');
        fetch24hrTickers();
      }, 60000); // 60 seconds for better performance
      
      return () => clearInterval(interval);
    }
  }, [wsConnected, loading, fetch24hrTickers]);

  // Calculate market stats
  const calculateMarketStats = useCallback((filtered: EnhancedMarketData[]): MarketStats => {
    if (filtered.length === 0) {
      return {
        totalPairs: 0,
        totalQuoteVolume: 0,
        topGainer: null,
        topLoser: null
      };
    }
    
    const totalQuoteVolume = filtered.reduce((sum, item) => 
      sum + parseFloat(item.quoteVolume || '0'), 0
    );
    
    const sorted = [...filtered].sort((a, b) => 
      parseFloat(b.priceChangePercent || '0') - parseFloat(a.priceChangePercent || '0')
    );
    
    return {
      totalPairs: filtered.length,
      totalQuoteVolume,
      topGainer: sorted.length > 0 ? {
        symbol: sorted[0].symbol,
        change: parseFloat(sorted[0].priceChangePercent || '0')
      } : null,
      topLoser: sorted.length > 0 ? {
        symbol: sorted[sorted.length - 1].symbol,
        change: parseFloat(sorted[sorted.length - 1].priceChangePercent || '0')
      } : null
    };
  }, []);

  // Filter and sort data
  const getFilteredData = useCallback((filters: MarketFilters) => {
    const allData = Object.values(enhancedData);
    
    let filtered = allData.filter(item => {
      // Quote filter
      if (filters.quoteAssets.length > 0 && !filters.quoteAssets.includes(item.quoteAsset)) {
        return false;
      }
      
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        return (
          item.symbol.toLowerCase().includes(searchTerm) ||
          item.baseAsset.toLowerCase().includes(searchTerm)
        );
      }
      
      return true;
    });
    
    // Sort (marketCap sorting is handled in Markets.tsx after market cap data is added)
    if (filters.sortBy !== 'marketCap') {
    filtered.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (filters.sortBy) {
        case 'symbol':
          return filters.sortOrder === 'asc' 
            ? a.symbol.localeCompare(b.symbol)
            : b.symbol.localeCompare(a.symbol);
            
        case 'price':
          aValue = parseFloat(a.lastPrice || '0');
          bValue = parseFloat(b.lastPrice || '0');
          break;
          
        case 'change24h':
          aValue = parseFloat(a.priceChangePercent || '0');
          bValue = parseFloat(b.priceChangePercent || '0');
          break;
          
        case 'change1h':
          aValue = a.priceChangePercent1h || 0;
          bValue = b.priceChangePercent1h || 0;
          break;
          
        case 'change7d':
          aValue = a.priceChangePercent7d || 0;
          bValue = b.priceChangePercent7d || 0;
          break;
          
        case 'volume':
          aValue = parseFloat(a.volume || '0');
          bValue = parseFloat(b.volume || '0');
          break;
          
        case 'quoteVolume':
        default:
          aValue = parseFloat(a.quoteVolume || '0');
          bValue = parseFloat(b.quoteVolume || '0');
          break;
      }
      
      return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
    }
    
    return filtered;
  }, [enhancedData]);

  // Get trending data (Hot, New, Top Gainer, Top Volume)
  const getTrendingData = useCallback(() => {
    // Only USDT pairs
    const allData = Object.values(enhancedData).filter(item => item.quoteAsset === 'USDT');
    
    // Hot: Highest volume in last 24h
    const hot = [...allData]
      .sort((a, b) => parseFloat(b.quoteVolume || '0') - parseFloat(a.quoteVolume || '0'))
      .slice(0, 3);

    // Top Gainer: Highest 24h % change
    const topGainer = [...allData]
      .filter(item => parseFloat(item.priceChangePercent || '0') > 0)
      .sort((a, b) => parseFloat(b.priceChangePercent || '0') - parseFloat(a.priceChangePercent || '0'))
      .slice(0, 3);

    // Top Volume: Highest 24h volume
    const topVolume = [...allData]
      .sort((a, b) => parseFloat(b.quoteVolume || '0') - parseFloat(a.quoteVolume || '0'))
      .slice(0, 3);

    // New: Based on volume spike or recent listings (simplified - using low volume as proxy for new)
    const newCoins = [...allData]
      .filter(item => {
        const volume = parseFloat(item.quoteVolume || '0');
        const priceChange = parseFloat(item.priceChangePercent || '0');
        // New coins typically have lower volume but positive price change
        return volume > 0 && volume < 1000000 && priceChange > 0;
      })
      .sort((a, b) => parseFloat(b.priceChangePercent || '0') - parseFloat(a.priceChangePercent || '0'))
      .slice(0, 3);

    return {
      hot,
      new: newCoins,
      topGainer,
      topVolume,
    };
  }, [enhancedData]);

  return {
    symbols,
    tickers,
    enhancedData,
    loading,
    error,
    wsConnected,
    getFilteredData,
    calculateMarketStats,
    getTrendingData,
    fetchKlinesData,
    refetch: () => {
      setLoading(true);
      Promise.all([fetchExchangeInfo(), fetch24hrTickers()]).finally(() => setLoading(false));
    }
  };
}

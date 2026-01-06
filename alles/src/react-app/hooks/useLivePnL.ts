import { useState, useEffect, useMemo } from 'react';

export interface OpenPosition {
  id: number;
  symbol: string;
  asset_type: 'stocks' | 'crypto' | 'forex';
  direction: 'long' | 'short';
  quantity: number;
  entry_price: number;
  leverage?: number;
  commission?: number;
}

export interface LivePnL {
  tradeId: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  priceChange24h: number;
}

export function useLivePnL(openPositions: OpenPosition[]) {
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; change24h: number }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get all symbols that need live prices
  const symbolsToTrack = useMemo(() => {
    return openPositions.map(pos => {
      // Format symbols for different APIs
      switch (pos.asset_type) {
        case 'crypto':
          return pos.symbol.endsWith('USDT') ? pos.symbol : `${pos.symbol}USDT`;
        case 'forex':
          return pos.symbol;
        case 'stocks':
          return pos.symbol;
        default:
          return pos.symbol;
      }
    });
  }, [openPositions]);

  // Fetch live prices for crypto assets
  const fetchCryptoPrices = async (symbols: string[]) => {
    try {
      const cryptoSymbols = symbols.filter(symbol => 
        openPositions.find(pos => 
          pos.asset_type === 'crypto' && 
          (pos.symbol === symbol || `${pos.symbol}USDT` === symbol)
        )
      );

      if (cryptoSymbols.length === 0) return {};

      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr`);
      if (!response.ok) throw new Error('Failed to fetch crypto prices');
      
      const data = await response.json();
      const priceMap: Record<string, { price: number; change24h: number }> = {};
      
      data.forEach((ticker: any) => {
        if (cryptoSymbols.includes(ticker.symbol)) {
          priceMap[ticker.symbol] = {
            price: parseFloat(ticker.lastPrice),
            change24h: parseFloat(ticker.priceChangePercent)
          };
        }
      });
      
      return priceMap;
    } catch (err) {
      console.error('Failed to fetch crypto prices:', err);
      return {};
    }
  };

  // Fetch live prices for forex pairs
  const fetchForexPrices = async (symbols: string[]) => {
    try {
      const forexSymbols = symbols.filter(symbol => 
        openPositions.find(pos => pos.asset_type === 'forex' && pos.symbol === symbol)
      );

      if (forexSymbols.length === 0) return {};

      // Using exchangerate-api for forex rates
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      if (!response.ok) throw new Error('Failed to fetch forex rates');
      
      const data = await response.json();
      const priceMap: Record<string, { price: number; change24h: number }> = {};
      
      forexSymbols.forEach(symbol => {
        const [base, quote] = [symbol.slice(0, 3), symbol.slice(3, 6)];
        let price = null;
        
        if (base === 'USD' && data.rates[quote]) {
          price = data.rates[quote];
        } else if (quote === 'USD' && data.rates[base]) {
          price = 1 / data.rates[base];
        } else if (data.rates[base] && data.rates[quote]) {
          price = data.rates[quote] / data.rates[base];
        }
        
        if (price) {
          priceMap[symbol] = {
            price: Number(price.toFixed(5)),
            change24h: 0 // Forex doesn't have 24h change in this API
          };
        }
      });
      
      return priceMap;
    } catch (err) {
      console.error('Failed to fetch forex prices:', err);
      return {};
    }
  };

  // Fetch live prices for stocks (mock data for now)
  const fetchStockPrices = async (symbols: string[]) => {
    const stockSymbols = symbols.filter(symbol => 
      openPositions.find(pos => pos.asset_type === 'stocks' && pos.symbol === symbol)
    );

    // Mock stock prices (in real app, use Alpha Vantage, IEX, etc.)
    const priceMap: Record<string, { price: number; change24h: number }> = {};
    stockSymbols.forEach(symbol => {
      const position = openPositions.find(pos => pos.symbol === symbol);
      if (position) {
        // Simulate small price movements around entry price
        const variation = (Math.random() - 0.5) * 0.05; // ±2.5% variation
        const mockPrice = position.entry_price * (1 + variation);
        priceMap[symbol] = {
          price: Number(mockPrice.toFixed(2)),
          change24h: variation * 100
        };
      }
    });
    
    return priceMap;
  };

  // Main function to fetch all live prices
  const fetchLivePrices = async () => {
    if (symbolsToTrack.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const [cryptoPrices, forexPrices, stockPrices] = await Promise.all([
        fetchCryptoPrices(symbolsToTrack),
        fetchForexPrices(symbolsToTrack),
        fetchStockPrices(symbolsToTrack)
      ]);

      setLivePrices({
        ...cryptoPrices,
        ...forexPrices,
        ...stockPrices
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  };

  // Calculate live P&L for each position
  const livePnLData: LivePnL[] = useMemo(() => {
    return openPositions.map(position => {
      const symbolKey = position.asset_type === 'crypto' 
        ? (position.symbol.endsWith('USDT') ? position.symbol : `${position.symbol}USDT`)
        : position.symbol;
      
      const livePrice = livePrices[symbolKey];
      
      if (!livePrice) {
        return {
          tradeId: position.id,
          currentPrice: position.entry_price,
          unrealizedPnL: 0,
          unrealizedPnLPercent: 0,
          priceChange24h: 0
        };
      }

      const multiplier = position.direction === 'long' ? 1 : -1;
      const leverage = position.leverage || 1;
      const priceDiff = livePrice.price - position.entry_price;
      const unrealizedPnL = priceDiff * position.quantity * multiplier * leverage;
      const unrealizedPnLPercent = (priceDiff / position.entry_price) * 100 * multiplier * leverage;

      return {
        tradeId: position.id,
        currentPrice: livePrice.price,
        unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
        unrealizedPnLPercent: Number(unrealizedPnLPercent.toFixed(2)),
        priceChange24h: livePrice.change24h
      };
    });
  }, [openPositions, livePrices]);

  // Update prices every 60 seconds for better performance
  useEffect(() => {
    if (openPositions.length === 0) return;

    // Initial fetch
    fetchLivePrices();

    // Set up interval for updates - increased to 60 seconds
    const interval = setInterval(fetchLivePrices, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [symbolsToTrack.join(',')]);

  return {
    livePnLData,
    loading,
    error,
    refetch: fetchLivePrices
  };
}

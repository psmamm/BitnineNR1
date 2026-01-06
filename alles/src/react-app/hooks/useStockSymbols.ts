import { useState, useEffect } from 'react';

export interface StockSymbol {
  symbol: string;
  name: string;
  exchange: string;
  sector?: string;
  price?: number;
  change?: number;
}

const POPULAR_STOCKS: StockSymbol[] = [
  // Tech Giants
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'GOOG', name: 'Alphabet Inc. (Class C)', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'Consumer Discretionary' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', sector: 'Consumer Discretionary' },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Technology' },
  { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', sector: 'Communication Services' },
  
  // Financial
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Financial Services' },
  { symbol: 'BAC', name: 'Bank of America Corp.', exchange: 'NYSE', sector: 'Financial Services' },
  { symbol: 'WFC', name: 'Wells Fargo & Company', exchange: 'NYSE', sector: 'Financial Services' },
  { symbol: 'GS', name: 'Goldman Sachs Group Inc.', exchange: 'NYSE', sector: 'Financial Services' },
  { symbol: 'MS', name: 'Morgan Stanley', exchange: 'NYSE', sector: 'Financial Services' },
  
  // Healthcare
  { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', sector: 'Healthcare' },
  { symbol: 'PFE', name: 'Pfizer Inc.', exchange: 'NYSE', sector: 'Healthcare' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.', exchange: 'NYSE', sector: 'Healthcare' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', exchange: 'NYSE', sector: 'Healthcare' },
  
  // Consumer
  { symbol: 'KO', name: 'The Coca-Cola Company', exchange: 'NYSE', sector: 'Consumer Staples' },
  { symbol: 'PEP', name: 'PepsiCo Inc.', exchange: 'NASDAQ', sector: 'Consumer Staples' },
  { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', sector: 'Consumer Staples' },
  { symbol: 'PG', name: 'Procter & Gamble Co.', exchange: 'NYSE', sector: 'Consumer Staples' },
  { symbol: 'HD', name: 'The Home Depot Inc.', exchange: 'NYSE', sector: 'Consumer Discretionary' },
  { symbol: 'MCD', name: 'McDonald\'s Corporation', exchange: 'NYSE', sector: 'Consumer Discretionary' },
  
  // Industrial
  { symbol: 'BA', name: 'The Boeing Company', exchange: 'NYSE', sector: 'Industrial' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', exchange: 'NYSE', sector: 'Industrial' },
  { symbol: 'MMM', name: '3M Company', exchange: 'NYSE', sector: 'Industrial' },
  
  // Energy
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', exchange: 'NYSE', sector: 'Energy' },
  { symbol: 'CVX', name: 'Chevron Corporation', exchange: 'NYSE', sector: 'Energy' },
  
  // Communication
  { symbol: 'VZ', name: 'Verizon Communications Inc.', exchange: 'NYSE', sector: 'Communication Services' },
  { symbol: 'T', name: 'AT&T Inc.', exchange: 'NYSE', sector: 'Communication Services' },
  
  // Utilities
  { symbol: 'NEE', name: 'NextEra Energy Inc.', exchange: 'NYSE', sector: 'Utilities' },
  
  // Real Estate
  { symbol: 'AMT', name: 'American Tower Corporation', exchange: 'NYSE', sector: 'Real Estate' },
  
  // ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'ARCA', sector: 'ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', sector: 'ETF' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'ARCA', sector: 'ETF' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', exchange: 'ARCA', sector: 'ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'ARCA', sector: 'ETF' },
];

export function useStockSymbols() {
  const [stocks, setStocks] = useState<StockSymbol[]>(POPULAR_STOCKS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStockPrices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For demo purposes, we'll use the free Alpha Vantage API (limited calls)
      // In production, you'd want to use a proper financial data provider
      
      // For now, just return the stocks without prices to avoid API rate limits
      setStocks(POPULAR_STOCKS.map(stock => ({
        ...stock,
        price: undefined,
        change: undefined
      })));
      
    } catch (err) {
      console.warn('Failed to fetch stock prices:', err);
      setError('Failed to load stock prices');
      setStocks(POPULAR_STOCKS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockPrices();
  }, []);

  return {
    stocks,
    loading,
    error,
    refetch: fetchStockPrices
  };
}

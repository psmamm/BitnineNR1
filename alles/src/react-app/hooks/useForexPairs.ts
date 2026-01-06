import { useState, useEffect } from 'react';

export interface ForexPair {
  symbol: string;
  name: string;
  base: string;
  quote: string;
  price?: number;
  change?: number;
}

const MAJOR_FOREX_PAIRS: ForexPair[] = [
  { symbol: 'EURUSD', name: 'Euro / US Dollar', base: 'EUR', quote: 'USD' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', base: 'GBP', quote: 'USD' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', base: 'USD', quote: 'JPY' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', base: 'AUD', quote: 'USD' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', base: 'USD', quote: 'CAD' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', base: 'USD', quote: 'CHF' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', base: 'NZD', quote: 'USD' },
  { symbol: 'EURJPY', name: 'Euro / Japanese Yen', base: 'EUR', quote: 'JPY' },
  { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', base: 'GBP', quote: 'JPY' },
  { symbol: 'EURGBP', name: 'Euro / British Pound', base: 'EUR', quote: 'GBP' },
  { symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen', base: 'AUD', quote: 'JPY' },
  { symbol: 'EURAUD', name: 'Euro / Australian Dollar', base: 'EUR', quote: 'AUD' },
  { symbol: 'EURCHF', name: 'Euro / Swiss Franc', base: 'EUR', quote: 'CHF' },
  { symbol: 'AUDCAD', name: 'Australian Dollar / Canadian Dollar', base: 'AUD', quote: 'CAD' },
  { symbol: 'GBPCHF', name: 'British Pound / Swiss Franc', base: 'GBP', quote: 'CHF' },
  { symbol: 'CADCHF', name: 'Canadian Dollar / Swiss Franc', base: 'CAD', quote: 'CHF' },
  { symbol: 'NZDJPY', name: 'New Zealand Dollar / Japanese Yen', base: 'NZD', quote: 'JPY' },
  { symbol: 'AUDCHF', name: 'Australian Dollar / Swiss Franc', base: 'AUD', quote: 'CHF' },
  { symbol: 'GBPCAD', name: 'British Pound / Canadian Dollar', base: 'GBP', quote: 'CAD' },
  { symbol: 'GBPAUD', name: 'British Pound / Australian Dollar', base: 'GBP', quote: 'AUD' },
  { symbol: 'CHFJPY', name: 'Swiss Franc / Japanese Yen', base: 'CHF', quote: 'JPY' },
  { symbol: 'EURNZD', name: 'Euro / New Zealand Dollar', base: 'EUR', quote: 'NZD' },
  { symbol: 'EURCAD', name: 'Euro / Canadian Dollar', base: 'EUR', quote: 'CAD' },
  { symbol: 'CADCAD', name: 'Canadian Dollar / Canadian Dollar', base: 'CAD', quote: 'CAD' },
  { symbol: 'NZDCAD', name: 'New Zealand Dollar / Canadian Dollar', base: 'NZD', quote: 'CAD' },
];

export function useForexPairs() {
  const [pairs, setPairs] = useState<ForexPair[]>(MAJOR_FOREX_PAIRS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForexPrices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch real forex rates from a free API
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      
      if (response.ok) {
        const data = await response.json();
        const updatedPairs = MAJOR_FOREX_PAIRS.map(pair => {
          let price = null;
          
          // Calculate cross rates
          if (pair.base === 'USD' && data.rates[pair.quote]) {
            price = data.rates[pair.quote];
          } else if (pair.quote === 'USD' && data.rates[pair.base]) {
            price = 1 / data.rates[pair.base];
          } else if (data.rates[pair.base] && data.rates[pair.quote]) {
            price = data.rates[pair.quote] / data.rates[pair.base];
          }
          
          return {
            ...pair,
            price: price ? Number(price.toFixed(5)) : undefined
          };
        });
        
        setPairs(updatedPairs);
      } else {
        // Fallback to pairs without prices
        setPairs(MAJOR_FOREX_PAIRS);
      }
    } catch (err) {
      console.warn('Failed to fetch forex prices:', err);
      setError('Failed to load forex prices');
      setPairs(MAJOR_FOREX_PAIRS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForexPrices();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchForexPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    pairs,
    loading,
    error,
    refetch: fetchForexPrices
  };
}

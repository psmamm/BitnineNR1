import { useState, useEffect, useCallback, useRef } from 'react';
import { apiConfig } from '@/react-app/config/apiConfig';

export interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  image?: string;
}

interface MarketCapCache {
  data: Record<string, CoinGeckoMarketData>;
  timestamp: number;
}

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export function useCoinGeckoMarketCap() {
  const [marketCapData, setMarketCapData] = useState<Record<string, CoinGeckoMarketData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<MarketCapCache | null>(null);

  // Mapping from Binance symbol to CoinGecko ID
  // This is a simplified mapping - in production, you might want a more comprehensive mapping
  const getCoinGeckoId = useCallback((baseAsset: string): string | null => {
    const mapping: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'XRP': 'ripple',
      'DOGE': 'dogecoin',
      'ADA': 'cardano',
      'TRX': 'tron',
      'AVAX': 'avalanche-2',
      'TON': 'the-open-network',
      'SHIB': 'shiba-inu',
      'DOT': 'polkadot',
      'BCH': 'bitcoin-cash',
      'LINK': 'chainlink',
      'NEAR': 'near',
      'MATIC': 'matic-network',
      'UNI': 'uniswap',
      'LTC': 'litecoin',
      'PEPE': 'pepe',
      'ICP': 'internet-computer',
      'ETC': 'ethereum-classic',
      'APT': 'aptos',
      'SUI': 'sui',
      'CRO': 'crypto-com-chain',
      'ATOM': 'cosmos',
      'FIL': 'filecoin',
      'OP': 'optimism',
      'INJ': 'injective-protocol',
      'VET': 'vechain',
      'ARB': 'arbitrum',
      'TAO': 'bittensor',
      'TIA': 'celestia',
      'STX': 'blockstack',
      'HBAR': 'hedera-hashgraph',
      'MNT': 'mantle',
      'IMX': 'immutable-x',
      'POL': 'polymath',
      'ALGO': 'algorand',
      'AAVE': 'aave',
      'WIF': 'dogwifcoin',
      'RENDER': 'render-token',
      'MKR': 'maker',
      'GRT': 'the-graph',
      'OKB': 'okb',
      'THETA': 'theta-token',
      'RUNE': 'thorchain',
      'FTM': 'fantom',
      'SEI': 'sei-network',
    };

    return mapping[baseAsset] || baseAsset.toLowerCase();
  }, []);

  // Fetch market cap data from CoinGecko
  const fetchMarketCapData = useCallback(async (): Promise<Record<string, CoinGeckoMarketData>> => {
    // Check cache first
    if (cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_DURATION) {
      return cacheRef.current.data;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all market data (top 250 coins by market cap - only for Binance coins)
      const response = await fetch(apiConfig.coingecko.endpoints.markets('usd', 250, 1));
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: CoinGeckoMarketData[] = await response.json();

      // Create a map by symbol (uppercase)
      const marketCapMap: Record<string, CoinGeckoMarketData> = {};
      data.forEach((coin) => {
        marketCapMap[coin.symbol.toUpperCase()] = coin;
      });

      // Update cache
      cacheRef.current = {
        data: marketCapMap,
        timestamp: Date.now(),
      };

      setMarketCapData(marketCapMap);
      return marketCapMap;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch market cap data';
      console.error('Failed to fetch CoinGecko market cap data:', err);
      setError(errorMessage);
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  // Get market cap for a specific symbol
  const getMarketCap = useCallback((baseAsset: string): CoinGeckoMarketData | null => {
    const symbol = baseAsset.toUpperCase();
    // First try direct symbol match
    if (marketCapData[symbol]) {
      return marketCapData[symbol];
    }
    // Try CoinGecko ID match
    const coinGeckoId = getCoinGeckoId(baseAsset);
    if (coinGeckoId && marketCapData[coinGeckoId]) {
      return marketCapData[coinGeckoId];
    }
    return null;
  }, [marketCapData, getCoinGeckoId]);

  // Initialize: Fetch market cap data on mount
  useEffect(() => {
    fetchMarketCapData();
  }, [fetchMarketCapData]);

  return {
    marketCapData,
    loading,
    error,
    getMarketCap,
    fetchMarketCapData,
    getCoinGeckoId,
    refetch: () => fetchMarketCapData(),
  };
}

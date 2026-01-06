import { useState, useEffect } from 'react';
import { apiConfig } from '@/react-app/config/apiConfig';

export interface BinanceCoin {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  name: string;
  price: number;
  priceChangePercent: number;
  volume: number;
  marketCap: number;
  marketCapRank: number;
  coingeckoId: string;
}

export function useBinanceCoins() {
  const [coins, setCoins] = useState<BinanceCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoins = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch top trading pairs from Binance
      const response = await fetch(apiConfig.binance.endpoints.ticker24hr);
      if (!response.ok) throw new Error('Failed to fetch Binance data');

      const data = await response.json();

      // Filter for USDT pairs only - major coins with high volume
      const usdtPairs = data.filter((ticker: any) =>
        ticker.symbol.endsWith('USDT') &&
        !ticker.symbol.includes('UP') &&
        !ticker.symbol.includes('DOWN') &&
        !ticker.symbol.includes('BULL') &&
        !ticker.symbol.includes('BEAR') &&
        parseFloat(ticker.quoteVolume) > 100000 // Filter for active pairs (>100k USDT volume)
      );

      // Create coin mapping with CoinGecko IDs for proper logos
      const coinMapping: Record<string, { name: string; coingeckoId: string; rank: number }> = {
        'BTC': { name: 'Bitcoin', coingeckoId: 'bitcoin', rank: 1 },
        'ETH': { name: 'Ethereum', coingeckoId: 'ethereum', rank: 2 },
        'BNB': { name: 'BNB', coingeckoId: 'binancecoin', rank: 4 },
        'SOL': { name: 'Solana', coingeckoId: 'solana', rank: 5 },
        'XRP': { name: 'XRP', coingeckoId: 'ripple', rank: 6 },
        'DOGE': { name: 'Dogecoin', coingeckoId: 'dogecoin', rank: 8 },
        'ADA': { name: 'Cardano', coingeckoId: 'cardano', rank: 9 },
        'TRX': { name: 'TRON', coingeckoId: 'tron', rank: 10 },
        'AVAX': { name: 'Avalanche', coingeckoId: 'avalanche-2', rank: 11 },
        'TON': { name: 'TON', coingeckoId: 'the-open-network', rank: 12 },
        'SHIB': { name: 'Shiba Inu', coingeckoId: 'shiba-inu', rank: 13 },
        'DOT': { name: 'Polkadot', coingeckoId: 'polkadot', rank: 14 },
        'BCH': { name: 'Bitcoin Cash', coingeckoId: 'bitcoin-cash', rank: 15 },
        'LINK': { name: 'Chainlink', coingeckoId: 'chainlink', rank: 16 },
        'NEAR': { name: 'NEAR Protocol', coingeckoId: 'near', rank: 17 },
        'MATIC': { name: 'Polygon', coingeckoId: 'matic-network', rank: 18 },
        'UNI': { name: 'Uniswap', coingeckoId: 'uniswap', rank: 19 },
        'LTC': { name: 'Litecoin', coingeckoId: 'litecoin', rank: 20 },
        'PEPE': { name: 'Pepe', coingeckoId: 'pepe', rank: 21 },
        'ICP': { name: 'Internet Computer', coingeckoId: 'internet-computer', rank: 22 },
        'ETC': { name: 'Ethereum Classic', coingeckoId: 'ethereum-classic', rank: 23 },
        'APT': { name: 'Aptos', coingeckoId: 'aptos', rank: 24 },
        'SUI': { name: 'Sui', coingeckoId: 'sui', rank: 25 },
        'CRO': { name: 'Cronos', coingeckoId: 'crypto-com-chain', rank: 26 },
        'ATOM': { name: 'Cosmos', coingeckoId: 'cosmos', rank: 27 },
        'FIL': { name: 'Filecoin', coingeckoId: 'filecoin', rank: 28 },
        'OP': { name: 'Optimism', coingeckoId: 'optimism', rank: 29 },
        'INJ': { name: 'Injective Protocol', coingeckoId: 'injective-protocol', rank: 30 },
        'VET': { name: 'VeChain', coingeckoId: 'vechain', rank: 31 },
        'ARB': { name: 'Arbitrum', coingeckoId: 'arbitrum', rank: 32 },
        'TAO': { name: 'Bittensor', coingeckoId: 'bittensor', rank: 33 },
        'TIA': { name: 'Celestia', coingeckoId: 'celestia', rank: 34 },
        'STX': { name: 'Stacks', coingeckoId: 'blockstack', rank: 35 },
        'HBAR': { name: 'Hedera', coingeckoId: 'hedera-hashgraph', rank: 36 },
        'MNT': { name: 'Mantle', coingeckoId: 'mantle', rank: 37 },
        'IMX': { name: 'Immutable X', coingeckoId: 'immutable-x', rank: 38 },
        'POL': { name: 'Polygon Ecosystem Token', coingeckoId: 'polymath', rank: 39 },
        'ALGO': { name: 'Algorand', coingeckoId: 'algorand', rank: 40 },
        'AAVE': { name: 'Aave', coingeckoId: 'aave', rank: 41 },
        'WIF': { name: 'dogwifhat', coingeckoId: 'dogwifcoin', rank: 42 },
        'RENDER': { name: 'Render', coingeckoId: 'render-token', rank: 43 },
        'MKR': { name: 'Maker', coingeckoId: 'maker', rank: 44 },
        'GRT': { name: 'The Graph', coingeckoId: 'the-graph', rank: 45 },
        'OKB': { name: 'OKB', coingeckoId: 'okb', rank: 46 },
        'THETA': { name: 'Theta Network', coingeckoId: 'theta-token', rank: 47 },
        'RUNE': { name: 'THORChain', coingeckoId: 'thorchain', rank: 48 },
        'FTM': { name: 'Fantom', coingeckoId: 'fantom', rank: 49 },
        'SEI': { name: 'Sei', coingeckoId: 'sei-network', rank: 50 }
      };

      // Convert to our format
      const processedCoins: BinanceCoin[] = usdtPairs.map((ticker: any) => {
        const baseAsset = ticker.symbol.replace('USDT', '');
        const coinInfo = coinMapping[baseAsset];

        return {
          symbol: ticker.symbol,
          baseAsset: baseAsset,
          quoteAsset: 'USDT',
          name: coinInfo?.name || baseAsset,
          price: parseFloat(ticker.lastPrice),
          priceChangePercent: parseFloat(ticker.priceChangePercent),
          volume: parseFloat(ticker.volume) * parseFloat(ticker.lastPrice),
          marketCap: parseFloat(ticker.volume) * parseFloat(ticker.lastPrice) * 1000, // Rough estimate
          marketCapRank: coinInfo?.rank || 999,
          coingeckoId: coinInfo?.coingeckoId || baseAsset.toLowerCase()
        };
      });

      // Sort by market cap rank, then by volume
      const sortedCoins = processedCoins
        // .filter(coin => coin.marketCapRank < 200) // Allow all coins
        .sort((a, b) => {
          if (a.marketCapRank !== b.marketCapRank) {
            return a.marketCapRank - b.marketCapRank;
          }
          return b.volume - a.volume;
        })
        .slice(0, 500); // Limit to top 500

      setCoins(sortedCoins);
      setLoading(false);

    } catch (err) {
      console.error('Failed to fetch Binance coins:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoins();

    // Refresh every 10 minutes for better performance
    const interval = setInterval(fetchCoins, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    coins,
    loading,
    error,
    refetch: fetchCoins
  };
}

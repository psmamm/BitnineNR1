import { useState, useEffect } from 'react';

export interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

export interface CryptoCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap_rank: number;
  image: string;
}

// Top 100 crypto coins with trading symbols
export const TOP_CRYPTO_COINS = [
  { id: 'bitcoin', symbol: 'BTCUSDT', name: 'Bitcoin', rank: 1 },
  { id: 'ethereum', symbol: 'ETHUSDT', name: 'Ethereum', rank: 2 },
  { id: 'tether', symbol: 'USDCUSDT', name: 'Tether', rank: 3 },
  { id: 'binancecoin', symbol: 'BNBUSDT', name: 'BNB', rank: 4 },
  { id: 'solana', symbol: 'SOLUSDT', name: 'Solana', rank: 5 },
  { id: 'usd-coin', symbol: 'USDCUSDT', name: 'USDC', rank: 6 },
  { id: 'staked-ether', symbol: 'STETHUSDT', name: 'Lido Staked Ether', rank: 7 },
  { id: 'ripple', symbol: 'XRPUSDT', name: 'XRP', rank: 8 },
  { id: 'the-open-network', symbol: 'TONUSDT', name: 'Toncoin', rank: 9 },
  { id: 'dogecoin', symbol: 'DOGEUSDT', name: 'Dogecoin', rank: 10 },
  { id: 'cardano', symbol: 'ADAUSDT', name: 'Cardano', rank: 11 },
  { id: 'tron', symbol: 'TRXUSDT', name: 'TRON', rank: 12 },
  { id: 'avalanche-2', symbol: 'AVAXUSDT', name: 'Avalanche', rank: 13 },
  { id: 'wrapped-bitcoin', symbol: 'WBTCUSDT', name: 'Wrapped Bitcoin', rank: 14 },
  { id: 'shiba-inu', symbol: 'SHIBUSDT', name: 'Shiba Inu', rank: 15 },
  { id: 'chainlink', symbol: 'LINKUSDT', name: 'Chainlink', rank: 16 },
  { id: 'bitcoin-cash', symbol: 'BCHUSDT', name: 'Bitcoin Cash', rank: 17 },
  { id: 'polkadot', symbol: 'DOTUSDT', name: 'Polkadot', rank: 18 },
  { id: 'dai', symbol: 'DAIUSDT', name: 'Dai', rank: 19 },
  { id: 'polygon', symbol: 'MATICUSDT', name: 'Polygon', rank: 20 },
  { id: 'litecoin', symbol: 'LTCUSDT', name: 'Litecoin', rank: 21 },
  { id: 'wrapped-eeth', symbol: 'WEETHUSDT', name: 'Wrapped eETH', rank: 22 },
  { id: 'uniswap', symbol: 'UNIUSDT', name: 'Uniswap', rank: 23 },
  { id: 'near', symbol: 'NEARUSDT', name: 'NEAR Protocol', rank: 24 },
  { id: 'ethereum-classic', symbol: 'ETCUSDT', name: 'Ethereum Classic', rank: 25 },
  { id: 'internet-computer', symbol: 'ICPUSDT', name: 'Internet Computer', rank: 26 },
  { id: 'aptos', symbol: 'APTUSDT', name: 'Aptos', rank: 27 },
  { id: 'fetch-ai', symbol: 'FETUSDT', name: 'Fetch.ai', rank: 28 },
  { id: 'stellar', symbol: 'XLMUSDT', name: 'Stellar', rank: 29 },
  { id: 'crypto-com-chain', symbol: 'CROUSDT', name: 'Cronos', rank: 30 },
  { id: 'monero', symbol: 'XMRUSDT', name: 'Monero', rank: 31 },
  { id: 'okb', symbol: 'OKBUSDT', name: 'OKB', rank: 32 },
  { id: 'hedera-hashgraph', symbol: 'HBARUSDT', name: 'Hedera', rank: 33 },
  { id: 'arbitrum', symbol: 'ARBUSDT', name: 'Arbitrum', rank: 34 },
  { id: 'filecoin', symbol: 'FILUSDT', name: 'Filecoin', rank: 35 },
  { id: 'cosmos', symbol: 'ATOMUSDT', name: 'Cosmos Hub', rank: 36 },
  { id: 'maker', symbol: 'MKRUSDT', name: 'Maker', rank: 37 },
  { id: 'vechain', symbol: 'VETUSDT', name: 'VeChain', rank: 38 },
  { id: 'optimism', symbol: 'OPUSDT', name: 'Optimism', rank: 39 },
  { id: 'immutable-x', symbol: 'IMXUSDT', name: 'Immutable', rank: 40 },
  { id: 'the-graph', symbol: 'GRTUSDT', name: 'The Graph', rank: 41 },
  { id: 'injective-protocol', symbol: 'INJUSDT', name: 'Injective', rank: 42 },
  { id: 'thorchain', symbol: 'RUNEUSDT', name: 'THORChain', rank: 43 },
  { id: 'sei-network', symbol: 'SEIUSDT', name: 'Sei', rank: 44 },
  { id: 'first-digital-usd', symbol: 'FDUSDUSDT', name: 'First Digital USD', rank: 45 },
  { id: 'algorand', symbol: 'ALGOUSDT', name: 'Algorand', rank: 46 },
  { id: 'fantom', symbol: 'FTMUSDT', name: 'Fantom', rank: 47 },
  { id: 'aave', symbol: 'AAVEUSDT', name: 'Aave', rank: 48 },
  { id: 'flow', symbol: 'FLOWUSDT', name: 'Flow', rank: 49 },
  { id: 'theta-token', symbol: 'THETAUSDT', name: 'Theta Network', rank: 50 },
  { id: 'rocket-pool', symbol: 'RPLETH', name: 'Rocket Pool', rank: 51 },
  { id: 'bittensor', symbol: 'TAOUSDT', name: 'Bittensor', rank: 52 },
  { id: 'quant-network', symbol: 'QNTUSDT', name: 'Quant', rank: 53 },
  { id: 'elrond-erd-2', symbol: 'EGLDUSDT', name: 'MultiversX', rank: 54 },
  { id: 'sandbox', symbol: 'SANDUSDT', name: 'The Sandbox', rank: 55 },
  { id: 'axie-infinity', symbol: 'AXSUSDT', name: 'Axie Infinity', rank: 56 },
  { id: 'tezos', symbol: 'XTZUSDT', name: 'Tezos', rank: 57 },
  { id: 'eos', symbol: 'EOSUSDT', name: 'EOS', rank: 58 },
  { id: 'decentraland', symbol: 'MANAUSDT', name: 'Decentraland', rank: 59 },
  { id: 'iota', symbol: 'IOTAUSDT', name: 'IOTA', rank: 60 },
  { id: 'neo', symbol: 'NEOUSDT', name: 'Neo', rank: 61 },
  { id: 'kucoin-shares', symbol: 'KCSUSDT', name: 'KuCoin', rank: 62 },
  { id: 'frax-share', symbol: 'FXSUSDT', name: 'Frax Share', rank: 63 },
  { id: 'chiliz', symbol: 'CHZUSDT', name: 'Chiliz', rank: 64 },
  { id: 'render-token', symbol: 'RENDERUSDT', name: 'Render', rank: 65 },
  { id: 'mina-protocol', symbol: 'MINAUSDT', name: 'Mina', rank: 66 },
  { id: 'gala', symbol: 'GALAUSDT', name: 'Gala', rank: 67 },
  { id: 'synthetix-network-token', symbol: 'SNXUSDT', name: 'Synthetix', rank: 68 },
  { id: 'klaytn', symbol: 'KLAYUSDT', name: 'Klaytn', rank: 69 },
  { id: 'terra-luna', symbol: 'LUNAUSDT', name: 'Terra Luna Classic', rank: 70 },
  { id: 'helium', symbol: 'HNTUSDT', name: 'Helium', rank: 71 },
  { id: 'pancakeswap-token', symbol: 'CAKEUSDT', name: 'PancakeSwap', rank: 72 },
  { id: 'bitcoin-sv', symbol: 'BSVUSDT', name: 'Bitcoin SV', rank: 73 },
  { id: 'zcash', symbol: 'ZECUSDT', name: 'Zcash', rank: 74 },
  { id: 'dash', symbol: 'DASHUSDT', name: 'Dash', rank: 75 },
  { id: 'compound-governance-token', symbol: 'COMPUSDT', name: 'Compound', rank: 76 },
  { id: 'curve-dao-token', symbol: 'CRVUSDT', name: 'Curve DAO', rank: 77 },
  { id: 'enjincoin', symbol: 'ENJUSDT', name: 'Enjin Coin', rank: 78 },
  { id: 'zilliqa', symbol: 'ZILUSDT', name: 'Zilliqa', rank: 79 },
  { id: 'yearn-finance', symbol: 'YFIUSDT', name: 'yearn.finance', rank: 80 },
  { id: 'sushi', symbol: 'SUSHIUSDT', name: 'SushiSwap', rank: 81 },
  { id: 'basic-attention-token', symbol: 'BATUSDT', name: 'Basic Attention', rank: 82 },
  { id: '1inch', symbol: '1INCHUSDT', name: '1inch', rank: 83 },
  { id: 'loopring', symbol: 'LRCUSDT', name: 'Loopring', rank: 84 },
  { id: 'omg', symbol: 'OMGUSDT', name: 'OMG Network', rank: 85 },
  { id: 'qtum', symbol: 'QTUMUSDT', name: 'Qtum', rank: 86 },
  { id: 'waves', symbol: 'WAVESUSDT', name: 'Waves', rank: 87 },
  { id: 'icon', symbol: 'ICXUSDT', name: 'ICON', rank: 88 },
  { id: 'celsius-degree-token', symbol: 'CELUSDT', name: 'Celsius', rank: 89 },
  { id: 'skale', symbol: 'SKLUSDT', name: 'SKALE', rank: 90 },
  { id: 'balancer', symbol: 'BALUSDT', name: 'Balancer', rank: 91 },
  { id: 'storj', symbol: 'STORJUSDT', name: 'Storj', rank: 92 },
  { id: 'ankr', symbol: 'ANKRUSDT', name: 'Ankr', rank: 93 },
  { id: 'numeraire', symbol: 'NMRUSDT', name: 'Numeraire', rank: 94 },
  { id: 'band-protocol', symbol: 'BANDUSDT', name: 'Band Protocol', rank: 95 },
  { id: 'republic-protocol', symbol: 'RENUSDT', name: 'Ren', rank: 96 },
  { id: 'kava', symbol: 'KAVAUSDT', name: 'Kava', rank: 97 },
  { id: 'reserve-rights-token', symbol: 'RSRUSDT', name: 'Reserve Rights', rank: 98 },
  { id: 'lisk', symbol: 'LSKUSDT', name: 'Lisk', rank: 99 },
  { id: 'ontology', symbol: 'ONTUSDT', name: 'Ontology', rank: 100 }
];

export function useCryptoPrices() {
  const [prices, setPrices] = useState<Record<string, CryptoPrice>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = async (symbol: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use Binance API for real-time prices
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch price for ${symbol}`);
      }
      
      const data = await response.json();
      
      const priceData: CryptoPrice = {
        symbol: data.symbol,
        price: parseFloat(data.lastPrice),
        change24h: parseFloat(data.priceChangePercent),
        volume24h: parseFloat(data.volume)
      };
      
      setPrices(prev => ({
        ...prev,
        [symbol]: priceData
      }));
      
      return priceData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch price';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchMultiplePrices = async (symbols: string[]) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all symbols at once
      const promises = symbols.map(symbol => 
        fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      );
      
      const results = await Promise.all(promises);
      const newPrices: Record<string, CryptoPrice> = {};
      
      results.forEach((data, index) => {
        if (data) {
          const symbol = symbols[index];
          newPrices[symbol] = {
            symbol: data.symbol,
            price: parseFloat(data.lastPrice),
            change24h: parseFloat(data.priceChangePercent),
            volume24h: parseFloat(data.volume)
          };
        }
      });
      
      setPrices(prev => ({ ...prev, ...newPrices }));
      return newPrices;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch prices';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates using WebSocket (optional)
  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          const newPrices: Record<string, CryptoPrice> = {};
          
          data.forEach((ticker: any) => {
            if (prices[ticker.s] || TOP_CRYPTO_COINS.some(coin => coin.symbol === ticker.s)) {
              newPrices[ticker.s] = {
                symbol: ticker.s,
                price: parseFloat(ticker.c),
                change24h: parseFloat(ticker.P),
                volume24h: parseFloat(ticker.v)
              };
            }
          });
          
          if (Object.keys(newPrices).length > 0) {
            setPrices(prev => ({ ...prev, ...newPrices }));
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = () => {
      console.error('WebSocket connection error');
    };

    return () => {
      ws.close();
    };
  }, []);

  return {
    prices,
    loading,
    error,
    fetchPrice,
    fetchMultiplePrices
  };
}

// Hook to get current price for a specific symbol
export function useCryptoPrice(symbol: string) {
  const [price, setPrice] = useState<CryptoPrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;

    const fetchPrice = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch price for ${symbol}`);
        }
        
        const data = await response.json();
        
        setPrice({
          symbol: data.symbol,
          price: parseFloat(data.lastPrice),
          change24h: parseFloat(data.priceChangePercent),
          volume24h: parseFloat(data.volume)
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch price');
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    
    // Update every 30 seconds
    const interval = setInterval(fetchPrice, 30000);
    
    return () => clearInterval(interval);
  }, [symbol]);

  return { price, loading, error };
}

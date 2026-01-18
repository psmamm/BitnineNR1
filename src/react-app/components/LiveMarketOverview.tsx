import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart3, Activity, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";

interface LiveMarketOverviewProps {
  selectedCoin: string;
}

interface CoinData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
  high24h?: number;
  low24h?: number;
}

export default function LiveMarketOverview({ selectedCoin }: LiveMarketOverviewProps) {
  const [coinData, setCoinData] = useState<CoinData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoinData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Format symbol for Binance API
      const binanceSymbol = selectedCoin === 'BTC' ? 'BTCUSDT' : `${selectedCoin}USDT`;
      
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }
      
      const data = await response.json();
      
      setCoinData({
        symbol: selectedCoin,
        name: selectedCoin,
        price: parseFloat(data.lastPrice),
        change24h: parseFloat(data.priceChangePercent),
        volume24h: parseFloat(data.volume) * parseFloat(data.lastPrice),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice)
      });
      
    } catch (err) {
      console.error('Failed to fetch coin data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoinData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCoinData, 30000);
    return () => clearInterval(interval);
  }, [selectedCoin]);

  const formatPrice = (price: number): string => {
    if (price >= 1) {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `$${price.toFixed(6)}`;
    }
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000000) {
      return `$${(volume / 1000000000).toFixed(2)}B`;
    } else if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(2)}K`;
    }
    return `$${volume.toFixed(2)}`;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#1B1B1D] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-[#FCD535]/10 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-[#FCD535] animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-white">Live Market Overview</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-[#FCD535] rounded-full animate-pulse" />
            <span className="text-[#FCD535] text-sm font-medium">Loading...</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 bg-[#1B1B1D]/50 rounded-xl border border-[#2B2F36] animate-pulse">
              <div className="h-4 bg-white/10 rounded w-16 mb-2" />
              <div className="h-6 bg-white/10 rounded w-20 mb-1" />
              <div className="h-3 bg-white/10 rounded w-12" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (error || !coinData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-[#1B1B1D] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-[#F43F5E]/10 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-[#F43F5E]" />
          </div>
          <h3 className="text-lg font-semibold text-white">Live Market Overview</h3>
        </div>
        
        <div className="text-center py-8">
          <p className="text-[#F43F5E] mb-2">Failed to load market data</p>
          <p className="text-[#7F8C8D] text-sm">{error}</p>
          <button
            onClick={fetchCoinData}
            className="mt-4 px-4 py-2 bg-[#FCD535] hover:bg-[#FFE066] text-white rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-[#1B1B1D] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#FCD535]/10 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-[#FCD535]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Live Market Overview</h3>
            <p className="text-[#7F8C8D] text-sm">{coinData.name} ({coinData.symbol})</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-[#FCD535] rounded-full animate-pulse" />
          <span className="text-[#FCD535] text-sm font-medium">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Price */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-[#1B1B1D]/50 rounded-xl border border-[#2B2F36] hover:border-[#FCD535]/50 transition-colors"
        >
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="w-4 h-4 text-[#6B7280]" />
            <span className="text-[#7F8C8D] text-sm font-medium">Price</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatPrice(coinData.price)}</div>
          <div className={`flex items-center space-x-1 text-sm font-medium ${
            coinData.change24h >= 0 ? 'text-[#FCD535]' : 'text-[#F43F5E]'
          }`}>
            {coinData.change24h >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{coinData.change24h >= 0 ? '+' : ''}{coinData.change24h.toFixed(2)}%</span>
          </div>
        </motion.div>

        {/* 24h Volume */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 bg-[#1B1B1D]/50 rounded-xl border border-[#2B2F36] hover:border-[#FCD535]/50 transition-colors"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="w-4 h-4 text-[#6B7280]" />
            <span className="text-[#7F8C8D] text-sm font-medium">Volume 24h</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatVolume(coinData.volume24h)}</div>
          <div className="text-[#7F8C8D] text-sm">Trading volume</div>
        </motion.div>

        {/* 24h High */}
        {coinData.high24h && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-[#1B1B1D]/50 rounded-xl border border-[#2B2F36] hover:border-[#FCD535]/50 transition-colors"
          >
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[#FCD535]" />
              <span className="text-[#7F8C8D] text-sm font-medium">24h High</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatPrice(coinData.high24h)}</div>
            <div className="text-[#FCD535] text-sm">Daily high</div>
          </motion.div>
        )}

        {/* 24h Low */}
        {coinData.low24h && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="p-4 bg-[#1B1B1D]/50 rounded-xl border border-[#2B2F36] hover:border-[#FCD535]/50 transition-colors"
          >
            <div className="flex items-center space-x-2 mb-2">
              <TrendingDown className="w-4 h-4 text-[#F43F5E]" />
              <span className="text-[#7F8C8D] text-sm font-medium">24h Low</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatPrice(coinData.low24h)}</div>
            <div className="text-[#F43F5E] text-sm">Daily low</div>
          </motion.div>
        )}
      </div>

      <div className="mt-6 p-4 bg-[#FCD535]/5 border border-[#FCD535]/20 rounded-xl">
        <div className="text-center">
          <p className="text-[#FCD535] text-sm font-medium">
            Real-time data from Binance API
          </p>
          <p className="text-[#7F8C8D] text-xs mt-1">
            Updates every 30 seconds • Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}









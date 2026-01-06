import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  TrendingUp,
  TrendingDown,
  Clock,
  Volume2,
  BarChart3,
  Bell,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useCoinDetail } from "@/react-app/hooks/useCoinDetail";
import { useLanguageCurrency } from "@/react-app/contexts/LanguageCurrencyContext";
import CandlestickChart from "@/react-app/components/CandlestickChart";
import TradingViewWidget from "@/react-app/components/TradingViewWidget";

const CHART_INTERVALS = [
  { key: '1m', label: '1m' },
  { key: '5m', label: '5m' },
  { key: '15m', label: '15m' },
  { key: '1h', label: '1h' },
  { key: '4h', label: '4h' },
  { key: '1d', label: '1d' }
] as const;

export default function CoinDetailPage() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const { currency, convertCurrency } = useLanguageCurrency();
  const [conversionRate, setConversionRate] = useState<number>(1);
  const currencyCode = currency.split('-')[0];

  // Load conversion rate when currency changes
  useEffect(() => {
    const loadRate = async () => {
      if (currencyCode === 'USD') {
        setConversionRate(1);
      } else {
        const rate = await convertCurrency(1, 'USD');
        setConversionRate(rate);
      }
    };
    loadRate();
  }, [currency, currencyCode]);

  const {
    coinData,
    klineData,
    technicalIndicators,
    loading,
    wsConnected,
    loadKlines,
    refetch
  } = useCoinDetail(symbol || '');

  // UI state
  const [selectedInterval, setSelectedInterval] = useState<string>('1h');
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [chartType, setChartType] = useState<'tradingview' | 'candlestick'>('tradingview');
  const [showIndicators, setShowIndicators] = useState({
    sma7: false,
    sma25: false,
    sma99: false,
    ema20: true,
    ema50: true,
    rsi: false,
    macd: false
  });

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tradecircle-watchlist');
    if (saved) {
      setWatchlist(new Set(JSON.parse(saved)));
    }
  }, []);

  // Save watchlist to localStorage
  const saveWatchlist = (newWatchlist: Set<string>) => {
    setWatchlist(newWatchlist);
    localStorage.setItem('tradecircle-watchlist', JSON.stringify([...newWatchlist]));
  };

  // Toggle watchlist
  const toggleWatchlist = () => {
    if (!symbol) return;

    const newWatchlist = new Set(watchlist);

    if (newWatchlist.has(symbol)) {
      newWatchlist.delete(symbol);
    } else {
      newWatchlist.add(symbol);
    }

    saveWatchlist(newWatchlist);
  };

  // Load klines when interval changes
  useEffect(() => {
    if (symbol) {
      loadKlines(selectedInterval);
    }
  }, [selectedInterval, symbol, loadKlines]);

  // Format numbers with currency conversion
  const formatPrice = (price: string): string => {
    const num = parseFloat(price) * conversionRate;
    if (num >= 1) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    }).format(num);
  };

  const formatPercent = (percent: number | string | undefined): string => {
    if (percent === undefined || percent === null) return '—';
    const num = typeof percent === 'string' ? parseFloat(percent) : percent;
    if (isNaN(num)) return '—';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const getPercentColor = (percent: number | string | undefined): string => {
    if (percent === undefined || percent === null) return 'text-[#7F8C8D]';
    const num = typeof percent === 'string' ? parseFloat(percent) : percent;
    if (isNaN(num)) return 'text-[#7F8C8D]';
    return num >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]';
  };

  const formatVolume = (volume: string): string => {
    const num = parseFloat(volume);
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!symbol) {
    navigate('/markets');
    return null;
  }

  return (
    <DashboardLayout>
      {/* Global Content Container - max-width 1440px, centered with 24px gutters */}
      <div className="w-full max-w-[1440px] mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">

          {/* Top Header (Pair Bar) - Full Width, 96px height */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-12 bg-[#1E2232] rounded-2xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] h-24"
          >
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => navigate('/markets')}
                  className="w-10 h-10 bg-[#0D0F18]/50 border border-white/10 hover:border-[#6A3DF4]/50 rounded-xl flex items-center justify-center text-[#AAB0C0] hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[#6A3DF4]/10 rounded-xl flex items-center justify-center overflow-hidden">
                    <img
                      src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${coinData?.baseAsset.toLowerCase()}.png`}
                      alt={coinData?.baseAsset}
                      className="w-8 h-8 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<span class="text-[#BDC3C7] font-bold text-lg">${coinData?.baseAsset.slice(0, 2) || 'C'}</span>`;
                        }
                      }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <h1 className="text-2xl font-bold text-white">
                        {coinData?.baseAsset || symbol?.replace(/USDT|BTC|BNB|FDUSD|TUSD|USDC$/i, '')}
                      </h1>
                      <span className="text-[#7F8C8D]">/</span>
                      <span className="text-lg text-[#AAB0C0]">
                        {coinData?.quoteAsset || symbol?.replace(/^[A-Z]+/, '')}
                      </span>
                      <button
                        onClick={toggleWatchlist}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${watchlist.has(symbol)
                            ? 'text-[#F39C12] hover:text-[#E67E22] bg-[#F39C12]/10'
                            : 'text-[#7F8C8D] hover:text-[#AAB0C0] hover:bg-[#0D0F18]/50'
                          }`}
                      >
                        <Star className={`w-5 h-5 ${watchlist.has(symbol) ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {/* Price & Change Chips */}
                    {coinData && (
                      <div className="flex items-center space-x-2">
                        <div className="text-xl font-bold text-white">
                          {formatPrice(coinData.price)}
                        </div>
                        <div className={`px-2 py-1 rounded text-sm font-medium ${getPercentColor(coinData.priceChangePercent)} bg-current/10`}>
                          {formatPercent(coinData.priceChangePercent)} (24h)
                        </div>
                        {coinData.priceChangePercent1h !== undefined && (
                          <div className={`px-2 py-1 rounded text-xs font-medium ${getPercentColor(coinData.priceChangePercent1h)} bg-current/10`}>
                            {formatPercent(coinData.priceChangePercent1h)} (1h)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Live indicator */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#2ECC71] animate-pulse' : 'bg-[#E74C3C]'}`} />
                  <span className={`text-sm font-medium ${wsConnected ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                    {wsConnected ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>

                {/* Refresh button */}
                <button
                  onClick={refetch}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-[#0D0F18]/50 hover:bg-[#0D0F18]/70 border border-white/10 hover:border-[#6A3DF4]/50 text-[#AAB0C0] hover:text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Main Content - Full Width */}
          <div className="col-span-12 space-y-6">

            {/* Price Chart Card - min-height 420px */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1E2232] rounded-2xl p-4 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] min-h-[420px]"
            >
              <div className="flex items-center justify-between mb-4 h-10">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-6 h-6 text-[#6A3DF4]" />
                  <h2 className="text-xl font-semibold text-white">Price Chart</h2>

                  {/* Chart Type Selector */}
                  <div className="flex gap-1 ml-6">
                    <button
                      onClick={() => setChartType('tradingview')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${chartType === 'tradingview'
                          ? 'bg-[#6A3DF4] text-white'
                          : 'bg-[#0D0F18]/50 text-[#AAB0C0] hover:bg-[#0D0F18]/70 border border-white/10'
                        }`}
                    >
                      TradingView
                    </button>
                    <button
                      onClick={() => setChartType('candlestick')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${chartType === 'candlestick'
                          ? 'bg-[#6A3DF4] text-white'
                          : 'bg-[#0D0F18]/50 text-[#AAB0C0] hover:bg-[#0D0F18]/70 border border-white/10'
                        }`}
                    >
                      Candlestick
                    </button>
                  </div>
                </div>

                {/* Timeframe selector - only show for candlestick */}
                {chartType === 'candlestick' && (
                  <div className="flex gap-2">
                    {CHART_INTERVALS.map(interval => (
                      <button
                        key={interval.key}
                        onClick={() => setSelectedInterval(interval.key)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedInterval === interval.key
                            ? 'bg-[#6A3DF4] text-white'
                            : 'bg-[#0D0F18]/50 text-[#AAB0C0] hover:bg-[#0D0F18]/70 border border-white/10'
                          }`}
                      >
                        {interval.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Technical Indicators Toggle - only show for candlestick */}
              {chartType === 'candlestick' && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(showIndicators).map(([key, enabled]) => (
                    <button
                      key={key}
                      onClick={() => setShowIndicators(prev => ({ ...prev, [key]: !enabled }))}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${enabled
                          ? 'bg-[#6A3DF4]/20 text-[#6A3DF4] border border-[#6A3DF4]/30'
                          : 'bg-[#0D0F18]/50 text-[#7F8C8D] hover:text-[#AAB0C0] border border-white/10'
                        }`}
                    >
                      {key.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}

              <div className="bg-[#0D0F18]/30 rounded-xl overflow-hidden">
                {chartType === 'tradingview' ? (
                  <TradingViewWidget
                    symbol={symbol}
                    interval={selectedInterval === '1m' ? '1' : selectedInterval === '5m' ? '5' : selectedInterval === '15m' ? '15' : selectedInterval === '1h' ? '60' : selectedInterval === '4h' ? '240' : 'D'}
                    width="100%"
                    height={400}
                    theme="dark"
                    autosize={true}
                  />
                ) : (
                  <div className="p-4">
                    {loading && !klineData[selectedInterval] ? (
                      <div className="h-[320px] flex items-center justify-center">
                        <div className="text-center">
                          <RefreshCw className="w-8 h-8 text-[#6A3DF4] animate-spin mx-auto mb-3" />
                          <p className="text-[#7F8C8D]">Loading chart data...</p>
                        </div>
                      </div>
                    ) : klineData[selectedInterval] ? (
                      <CandlestickChart
                        data={klineData[selectedInterval]}
                        interval={selectedInterval}
                        technicalIndicators={technicalIndicators}
                        showIndicators={showIndicators}
                        width={800}
                        height={320}
                      />
                    ) : (
                      <div className="h-[320px] flex items-center justify-center">
                        <div className="text-center">
                          <BarChart3 className="w-12 h-12 text-[#7F8C8D] mx-auto mb-3" />
                          <p className="text-[#7F8C8D]">No chart data available</p>
                          <p className="text-[#AAB0C0] text-sm mt-1">Try a different interval</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Key Statistics - 4 equal-width mini-cards, min-height 88px */}
            {coinData && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-4 gap-4"
              >
                <div className="bg-[#1E2232] rounded-xl p-4 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-[#2ECC71]" />
                    <span className="text-[#7F8C8D] text-sm">24H High</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {formatPrice(coinData.highPrice)}
                  </div>
                </div>

                <div className="bg-[#1E2232] rounded-xl p-4 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingDown className="w-4 h-4 text-[#E74C3C]" />
                    <span className="text-[#7F8C8D] text-sm">24H Low</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {formatPrice(coinData.lowPrice)}
                  </div>
                </div>

                <div className="bg-[#1E2232] rounded-xl p-4 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-2 mb-2">
                    <Volume2 className="w-4 h-4 text-[#6A3DF4]" />
                    <span className="text-[#7F8C8D] text-sm">24H Volume</span>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {formatVolume(coinData.volume)} {coinData.baseAsset}
                  </div>
                  <div className="text-sm text-[#AAB0C0]">
                    {formatVolume(coinData.quoteVolume)} {coinData.quoteAsset}
                  </div>
                </div>

                <div className="bg-[#1E2232] rounded-xl p-4 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-4 h-4 text-[#AAB0C0]" />
                    <span className="text-[#7F8C8D] text-sm">Last Update</span>
                  </div>
                  <div className="text-lg font-bold text-white">
                    {formatTime(coinData.lastUpdateTime)}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Technical Indicators Card - min-height 120px */}
            {technicalIndicators && Object.keys(technicalIndicators).length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[#1E2232] rounded-xl p-4 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] min-h-[120px]"
              >
                <h4 className="text-md font-semibold text-white mb-4">Technical Indicators</h4>
                <div className="grid grid-cols-4 gap-4">
                  {technicalIndicators.rsi && (
                    <div className="text-center">
                      <div className="text-xs text-[#7F8C8D] mb-1">RSI (14)</div>
                      <div className={`font-semibold ${technicalIndicators.rsi > 70 ? 'text-[#E74C3C]' :
                          technicalIndicators.rsi < 30 ? 'text-[#2ECC71]' :
                            'text-[#AAB0C0]'
                        }`}>
                        {technicalIndicators.rsi.toFixed(1)}
                      </div>
                    </div>
                  )}

                  {technicalIndicators.ema20 && (
                    <div className="text-center">
                      <div className="text-xs text-[#7F8C8D] mb-1">EMA 20</div>
                      <div className="font-semibold text-[#9B59B6]">
                        {formatPrice(technicalIndicators.ema20.toString())}
                      </div>
                    </div>
                  )}

                  {technicalIndicators.ema50 && (
                    <div className="text-center">
                      <div className="text-xs text-[#7F8C8D] mb-1">EMA 50</div>
                      <div className="font-semibold text-[#3498DB]">
                        {formatPrice(technicalIndicators.ema50.toString())}
                      </div>
                    </div>
                  )}

                  {technicalIndicators.macd && (
                    <div className="text-center">
                      <div className="text-xs text-[#7F8C8D] mb-1">MACD</div>
                      <div className={`font-semibold ${technicalIndicators.macd.histogram > 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                        }`}>
                        {technicalIndicators.macd.macd.toFixed(4)}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Actions Section - Now integrated below charts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
            >
              <h3 className="text-lg font-semibold text-white mb-6">Quick Actions</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={toggleWatchlist}
                  className={`flex items-center justify-center space-x-3 px-6 py-4 rounded-xl font-medium transition-colors ${watchlist.has(symbol)
                      ? 'bg-[#F39C12]/10 text-[#F39C12] border border-[#F39C12]/30 hover:bg-[#F39C12]/20'
                      : 'bg-[#6A3DF4]/10 text-[#6A3DF4] border border-[#6A3DF4]/30 hover:bg-[#6A3DF4]/20'
                    }`}
                >
                  <Star className={`w-5 h-5 ${watchlist.has(symbol) ? 'fill-current' : ''}`} />
                  <span>{watchlist.has(symbol) ? 'Remove from Watchlist' : 'Add to Watchlist'}</span>
                </button>

                <button className="flex items-center justify-center space-x-3 px-6 py-4 bg-[#0D0F18]/50 text-[#AAB0C0] hover:text-white border border-white/10 hover:border-[#6A3DF4]/50 rounded-xl font-medium transition-colors">
                  <Bell className="w-5 h-5" />
                  <span>Set Price Alert</span>
                </button>

                <button
                  onClick={() => window.open('https://accounts.binance.com/register?ref=132056476', '_blank')}
                  className="flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] hover:from-[#5A2DE3] hover:to-[#7A4CFF] text-white rounded-xl font-medium transition-all"
                >
                  <ExternalLink className="w-5 h-5" />
                  <span>Trade on Binance</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

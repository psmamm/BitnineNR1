import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { 
  Coins,
  Hash,
  History,
  Newspaper,
  RefreshCw,
  DollarSign
} from "lucide-react";
import { useBitcoinData } from "@/react-app/hooks/useBitcoinData";
import { useState, useEffect } from "react";
import { Link } from "react-router";

export default function BitcoinHalvingPage() {
  const { bitcoinData, miningData, halvingData, loading, error, refetch } = useBitcoinData();
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Calculate countdown to next halving
  useEffect(() => {
    if (!halvingData) return;

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = halvingData.estimatedDate.getTime() - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setCountdown(prev => {
          // Only update if values actually changed to prevent unnecessary re-renders
          if (prev.days !== days || prev.hours !== hours || prev.minutes !== minutes || prev.seconds !== seconds) {
            return { days, hours, minutes, seconds };
          }
          return prev;
        });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [halvingData]);

  const halvingHistory = [
    {
      date: "November 28, 2012",
      block: 210000,
      rewardBefore: 50,
      rewardAfter: 25,
      priceAtHalving: 12.35,
      priceOneYearLater: 1037.53
    },
    {
      date: "July 9, 2016", 
      block: 420000,
      rewardBefore: 25,
      rewardAfter: 12.5,
      priceAtHalving: 650.53,
      priceOneYearLater: 2518.32
    },
    {
      date: "May 11, 2020",
      block: 630000,
      rewardBefore: 12.5,
      rewardAfter: 6.25,
      priceAtHalving: 8821.42,
      priceOneYearLater: 54259.33
    },
    {
      date: "April 20, 2024",
      block: 840000,
      rewardBefore: 6.25,
      rewardAfter: 3.125,
      priceAtHalving: 64000,
      priceOneYearLater: null // Still ongoing
    }
  ];

  const bitcoinNews = [
    {
      title: "Bitcoin Approaches Next Halving Event as Mining Activity Intensifies",
      source: "CoinDesk",
      timestamp: "2 hours ago",
      url: "#"
    },
    {
      title: "Institutional Bitcoin Holdings Hit New All-Time High",
      source: "CoinTelegraph", 
      timestamp: "4 hours ago",
      url: "#"
    },
    {
      title: "Bitcoin Network Hashrate Reaches Record Levels Ahead of Halving",
      source: "Bitcoin Magazine",
      timestamp: "6 hours ago", 
      url: "#"
    },
    {
      title: "Major Mining Pools Prepare for Bitcoin Halving Event",
      source: "Decrypt",
      timestamp: "8 hours ago",
      url: "#"
    },
    {
      title: "Bitcoin Price Analysis: Pre-Halving Market Dynamics",
      source: "CryptoSlate",
      timestamp: "12 hours ago",
      url: "#"
    }
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 text-[#6A3DF4] animate-spin" />
            <div className="text-white text-xl">Loading Bitcoin data...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-red-400 text-xl">Error loading Bitcoin data: {error}</div>
          <button
            onClick={refetch}
            className="flex items-center space-x-2 px-4 py-2 bg-[#6A3DF4] text-white rounded-lg hover:bg-[#5A2DE3] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* US Debt Button - Top Right */}
        <div className="flex justify-end mb-4">
          <Link
            to="/us-debt"
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-[#E74C3C] to-[#C0392B] text-white rounded-xl hover:from-[#C0392B] hover:to-[#A93226] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <DollarSign className="w-5 h-5" />
            <span className="font-semibold">US Debt</span>
          </Link>
        </div>
        {/* Hero Section - Bitcoin Halving Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1E2232] rounded-xl p-8 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        >
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-[#F7931A]/10 rounded-2xl flex items-center justify-center">
                <img
                  src="https://cryptologos.cc/logos/bitcoin-btc-logo.svg"
                  alt="Bitcoin"
                  className="w-10 h-10"
                  onError={(e) => {
                    // Fallback to Bitcoin symbol if image fails
                    const target = e.target as HTMLImageElement;
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<span class="text-[#F7931A] text-3xl font-bold">₿</span>';
                    }
                  }}
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Bitcoin Halving Hub
                </h1>
                <p className="text-[#AAB0C0] text-lg">
                  Live countdown to the next Bitcoin halving event
                </p>
              </div>
            </div>

            {/* Countdown Timer */}
            <div className="bg-[#0D0F18]/50 rounded-xl p-8 border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">Countdown to Next Halving</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                {[
                  { label: "Days", value: countdown.days },
                  { label: "Hours", value: countdown.hours },
                  { label: "Minutes", value: countdown.minutes },
                  { label: "Seconds", value: countdown.seconds }
                ].map((item, index) => (
                  <motion.div
                    key={item.label}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-center"
                  >
                    <motion.div 
                      key={item.value} // This ensures smooth animations when values change
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="text-5xl font-bold text-[#F7931A] mb-2"
                    >
                      {item.value.toString().padStart(2, '0')}
                    </motion.div>
                    <div className="text-[#7F8C8D] uppercase tracking-wide text-sm">
                      {item.label}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="space-y-3 text-[#AAB0C0]">
                <div className="text-lg">
                  <span className="text-[#7F8C8D]">Current Block:</span> 
                  <span className="text-white font-bold ml-2">
                    {halvingData ? halvingData.currentBlock.toLocaleString() : '...'}
                  </span>
                  <span className="text-[#7F8C8D] mx-2">/</span>
                  <span className="text-[#6A3DF4] font-bold">
                    {halvingData ? halvingData.nextHalvingBlock.toLocaleString() : '...'}
                  </span>
                </div>
                <div className="text-lg">
                  <span className="text-[#7F8C8D]">Estimated Halving Date:</span>
                  <span className="text-white font-bold ml-2">
                    {halvingData ? halvingData.estimatedDate.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '...'}
                  </span>
                </div>
                <div className="text-lg">
                  <span className="text-[#7F8C8D]">Block Reward:</span>
                  <span className="text-white font-bold ml-2">
                    {halvingData ? halvingData.currentReward : '...'} BTC
                  </span>
                  <span className="text-[#6A3DF4] mx-2">→</span>
                  <span className="text-[#F7931A] font-bold">
                    {halvingData ? halvingData.nextReward : '...'} BTC
                  </span>
                  <span className="text-[#7F8C8D] ml-2">after halving</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bitcoin Overview & Mining Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bitcoin Overview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Coins className="w-6 h-6 text-[#BDC3C7]" />
              <h2 className="text-xl font-semibold text-white">Bitcoin Overview</h2>
            </div>

            <div className="space-y-6">
              {/* Price */}
              <div className="bg-[#0D0F18]/30 rounded-xl p-4">
                <div className="text-[#7F8C8D] text-sm mb-1">Live Price</div>
                <div className="flex items-baseline space-x-3">
                  <span className="text-3xl font-bold text-white">
                    ${bitcoinData ? bitcoinData.bitcoin.usd.toLocaleString() : '...'}
                  </span>
                  {bitcoinData && (
                    <span className={`text-lg font-semibold ${
                      bitcoinData.bitcoin.usd_24h_change >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                    }`}>
                      {bitcoinData.bitcoin.usd_24h_change >= 0 ? '+' : ''}
                      {bitcoinData.bitcoin.usd_24h_change.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Market Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0D0F18]/30 rounded-xl p-4">
                  <div className="text-[#7F8C8D] text-sm">Market Cap</div>
                  <div className="text-lg font-bold text-white">
                    ${bitcoinData ? (bitcoinData.bitcoin.usd_market_cap / 1e12).toFixed(2) : '...'}T
                  </div>
                </div>
                <div className="bg-[#0D0F18]/30 rounded-xl p-4">
                  <div className="text-[#7F8C8D] text-sm">24h Volume</div>
                  <div className="text-lg font-bold text-white">
                    ${bitcoinData ? (bitcoinData.bitcoin.usd_24h_vol / 1e9).toFixed(2) : '...'}B
                  </div>
                </div>
              </div>

              {/* Supply Info */}
              <div className="bg-[#0D0F18]/30 rounded-xl p-4">
                <div className="text-[#7F8C8D] text-sm mb-2">Circulating Supply</div>
                <div className="text-lg font-bold text-white mb-3">
                  {miningData ? (miningData.circulation / 1e8).toFixed(0) : '...'} BTC
                </div>
                <div className="w-full bg-[#0D0F18] rounded-full h-2">
                  <div 
                    className="bg-[#6A3DF4] h-2 rounded-full transition-all duration-1000"
                    style={{ 
                      width: miningData ? `${((miningData.circulation / 1e8) / 21000000) * 100}%` : '0%' 
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[#7F8C8D] mt-2">
                  <span>{miningData ? ((miningData.circulation / 1e8) / 21000000 * 100).toFixed(1) : '...'}% of 21M</span>
                  <span>Max: 21,000,000 BTC</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Mining Data */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Hash className="w-6 h-6 text-[#BDC3C7]" />
              <h2 className="text-xl font-semibold text-white">Mining Data</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0D0F18]/30 rounded-xl p-4">
                <div className="text-[#7F8C8D] text-sm">Current Block Height</div>
                <div className="text-2xl font-bold text-white">
                  {miningData ? miningData.blocks.toLocaleString() : '...'}
                </div>
              </div>

              <div className="bg-[#0D0F18]/30 rounded-xl p-4">
                <div className="text-[#7F8C8D] text-sm">Blocks Until Halving</div>
                <div className="text-2xl font-bold text-[#F7931A]">
                  {halvingData ? halvingData.blocksUntilHalving.toLocaleString() : '...'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0D0F18]/30 rounded-xl p-4">
                  <div className="text-[#7F8C8D] text-sm">Avg Block Time</div>
                  <div className="text-lg font-bold text-white">
                    {miningData && miningData.avgBlockTime ? 
                      `${Math.round(miningData.avgBlockTime / 60)} min` : '10 min'}
                  </div>
                </div>
                <div className="bg-[#0D0F18]/30 rounded-xl p-4">
                  <div className="text-[#7F8C8D] text-sm">Difficulty</div>
                  <div className="text-lg font-bold text-white">
                    {miningData ? (miningData.difficulty / 1e12).toFixed(2) : '...'}T
                  </div>
                </div>
              </div>

              <div className="bg-[#0D0F18]/30 rounded-xl p-4">
                <div className="text-[#7F8C8D] text-sm">Network Hashrate</div>
                <div className="text-xl font-bold text-white">
                  {miningData ? (miningData.hashrate_24h / 1e18).toFixed(0) : '...'} EH/s
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Halving History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        >
          <div className="flex items-center space-x-3 mb-6">
            <History className="w-6 h-6 text-[#BDC3C7]" />
            <h2 className="text-xl font-semibold text-white">Halving History</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {halvingHistory.map((halving, index) => (
              <motion.div
                key={halving.block}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-[#0D0F18]/30 rounded-xl p-6 border border-white/5"
              >
                <div className="text-[#6A3DF4] font-semibold mb-3">
                  Halving {index + 1}
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-[#7F8C8D] text-xs">Date</div>
                    <div className="text-white font-semibold">{halving.date}</div>
                  </div>
                  <div>
                    <div className="text-[#7F8C8D] text-xs">Block</div>
                    <div className="text-white font-semibold">{halving.block.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[#7F8C8D] text-xs">Reward</div>
                    <div className="text-white font-semibold">
                      {halving.rewardBefore} → {halving.rewardAfter} BTC
                    </div>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="text-[#7F8C8D] text-xs">Price at Halving</div>
                    <div className="text-[#2ECC71] font-semibold">${halving.priceAtHalving.toLocaleString()}</div>
                  </div>
                  {halving.priceOneYearLater && (
                    <>
                      <div>
                        <div className="text-[#7F8C8D] text-xs">Price 1 Year Later</div>
                        <div className="text-[#F7931A] font-semibold">${halving.priceOneYearLater.toLocaleString()}</div>
                      </div>
                      <div className="pt-2">
                        <div className="text-xs text-[#7F8C8D]">ROI</div>
                        <div className="text-[#2ECC71] font-bold">
                          +{(((halving.priceOneYearLater - halving.priceAtHalving) / halving.priceAtHalving) * 100).toFixed(0)}%
                        </div>
                      </div>
                    </>
                  )}
                  {!halving.priceOneYearLater && (
                    <div className="pt-2">
                      <div className="text-xs text-[#7F8C8D]">Status</div>
                      <div className="text-[#F7931A] font-bold">Current Cycle</div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bitcoin News */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Newspaper className="w-6 h-6 text-[#BDC3C7]" />
            <h2 className="text-xl font-semibold text-white">Bitcoin News</h2>
          </div>

          <div className="space-y-4">
            {bitcoinNews.map((news, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * index }}
                className="bg-[#0D0F18]/30 rounded-xl p-4 border border-white/5 hover:border-[#6A3DF4]/20 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2 group-hover:text-[#6A3DF4] transition-colors">
                      {news.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-[#7F8C8D] text-sm">
                      <span>{news.source}</span>
                      <span>•</span>
                      <span>{news.timestamp}</span>
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-[#6A3DF4] rounded-full ml-4 mt-2" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

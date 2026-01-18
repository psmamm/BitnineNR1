import DashboardLayout from "@/react-app/components/DashboardLayout";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  BarChart3,
  ChevronRight,
  Zap,
  BookOpen,
  PieChart,
  Copy,
  Check,
  Eye,
  EyeOff
} from "lucide-react";
import { useTrades } from "@/react-app/hooks/useTrades";
import { motion } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { useLanguageCurrency } from "@/react-app/contexts/LanguageCurrencyContext";

// Bitget-Style Dashboard - Clean, Minimal, Professional
export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trades, loading } = useTrades();
  const { currency, convertCurrency } = useLanguageCurrency();
  const [conversionRate, setConversionRate] = useState<number>(1);
  const [copiedUID, setCopiedUID] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const currencyCode = currency.split('-')[0];

  // Generate UID
  const userUID = user?.email ?
    Math.abs(user.email.charCodeAt(0) * 12345678).toString().slice(0, 10) :
    "0000000000";

  const copyUID = () => {
    navigator.clipboard.writeText(userUID);
    setCopiedUID(true);
    setTimeout(() => setCopiedUID(false), 2000);
  };

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
  }, [currency, currencyCode, convertCurrency]);

  const formatCurrency = (amount: number): string => {
    const converted = amount * conversionRate;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };

  // Calculate metrics
  const metrics = useMemo(() => {
    const closedTrades = trades.filter(t => t.is_closed);
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losingTrades = closedTrades.filter(t => (t.pnl || 0) < 0);

    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl || 0), 0) / losingTrades.length) : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 999 : 0;

    const openTrades = trades.filter(t => !t.is_closed);

    return {
      totalPnl,
      winRate,
      profitFactor,
      totalTrades: trades.length,
      openTrades: openTrades.length,
      closedTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgWin,
      avgLoss
    };
  }, [trades]);

  // Get recent trades
  const recentTrades = useMemo(() => {
    return [...trades]
      .sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime())
      .slice(0, 5);
  }, [trades]);

  // Trader motivational quotes
  const traderQuotes = [
    "He who lives by the crystal ball will eat shattered glass. — Ray Dalio",
    "The goal of a successful trader is to make the best trades. Money is secondary. — Alexander Elder",
    "Risk comes from not knowing what you're doing. — Warren Buffett",
    "The market can remain irrational longer than you can remain solvent. — John Maynard Keynes",
    "In trading, as in life, the best opportunities come when others are fearful. — Unknown",
    "The most important thing is to preserve capital. — Paul Tudor Jones",
    "Cut your losses short and let your winners run. — Jesse Livermore",
    "The market is a voting machine in the short run, but a weighing machine in the long run. — Benjamin Graham",
    "Trading is 90% psychology and 10% methodology. — Unknown",
    "The best traders have no ego. — Mark Douglas",
    "Price action is the ultimate indicator. — Unknown",
    "Patience is not the ability to wait, but the ability to keep a good attitude while waiting. — Unknown",
    "The trend is your friend until the end when it bends. — Unknown",
    "Risk management is the most important aspect of trading. — Unknown",
    "Emotions are the enemy of trading. — Unknown",
    "The market doesn't care about your opinion. — Unknown",
    "Success in trading comes from discipline, not from being right. — Unknown",
    "The best trade is the one you don't take. — Unknown",
    "Focus on the process, not the outcome. — Unknown",
    "Trading is a marathon, not a sprint. — Unknown"
  ];

  // Get random motivational quote
  const [motivationalQuote] = useState(() => {
    return traderQuotes[Math.floor(Math.random() * traderQuotes.length)];
  });

  // Get time-based greeting with 3D icons
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    const userName = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Trader';
    
    if (hour >= 5 && hour < 12) {
      return { greeting: 'Good Morning', icon: '/icons/sun.png', userName };
    } else if (hour >= 12 && hour < 17) {
      return { greeting: 'Good Afternoon', icon: '/icons/sun-cloudy.png', userName };
    } else if (hour >= 17 && hour < 22) {
      return { greeting: 'Good Evening', icon: '/icons/moon.png', userName };
    } else {
      return { greeting: 'Good Night', icon: '/icons/moon.png', userName };
    }
  };

  const timeGreeting = getTimeBasedGreeting();

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

          {/* Welcome Header with 3D Icon */}
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              {timeGreeting.greeting}, {timeGreeting.userName}!
              <img 
                src={timeGreeting.icon} 
                alt="" 
                className="w-8 h-8 object-contain"
              />
            </h1>
            <p className="text-[#9CA3AF] text-sm">{motivationalQuote}</p>
          </div>

          {/* Bitget Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#2B2F36]">
                  {user?.photoURL?.startsWith('http') || user?.photoURL?.startsWith('data:') ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#252629] flex items-center justify-center">
                      <span className="text-[#9CA3AF] font-semibold text-xl">
                        {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {user?.displayName || user?.email?.split('@')[0] || 'Trader'}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#6B7280] text-sm">UID:</span>
                      <span className="text-[#9CA3AF] text-sm font-mono">{userUID}</span>
                      <button onClick={copyUID} className="p-1 hover:bg-[#252629] rounded transition-colors">
                        {copiedUID ? (
                          <Check className="w-3.5 h-3.5 text-[#FCD535]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-[#6B7280]" />
                        )}
                      </button>
                    </div>
                    <span className="px-2 py-0.5 bg-[#FCD535]/10 text-[#FCD535] text-xs font-medium rounded-full flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2 hover:bg-[#252629] rounded-lg transition-colors"
                >
                  {showBalance ? (
                    <Eye className="w-5 h-5 text-[#6B7280]" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-[#6B7280]" />
                  )}
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="px-4 py-2 bg-white text-[#151517] rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  My profile
                </button>
              </div>
            </div>
          </motion.div>

          {/* Bitget Stats Cards - With Circular Icon Backgrounds */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total P&L */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF] text-sm">Total P&L</span>
                <div className="w-10 h-10 rounded-full bg-[#FCD535]/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-[#FCD535]" />
                </div>
              </div>
              <div className={`text-2xl font-semibold mt-3 ${metrics.totalPnl >= 0 ? 'text-[#FCD535]' : 'text-[#F43F5E]'}`}>
                {loading ? '...' : showBalance ? formatCurrency(metrics.totalPnl) : '****'}
              </div>
              <div className="text-[#6B7280] text-sm mt-1">
                {metrics.closedTrades} closed trades
              </div>
            </motion.div>

            {/* Win Rate */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF] text-sm">Win Rate</span>
                <div className="w-10 h-10 rounded-full bg-[#FCD535]/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#FCD535]" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white mt-3">
                {loading ? '...' : `${metrics.winRate.toFixed(1)}%`}
              </div>
              <div className="text-[#6B7280] text-sm mt-1">
                {metrics.winningTrades}W / {metrics.losingTrades}L
              </div>
            </motion.div>

            {/* Profit Factor */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF] text-sm">Profit Factor</span>
                <div className="w-10 h-10 rounded-full bg-[#FCD535]/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#FCD535]" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white mt-3">
                {loading ? '...' : metrics.profitFactor.toFixed(2)}
              </div>
              <div className="text-[#6B7280] text-sm mt-1">
                Risk/Reward
              </div>
            </motion.div>

            {/* Open Positions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF] text-sm">Open Positions</span>
                <div className="w-10 h-10 rounded-full bg-[#FCD535]/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[#FCD535]" />
                </div>
              </div>
              <div className="text-2xl font-semibold text-white mt-3">
                {loading ? '...' : metrics.openTrades}
              </div>
              <div className="text-[#6B7280] text-sm mt-1">
                Active trades
              </div>
            </motion.div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Trades */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 bg-[#1B1B1D] rounded-xl border border-[#2B2F36]"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#2B2F36]">
                <h2 className="text-lg font-medium text-white">Recent Trades</h2>
                <button
                  onClick={() => navigate('/journal')}
                  className="text-sm text-[#FCD535] hover:text-[#FFE066] transition-colors flex items-center gap-1"
                >
                  View All
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center">
                  <div className="w-8 h-8 border-2 border-[#2B2F36] border-t-[#FCD535] rounded-full animate-spin mx-auto" />
                </div>
              ) : recentTrades.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-[#252629] rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-[#6B7280]" />
                  </div>
                  <h3 className="text-white font-medium mb-2">No trades yet</h3>
                  <p className="text-[#9CA3AF] text-sm mb-4">Start tracking your trades to see your performance</p>
                  <button
                    onClick={() => navigate('/journal')}
                    className="px-4 py-2 bg-[#FCD535] text-[#151517] rounded-lg font-medium hover:bg-[#FFE066] transition-colors"
                  >
                    Add Your First Trade
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#2B2F36]">
                  {recentTrades.map((trade) => (
                    <div key={trade.id} className="p-4 flex items-center justify-between hover:bg-[#252629] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          trade.direction === 'long' ? 'bg-[#FCD535]/10' : 'bg-[#F43F5E]/10'
                        }`}>
                          {trade.direction === 'long' ? (
                            <TrendingUp className="w-5 h-5 text-[#FCD535]" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-[#F43F5E]" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{trade.symbol}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              trade.direction === 'long'
                                ? 'bg-[#FCD535]/10 text-[#FCD535]'
                                : 'bg-[#F43F5E]/10 text-[#F43F5E]'
                            }`}>
                              {trade.direction.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[#6B7280] text-sm">{trade.entry_date}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {trade.is_closed && trade.pnl !== null ? (
                          <div className={`font-semibold ${(trade.pnl ?? 0) >= 0 ? 'text-[#FCD535]' : 'text-[#F43F5E]'}`}>
                            {(trade.pnl ?? 0) >= 0 ? '+' : ''}{showBalance ? formatCurrency(trade.pnl ?? 0) : '****'}
                          </div>
                        ) : (
                          <span className="px-2 py-1 bg-[#FCD535]/10 text-[#FCD535] text-xs font-medium rounded">
                            Open
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="space-y-6"
            >
              {/* Performance Summary */}
              <div className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5">
                <h3 className="text-lg font-medium text-white mb-4">Performance</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF] text-sm">Avg. Win</span>
                    <span className="text-[#FCD535] font-medium">{showBalance ? formatCurrency(metrics.avgWin) : '****'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF] text-sm">Avg. Loss</span>
                    <span className="text-[#F43F5E] font-medium">{showBalance ? formatCurrency(metrics.avgLoss) : '****'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#9CA3AF] text-sm">R:R Ratio</span>
                    <span className="text-white font-medium">
                      {metrics.avgLoss > 0 ? (metrics.avgWin / metrics.avgLoss).toFixed(2) : '∞'}:1
                    </span>
                  </div>
                  <div className="pt-3 border-t border-[#2B2F36]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#9CA3AF] text-sm">Total Trades</span>
                      <span className="text-white font-medium">{metrics.totalTrades}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5">
                <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/journal')}
                    className="w-full flex items-center gap-3 p-3 bg-[#252629] rounded-lg hover:bg-[#222226] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FCD535]/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-[#FCD535]" />
                    </div>
                    <div>
                      <span className="text-white font-medium block">Trade Journal</span>
                      <span className="text-[#6B7280] text-xs">View & manage trades</span>
                    </div>
                  </button>
                  <button
                    onClick={() => navigate('/reports')}
                    className="w-full flex items-center gap-3 p-3 bg-[#252629] rounded-lg hover:bg-[#222226] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FCD535]/10 flex items-center justify-center">
                      <PieChart className="w-5 h-5 text-[#FCD535]" />
                    </div>
                    <div>
                      <span className="text-white font-medium block">Analytics</span>
                      <span className="text-[#6B7280] text-xs">Performance reports</span>
                    </div>
                  </button>
                  <button
                    onClick={() => navigate('/strategies')}
                    className="w-full flex items-center gap-3 p-3 bg-[#252629] rounded-lg hover:bg-[#222226] transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#FCD535]/10 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-[#FCD535]" />
                    </div>
                    <div>
                      <span className="text-white font-medium block">Strategies</span>
                      <span className="text-[#6B7280] text-xs">Manage playbooks</span>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

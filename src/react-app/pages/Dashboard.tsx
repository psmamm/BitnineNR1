import DashboardLayout from "@/react-app/components/DashboardLayout";
import StatCard from "@/react-app/components/StatCard";
import RecentTrades from "@/react-app/components/RecentTrades";
import QuickActions from "@/react-app/components/QuickActions";
import EquityChart from "@/react-app/components/EquityChart";
import QuickAddTradeModal from "@/react-app/components/dashboard/QuickAddTradeModal";
import RiskLockdownOverlay from "@/react-app/components/dashboard/RiskLockdownOverlay";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router";
import {
  TrendingUp,
  DollarSign,
  Target,
  Activity,
  Trophy,
  BarChart3,
  PieChart,
  Calendar,
  Sun,
  Moon,
  Eye,
  Plus
} from "lucide-react";
import { useTrades } from "@/react-app/hooks/useTrades";
import { motion } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { useLanguageCurrency } from "@/react-app/contexts/LanguageCurrencyContext";
import { useTheme } from "@/react-app/contexts/ThemeContext";
import { getCardBg, getCardBorder, getTextColor, getHoverBg } from "@/react-app/utils/themeUtils";
import { Button } from "@/react-app/components/ui/button";
import { DashboardGrid } from "@/react-app/components/dashboard/DashboardGrid";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { trades, loading } = useTrades();
  const { currency, convertCurrency } = useLanguageCurrency();
  const { theme } = useTheme();
  
  // State for QuickAddTradeModal
  const [isQuickAddOpen, setQuickAddOpen] = useState(false);
  const [, setRefreshKey] = useState(0); // Zum Neuladen der User-Daten
  
  // State for currency conversion rate
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
  }, [currency, currencyCode, convertCurrency]);

  // Format currency values
  const formatCurrency = (amount: number): string => {
    const converted = amount * conversionRate;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };

  // Calculate trading metrics
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
    const todaysTrades = trades.filter(t => {
      const today = new Date().toISOString().split('T')[0];
      return t.entry_date === today;
    });

    // Calculate month-over-month changes based on real data
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const prev30Days = new Date();
    prev30Days.setDate(prev30Days.getDate() - 60);

    const currentPeriodTrades = closedTrades.filter(t => {
      const date = new Date(t.exit_date || t.entry_date);
      return date >= last30Days;
    });

    const previousPeriodTrades = closedTrades.filter(t => {
      const date = new Date(t.exit_date || t.entry_date);
      return date >= prev30Days && date < last30Days;
    });

    const calculateMetricsForSet = (tradeSet: typeof trades) => {
      if (tradeSet.length === 0) return { pnl: 0, winRate: 0, profitFactor: 0 };
      const wins = tradeSet.filter(t => (t.pnl || 0) > 0);
      const losses = tradeSet.filter(t => (t.pnl || 0) < 0);

      const setPnl = tradeSet.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const setWinRate = (wins.length / tradeSet.length) * 100;

      const setAvgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length : 0;
      const setAvgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0) / losses.length) : 0;
      const setProfitFactor = setAvgLoss > 0 ? setAvgWin / setAvgLoss : (setAvgWin > 0 ? 1 : 0);

      return { pnl: setPnl, winRate: setWinRate, profitFactor: setProfitFactor };
    };

    const currentMetrics = calculateMetricsForSet(currentPeriodTrades);
    const prevMetrics = calculateMetricsForSet(previousPeriodTrades);

    // Calculate percent changes (if previous is 0, just show current as change or 0)
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current === 0 ? 0 : 100; // If started from 0, it's a 100% gain effectively (or treating as new)
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    const totalPnlChange = previousPeriodTrades.length > 0 ? calculateChange(currentMetrics.pnl, prevMetrics.pnl) : 0;
    const winRateChange = previousPeriodTrades.length > 0 ? currentMetrics.winRate - prevMetrics.winRate : 0; // Absolute % diff for rates
    const profitFactorChange = previousPeriodTrades.length > 0 ? currentMetrics.profitFactor - prevMetrics.profitFactor : 0; // Absolute diff for ratio

    return {
      totalPnl,
      totalPnlChange,
      winRate,
      winRateChange,
      profitFactor,
      profitFactorChange,
      totalTrades: trades.length,
      openTrades: openTrades.length,
      todaysTrades: todaysTrades.length,
      avgWin,
      avgLoss
    };
  }, [trades]);

  // Filter trades based on search query
  const filteredTrades = useMemo(() => {
    if (!searchQuery.trim()) return trades;

    const query = searchQuery.toLowerCase();
    return trades.filter(trade =>
      trade.symbol.toLowerCase().includes(query) ||
      (trade.notes && trade.notes.toLowerCase().includes(query)) ||
      (trade.tags && trade.tags.toLowerCase().includes(query)) ||
      (trade.strategy_name && trade.strategy_name.toLowerCase().includes(query))
    );
  }, [trades, searchQuery]);

  // Get time-based greeting and icon
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();

    if (hour >= 0 && hour < 12) {
      // Morning: 0-11
      return {
        greeting: 'Good morning',
        icon: Sun,
        iconColor: 'text-[#F39C12]',
        iconBg: 'bg-[#F39C12]/10'
      };
    } else if (hour >= 12 && hour < 18) {
      // Afternoon: 12-17
      return {
        greeting: 'Good afternoon',
        icon: Sun,
        iconColor: 'text-[#F39C12]',
        iconBg: 'bg-[#F39C12]/10'
      };
    } else {
      // Evening: 18-23
      return {
        greeting: 'Good evening',
        icon: Moon,
        iconColor: 'text-[#6A3DF4]',
        iconBg: 'bg-[#6A3DF4]/10'
      };
    }
  };

  const timeGreeting = getTimeBasedGreeting();

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <DashboardLayout>
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 space-y-3 sm:space-y-4">
        {/* Search Results or Welcome Header */}
        {searchQuery ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${getCardBg(theme)} rounded-xl p-4 border ${getCardBorder(theme)}`}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className={`text-lg sm:text-xl font-bold ${getTextColor(theme, 'primary')}`}>
                  Search results for "{searchQuery}"
                </h2>
                <p className={getTextColor(theme, 'muted')}>
                  {filteredTrades.length} {filteredTrades.length === 1 ? 'trade' : 'trades'} found
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setSearchQuery('')}
                className="bg-[#6A3DF4]/20 hover:bg-[#6A3DF4]/30 text-[#6A3DF4]"
              >
                Reset
              </Button>
            </div>

            {filteredTrades.length > 0 ? (
              <div className="space-y-3">
                {filteredTrades.slice(0, 5).map((trade) => (
                  <div key={trade.id} className={`flex items-center justify-between p-4 ${getCardBg(theme)} rounded-xl border ${getCardBorder(theme)} ${getHoverBg(theme)} transition-colors`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-[#6A3DF4]/10 rounded-xl flex items-center justify-center">
                        <span className={`${getTextColor(theme, 'secondary')} font-semibold`}>{trade.symbol}</span>
                      </div>
                      <div>
                        <h3 className={`${getTextColor(theme, 'primary')} font-medium`}>{trade.symbol}</h3>
                        <p className={`${getTextColor(theme, 'muted')} text-sm`}>
                          {trade.direction.toUpperCase()} • {trade.entry_date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {trade.is_closed && trade.pnl !== null ? (
                        <div className={`font-semibold ${(trade.pnl ?? 0) >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                          }`}>
                          {(trade.pnl ?? 0) >= 0 ? '+' : ''}{formatCurrency(trade.pnl ?? 0)}
                        </div>
                      ) : (
                        <span className="text-[#6A3DF4] text-sm font-medium">Open</span>
                      )}
                    </div>
                  </div>
                ))}
                {filteredTrades.length > 5 && (
                  <p className={`${getTextColor(theme, 'muted')} text-center pt-4`}>
                    And {filteredTrades.length - 5} more trades...
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className={getTextColor(theme, 'muted')}>No trades found</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${getCardBg(theme)} rounded-lg p-3 sm:p-4 border ${getCardBorder(theme)}`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${timeGreeting.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <timeGreeting.icon className={`w-5 h-5 ${timeGreeting.iconColor}`} />
                </div>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-bold ${getTextColor(theme, 'primary')}`}>
                    {timeGreeting.greeting}, {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Trader'}!
                  </h1>
                  <p className={`${getTextColor(theme, 'secondary')} text-xs sm:text-sm`}>
                    Here's your trading performance overview
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 lg:gap-6">
                <div className="text-center">
                  <div className={`text-xl sm:text-2xl font-bold ${getTextColor(theme, 'primary')}`}>{metrics.totalTrades}</div>
                  <div className={`${getTextColor(theme, 'muted')} text-[10px] sm:text-xs font-medium`}>Total Trades</div>
                </div>
                <div className={`w-px h-8 sm:h-10 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-[#6A3DF4]">{metrics.openTrades}</div>
                  <div className={`${getTextColor(theme, 'muted')} text-[10px] sm:text-xs font-medium`}>Open Positions</div>
                </div>
                <div className={`w-px h-8 sm:h-10 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />
                <div className="text-center">
                  <div className="text-xl sm:text-2xl font-bold text-[#2ECC71]">{metrics.todaysTrades}</div>
                  <div className={`${getTextColor(theme, 'muted')} text-[10px] sm:text-xs font-medium`}>Today's Trades</div>
                </div>
                <div className={`w-px h-8 sm:h-10 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`} />
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setQuickAddOpen(true)}
                  className="bg-[#6A3DF4] hover:bg-[#5A2DE4] shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  <span className="text-xs sm:text-sm">Add Trade</span>
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Draggable Dashboard Components */}
        <DashboardGrid storageKey="dashboard-layout" defaultOrder={['kpi-1', 'kpi-2', 'kpi-3', 'kpi-4']}>
          <motion.div key="kpi-1" variants={cardVariants}>
            <StatCard
              title="Total P&L"
              value={loading ? "..." : formatCurrency(metrics.totalPnl)}
              change={loading ? "N/A" : `${metrics.totalPnlChange.toFixed(1)}%`}
              changeType={metrics.totalPnlChange >= 0 ? 'positive' : 'negative'}
              icon={DollarSign}
              loading={loading}
              onClick={() => navigate('/reports')}
              subtitle={`${trades.filter(t => t.is_closed).length} closed trades`}
            />
          </motion.div>

          <motion.div key="kpi-2" variants={cardVariants}>
            <StatCard
              title="Win Rate"
              value={loading ? "..." : `${metrics.winRate.toFixed(1)}`}
              change={loading ? "N/A" : `${metrics.winRateChange.toFixed(1)}%`}
              changeType={metrics.winRateChange >= 0 ? 'positive' : 'negative'}
              icon={Target}
              loading={loading}
              onClick={() => navigate('/reports')}
              subtitle={`${trades.filter(t => t.is_closed && (t.pnl || 0) > 0).length} wins of ${trades.filter(t => t.is_closed).length}`}
            />
          </motion.div>

          <motion.div key="kpi-3" variants={cardVariants}>
            <StatCard
              title="Profit Factor"
              value={loading ? "..." : metrics.profitFactor.toFixed(2)}
              change={loading ? "N/A" : `${metrics.profitFactorChange.toFixed(2)}`}
              changeType={metrics.profitFactorChange >= 0 ? 'positive' : 'negative'}
              icon={TrendingUp}
              loading={loading}
              onClick={() => navigate('/reports')}
              subtitle="Risk/Reward ratio"
            />
          </motion.div>

          <motion.div key="kpi-4" variants={cardVariants}>
            <StatCard
              title="Active Trades"
              value={loading ? "..." : metrics.openTrades.toString()}
              change="N/A"
              changeType="positive"
              icon={Activity}
              loading={loading}
              onClick={() => navigate('/journal')}
              subtitle={metrics.openTrades > 0 ? 'Click to manage' : 'No open positions'}
              trend={[1, 3, 2, 5, 3, 2, metrics.openTrades]}
            />
          </motion.div>
        </DashboardGrid>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">
          {/* Equity Chart - Spans 8 columns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="xl:col-span-8"
          >
            <div className={`${getCardBg(theme)} rounded-lg p-3 sm:p-4 border ${getCardBorder(theme)} h-full`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#6A3DF4]/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[#6A3DF4]" />
                  </div>
                  <div>
                    <h2 className={`text-base sm:text-lg font-semibold ${getTextColor(theme, 'primary')}`}>Portfolio Performance</h2>
                    <p className={`${getTextColor(theme, 'muted')} text-[10px] sm:text-xs`}>30-day equity curve</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-[#6A3DF4] rounded-full" />
                    <span className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm`}>Portfolio Value</span>
                  </div>
                  <div className="px-2 sm:px-3 py-0.5 sm:py-1 bg-[#2ECC71]/10 text-[#2ECC71] text-[10px] sm:text-xs rounded-full font-medium">
                    Live
                  </div>
                </div>
              </div>
              <EquityChart />
            </div>
          </motion.div>

          {/* Right Column - Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="xl:col-span-4"
          >
            <QuickActions />
          </motion.div>
        </div>

        {/* Performance Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4"
        >
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/reports')}
            className={`${getCardBg(theme)} rounded-lg p-3 sm:p-4 border ${getCardBorder(theme)} h-full cursor-pointer ${getHoverBg(theme)} transition-all duration-300 group relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#2ECC71]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#2ECC71]/10 rounded-lg flex items-center justify-center group-hover:bg-[#2ECC71]/20 transition-colors">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-[#2ECC71]" />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold ${getTextColor(theme, 'primary')}`}>Performance Metrics</h3>
                    <p className={`${getTextColor(theme, 'muted')} text-[10px] sm:text-xs`}>Click for detailed analysis</p>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-[#2ECC71]" />
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <div className={`flex justify-between items-center p-2 sm:p-2.5 ${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} ${getHoverBg(theme)} transition-colors`}>
                  <span className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm font-medium`}>Avg Win</span>
                  <span className="text-[#2ECC71] font-semibold text-sm sm:text-base">{formatCurrency(metrics.avgWin)}</span>
                </div>
                <div className={`flex justify-between items-center p-2 sm:p-2.5 ${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} ${getHoverBg(theme)} transition-colors`}>
                  <span className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm font-medium`}>Avg Loss</span>
                  <span className="text-[#E74C3C] font-semibold text-sm sm:text-base">{formatCurrency(metrics.avgLoss)}</span>
                </div>
                <div className={`flex justify-between items-center p-2 sm:p-2.5 ${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} ${getHoverBg(theme)} transition-colors`}>
                  <span className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm font-medium`}>R:R Ratio</span>
                  <span className={`${getTextColor(theme, 'primary')} font-semibold text-sm sm:text-base`}>
                    {metrics.avgLoss > 0 ? (metrics.avgWin / metrics.avgLoss).toFixed(2) : '∞'}:1
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/journal')}
            className={`${getCardBg(theme)} rounded-lg p-3 sm:p-4 border ${getCardBorder(theme)} h-full cursor-pointer ${getHoverBg(theme)} transition-all duration-300 group relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#6A3DF4]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#6A3DF4]/10 rounded-lg flex items-center justify-center group-hover:bg-[#6A3DF4]/20 transition-colors">
                    <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-[#6A3DF4]" />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold ${getTextColor(theme, 'primary')}`}>Trade Distribution</h3>
                    <p className={`${getTextColor(theme, 'muted')} text-[10px] sm:text-xs`}>View your trade journal</p>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-[#6A3DF4]" />
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <div className={`flex justify-between items-center p-2 sm:p-2.5 ${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} ${getHoverBg(theme)} transition-colors`}>
                  <span className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm font-medium`}>Closed Trades</span>
                  <span className={`${getTextColor(theme, 'primary')} font-semibold text-sm sm:text-base`}>{trades.filter(t => t.is_closed).length}</span>
                </div>
                <div className={`flex justify-between items-center p-2 sm:p-2.5 ${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} ${getHoverBg(theme)} transition-colors`}>
                  <span className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm font-medium`}>Open Positions</span>
                  <span className="text-[#6A3DF4] font-semibold text-sm sm:text-base">{metrics.openTrades}</span>
                </div>
                <div className={`flex justify-between items-center p-2 sm:p-2.5 ${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} ${getHoverBg(theme)} transition-colors`}>
                  <span className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm font-medium`}>Win/Loss Ratio</span>
                  <span className={`${getTextColor(theme, 'primary')} font-semibold text-sm sm:text-base`}>
                    {trades.filter(t => t.is_closed && (t.pnl || 0) > 0).length}/
                    {trades.filter(t => t.is_closed && (t.pnl || 0) < 0).length}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/journal')}
            className={`${getCardBg(theme)} rounded-lg p-3 sm:p-4 border ${getCardBorder(theme)} h-full cursor-pointer ${getHoverBg(theme)} transition-all duration-300 group relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#F39C12]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#F39C12]/10 rounded-lg flex items-center justify-center group-hover:bg-[#F39C12]/20 transition-colors">
                    <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[#F39C12]" />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold ${getTextColor(theme, 'primary')}`}>Recent Activity</h3>
                    <p className={`${getTextColor(theme, 'muted')} text-[10px] sm:text-xs`}>Add new trades</p>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-[#F39C12]" />
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <div className={`flex justify-between items-center p-2 sm:p-2.5 ${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} ${getHoverBg(theme)} transition-colors`}>
                  <span className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm font-medium`}>This Week</span>
                  <span className={`${getTextColor(theme, 'primary')} font-semibold text-sm sm:text-base`}>
                    {trades.filter(t => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return new Date(t.entry_date) >= weekAgo;
                    }).length} trades
                  </span>
                </div>
                <div className={`flex justify-between items-center p-2 sm:p-2.5 ${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} ${getHoverBg(theme)} transition-colors`}>
                  <span className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm font-medium`}>Today</span>
                  <span className="text-[#F39C12] font-semibold text-sm sm:text-base">{metrics.todaysTrades} trades</span>
                </div>
                <div className={`flex justify-between items-center p-2 sm:p-2.5 ${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} ${getHoverBg(theme)} transition-colors`}>
                  <span className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm font-medium`}>Avg per Day</span>
                  <span className={`${getTextColor(theme, 'primary')} font-semibold text-sm sm:text-base`}>
                    {trades.length > 0 ? (trades.length / 30).toFixed(1) : '0'} trades
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Recent Trades */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <RecentTrades />
        </motion.div>
      </div>

      {/* Quick Add Trade Modal */}
      <QuickAddTradeModal
        isOpen={isQuickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSuccess={() => {
          // Trigger refresh of user data (PerformanceCard will update)
          setRefreshKey(prev => prev + 1);
        }}
      />

      {/* Risk Lockdown Overlay */}
      <RiskLockdownOverlay />
    </DashboardLayout>
  );
}

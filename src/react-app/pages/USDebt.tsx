import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { 
  DollarSign,
  TrendingUp,
  Users,
  Receipt,
  RefreshCw,
  ArrowLeft,
  Clock,
  Calendar,
  Baby,
  PiggyBank,
  Zap,
  Target
} from "lucide-react";
import { useUSDebt } from "@/react-app/hooks/useUSDebt";
import { Link } from "react-router";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { useState, useEffect } from "react";

interface ChartDataPoint {
  time: string;
  timestamp: number;
  debt: number;
  interest: number;
}

export default function USDebtPage() {
  const { debtData, loading, error, refetch } = useUSDebt();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Update chart data more frequently for smooth animations
  useEffect(() => {
    if (!debtData) return;

    const updateChart = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      setChartData(prev => {
        const newData = [...prev, {
          time: timeString,
          timestamp: now.getTime(),
          debt: debtData.nationalDebt / 1e12, // Convert to trillions
          interest: debtData.interestSincePageLoad / 1e6 // Convert to millions
        }];
        
        // Keep only last 60 data points (about 3 minutes of data)
        return newData.slice(-60);
      });
    };

    updateChart();
    const interval = setInterval(updateChart, 3000); // Update chart every 3 seconds

    return () => clearInterval(interval);
  }, [debtData?.nationalDebt]);

  // Precise number formatting with commas and decimals
  const formatFullNumber = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const formatPreciseNumber = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatCurrency = (amount: number, precise: boolean = false): string => {
    if (amount >= 1e12) {
      return precise 
        ? `$${(amount / 1e12).toFixed(6)} Trillion`
        : `$${(amount / 1e12).toFixed(3)}T`;
    } else if (amount >= 1e9) {
      return precise 
        ? `$${(amount / 1e9).toFixed(3)} Billion`
        : `$${(amount / 1e9).toFixed(2)}B`;
    } else if (amount >= 1e6) {
      return precise 
        ? `$${(amount / 1e6).toFixed(2)} Million`
        : `$${(amount / 1e6).toFixed(2)}M`;
    } else if (amount >= 1e3) {
      return `$${(amount / 1e3).toFixed(2)}K`;
    }
    return `$${precise ? formatPreciseNumber(amount) : amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-6 h-6 text-[#E74C3C] animate-spin" />
            <div className="text-white text-xl">Loading US Debt data...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-red-400 text-xl">Error loading US Debt data: {error}</div>
          <button
            onClick={refetch}
            className="flex items-center space-x-2 px-4 py-2 bg-[#E74C3C] text-white rounded-lg hover:bg-[#C0392B] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1E2232] border border-white/10 rounded-lg p-3 shadow-lg">
          <p className="text-[#7F8C8D] text-sm mb-1">{label}</p>
          <p className="text-[#2ECC71] font-semibold">
            Debt: ${payload[0].value.toFixed(6)}T
          </p>
          {payload[1] && (
            <p className="text-[#E74C3C] font-semibold">
              Interest: ${payload[1].value.toFixed(2)}M
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/bitcoin-halving"
            className="flex items-center space-x-2 px-4 py-2 bg-[#1E2232] text-[#AAB0C0] rounded-lg hover:bg-[#2A2F42] hover:text-white transition-all border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Bitcoin Halving</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[#2ECC71] rounded-full animate-pulse"></div>
              <span className="text-[#2ECC71] text-sm font-semibold">LIVE</span>
            </div>
            <div className="text-[#7F8C8D] text-sm">
              {debtData?.lastUpdated.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}.{String(debtData?.lastUpdated.getMilliseconds()).padStart(3, '0').slice(0, 2)}
            </div>
          </div>
        </div>

        {/* Hero Section - Main Debt Counter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1E2232] rounded-xl p-8 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        >
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-[#E74C3C]/10 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-10 h-10 text-[#E74C3C]" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  🇺🇸 Live US National Debt Clock
                </h1>
                <p className="text-[#AAB0C0] text-lg">
                  Real-time precision tracking • Updated every 50ms
                </p>
              </div>
            </div>

            {/* Main Debt Display */}
            <div className="bg-[#0D0F18]/50 rounded-xl p-8 border border-white/10">
              <div className="text-center mb-8">
                <div className="text-[#7F8C8D] text-xl mb-4 flex items-center justify-center space-x-3">
                  <div className="w-4 h-4 bg-[#2ECC71] rounded-full animate-pulse"></div>
                  <span>United States National Debt</span>
                  <div className="w-4 h-4 bg-[#2ECC71] rounded-full animate-pulse"></div>
                </div>
                
                <motion.div
                  key={Math.floor((debtData?.nationalDebt || 0) / 1000)}
                  initial={{ scale: 0.98 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="text-6xl lg:text-8xl font-bold text-[#2ECC71] mb-4 font-mono tracking-tight"
                >
                  ${formatFullNumber(debtData?.nationalDebt || 0)}
                </motion.div>
                
                <div className="text-[#AAB0C0] text-xl">
                  Precise amount: {formatCurrency(debtData?.nationalDebt || 0, true)}
                </div>
              </div>

              {/* Real-time Increases */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#1E2232] rounded-xl p-4 border border-white/5">
                  <div className="text-[#E74C3C] text-sm font-semibold mb-2 flex items-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <span>Per Second</span>
                  </div>
                  <motion.div
                    key={Math.floor(Date.now() / 1000)}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="text-2xl font-bold text-white font-mono"
                  >
                    ${formatPreciseNumber(debtData?.debtIncreasePerSecond || 0)}
                  </motion.div>
                </div>

                <div className="bg-[#1E2232] rounded-xl p-4 border border-white/5">
                  <div className="text-[#F39C12] text-sm font-semibold mb-2 flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Per Minute</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">
                    ${formatPreciseNumber(debtData?.debtIncreasePerMinute || 0)}
                  </div>
                </div>

                <div className="bg-[#1E2232] rounded-xl p-4 border border-white/5">
                  <div className="text-[#6A3DF4] text-sm font-semibold mb-2 flex items-center space-x-2">
                    <Clock className="w-4 h-4" />
                    <span>Per Hour</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {formatCurrency(debtData?.debtIncreasePerHour || 0)}
                  </div>
                </div>

                <div className="bg-[#1E2232] rounded-xl p-4 border border-white/5">
                  <div className="text-[#2ECC71] text-sm font-semibold mb-2 flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Per Day</span>
                  </div>
                  <div className="text-2xl font-bold text-white font-mono">
                    {formatCurrency(debtData?.debtIncreasePerDay || 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Since Page Load Counter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Target className="w-6 h-6 text-[#BDC3C7]" />
            <h2 className="text-xl font-semibold text-white">Since You Loaded This Page</h2>
            <div className="text-[#7F8C8D] text-sm">
              ({Math.floor((Date.now() - (debtData?.pageLoadTime.getTime() || 0)) / 1000)} seconds ago)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#0D0F18]/30 rounded-xl p-6">
              <div className="text-[#E74C3C] text-sm mb-2">Debt Increased By</div>
              <motion.div
                key={Math.floor((debtData?.debtSincePageLoad || 0) / 100)}
                initial={{ scale: 0.98 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="text-4xl font-bold text-[#E74C3C] font-mono"
              >
                ${formatPreciseNumber(debtData?.debtSincePageLoad || 0)}
              </motion.div>
            </div>

            <div className="bg-[#0D0F18]/30 rounded-xl p-6">
              <div className="text-[#F39C12] text-sm mb-2">Interest Accumulated</div>
              <motion.div
                key={Math.floor((debtData?.interestSincePageLoad || 0) / 100)}
                initial={{ scale: 0.98 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="text-4xl font-bold text-[#F39C12] font-mono"
              >
                ${formatPreciseNumber(debtData?.interestSincePageLoad || 0)}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Per Person Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Users className="w-6 h-6 text-[#BDC3C7]" />
              <h2 className="text-xl font-semibold text-white">Debt Per Person</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-[#0D0F18]/30 rounded-xl p-6">
                <div className="text-[#7F8C8D] text-sm mb-2 flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Per US Citizen</span>
                </div>
                <motion.div
                  key={Math.floor((debtData?.debtPerCitizen || 0) / 10)}
                  initial={{ scale: 0.98 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="text-3xl font-bold text-[#6A3DF4] font-mono"
                >
                  ${formatPreciseNumber(debtData?.debtPerCitizen || 0)}
                </motion.div>
                <div className="text-[#7F8C8D] text-sm mt-2">
                  Based on 340.5M citizens
                </div>
              </div>

              <div className="bg-[#0D0F18]/30 rounded-xl p-6">
                <div className="text-[#7F8C8D] text-sm mb-2 flex items-center space-x-2">
                  <Receipt className="w-4 h-4" />
                  <span>Per Taxpayer</span>
                </div>
                <motion.div
                  key={Math.floor((debtData?.debtPerTaxpayer || 0) / 10)}
                  initial={{ scale: 0.98 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="text-3xl font-bold text-[#E74C3C] font-mono"
                >
                  ${formatPreciseNumber(debtData?.debtPerTaxpayer || 0)}
                </motion.div>
                <div className="text-[#7F8C8D] text-sm mt-2">
                  Based on 160.2M taxpayers
                </div>
              </div>

              <div className="bg-[#0D0F18]/30 rounded-xl p-6">
                <div className="text-[#7F8C8D] text-sm mb-2 flex items-center space-x-2">
                  <Baby className="w-4 h-4" />
                  <span>Per Child (Under 18)</span>
                </div>
                <motion.div
                  key={Math.floor((debtData?.debtPerChild || 0) / 10)}
                  initial={{ scale: 0.98 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="text-3xl font-bold text-[#F39C12] font-mono"
                >
                  ${formatPreciseNumber(debtData?.debtPerChild || 0)}
                </motion.div>
                <div className="text-[#7F8C8D] text-sm mt-2">
                  Based on 73.1M children
                </div>
              </div>
            </div>
          </motion.div>

          {/* Live Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-center space-x-3 mb-6">
              <TrendingUp className="w-6 h-6 text-[#BDC3C7]" />
              <h2 className="text-xl font-semibold text-white">Live Debt & Interest Chart</h2>
            </div>

            <div className="bg-[#0D0F18]/30 rounded-xl p-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#7F8C8D"
                    fontSize={11}
                    interval="preserveStartEnd"
                    tick={{ fill: '#7F8C8D' }}
                  />
                  <YAxis 
                    yAxisId="debt"
                    orientation="left"
                    stroke="#2ECC71"
                    fontSize={11}
                    tick={{ fill: '#2ECC71' }}
                    tickFormatter={(value) => `$${value.toFixed(3)}T`}
                  />
                  <YAxis 
                    yAxisId="interest"
                    orientation="right"
                    stroke="#E74C3C"
                    fontSize={11}
                    tick={{ fill: '#E74C3C' }}
                    tickFormatter={(value) => `$${value.toFixed(1)}M`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    yAxisId="debt"
                    type="monotone" 
                    dataKey="debt" 
                    stroke="#2ECC71" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: '#2ECC71', strokeWidth: 2, fill: '#2ECC71' }}
                  />
                  <Line 
                    yAxisId="interest"
                    type="monotone" 
                    dataKey="interest" 
                    stroke="#E74C3C" 
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: '#E74C3C', strokeWidth: 2, fill: '#E74C3C' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-0.5 bg-[#2ECC71]"></div>
                  <span className="text-[#2ECC71] text-sm">Debt (Trillions)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-0.5 bg-[#E74C3C]"></div>
                  <span className="text-[#E74C3C] text-sm">Interest (Millions)</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-[#2ECC71] rounded-full animate-pulse"></div>
                <span className="text-[#2ECC71] text-sm font-semibold">LIVE</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Interest & Economic Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        >
          <div className="flex items-center space-x-3 mb-6">
            <PiggyBank className="w-6 h-6 text-[#BDC3C7]" />
            <h2 className="text-xl font-semibold text-white">Interest Payments & Economic Ratios</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#0D0F18]/30 rounded-xl p-4 border border-white/5">
              <div className="text-[#E74C3C] font-semibold mb-2">Interest Per Second</div>
              <motion.div
                key={Math.floor(Date.now() / 1000)}
                initial={{ scale: 0.98 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="text-2xl font-bold text-white mb-2 font-mono"
              >
                ${formatPreciseNumber(debtData?.interestPerSecond || 0)}
              </motion.div>
              <div className="text-[#7F8C8D] text-sm">
                Annual: {formatCurrency(debtData?.interestPerYear || 0)}
              </div>
            </div>

            <div className="bg-[#0D0F18]/30 rounded-xl p-4 border border-white/5">
              <div className="text-[#F39C12] font-semibold mb-2">Interest Per Day</div>
              <div className="text-2xl font-bold text-white mb-2 font-mono">
                {formatCurrency(debtData?.interestPerDay || 0)}
              </div>
              <div className="text-[#7F8C8D] text-sm">
                Daily interest burden
              </div>
            </div>

            <div className="bg-[#0D0F18]/30 rounded-xl p-4 border border-white/5">
              <div className="text-[#6A3DF4] font-semibold mb-2">Debt-to-GDP Ratio</div>
              <div className="text-2xl font-bold text-white mb-2 font-mono">
                {debtData?.debtToGDPRatio.toFixed(1)}%
              </div>
              <div className="text-[#7F8C8D] text-sm">
                Debt vs economic output
              </div>
            </div>

            <div className="bg-[#0D0F18]/30 rounded-xl p-4 border border-white/5">
              <div className="text-[#2ECC71] font-semibold mb-2">Interest-to-Revenue</div>
              <div className="text-2xl font-bold text-white mb-2 font-mono">
                {debtData?.interestToRevenueRatio.toFixed(1)}%
              </div>
              <div className="text-[#7F8C8D] text-sm">
                Interest vs federal revenue
              </div>
            </div>
          </div>
        </motion.div>

        {/* Annual Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        >
          <div className="flex items-center space-x-3 mb-6">
            <Receipt className="w-6 h-6 text-[#BDC3C7]" />
            <h2 className="text-xl font-semibold text-white">Annual Financial Overview</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#0D0F18]/30 rounded-xl p-4 border border-white/5">
              <div className="text-[#E74C3C] font-semibold mb-2">Debt Increase/Year</div>
              <div className="text-2xl font-bold text-white mb-2">
                {formatCurrency(debtData?.debtIncreasePerYear || 0)}
              </div>
              <div className="text-[#7F8C8D] text-sm">
                Annual debt growth
              </div>
            </div>

            <div className="bg-[#0D0F18]/30 rounded-xl p-4 border border-white/5">
              <div className="text-[#F39C12] font-semibold mb-2">Interest Payments</div>
              <div className="text-2xl font-bold text-white mb-2">
                {formatCurrency(debtData?.interestPerYear || 0)}
              </div>
              <div className="text-[#7F8C8D] text-sm">
                Annual interest cost
              </div>
            </div>

            <div className="bg-[#0D0F18]/30 rounded-xl p-4 border border-white/5">
              <div className="text-[#2ECC71] font-semibold mb-2">Federal Revenue</div>
              <div className="text-2xl font-bold text-white mb-2">$5.2T</div>
              <div className="text-[#7F8C8D] text-sm">
                Annual government income
              </div>
            </div>

            <div className="bg-[#0D0F18]/30 rounded-xl p-4 border border-white/5">
              <div className="text-[#6A3DF4] font-semibold mb-2">GDP (Annual)</div>
              <div className="text-2xl font-bold text-white mb-2">$28.7T</div>
              <div className="text-[#7F8C8D] text-sm">
                Total economic output
              </div>
            </div>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-[#E74C3C]/10 to-[#C0392B]/10 rounded-xl p-6 border border-[#E74C3C]/20"
        >
          <div className="text-center">
            <div className="text-[#E74C3C] text-lg font-semibold mb-2">
              ⚠️ Data Source & Accuracy
            </div>
            <p className="text-[#AAB0C0] text-sm leading-relaxed">
              This real-time debt tracker uses official U.S. Treasury data and current economic trends to provide 
              highly accurate estimates. Numbers update every 50 milliseconds for smooth real-time visualization. 
              Based on 2025 fiscal data including $36.8T base debt, $2.1T annual increase, and $1.2T annual interest payments.
              Population data: 340.5M citizens, 160.2M taxpayers, 73.1M children under 18.
            </p>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

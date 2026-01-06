import DashboardLayout from "@/react-app/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, TrendingDown, RefreshCw, BarChart3, PlayCircle } from 'lucide-react';
import { useReports } from '@/react-app/hooks/useReports';
import { useDataExport } from '@/react-app/hooks/useDataExport';
import { useTrades } from '@/react-app/hooks/useTrades';
import { useMonteCarlo } from '@/react-app/hooks/useMonteCarlo';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLanguageCurrency } from '@/react-app/contexts/LanguageCurrencyContext';

export default function ReportsPage() {
  const { monthlyData, strategyData, winLossData, periodStats, keyMetrics } = useReports();
  const { exportData } = useDataExport();
  const { trades } = useTrades(500);
  const monteCarlo = useMonteCarlo(trades);
  const { currency, convertCurrency } = useLanguageCurrency();
  const [conversionRate, setConversionRate] = useState<number>(1);
  const currencyCode = currency.split('-')[0];

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

  const formatCurrency = (amount: number): string => {
    const converted = amount * conversionRate;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };

  const [mcParams, setMcParams] = useState({
    runs: 500,
    pathLength: 50,
    startingBalance: 10000,
    maxDrawdownPct: 20
  });
  const [whatIfParams, setWhatIfParams] = useState({
    takeProfitAdjustmentPct: 10,
    stopLossAdjustmentPct: -10
  });

  const handleExportReport = async () => {
    await exportData({
      includeTrades: true,
      includeStrategies: true,
      includeSettings: false,
      format: 'json'
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1E2232] border border-white/10 rounded-lg p-3 shadow-lg">
          <p className="text-[#7F8C8D] text-sm mb-1">{label}</p>
          <p className="text-white font-semibold">
            {formatCurrency(payload[0].value || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1E2232] rounded-xl p-8 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4 mb-6 sm:mb-0">
              <div className="bg-[#6A3DF4]/10 p-3 rounded-xl">
                <BarChart3 className="w-8 h-8 text-[#BDC3C7]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Performance Reports</h1>
                <p className="text-[#AAB0C0]">Detailed analysis of your trading performance</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleExportReport}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white px-4 py-3 rounded-xl font-medium transition-all shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
              >
                <Download className="w-4 h-4" />
                <span>Export Report</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-[#1E2232] hover:bg-[#2A2F42] text-white px-4 py-3 rounded-xl font-medium transition-all border border-white/10 hover:border-white/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <div className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
            <h3 className="text-[#7F8C8D] text-sm font-medium mb-2">Total P&L</h3>
            <p className={`text-2xl font-bold ${keyMetrics.totalPnl >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
              {keyMetrics.totalPnl >= 0 ? '+' : ''}${keyMetrics.totalPnl}
            </p>
            <div className="flex items-center space-x-1 mt-1">
              {keyMetrics.change.totalPnl >= 0 ? (
                <TrendingUp className="w-3 h-3 text-[#2ECC71]" />
              ) : (
                <TrendingDown className="w-3 h-3 text-[#E74C3C]" />
              )}
              <p className={`text-sm ${keyMetrics.change.totalPnl >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                {keyMetrics.change.totalPnl >= 0 ? '+' : ''}{keyMetrics.change.totalPnl.toFixed(1)}% this month
              </p>
            </div>
          </div>

          <div className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
            <h3 className="text-[#7F8C8D] text-sm font-medium mb-2">Win Rate</h3>
            <p className="text-2xl font-bold text-white">{keyMetrics.winRate}%</p>
            <div className="flex items-center space-x-1 mt-1">
              {keyMetrics.change.winRate >= 0 ? (
                <TrendingUp className="w-3 h-3 text-[#2ECC71]" />
              ) : (
                <TrendingDown className="w-3 h-3 text-[#E74C3C]" />
              )}
              <p className={`text-sm ${keyMetrics.change.winRate >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                {keyMetrics.change.winRate >= 0 ? '+' : ''}{keyMetrics.change.winRate.toFixed(1)}% vs last month
              </p>
            </div>
          </div>

          <div className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
            <h3 className="text-[#7F8C8D] text-sm font-medium mb-2">Avg Trade</h3>
            <p className={`text-2xl font-bold ${keyMetrics.avgTrade >= 0 ? 'text-white' : 'text-[#E74C3C]'}`}>
              {formatCurrency(keyMetrics.avgTrade)}
            </p>
            <div className="flex items-center space-x-1 mt-1">
              {keyMetrics.change.avgTrade >= 0 ? (
                <TrendingUp className="w-3 h-3 text-[#2ECC71]" />
              ) : (
                <TrendingDown className="w-3 h-3 text-[#E74C3C]" />
              )}
              <p className={`text-sm ${keyMetrics.change.avgTrade >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                {keyMetrics.change.avgTrade >= 0 ? '+' : ''}{formatCurrency(keyMetrics.change.avgTrade)} vs last month
              </p>
            </div>
          </div>

          <div className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
            <h3 className="text-[#7F8C8D] text-sm font-medium mb-2">Sharpe Ratio</h3>
            <p className="text-2xl font-bold text-white">{keyMetrics.sharpeRatio}</p>
            <p className={`text-sm mt-1 ${keyMetrics.sharpeRatio > 2 ? 'text-[#2ECC71]' :
                keyMetrics.sharpeRatio > 1 ? 'text-[#6A3DF4]' : 'text-[#E74C3C]'
              }`}>
              {keyMetrics.sharpeRatio > 2 ? 'Excellent' :
                keyMetrics.sharpeRatio > 1 ? 'Good' :
                  keyMetrics.sharpeRatio > 0 ? 'Poor' : 'Very Poor'}
            </p>
          </div>
        </motion.div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Monthly Performance</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#7F8C8D" fontSize={12} />
                  <YAxis stroke="#7F8C8D" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="profit"
                    fill="#6A3DF4"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Win Rate Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Win/Loss Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={winLossData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {winLossData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[#2ECC71] rounded-full"></div>
                <span className="text-[#AAB0C0] text-sm">Wins ({winLossData[0]?.value}%)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[#E74C3C] rounded-full"></div>
                <span className="text-[#AAB0C0] text-sm">Losses ({winLossData[1]?.value}%)</span>
              </div>
            </div>
          </motion.div>

          {/* Strategy Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Strategy Performance</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strategyData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#7F8C8D" fontSize={12} />
                  <YAxis dataKey="strategy" type="category" stroke="#7F8C8D" fontSize={12} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="profit"
                    fill="#6A3DF4"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Quant Sims */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          <div className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Monte Carlo Survival</h3>
                <p className="text-[#7F8C8D] text-sm">Probability of staying within drawdown cap</p>
              </div>
              <PlayCircle className="w-5 h-5 text-[#6A3DF4]" />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="text-[#AAB0C0] flex flex-col gap-1">
                Runs
                <input
                  type="number"
                  value={mcParams.runs}
                  onChange={(e) => setMcParams(prev => ({ ...prev, runs: parseInt(e.target.value || '0', 10) }))}
                  className="bg-[#0D0F18] border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </label>
              <label className="text-[#AAB0C0] flex flex-col gap-1">
                Path length
                <input
                  type="number"
                  value={mcParams.pathLength}
                  onChange={(e) => setMcParams(prev => ({ ...prev, pathLength: parseInt(e.target.value || '0', 10) }))}
                  className="bg-[#0D0F18] border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </label>
              <label className="text-[#AAB0C0] flex flex-col gap-1">
                Starting balance
                <input
                  type="number"
                  value={mcParams.startingBalance}
                  onChange={(e) => setMcParams(prev => ({ ...prev, startingBalance: parseFloat(e.target.value || '0') }))}
                  className="bg-[#0D0F18] border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </label>
              <label className="text-[#AAB0C0] flex flex-col gap-1">
                Max drawdown %
                <input
                  type="number"
                  value={mcParams.maxDrawdownPct}
                  onChange={(e) => setMcParams(prev => ({ ...prev, maxDrawdownPct: parseFloat(e.target.value || '0') }))}
                  className="bg-[#0D0F18] border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </label>
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => monteCarlo.simulate(mcParams)}
                className="bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Run simulation
              </button>
              <div className="text-xs text-[#7F8C8D]">{monteCarlo.closedTrades.length} closed trades</div>
            </div>
            {monteCarlo.monteResult && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-[#0D0F18] border border-white/10 rounded-lg p-3">
                  <div className="text-[#7F8C8D] text-xs">Survival Rate</div>
                  <div className="text-white text-xl font-bold">{monteCarlo.monteResult.survivalRate.toFixed(1)}%</div>
                </div>
                <div className="bg-[#0D0F18] border border-white/10 rounded-lg p-3">
                  <div className="text-[#7F8C8D] text-xs">Avg Ending Balance</div>
                  <div className="text-white text-xl font-bold">{formatCurrency(monteCarlo.monteResult.averageEndingBalance)}</div>
                </div>
                <div className="bg-[#0D0F18] border border-white/10 rounded-lg p-3">
                  <div className="text-[#7F8C8D] text-xs">Worst Drawdown</div>
                  <div className="text-white text-xl font-bold">{monteCarlo.monteResult.worstDrawdownPct.toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#1E2232] rounded-xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">What-If Scenarios</h3>
                <p className="text-[#7F8C8D] text-sm">Adjust TP/SL to see equity impact</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="text-[#AAB0C0] flex flex-col gap-1">
                Take Profit %+Δ
                <input
                  type="number"
                  value={whatIfParams.takeProfitAdjustmentPct}
                  onChange={(e) => setWhatIfParams(prev => ({ ...prev, takeProfitAdjustmentPct: parseFloat(e.target.value || '0') }))}
                  className="bg-[#0D0F18] border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </label>
              <label className="text-[#AAB0C0] flex flex-col gap-1">
                Stop Loss %+Δ
                <input
                  type="number"
                  value={whatIfParams.stopLossAdjustmentPct}
                  onChange={(e) => setWhatIfParams(prev => ({ ...prev, stopLossAdjustmentPct: parseFloat(e.target.value || '0') }))}
                  className="bg-[#0D0F18] border border-white/10 rounded-lg px-3 py-2 text-white"
                />
              </label>
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => monteCarlo.runWhatIf(whatIfParams)}
                className="bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Run what-if
              </button>
              <div className="text-xs text-[#7F8C8D]">{monteCarlo.closedTrades.length} closed trades</div>
            </div>
            {monteCarlo.whatIfResult && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-[#0D0F18] border border-white/10 rounded-lg p-3">
                  <div className="text-[#7F8C8D] text-xs">Adjusted P&L</div>
                  <div className="text-white text-xl font-bold">{formatCurrency(monteCarlo.whatIfResult.adjustedPnl)}</div>
                </div>
                <div className="bg-[#0D0F18] border border-white/10 rounded-lg p-3">
                  <div className="text-[#7F8C8D] text-xs">Current P&L</div>
                  <div className="text-white text-xl font-bold">{formatCurrency(monteCarlo.whatIfResult.totalPnl)}</div>
                </div>
                <div className="bg-[#0D0F18] border border-white/10 rounded-lg p-3">
                  <div className="text-[#7F8C8D] text-xs">Delta</div>
                  <div className={`text-xl font-bold ${monteCarlo.whatIfResult.delta >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                    {monteCarlo.whatIfResult.delta >= 0 ? '+' : ''}{formatCurrency(monteCarlo.whatIfResult.delta)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Detailed Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#1E2232] rounded-xl border border-white/5 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        >
          <div className="px-6 py-4 border-b border-white/5">
            <h3 className="text-xl font-semibold text-white">Performance Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1E2232]/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7F8C8D] uppercase tracking-wider">Period</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7F8C8D] uppercase tracking-wider">Trades</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7F8C8D] uppercase tracking-wider">Win Rate</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7F8C8D] uppercase tracking-wider hidden md:table-cell">Avg Win</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7F8C8D] uppercase tracking-wider hidden md:table-cell">Avg Loss</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#7F8C8D] uppercase tracking-wider">Total P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {periodStats.map((row, index) => (
                  <tr key={index} className="hover:bg-[#2A2F42]/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{row.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#AAB0C0]">{row.trades}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#AAB0C0]">{row.winRate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2ECC71] hidden md:table-cell">{row.avgWin}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#E74C3C] hidden md:table-cell">{row.avgLoss}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${row.pnl > 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                      }`}>
                      {row.pnl > 0 ? '+' : ''}{formatCurrency(row.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

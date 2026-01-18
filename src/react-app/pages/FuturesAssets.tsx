import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Wallet,
  Search,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
  RefreshCw,
  Link2,
  Link2Off,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router";
import { useLighter } from "@/react-app/hooks/useLighter";
import { useWallet } from "@/react-app/contexts/WalletContext";

export default function FuturesAssetsPage() {
  const navigate = useNavigate();
  const [hideBalances, setHideBalances] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get real data from Lighter DEX
  const { state, refreshAll, closePosition } = useLighter();
  const { lighter } = useWallet();

  // Real data from Lighter state
  const totalBalance = state.balance;
  const availableBalance = state.availableBalance;
  const unrealizedPnl = state.totalUnrealizedPnl;
  const realizedPnl = state.totalRealizedPnl;
  const marginRatio = state.balance > 0 ? (state.marginUsed / state.balance) * 100 : 0;

  // Map Lighter positions to display format
  const positions = state.positions.filter(pos =>
    pos.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
    setIsRefreshing(false);
  };

  const handleClosePosition = async (symbol: string) => {
    try {
      await closePosition(symbol);
    } catch (error) {
      console.error('Failed to close position:', error);
    }
  };

  const formatUSD = (value: number, showSign = false) => {
    if (hideBalances) return '****';
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    if (hideBalances) return '****';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getPnlColor = (value: number) => {
    if (value > 0) return 'text-[#10B981]';
    if (value < 0) return 'text-[#F43F5E]';
    return 'text-[#6B7280]';
  };

  const getMarginRatioColor = (ratio: number) => {
    if (ratio === 0) return 'text-[#6B7280]';
    if (ratio < 50) return 'text-[#10B981]';
    if (ratio < 80) return 'text-[#F59E0B]';
    return 'text-[#F43F5E]';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <Wallet className="w-7 h-7 text-[#8B5CF6]" />
              Futures Assets
              {state.isLoading && <Loader2 className="w-5 h-5 animate-spin text-[#6B7280]" />}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[#9CA3AF] text-sm">Manage your futures trading account</p>
              {lighter.isConnected ? (
                <span className="flex items-center gap-1 text-xs text-[#10B981]">
                  <Link2 className="w-3 h-3" />
                  Lighter Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-[#F59E0B]">
                  <Link2Off className="w-3 h-3" />
                  Not Connected
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 bg-[#1B1B1D] border border-[#2B2F36] hover:border-[#3A3E45] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/transfer')}
              className="px-4 py-2 bg-[#FCD535] hover:bg-[#FFE066] text-[#151517] rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <ArrowDownRight className="w-4 h-4" />
              Transfer In
            </button>
            <button
              onClick={() => navigate('/transfer')}
              className="px-4 py-2 bg-[#1B1B1D] border border-[#2B2F36] hover:border-[#3A3E45] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              Transfer Out
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Total Balance */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#9CA3AF] text-sm">Total Balance</span>
              <button onClick={() => setHideBalances(!hideBalances)}>
                {hideBalances ? (
                  <EyeOff className="w-4 h-4 text-[#6B7280] hover:text-white transition-colors" />
                ) : (
                  <Eye className="w-4 h-4 text-[#6B7280] hover:text-white transition-colors" />
                )}
              </button>
            </div>
            <div className="text-2xl font-semibold text-white">
              {formatUSD(totalBalance)}
            </div>
          </motion.div>

          {/* Available Balance */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#9CA3AF] text-sm">Available</span>
              <Info className="w-4 h-4 text-[#6B7280]" />
            </div>
            <div className="text-2xl font-semibold text-white">
              {formatUSD(availableBalance)}
            </div>
          </motion.div>

          {/* Unrealized PnL */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#9CA3AF] text-sm">Unrealized PnL</span>
              {unrealizedPnl !== 0 && (
                unrealizedPnl > 0 ? (
                  <TrendingUp className="w-4 h-4 text-[#10B981]" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-[#F43F5E]" />
                )
              )}
            </div>
            <div className={`text-2xl font-semibold ${getPnlColor(unrealizedPnl)}`}>
              {formatUSD(unrealizedPnl, true)}
            </div>
          </motion.div>

          {/* Realized PnL */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#9CA3AF] text-sm">Realized PnL (Today)</span>
            </div>
            <div className={`text-2xl font-semibold ${getPnlColor(realizedPnl)}`}>
              {formatUSD(realizedPnl, true)}
            </div>
          </motion.div>

          {/* Margin Ratio */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#9CA3AF] text-sm">Margin Ratio</span>
              {marginRatio >= 80 && <AlertTriangle className="w-4 h-4 text-[#F43F5E]" />}
            </div>
            <div className={`text-2xl font-semibold ${getMarginRatioColor(marginRatio)}`}>
              {marginRatio > 0 ? `${marginRatio.toFixed(2)}%` : '--'}
            </div>
            <div className="mt-2 h-1.5 bg-[#252629] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  marginRatio < 50 ? 'bg-[#10B981]' :
                  marginRatio < 80 ? 'bg-[#F59E0B]' :
                  marginRatio > 0 ? 'bg-[#F43F5E]' : 'bg-[#252629]'
                }`}
                style={{ width: `${Math.min(marginRatio, 100)}%` }}
              />
            </div>
          </motion.div>
        </div>

        {/* Open Positions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-[#2B2F36] flex items-center justify-between">
            <h3 className="text-white font-semibold">Open Positions</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 pl-10 pr-4 py-1.5 bg-[#252629] border border-[#2B2F36] rounded-lg text-white placeholder-[#6B7280] focus:border-[#FCD535] focus:outline-none text-sm"
              />
            </div>
          </div>

          {positions.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-[#6B7280] text-sm border-b border-[#2B2F36]">
                  <th className="text-left py-4 px-6 font-medium">Symbol</th>
                  <th className="text-right py-4 px-6 font-medium">Size</th>
                  <th className="text-right py-4 px-6 font-medium">Entry Price</th>
                  <th className="text-right py-4 px-6 font-medium">Mark Price</th>
                  <th className="text-right py-4 px-6 font-medium">Liq. Price</th>
                  <th className="text-right py-4 px-6 font-medium">Unrealized PnL</th>
                  <th className="text-center py-4 px-6 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position, index) => {
                  // Calculate PnL percentage based on margin used
                  const pnlPercent = position.marginUsed > 0
                    ? (position.unrealizedPnl / position.marginUsed) * 100
                    : 0;

                  return (
                    <motion.tr
                      key={position.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-[#2B2F36] last:border-b-0 hover:bg-[#252629]/50 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            position.side === 'long' ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#F43F5E]/20 text-[#F43F5E]'
                          }`}>
                            {position.leverage}x
                          </span>
                          <span className="text-white font-medium">{position.symbol}</span>
                          <span className={`text-xs ${position.side === 'long' ? 'text-[#10B981]' : 'text-[#F43F5E]'}`}>
                            {position.side.toUpperCase()}
                          </span>
                          <span className="text-[#6B7280] text-xs">
                            {position.marginMode}
                          </span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-6 text-white font-mono">
                        {position.size.toFixed(4)}
                      </td>
                      <td className="text-right py-4 px-6 text-[#9CA3AF] font-mono">
                        ${position.entryPrice.toLocaleString()}
                      </td>
                      <td className="text-right py-4 px-6 text-white font-mono">
                        ${position.markPrice.toLocaleString()}
                      </td>
                      <td className="text-right py-4 px-6 text-[#F43F5E] font-mono">
                        {position.liquidationPrice ? `$${position.liquidationPrice.toLocaleString()}` : '--'}
                      </td>
                      <td className="text-right py-4 px-6">
                        <div className={getPnlColor(position.unrealizedPnl)}>
                          <div className="font-mono">{formatUSD(position.unrealizedPnl, true)}</div>
                          <div className="text-xs">{formatPercent(pnlPercent)}</div>
                        </div>
                      </td>
                      <td className="text-center py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleClosePosition(position.symbol)}
                            className="px-3 py-1.5 text-[#FCD535] hover:bg-[#FCD535]/10 rounded text-sm font-medium transition-colors"
                          >
                            Close
                          </button>
                          <button className="px-3 py-1.5 text-[#9CA3AF] hover:text-white hover:bg-[#252629] rounded text-sm transition-colors">
                            TP/SL
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-[#252629] rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-[#6B7280]" />
              </div>
              <h3 className="text-white font-medium mb-2">No Open Positions</h3>
              <p className="text-[#6B7280] text-sm mb-4">
                Start trading to see your positions here
              </p>
              <button
                onClick={() => navigate('/trading/futures')}
                className="px-6 py-2.5 bg-[#FCD535] hover:bg-[#FFE066] text-[#151517] rounded-lg font-medium transition-colors"
              >
                Start Trading
              </button>
            </div>
          )}
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <h4 className="text-[#9CA3AF] text-sm mb-3">Trading Stats (30D)</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Total Trades</span>
                <span className="text-white font-medium">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Win Rate</span>
                <span className="text-white font-medium">--</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Total PnL</span>
                <span className="text-[#6B7280]">$0.00</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <h4 className="text-[#9CA3AF] text-sm mb-3">Risk Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Max Leverage</span>
                <span className="text-white font-medium">20x</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Position Mode</span>
                <span className="text-white font-medium">One-Way</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Margin Mode</span>
                <span className="text-white font-medium">Cross</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <h4 className="text-[#9CA3AF] text-sm mb-3">Fee Tier</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Maker Fee</span>
                <span className="text-white font-medium">0.02%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">Taker Fee</span>
                <span className="text-white font-medium">0.05%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">VIP Level</span>
                <span className="text-[#FCD535] font-medium">Standard</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}

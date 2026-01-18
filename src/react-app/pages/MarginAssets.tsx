import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import {
  Wallet,
  Search,
  Eye,
  EyeOff,
  ArrowDownRight,
  AlertTriangle,
  Info,
  RefreshCw,
  Link2,
  Link2Off,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router";
import { useMultiExchangePortfolio } from "@/react-app/hooks/useMultiExchangePortfolio";
import { useExchangeConnections } from "@/react-app/hooks/useExchangeConnections";

interface MarginAsset {
  symbol: string;
  name: string;
  totalBalance: number;
  available: number;
  borrowed: number;
  interest: number;
  usdValue: number;
  price: number;
  exchange?: string;
}

export default function MarginAssetsPage() {
  const navigate = useNavigate();
  const [hideSmallBalances, setHideSmallBalances] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get real data from exchange connections
  const { portfolio, loading: portfolioLoading, refresh: refreshPortfolio } = useMultiExchangePortfolio();
  const { connections, loading: connectionsLoading, refetch: refetchConnections } = useExchangeConnections();

  // Calculate margin metrics from exchange portfolio
  const totalEquity = portfolio.totalEquityUsd;
  const totalDebt = portfolio.exchanges.reduce((sum, e) => sum + e.usedMarginUsd, 0);
  const marginLevel = totalDebt > 0 ? (totalEquity / totalDebt) * 100 : 0;
  const marginRatio = totalEquity > 0 ? (totalDebt / totalEquity) * 100 : 0;

  // Build margin assets from exchange data
  const assets: MarginAsset[] = useMemo(() => {
    return portfolio.exchanges
      .filter(exchange => exchange.isConnected && exchange.totalEquityUsd > 0)
      .map(exchange => ({
        symbol: 'USD',
        name: `${exchange.exchange} Margin`,
        totalBalance: exchange.totalEquityUsd,
        available: exchange.availableMarginUsd,
        borrowed: exchange.usedMarginUsd,
        interest: 0, // Would come from API
        usdValue: exchange.totalEquityUsd,
        price: 1,
        exchange: exchange.exchange,
      }));
  }, [portfolio]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refreshPortfolio(),
      refetchConnections(),
    ]);
    setIsRefreshing(false);
  };

  const connectedExchanges = connections.filter(c => c.is_active);

  const filteredAssets = assets
    .filter(asset =>
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(asset => !hideSmallBalances || asset.usdValue >= 1);

  const formatBalance = (value: number) => {
    if (hideBalances) return '****';
    return value.toFixed(8);
  };

  const formatUSD = (value: number) => {
    if (hideBalances) return '****';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getMarginLevelColor = (level: number) => {
    if (level === 0) return 'text-[#6B7280]';
    if (level >= 200) return 'text-[#10B981]';
    if (level >= 150) return 'text-[#F59E0B]';
    return 'text-[#F43F5E]';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <Wallet className="w-7 h-7 text-[#F59E0B]" />
              Margin Assets
              {(portfolioLoading || connectionsLoading) && <Loader2 className="w-5 h-5 animate-spin text-[#6B7280]" />}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[#9CA3AF] text-sm">Manage your margin trading account</p>
              {connectedExchanges.length > 0 ? (
                <span className="flex items-center gap-1 text-xs text-[#10B981]">
                  <Link2 className="w-3 h-3" />
                  {connectedExchanges.length} Exchange(s) Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-[#F59E0B]">
                  <Link2Off className="w-3 h-3" />
                  No Exchanges Connected
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
              className="px-4 py-2 bg-[#1B1B1D] border border-[#2B2F36] hover:border-[#3A3E45] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              Borrow
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Margin Level */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#9CA3AF] text-sm">Margin Level</span>
              <Info className="w-4 h-4 text-[#6B7280]" />
            </div>
            <div className={`text-2xl font-semibold ${getMarginLevelColor(marginLevel)}`}>
              {marginLevel > 0 ? `${marginLevel.toFixed(2)}%` : '--'}
            </div>
            <div className="mt-3 h-2 bg-[#252629] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  marginLevel >= 200 ? 'bg-[#10B981]' :
                  marginLevel >= 150 ? 'bg-[#F59E0B]' :
                  marginLevel > 0 ? 'bg-[#F43F5E]' : 'bg-[#252629]'
                }`}
                style={{ width: `${Math.min(marginLevel, 100)}%` }}
              />
            </div>
          </motion.div>

          {/* Total Equity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#9CA3AF] text-sm">Total Equity</span>
              <button onClick={() => setHideBalances(!hideBalances)}>
                {hideBalances ? (
                  <EyeOff className="w-4 h-4 text-[#6B7280] hover:text-white transition-colors" />
                ) : (
                  <Eye className="w-4 h-4 text-[#6B7280] hover:text-white transition-colors" />
                )}
              </button>
            </div>
            <div className="text-2xl font-semibold text-white">
              {formatUSD(totalEquity)}
            </div>
          </motion.div>

          {/* Total Debt */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#9CA3AF] text-sm">Total Debt</span>
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <div className="text-2xl font-semibold text-[#F43F5E]">
              {formatUSD(totalDebt)}
            </div>
          </motion.div>

          {/* Margin Ratio */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#9CA3AF] text-sm">Margin Ratio</span>
              <Info className="w-4 h-4 text-[#6B7280]" />
            </div>
            <div className="text-2xl font-semibold text-white">
              {marginRatio > 0 ? `${marginRatio.toFixed(2)}%` : '--'}
            </div>
          </motion.div>
        </div>

        {/* Warning Banner */}
        {marginLevel > 0 && marginLevel < 150 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-[#F43F5E] flex-shrink-0" />
            <div>
              <span className="text-[#F43F5E] font-medium">Liquidation Warning!</span>
              <p className="text-[#9CA3AF] text-sm">
                Your margin level is below 150%. Add more collateral or reduce your borrowed amount to avoid liquidation.
              </p>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 bg-[#1B1B1D] border border-[#2B2F36] rounded-lg text-white placeholder-[#6B7280] focus:border-[#FCD535] focus:outline-none text-sm"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideSmallBalances}
              onChange={(e) => setHideSmallBalances(e.target.checked)}
              className="w-4 h-4 rounded border-[#2B2F36] bg-[#1B1B1D] text-[#FCD535] focus:ring-[#FCD535] focus:ring-offset-0"
            />
            <span className="text-[#9CA3AF] text-sm">Hide small balances</span>
          </label>
        </div>

        {/* Assets Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] overflow-hidden"
        >
          <table className="w-full">
            <thead>
              <tr className="text-[#6B7280] text-sm border-b border-[#2B2F36]">
                <th className="text-left py-4 px-6 font-medium">Asset</th>
                <th className="text-right py-4 px-6 font-medium">Total</th>
                <th className="text-right py-4 px-6 font-medium">Available</th>
                <th className="text-right py-4 px-6 font-medium">Borrowed</th>
                <th className="text-right py-4 px-6 font-medium">Interest</th>
                <th className="text-right py-4 px-6 font-medium">USD Value</th>
                <th className="text-center py-4 px-6 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset, index) => (
                <motion.tr
                  key={asset.symbol}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="border-b border-[#2B2F36] last:border-b-0 hover:bg-[#252629]/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#252629] flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{asset.symbol.slice(0, 2)}</span>
                      </div>
                      <div>
                        <span className="text-white font-medium">{asset.symbol}</span>
                        <span className="text-[#6B7280] text-sm ml-2">{asset.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-4 px-6 text-white font-mono">
                    {formatBalance(asset.totalBalance)}
                  </td>
                  <td className="text-right py-4 px-6 text-[#9CA3AF] font-mono">
                    {formatBalance(asset.available)}
                  </td>
                  <td className="text-right py-4 px-6 text-[#F59E0B] font-mono">
                    {formatBalance(asset.borrowed)}
                  </td>
                  <td className="text-right py-4 px-6 text-[#F43F5E] font-mono">
                    {formatBalance(asset.interest)}
                  </td>
                  <td className="text-right py-4 px-6 text-white">
                    {formatUSD(asset.usdValue)}
                  </td>
                  <td className="text-center py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      <button className="px-3 py-1.5 text-[#FCD535] hover:bg-[#FCD535]/10 rounded text-sm font-medium transition-colors">
                        Borrow
                      </button>
                      <button className="px-3 py-1.5 text-[#9CA3AF] hover:text-white hover:bg-[#252629] rounded text-sm transition-colors">
                        Repay
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filteredAssets.length === 0 && (
            <div className="py-12 text-center">
              {assets.length === 0 ? (
                <>
                  <Wallet className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
                  <h3 className="text-white font-medium mb-2">No Margin Accounts</h3>
                  <p className="text-[#6B7280] text-sm mb-4">
                    Connect an exchange with margin trading to see your margin assets
                  </p>
                  <button
                    onClick={() => navigate('/settings')}
                    className="px-4 py-2 bg-[#FCD535] hover:bg-[#FFE066] text-[#151517] rounded-lg font-medium transition-colors"
                  >
                    Connect Exchange
                  </button>
                </>
              ) : (
                <>
                  <Search className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
                  <h3 className="text-white font-medium mb-2">No assets found</h3>
                  <p className="text-[#6B7280] text-sm">Try adjusting your search or filters</p>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

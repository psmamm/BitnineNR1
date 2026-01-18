import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import {
  Wallet,
  Search,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  TrendingUp,
  Link2,
  Link2Off,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router";
import { useWallet } from "@/react-app/contexts/WalletContext";
import { useMultiExchangePortfolio } from "@/react-app/hooks/useMultiExchangePortfolio";
import { useLighter } from "@/react-app/hooks/useLighter";

interface Asset {
  symbol: string;
  name: string;
  balance: number;
  available: number;
  inOrders: number;
  usdValue: number;
  price: number;
  change24h: number;
  source: 'wallet' | 'exchange' | 'lighter';
}

// Price estimates for display (would come from price feed in production)
const PRICES: Record<string, { price: number; change24h: number; name: string }> = {
  ETH: { price: 3450, change24h: 2.5, name: 'Ethereum' },
  BTC: { price: 97500, change24h: 1.8, name: 'Bitcoin' },
  SOL: { price: 195, change24h: 5.8, name: 'Solana' },
  USDC: { price: 1, change24h: 0, name: 'USD Coin' },
  USDT: { price: 1, change24h: 0, name: 'Tether' },
  BNB: { price: 710, change24h: 1.5, name: 'BNB' },
  MATIC: { price: 0.85, change24h: 3.2, name: 'Polygon' },
  AVAX: { price: 42, change24h: -0.5, name: 'Avalanche' },
  OP: { price: 2.8, change24h: 4.1, name: 'Optimism' },
  ARB: { price: 1.2, change24h: 2.3, name: 'Arbitrum' },
};

export default function SpotAssetsPage() {
  const navigate = useNavigate();
  const [hideSmallBalances, setHideSmallBalances] = useState(false);
  const [hideBalances, setHideBalances] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get real data from wallet, exchanges, and Lighter
  const { wallet, refreshBalance } = useWallet();
  const { portfolio, loading: portfolioLoading, refresh: refreshPortfolio } = useMultiExchangePortfolio();
  const { state: lighterState, refreshAll: refreshLighter } = useLighter();

  // Aggregate assets from all sources
  const assets: Asset[] = useMemo(() => {
    const assetList: Asset[] = [];

    // Add wallet native token (ETH, SOL, BNB based on chain)
    if (wallet.isConnected && wallet.balance) {
      const balance = parseFloat(wallet.balance);
      let symbol = 'ETH';
      let chainName = 'Ethereum';

      if (wallet.chain === 'solana') {
        symbol = 'SOL';
        chainName = 'Solana';
      } else if (wallet.chain === 'bsc') {
        symbol = 'BNB';
        chainName = 'BNB Chain';
      } else if (wallet.chain === 'polygon') {
        symbol = 'MATIC';
        chainName = 'Polygon';
      } else if (wallet.chain === 'avalanche') {
        symbol = 'AVAX';
        chainName = 'Avalanche';
      } else if (wallet.chain === 'arbitrum') {
        symbol = 'ETH';
        chainName = 'Arbitrum';
      } else if (wallet.chain === 'optimism') {
        symbol = 'ETH';
        chainName = 'Optimism';
      }

      const priceInfo = PRICES[symbol] || { price: 0, change24h: 0, name: symbol };
      const usdValue = balance * priceInfo.price;

      assetList.push({
        symbol,
        name: `${priceInfo.name} (${chainName})`,
        balance,
        available: balance,
        inOrders: 0,
        usdValue,
        price: priceInfo.price,
        change24h: priceInfo.change24h,
        source: 'wallet',
      });
    }

    // Add Lighter USDC balance if connected
    if (lighterState.isConnected && lighterState.availableBalance > 0) {
      assetList.push({
        symbol: 'USDC',
        name: 'USD Coin (Lighter)',
        balance: lighterState.balance,
        available: lighterState.availableBalance,
        inOrders: lighterState.marginUsed,
        usdValue: lighterState.balance,
        price: 1,
        change24h: 0,
        source: 'lighter',
      });
    }

    // Add exchange balances
    portfolio.exchanges.forEach((exchange) => {
      if (exchange.isConnected && exchange.totalEquityUsd > 0) {
        assetList.push({
          symbol: 'USD',
          name: `${exchange.exchange} Balance`,
          balance: exchange.totalEquityUsd,
          available: exchange.availableMarginUsd,
          inOrders: exchange.usedMarginUsd,
          usdValue: exchange.totalEquityUsd,
          price: 1,
          change24h: 0,
          source: 'exchange',
        });
      }
    });

    return assetList;
  }, [wallet, portfolio, lighterState]);

  const totalBalance = assets.reduce((sum, asset) => sum + asset.usdValue, 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refreshBalance(),
      refreshPortfolio(),
      refreshLighter(),
    ]);
    setIsRefreshing(false);
  };

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
              <Wallet className="w-7 h-7 text-[#03AAC7]" />
              Spot Assets
              {portfolioLoading && <Loader2 className="w-5 h-5 animate-spin text-[#6B7280]" />}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[#9CA3AF] text-sm">Manage your spot trading wallet</p>
              {wallet.isConnected ? (
                <span className="flex items-center gap-1 text-xs text-[#10B981]">
                  <Link2 className="w-3 h-3" />
                  Wallet Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-[#F59E0B]">
                  <Link2Off className="w-3 h-3" />
                  No Wallet
                </span>
              )}
              {portfolio.exchanges.some(e => e.isConnected) && (
                <span className="flex items-center gap-1 text-xs text-[#10B981]">
                  <Link2 className="w-3 h-3" />
                  {portfolio.exchanges.filter(e => e.isConnected).length} Exchange(s)
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
              onClick={() => navigate('/deposit')}
              className="px-4 py-2 bg-[#03AAC7] hover:bg-[#26BFD4] text-[#151517] rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <ArrowDownRight className="w-4 h-4" />
              Deposit
            </button>
            <button
              onClick={() => navigate('/withdraw')}
              className="px-4 py-2 bg-[#1B1B1D] border border-[#2B2F36] hover:border-[#3A3E45] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              Withdraw
            </button>
          </div>
        </div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[#9CA3AF]">Total Balance</span>
              <button onClick={() => setHideBalances(!hideBalances)}>
                {hideBalances ? (
                  <EyeOff className="w-4 h-4 text-[#6B7280] hover:text-white transition-colors" />
                ) : (
                  <Eye className="w-4 h-4 text-[#6B7280] hover:text-white transition-colors" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#6B7280]">
              {assets.filter(a => a.source === 'wallet').length > 0 && (
                <span className="px-2 py-1 bg-[#252629] rounded">Wallet</span>
              )}
              {assets.filter(a => a.source === 'exchange').length > 0 && (
                <span className="px-2 py-1 bg-[#252629] rounded">Exchange</span>
              )}
              {assets.filter(a => a.source === 'lighter').length > 0 && (
                <span className="px-2 py-1 bg-[#252629] rounded">Lighter</span>
              )}
            </div>
          </div>
          <div className="text-3xl font-semibold text-white mb-1">
            {formatUSD(totalBalance)}
          </div>
          <div className="text-[#6B7280] text-sm">
            {hideBalances ? '****' : `≈ ${(totalBalance / 97500).toFixed(8)} BTC`}
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 bg-[#1B1B1D] border border-[#2B2F36] rounded-lg text-white placeholder-[#6B7280] focus:border-[#03AAC7] focus:outline-none text-sm"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideSmallBalances}
              onChange={(e) => setHideSmallBalances(e.target.checked)}
              className="w-4 h-4 rounded border-[#2B2F36] bg-[#1B1B1D] text-[#03AAC7] focus:ring-[#03AAC7] focus:ring-offset-0"
            />
            <span className="text-[#9CA3AF] text-sm">Hide small balances</span>
          </label>
        </div>

        {/* Assets Table */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] overflow-hidden"
        >
          <table className="w-full">
            <thead>
              <tr className="text-[#6B7280] text-sm border-b border-[#2B2F36]">
                <th className="text-left py-4 px-6 font-medium">Asset</th>
                <th className="text-right py-4 px-6 font-medium">Total Balance</th>
                <th className="text-right py-4 px-6 font-medium">Available</th>
                <th className="text-right py-4 px-6 font-medium">In Orders</th>
                <th className="text-right py-4 px-6 font-medium">USD Value</th>
                <th className="text-right py-4 px-6 font-medium">24h Change</th>
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
                    {formatBalance(asset.balance)}
                  </td>
                  <td className="text-right py-4 px-6 text-[#9CA3AF] font-mono">
                    {formatBalance(asset.available)}
                  </td>
                  <td className="text-right py-4 px-6 text-[#9CA3AF] font-mono">
                    {formatBalance(asset.inOrders)}
                  </td>
                  <td className="text-right py-4 px-6 text-white">
                    {formatUSD(asset.usdValue)}
                  </td>
                  <td className="text-right py-4 px-6">
                    <div className={`flex items-center justify-end gap-1 ${
                      asset.change24h >= 0 ? 'text-[#10B981]' : 'text-[#F43F5E]'
                    }`}>
                      {asset.change24h >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingUp className="w-4 h-4 rotate-180" />
                      )}
                      <span>{asset.change24h >= 0 ? '+' : ''}{asset.change24h}%</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => navigate('/trading')}
                        className="px-3 py-1.5 text-[#03AAC7] hover:bg-[#03AAC7]/10 rounded text-sm font-medium transition-colors"
                      >
                        Trade
                      </button>
                      <button
                        onClick={() => navigate('/deposit')}
                        className="px-3 py-1.5 text-[#9CA3AF] hover:text-white hover:bg-[#252629] rounded text-sm transition-colors"
                      >
                        Deposit
                      </button>
                      <button
                        onClick={() => navigate('/withdraw')}
                        className="px-3 py-1.5 text-[#9CA3AF] hover:text-white hover:bg-[#252629] rounded text-sm transition-colors"
                      >
                        Withdraw
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
                  <h3 className="text-white font-medium mb-2">No Assets Connected</h3>
                  <p className="text-[#6B7280] text-sm mb-4">
                    Connect your wallet or exchange to see your assets
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => navigate('/settings')}
                      className="px-4 py-2 bg-[#03AAC7] hover:bg-[#26BFD4] text-[#151517] rounded-lg font-medium transition-colors"
                    >
                      Connect Wallet
                    </button>
                    <button
                      onClick={() => navigate('/settings')}
                      className="px-4 py-2 bg-[#1B1B1D] border border-[#2B2F36] hover:border-[#3A3E45] text-white rounded-lg font-medium transition-colors"
                    >
                      Connect Exchange
                    </button>
                  </div>
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

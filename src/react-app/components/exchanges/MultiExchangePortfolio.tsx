/**
 * Multi-Exchange Portfolio Component
 *
 * Displays aggregated portfolio data from all connected exchanges.
 * Shows total balance, positions, and per-exchange breakdown.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, TrendingUp, TrendingDown, RefreshCw, Plus, Settings,
  ChevronDown, ChevronUp, AlertCircle, Check, Clock
} from 'lucide-react';
import { useTheme } from '@/react-app/contexts/ThemeContext';
import { getCardBg, getCardBorder, getTextColor, getHoverBg } from '@/react-app/utils/themeUtils';

// ============================================================================
// Types
// ============================================================================

interface ExchangeBalance {
  exchangeId: string;
  exchangeName: string;
  totalEquity: number;
  availableBalance: number;
  usedMargin: number;
  unrealizedPnl: number;
  realizedPnlToday: number;
  lastSync: string;
  status: 'connected' | 'syncing' | 'error';
  error?: string;
  balances: {
    currency: string;
    total: number;
    available: number;
    usdValue: number;
  }[];
}

interface Position {
  id: string;
  exchangeId: string;
  exchangeName: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  leverage: number;
  marginMode: 'isolated' | 'cross';
}

interface MultiExchangePortfolioProps {
  onAddExchange?: () => void;
  onManageExchanges?: () => void;
}

// ============================================================================
// Mock Data (Replace with real API calls)
// ============================================================================

const MOCK_BALANCES: ExchangeBalance[] = [
  {
    exchangeId: 'bybit',
    exchangeName: 'Bybit',
    totalEquity: 15420.50,
    availableBalance: 12350.25,
    usedMargin: 3070.25,
    unrealizedPnl: 245.30,
    realizedPnlToday: 180.50,
    lastSync: new Date(Date.now() - 60000).toISOString(),
    status: 'connected',
    balances: [
      { currency: 'USDT', total: 10000, available: 8500, usdValue: 10000 },
      { currency: 'BTC', total: 0.15, available: 0.1, usdValue: 5420.50 }
    ]
  },
  {
    exchangeId: 'binance',
    exchangeName: 'Binance',
    totalEquity: 8750.80,
    availableBalance: 6200.40,
    usedMargin: 2550.40,
    unrealizedPnl: -125.60,
    realizedPnlToday: 45.20,
    lastSync: new Date(Date.now() - 120000).toISOString(),
    status: 'connected',
    balances: [
      { currency: 'USDT', total: 5000, available: 4000, usdValue: 5000 },
      { currency: 'ETH', total: 1.5, available: 1.2, usdValue: 3750.80 }
    ]
  }
];

const MOCK_POSITIONS: Position[] = [
  {
    id: '1',
    exchangeId: 'bybit',
    exchangeName: 'Bybit',
    symbol: 'BTCUSDT',
    side: 'long',
    quantity: 0.1,
    entryPrice: 42500,
    markPrice: 43250,
    unrealizedPnl: 75,
    unrealizedPnlPercent: 1.76,
    leverage: 10,
    marginMode: 'cross'
  },
  {
    id: '2',
    exchangeId: 'bybit',
    exchangeName: 'Bybit',
    symbol: 'ETHUSDT',
    side: 'long',
    quantity: 2,
    entryPrice: 2450,
    markPrice: 2535,
    unrealizedPnl: 170,
    unrealizedPnlPercent: 3.47,
    leverage: 5,
    marginMode: 'isolated'
  },
  {
    id: '3',
    exchangeId: 'binance',
    exchangeName: 'Binance',
    symbol: 'SOLUSDT',
    side: 'short',
    quantity: 50,
    entryPrice: 98,
    markPrice: 100.50,
    unrealizedPnl: -125,
    unrealizedPnlPercent: -2.55,
    leverage: 3,
    marginMode: 'cross'
  }
];

// ============================================================================
// Component
// ============================================================================

export default function MultiExchangePortfolio({
  onAddExchange,
  onManageExchanges
}: MultiExchangePortfolioProps) {
  const { theme } = useTheme();
  const [balances] = useState<ExchangeBalance[]>(MOCK_BALANCES);
  const [positions] = useState<Position[]>(MOCK_POSITIONS);
  const [loading, setLoading] = useState(false);
  const [expandedExchange, setExpandedExchange] = useState<string | null>(null);
  const [view, setView] = useState<'overview' | 'positions'>('overview');

  // Calculate totals
  const totalEquity = balances.reduce((sum, b) => sum + b.totalEquity, 0);
  const totalAvailable = balances.reduce((sum, b) => sum + b.availableBalance, 0);
  const totalUnrealizedPnl = balances.reduce((sum, b) => sum + b.unrealizedPnl, 0);
  const totalRealizedPnlToday = balances.reduce((sum, b) => sum + b.realizedPnlToday, 0);

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getTimeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className={`${getCardBg(theme)} rounded-2xl border ${getCardBorder(theme)} overflow-hidden`}>
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#6A3DF4]/10 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-[#6A3DF4]" />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${getTextColor(theme, 'primary')}`}>
                Portfolio Overview
              </h2>
              <p className={`text-sm ${getTextColor(theme, 'muted')}`}>
                {balances.length} exchange{balances.length !== 1 ? 's' : ''} connected
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`p-2 rounded-lg ${getHoverBg(theme)} transition-colors`}
            >
              <RefreshCw className={`w-5 h-5 ${getTextColor(theme, 'secondary')} ${loading ? 'animate-spin' : ''}`} />
            </button>
            {onManageExchanges && (
              <button
                onClick={onManageExchanges}
                className={`p-2 rounded-lg ${getHoverBg(theme)} transition-colors`}
              >
                <Settings className={`w-5 h-5 ${getTextColor(theme, 'secondary')}`} />
              </button>
            )}
            {onAddExchange && (
              <button
                onClick={onAddExchange}
                className="flex items-center gap-2 px-4 py-2 bg-[#6A3DF4] hover:bg-[#5A2DE4] text-white font-medium rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Exchange
              </button>
            )}
          </div>
        </div>

        {/* Total Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className={`p-4 ${getCardBg(theme)} rounded-xl border ${getCardBorder(theme)}`}>
            <p className={`text-sm ${getTextColor(theme, 'muted')} mb-1`}>Total Equity</p>
            <p className={`text-2xl font-bold ${getTextColor(theme, 'primary')}`}>
              {formatCurrency(totalEquity)}
            </p>
          </div>
          <div className={`p-4 ${getCardBg(theme)} rounded-xl border ${getCardBorder(theme)}`}>
            <p className={`text-sm ${getTextColor(theme, 'muted')} mb-1`}>Available</p>
            <p className={`text-2xl font-bold ${getTextColor(theme, 'primary')}`}>
              {formatCurrency(totalAvailable)}
            </p>
          </div>
          <div className={`p-4 ${getCardBg(theme)} rounded-xl border ${getCardBorder(theme)}`}>
            <p className={`text-sm ${getTextColor(theme, 'muted')} mb-1`}>Unrealized P&L</p>
            <p className={`text-2xl font-bold ${totalUnrealizedPnl >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
              {totalUnrealizedPnl >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedPnl)}
            </p>
          </div>
          <div className={`p-4 ${getCardBg(theme)} rounded-xl border ${getCardBorder(theme)}`}>
            <p className={`text-sm ${getTextColor(theme, 'muted')} mb-1`}>Today's P&L</p>
            <p className={`text-2xl font-bold ${totalRealizedPnlToday >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
              {totalRealizedPnlToday >= 0 ? '+' : ''}{formatCurrency(totalRealizedPnlToday)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setView('overview')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            view === 'overview'
              ? 'text-[#6A3DF4] border-b-2 border-[#6A3DF4]'
              : `${getTextColor(theme, 'muted')} hover:text-white`
          }`}
        >
          Exchanges
        </button>
        <button
          onClick={() => setView('positions')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            view === 'positions'
              ? 'text-[#6A3DF4] border-b-2 border-[#6A3DF4]'
              : `${getTextColor(theme, 'muted')} hover:text-white`
          }`}
        >
          Positions ({positions.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <AnimatePresence mode="wait">
          {view === 'overview' ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {balances.map(balance => (
                <div
                  key={balance.exchangeId}
                  className={`${getCardBg(theme)} rounded-xl border ${getCardBorder(theme)} overflow-hidden`}
                >
                  {/* Exchange Header */}
                  <button
                    onClick={() => setExpandedExchange(
                      expandedExchange === balance.exchangeId ? null : balance.exchangeId
                    )}
                    className={`w-full flex items-center justify-between p-4 ${getHoverBg(theme)} transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Logo Placeholder */}
                      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                        <span className="text-lg font-bold text-[#6A3DF4]">
                          {balance.exchangeName.charAt(0)}
                        </span>
                      </div>

                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${getTextColor(theme, 'primary')}`}>
                            {balance.exchangeName}
                          </span>
                          {balance.status === 'connected' && (
                            <Check className="w-4 h-4 text-[#2ECC71]" />
                          )}
                          {balance.status === 'syncing' && (
                            <RefreshCw className="w-4 h-4 text-[#F39C12] animate-spin" />
                          )}
                          {balance.status === 'error' && (
                            <AlertCircle className="w-4 h-4 text-[#E74C3C]" />
                          )}
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${getTextColor(theme, 'muted')}`}>
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(balance.lastSync)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className={`font-semibold ${getTextColor(theme, 'primary')}`}>
                          {formatCurrency(balance.totalEquity)}
                        </p>
                        <p className={`text-sm ${balance.unrealizedPnl >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                          {balance.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(balance.unrealizedPnl)}
                        </p>
                      </div>

                      {expandedExchange === balance.exchangeId ? (
                        <ChevronUp className={`w-5 h-5 ${getTextColor(theme, 'muted')}`} />
                      ) : (
                        <ChevronDown className={`w-5 h-5 ${getTextColor(theme, 'muted')}`} />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedExchange === balance.exchangeId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10"
                      >
                        <div className="p-4">
                          {/* Balance Breakdown */}
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className={`text-xs ${getTextColor(theme, 'muted')}`}>Available</p>
                              <p className={`font-medium ${getTextColor(theme, 'primary')}`}>
                                {formatCurrency(balance.availableBalance)}
                              </p>
                            </div>
                            <div>
                              <p className={`text-xs ${getTextColor(theme, 'muted')}`}>Used Margin</p>
                              <p className={`font-medium ${getTextColor(theme, 'primary')}`}>
                                {formatCurrency(balance.usedMargin)}
                              </p>
                            </div>
                            <div>
                              <p className={`text-xs ${getTextColor(theme, 'muted')}`}>Today's P&L</p>
                              <p className={`font-medium ${balance.realizedPnlToday >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                                {balance.realizedPnlToday >= 0 ? '+' : ''}{formatCurrency(balance.realizedPnlToday)}
                              </p>
                            </div>
                          </div>

                          {/* Asset Breakdown */}
                          <div className="space-y-2">
                            <p className={`text-xs font-medium ${getTextColor(theme, 'muted')}`}>Assets</p>
                            {balance.balances.map(asset => (
                              <div
                                key={asset.currency}
                                className={`flex items-center justify-between p-2 ${getCardBg(theme)} rounded-lg`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${getTextColor(theme, 'primary')}`}>
                                    {asset.currency}
                                  </span>
                                  <span className={`text-sm ${getTextColor(theme, 'muted')}`}>
                                    {asset.total.toFixed(asset.currency === 'USDT' ? 2 : 6)}
                                  </span>
                                </div>
                                <span className={`${getTextColor(theme, 'secondary')}`}>
                                  {formatCurrency(asset.usdValue)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="positions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {positions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className={`${getTextColor(theme, 'muted')}`}>No open positions</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {positions.map(position => (
                    <div
                      key={position.id}
                      className={`flex items-center justify-between p-4 ${getCardBg(theme)} rounded-xl border ${getCardBorder(theme)}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          position.side === 'long'
                            ? 'bg-[#2ECC71]/20 text-[#2ECC71]'
                            : 'bg-[#E74C3C]/20 text-[#E74C3C]'
                        }`}>
                          {position.side.toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${getTextColor(theme, 'primary')}`}>
                              {position.symbol}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 ${getCardBg(theme)} rounded ${getTextColor(theme, 'muted')}`}>
                              {position.leverage}x
                            </span>
                          </div>
                          <p className={`text-xs ${getTextColor(theme, 'muted')}`}>
                            {position.exchangeName} / {position.marginMode}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {position.unrealizedPnl >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-[#2ECC71]" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-[#E74C3C]" />
                          )}
                          <span className={`font-medium ${
                            position.unrealizedPnl >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                          }`}>
                            {formatCurrency(position.unrealizedPnl)}
                          </span>
                        </div>
                        <p className={`text-xs ${
                          position.unrealizedPnlPercent >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                        }`}>
                          {formatPercent(position.unrealizedPnlPercent)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

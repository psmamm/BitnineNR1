import { Link } from 'react-router';
import { Clock, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { useTrades } from '@/react-app/hooks/useTrades';
import { useLivePnL } from '@/react-app/hooks/useLivePnL';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getCardBg, getCardBorder, getTextColor, getHoverBg } from '../utils/themeUtils';

export default function RecentTrades() {
  const { trades, loading } = useTrades(10); // Get last 10 trades
  const { theme } = useTheme();
  
  // Get open positions for live P&L
  const openPositions = useMemo(() => {
    return trades
      .filter(trade => !trade.is_closed)
      .map(trade => ({
        id: trade.id,
        symbol: trade.symbol,
        asset_type: trade.asset_type || 'stocks' as const,
        direction: trade.direction,
        quantity: trade.quantity,
        entry_price: trade.entry_price,
        leverage: trade.leverage,
        commission: trade.commission
      }));
  }, [trades]);

  useLivePnL(openPositions);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 3600);

    if (diffInHours < 24) {
      if (diffInHours < 1) return `${Math.floor(diffInHours * 60)}m ago`;
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) return 'Yesterday';
      if (diffInDays < 7) return `${diffInDays} days ago`;
      return date.toLocaleDateString();
    }
  };

  const getAssetIcon = (assetType: string) => {
    switch (assetType) {
      case 'crypto': return '₿';
      case 'forex': return '💱';
      default: return '📈';
    }
  };

  

  if (loading) {
    return (
      <div className={`${getCardBg(theme)} rounded-xl p-4 border ${getCardBorder(theme)}`}>
        <h2 className={`text-xl font-semibold ${getTextColor(theme, 'primary')} mb-6`}>Recent Trades</h2>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-4">
                <div className={`w-10 h-10 ${theme === 'dark' ? 'bg-[#2A2F42]' : 'bg-gray-200'} rounded-lg`} />
                <div className="flex-1">
                  <div className={`h-4 ${theme === 'dark' ? 'bg-[#2A2F42]' : 'bg-gray-200'} rounded w-1/3 mb-2`} />
                  <div className={`h-3 ${theme === 'dark' ? 'bg-[#2A2F42]' : 'bg-gray-200'} rounded w-1/2`} />
                </div>
                <div className={`h-4 ${theme === 'dark' ? 'bg-[#2A2F42]' : 'bg-gray-200'} rounded w-16`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${getCardBg(theme)} rounded-xl p-4 border ${getCardBorder(theme)}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#6A3DF4]/10 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#6A3DF4]" />
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${getTextColor(theme, 'primary')}`}>Recent Trades</h2>
            <p className={`${getTextColor(theme, 'muted')} text-sm`}>Latest trading activity</p>
          </div>
        </div>
        <Link 
          to="/journal" 
          className="px-4 py-2 bg-[#6A3DF4]/20 hover:bg-[#6A3DF4]/30 text-[#6A3DF4] rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
        >
          <Eye className="w-4 h-4" />
          <span>View All</span>
        </Link>
      </div>
      
      {trades.length === 0 ? (
        <div className="text-center py-12">
          <div className={getTextColor(theme, 'muted') + ' mb-2'}>No trades yet</div>
          <p className={`${getTextColor(theme, 'muted')} text-sm`}>
            Start by <Link to="/journal" className="text-[#6A3DF4] hover:text-[#8A5CFF] transition-colors">adding your first trade</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {trades.map((trade, index) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center space-x-4 p-4 ${getCardBg(theme)} ${getHoverBg(theme)} border ${getCardBorder(theme)} rounded-xl transition-all duration-200 group`}
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-[#6A3DF4]/10 rounded-lg flex items-center justify-center">
                  <span className={`${getTextColor(theme, 'secondary')} font-medium`}>
                    {getAssetIcon(trade.asset_type || 'stocks')}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className={`${getTextColor(theme, 'primary')} font-medium`}>{trade.symbol}</h3>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                    trade.direction === 'long' 
                      ? 'bg-[#2ECC71]/20 text-[#2ECC71]' 
                      : 'bg-[#E74C3C]/20 text-[#E74C3C]'
                  }`}>
                    {trade.direction === 'long' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{trade.direction.toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <p className={`${getTextColor(theme, 'muted')} text-sm`}>
                    {trade.quantity.toLocaleString()} @ ${trade.entry_price.toFixed(4)}
                  </p>
                  <span className={getTextColor(theme, 'muted')}>•</span>
                  <p className={`${getTextColor(theme, 'muted')} text-sm`}>{formatDate(trade.entry_date)}</p>
                </div>
              </div>
              
              <div className="text-right">
                {trade.is_closed && trade.pnl !== null ? (
                  <div className={`text-sm font-semibold ${
                    (trade.pnl ?? 0) >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                  }`}>
                    {(trade.pnl ?? 0) >= 0 ? '+' : ''}${(trade.pnl ?? 0).toFixed(2)}
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-[#6A3DF4] rounded-full animate-pulse" />
                    <span className="text-[#6A3DF4] text-sm font-medium">Open</span>
                  </div>
                )}
                <div className={`${getTextColor(theme, 'muted')} text-xs mt-1`}>
                  {trade.strategy_name || 'No Strategy'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

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
    <div className={`${getCardBg(theme)} rounded-lg p-3 sm:p-4 border ${getCardBorder(theme)}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#FCD535]/10 rounded-lg flex items-center justify-center">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#FCD535]" />
          </div>
          <div>
            <h2 className={`text-base sm:text-lg font-semibold ${getTextColor(theme, 'primary')}`}>Recent Trades</h2>
            <p className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm`}>Latest trading activity</p>
          </div>
        </div>
        <Link 
          to="/journal" 
          className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#FCD535]/20 hover:bg-[#FCD535]/30 text-[#FCD535] rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center space-x-1.5 sm:space-x-2"
        >
          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>View All</span>
        </Link>
      </div>
      
      {trades.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <div className={`${getTextColor(theme, 'muted')} mb-2 text-sm sm:text-base`}>No trades yet</div>
          <p className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm`}>
            Start by <Link to="/journal" className="text-[#FCD535] hover:text-[#FFE066] transition-colors">adding your first trade</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {trades.map((trade, index) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center space-x-3 p-2.5 sm:p-3 ${getCardBg(theme)} ${getHoverBg(theme)} border ${getCardBorder(theme)} rounded-lg transition-all duration-200 group`}
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#FCD535]/10 rounded-lg flex items-center justify-center">
                  <span className={`${getTextColor(theme, 'secondary')} text-sm sm:text-base font-medium`}>
                    {getAssetIcon(trade.asset_type || 'stocks')}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
                  <h3 className={`${getTextColor(theme, 'primary')} text-sm sm:text-base font-medium truncate`}>{trade.symbol}</h3>
                  <div className={`flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 ${
                    trade.direction === 'long' 
                      ? 'bg-[#FCD535]/20 text-[#FCD535]' 
                      : 'bg-[#F43F5E]/20 text-[#F43F5E]'
                  }`}>
                    {trade.direction === 'long' ? (
                      <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    )}
                    <span>{trade.direction.toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 sm:space-x-2 mt-1 flex-wrap">
                  <p className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm`}>
                    {trade.quantity.toLocaleString()} @ ${trade.entry_price.toFixed(4)}
                  </p>
                  <span className={getTextColor(theme, 'muted')}>•</span>
                  <p className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm`}>{formatDate(trade.entry_date)}</p>
                </div>
              </div>
              
              <div className="text-right flex-shrink-0">
                {trade.is_closed && trade.pnl !== null ? (
                  <div className={`text-xs sm:text-sm font-semibold ${
                    (trade.pnl ?? 0) >= 0 ? 'text-[#FCD535]' : 'text-[#F43F5E]'
                  }`}>
                    {(trade.pnl ?? 0) >= 0 ? '+' : ''}${(trade.pnl ?? 0).toFixed(2)}
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#FCD535] rounded-full animate-pulse" />
                    <span className="text-[#FCD535] text-xs sm:text-sm font-medium">Open</span>
                  </div>
                )}
                <div className={`${getTextColor(theme, 'muted')} text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate max-w-[80px]`}>
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








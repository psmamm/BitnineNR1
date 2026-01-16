import { LucideIcon, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";
import { getCardBg, getCardBorder, getTextColor, getHoverBg } from "../utils/themeUtils";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative';
  icon: LucideIcon;
  onClick?: () => void;
  loading?: boolean;
  subtitle?: string;
  trend?: number[];
}

export default function StatCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon: Icon, 
  onClick, 
  loading = false,
  subtitle,
  trend 
}: StatCardProps) {
  const { theme } = useTheme();
  
  const getChangeColor = () => {
    if (change === "N/A") return theme === 'dark' ? "text-[#AAB0C0]" : "text-gray-500";
    return changeType === 'positive' ? 'text-[#03AAC7]' : 'text-[#F43F5E]';
  };

  const getChangeIcon = () => {
    if (change === "N/A") return null;
    return changeType === 'positive' ? TrendingUp : TrendingDown;
  };

  const ChangeIcon = getChangeIcon();

  const getProgressColor = () => {
    if (title === "Win Rate") {
      const percentage = parseFloat(value);
      if (percentage >= 70) return 'from-[#03AAC7] to-[#27AE60]';
      if (percentage >= 50) return 'from-[#03AAC7] to-[#26BFD4]';
      return 'from-[#F43F5E] to-[#C0392B]';
    }
    return 'from-[#03AAC7] to-[#26BFD4]';
  };

  const isClickable = !!onClick;

  return (
    <motion.div 
      className={`${getCardBg(theme)} rounded-lg p-3 sm:p-4 border ${getCardBorder(theme)} transition-all duration-200 group h-full relative overflow-hidden ${
        isClickable 
          ? `${getHoverBg(theme)} cursor-pointer` 
          : getHoverBg(theme)
      }`}
      onClick={onClick}
      whileHover={isClickable ? { y: -2 } : {}}
      whileTap={isClickable ? { scale: 0.98 } : {}}
    >
      {/* Gradient overlay for clickable cards */}
      {isClickable && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#03AAC7]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className={`p-2 sm:p-2.5 rounded-lg border transition-all duration-300 ${
            loading 
              ? 'bg-[#03AAC7]/20 border-[#03AAC7]/30 animate-pulse' 
              : 'bg-[#03AAC7]/10 border-[#03AAC7]/20 group-hover:bg-[#03AAC7]/20 group-hover:border-[#03AAC7]/40'
          }`}>
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 text-[#03AAC7] ${loading ? 'animate-pulse' : ''}`} />
          </div>
          
          {!loading && change !== "N/A" && (
            <div className="flex items-center space-x-1">
              {ChangeIcon && <ChangeIcon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${getChangeColor()}`} />}
              <span className={`text-xs sm:text-sm font-medium ${getChangeColor()}`}>
                {change}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className={`${getTextColor(theme, 'muted')} text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 uppercase tracking-wide`}>{title}</h3>
          
          {loading ? (
            <div className="space-y-2">
              <div className={`h-6 sm:h-7 ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'} rounded animate-pulse`} />
              {subtitle && <div className={`h-3 sm:h-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'} rounded animate-pulse w-2/3`} />}
            </div>
          ) : (
            <>
              <div className="flex items-baseline space-x-2 mb-1.5 sm:mb-2">
                <p className={`text-2xl sm:text-3xl font-bold ${getTextColor(theme, 'primary')}`}>{value}</p>
              </div>
              {subtitle && (
                <p className={`${getTextColor(theme, 'secondary')} text-xs sm:text-sm`}>{subtitle}</p>
              )}
            </>
          )}
        </div>
        
        {/* Progress bar for Win Rate */}
        {title === "Win Rate" && value !== "..." && !loading && (
          <div className="mt-3">
            <div className={`w-full ${theme === 'dark' ? 'bg-[#1B1B1D]/50' : 'bg-gray-200'} rounded-full h-1.5`}>
              <motion.div 
                className={`bg-gradient-to-r ${getProgressColor()} h-1.5 rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, parseFloat(value))}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className={`text-[10px] ${getTextColor(theme, 'muted')}`}>0%</span>
              <span className={`text-[10px] ${getTextColor(theme, 'muted')}`}>100%</span>
            </div>
          </div>
        )}
        
        {/* Status indicator for Profit Factor */}
        {title === "Profit Factor" && value !== "..." && !loading && (
          <div className="mt-2">
            <span className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
              parseFloat(value) >= 1.5 ? 'bg-[#03AAC7]/10 text-[#03AAC7]' :
              parseFloat(value) >= 1.0 ? 'bg-[#03AAC7]/10 text-[#03AAC7]' : 'bg-[#F43F5E]/10 text-[#F43F5E]'
            }`}>
              {parseFloat(value) >= 1.5 ? 'Excellent' :
               parseFloat(value) >= 1.0 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
        )}

        {/* Mini trend chart for Active Trades */}
        {title === "Active Trades" && trend && trend.length > 0 && !loading && (
          <div className="mt-2">
            <div className="flex items-end space-x-0.5 sm:space-x-1 h-6 sm:h-7">
              {trend.slice(-7).map((point, index) => (
                <div
                  key={index}
                  className="bg-[#03AAC7] rounded-sm flex-1 opacity-70 group-hover:opacity-100 transition-opacity"
                  style={{ height: `${Math.max(10, (point / Math.max(...trend)) * 100)}%` }}
                />
              ))}
            </div>
            <p className={`text-[10px] sm:text-xs ${getTextColor(theme, 'muted')} mt-1`}>Last 7 days</p>
          </div>
        )}

        {/* Click indicator */}
        {isClickable && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Activity className="w-4 h-4 text-[#03AAC7]" />
          </div>
        )}
      </div>
    </motion.div>
  );
}









import { LucideIcon, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { motion } from "framer-motion";

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
  const getChangeColor = () => {
    if (change === "N/A") return "text-[#AAB0C0]";
    return changeType === 'positive' ? 'text-[#2ECC71]' : 'text-[#E74C3C]';
  };

  const getChangeIcon = () => {
    if (change === "N/A") return null;
    return changeType === 'positive' ? TrendingUp : TrendingDown;
  };

  const ChangeIcon = getChangeIcon();

  const getProgressColor = () => {
    if (title === "Win Rate") {
      const percentage = parseFloat(value);
      if (percentage >= 70) return 'from-[#2ECC71] to-[#27AE60]';
      if (percentage >= 50) return 'from-[#6A3DF4] to-[#8A5CFF]';
      return 'from-[#E74C3C] to-[#C0392B]';
    }
    return 'from-[#6A3DF4] to-[#8A5CFF]';
  };

  const isClickable = !!onClick;

  return (
    <motion.div 
      className={`bg-[#1E2232] rounded-2xl p-6 border border-white/5 transition-all duration-200 group shadow-[0_4px_20px_rgba(0,0,0,0.2)] h-full relative overflow-hidden ${
        isClickable 
          ? 'hover:border-[#6A3DF4]/50 cursor-pointer hover:shadow-[0_8px_30px_rgba(106,61,244,0.3)] hover:transform hover:scale-[1.02]' 
          : 'hover:border-white/10'
      }`}
      onClick={onClick}
      whileHover={isClickable ? { y: -2 } : {}}
      whileTap={isClickable ? { scale: 0.98 } : {}}
    >
      {/* Gradient overlay for clickable cards */}
      {isClickable && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#6A3DF4]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className={`p-3 rounded-xl border transition-all duration-300 ${
            loading 
              ? 'bg-[#6A3DF4]/20 border-[#6A3DF4]/30 animate-pulse' 
              : 'bg-[#6A3DF4]/10 border-[#6A3DF4]/20 group-hover:bg-[#6A3DF4]/20 group-hover:border-[#6A3DF4]/40'
          }`}>
            <Icon className={`w-6 h-6 text-[#6A3DF4] ${loading ? 'animate-pulse' : ''}`} />
          </div>
          
          {!loading && change !== "N/A" && (
            <div className="flex items-center space-x-1">
              {ChangeIcon && <ChangeIcon className={`w-4 h-4 ${getChangeColor()}`} />}
              <span className={`text-sm font-medium ${getChangeColor()}`}>
                {change}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-[#7F8C8D] text-sm font-semibold mb-2 uppercase tracking-wide">{title}</h3>
          
          {loading ? (
            <div className="space-y-2">
              <div className="h-8 bg-white/10 rounded animate-pulse" />
              {subtitle && <div className="h-4 bg-white/5 rounded animate-pulse w-2/3" />}
            </div>
          ) : (
            <>
              <div className="flex items-baseline space-x-2 mb-2">
                <p className="text-3xl font-bold text-white">{value}</p>
              </div>
              {subtitle && (
                <p className="text-[#AAB0C0] text-sm">{subtitle}</p>
              )}
            </>
          )}
        </div>
        
        {/* Progress bar for Win Rate */}
        {title === "Win Rate" && value !== "..." && !loading && (
          <div className="mt-4">
            <div className="w-full bg-[#0D0F18]/50 rounded-full h-2">
              <motion.div 
                className={`bg-gradient-to-r ${getProgressColor()} h-2 rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, parseFloat(value))}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-[#7F8C8D]">0%</span>
              <span className="text-xs text-[#7F8C8D]">100%</span>
            </div>
          </div>
        )}
        
        {/* Status indicator for Profit Factor */}
        {title === "Profit Factor" && value !== "..." && !loading && (
          <div className="mt-3">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              parseFloat(value) >= 1.5 ? 'bg-[#2ECC71]/10 text-[#2ECC71]' :
              parseFloat(value) >= 1.0 ? 'bg-[#6A3DF4]/10 text-[#6A3DF4]' : 'bg-[#E74C3C]/10 text-[#E74C3C]'
            }`}>
              {parseFloat(value) >= 1.5 ? 'Excellent' :
               parseFloat(value) >= 1.0 ? 'Good' : 'Needs Improvement'}
            </span>
          </div>
        )}

        {/* Mini trend chart for Active Trades */}
        {title === "Active Trades" && trend && trend.length > 0 && !loading && (
          <div className="mt-3">
            <div className="flex items-end space-x-1 h-8">
              {trend.slice(-7).map((point, index) => (
                <div
                  key={index}
                  className="bg-[#6A3DF4] rounded-sm flex-1 opacity-70 group-hover:opacity-100 transition-opacity"
                  style={{ height: `${Math.max(10, (point / Math.max(...trend)) * 100)}%` }}
                />
              ))}
            </div>
            <p className="text-xs text-[#7F8C8D] mt-1">Last 7 days</p>
          </div>
        )}

        {/* Click indicator */}
        {isClickable && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Activity className="w-4 h-4 text-[#6A3DF4]" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

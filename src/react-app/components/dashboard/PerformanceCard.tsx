import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, TrendingUp, Award, Zap } from 'lucide-react';
import { useApi, buildApiUrl } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { getCardBg, getCardBorder, getTextColor } from '../../utils/themeUtils';

interface UserPerformanceData {
  username: string | null;
  xp: number;
  rank_tier: string;
  reputation_score: number;
  current_streak: number;
  email: string;
  name: string;
}

// Career Status Mapping
const CAREER_STATUS_MAP: Record<string, string> = {
  BRONZE: 'Junior Analyst',
  SILVER: 'Associate Trader',
  GOLD: 'Senior Trader',
  PLATINUM: 'Fund Manager',
  DIAMOND: 'Market Maker',
};

// Tier progression thresholds (XP required for each tier)
const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 1000,
  GOLD: 5000,
  PLATINUM: 15000,
  DIAMOND: 50000,
};

// Get next tier and required XP
function getTierProgress(currentTier: string, currentXP: number) {
  const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
  const currentIndex = tiers.indexOf(currentTier.toUpperCase());
  
  if (currentIndex === -1 || currentIndex === tiers.length - 1) {
    // Already at max tier or invalid tier
    return {
      nextTier: null,
      currentThreshold: TIER_THRESHOLDS[currentTier.toUpperCase() as keyof typeof TIER_THRESHOLDS] || 0,
      nextThreshold: null,
      progress: 100,
    };
  }
  
  const nextTier = tiers[currentIndex + 1];
  const currentThreshold = TIER_THRESHOLDS[currentTier.toUpperCase() as keyof typeof TIER_THRESHOLDS] || 0;
  const nextThreshold = TIER_THRESHOLDS[nextTier as keyof typeof TIER_THRESHOLDS];
  const progress = ((currentXP - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  
  return {
    nextTier,
    currentThreshold,
    nextThreshold,
    progress: Math.max(0, Math.min(100, progress)),
  };
}

// Get tier color based on rank
function getTierColor(tier: string): string {
  const tierUpper = tier.toUpperCase();
  switch (tierUpper) {
    case 'BRONZE':
      return 'text-[#CD7F32] border-[#CD7F32]/30 bg-[#CD7F32]/10';
    case 'SILVER':
      return 'text-gray-300 border-gray-300/30 bg-gray-300/10';
    case 'GOLD':
      return 'text-[#FFD700] border-[#FFD700]/30 bg-[#FFD700]/10';
    case 'PLATINUM':
      return 'text-[#E5E4E2] border-[#E5E4E2]/30 bg-[#E5E4E2]/10';
    case 'DIAMOND':
      return 'text-[#B9F2FF] border-[#B9F2FF]/30 bg-[#B9F2FF]/10';
    default:
      return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
  }
}

interface PerformanceCardProps {
  refreshTrigger?: number; // External trigger to refetch data
}

export default function PerformanceCard({ refreshTrigger }: PerformanceCardProps) {
  const { theme } = useTheme();
  const { data, loading, error, refetch } = useApi<UserPerformanceData>(
    buildApiUrl('/api/users/me')
  );

  // Refetch when refreshTrigger changes (internal refetch, no remount)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]); // Only depend on refreshTrigger, not refetch (stable function)

  const [progressAnimation, setProgressAnimation] = useState(0);

  useEffect(() => {
    if (data) {
      // Use xp as the reputation value (consistent across all displays)
      const tierProgress = getTierProgress(data.rank_tier, data.xp);
      // Trigger animation after a short delay for smooth entrance
      setTimeout(() => {
        setProgressAnimation(tierProgress.progress);
      }, 300);
    }
  }, [data]);

  // Loading state
  if (loading) {
    return (
      <div className={`${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} p-6`}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 bg-white/10 rounded animate-pulse" />
            <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
          </div>
          <div className="h-12 w-full bg-white/10 rounded animate-pulse" />
          <div className="h-2 w-full bg-white/10 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className={`${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} border-red-500/30 p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`${getTextColor(theme, 'primary')} text-lg font-semibold mb-1`}>
              Performance Status
            </h3>
            <p className={`${getTextColor(theme, 'secondary')} text-sm`}>
              {error || 'Failed to load performance data'}
            </p>
          </div>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-[#6A3DF4]/20 hover:bg-[#6A3DF4]/30 border border-[#6A3DF4]/30 rounded-lg text-[#6A3DF4] text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const careerStatus = CAREER_STATUS_MAP[data.rank_tier.toUpperCase()] || data.rank_tier;
  
  // Use xp as primary source for Reputation Score
  // xp is the actual reputation value that gets updated when trades are logged
  // Both displays (large counter and small badge) should use the same value
  // IMPORTANT: Always use xp, even if it's 0 (0 is a valid value, not a missing value)
  const reputationValue = data.xp;
  const tierProgress = getTierProgress(data.rank_tier, reputationValue);
  const tierColor = getTierColor(data.rank_tier);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} border-white/10 p-6 relative overflow-hidden`}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 11px)',
        }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg border ${tierColor}`}>
              <BadgeCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`${getTextColor(theme, 'muted')} text-xs font-semibold uppercase tracking-wider mb-1`}>
                Career Status
              </h3>
              <p className={`${getTextColor(theme, 'primary')} text-lg font-bold`}>
                {careerStatus}
              </p>
            </div>
          </div>
          
          {data.current_streak > 0 && (
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[#FFD700]" />
              <span className={`${getTextColor(theme, 'secondary')} text-sm font-mono`}>
                {data.current_streak} day streak
              </span>
            </div>
          )}
        </div>

        {/* Reputation Score */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className={`${getTextColor(theme, 'muted')} text-xs font-semibold uppercase tracking-wider`}>
              Reputation Score
            </span>
            <span className={`${getTextColor(theme, 'secondary')} text-xs`}>
              {tierProgress.nextTier ? `Next: ${CAREER_STATUS_MAP[tierProgress.nextTier]}` : 'Max Tier'}
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`${getTextColor(theme, 'primary')} text-4xl font-bold font-mono tracking-tight`}>
              {reputationValue.toLocaleString()}
            </span>
            <span className={`${getTextColor(theme, 'secondary')} text-sm`}>
              / {tierProgress.nextThreshold ? tierProgress.nextThreshold.toLocaleString() : '∞'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {tierProgress.nextTier && (
          <div className="mb-6">
            <div className={`w-full ${theme === 'dark' ? 'bg-black/30' : 'bg-gray-800/30'} rounded-full h-2 border border-white/5 overflow-hidden`}>
              <motion.div
                className="bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressAnimation}%` }}
                transition={{ 
                  duration: 1.2, 
                  ease: [0.16, 1, 0.3, 1], // Custom easing for smooth animation
                  delay: 0.2
                }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className={`${getTextColor(theme, 'muted')} text-xs font-mono`}>
                {tierProgress.currentThreshold.toLocaleString()}
              </span>
              <span className={`${getTextColor(theme, 'muted')} text-xs font-mono`}>
                {tierProgress.nextThreshold?.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Award className="w-4 h-4 text-[#6A3DF4]" />
              <span className={`${getTextColor(theme, 'muted')} text-xs uppercase tracking-wider`}>
                Reputation
              </span>
            </div>
            <p className={`${getTextColor(theme, 'primary')} text-xl font-bold font-mono`}>
              {reputationValue}
            </p>
          </div>
          
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#2ECC71]" />
              <span className={`${getTextColor(theme, 'muted')} text-xs uppercase tracking-wider`}>
                Streak
              </span>
            </div>
            <p className={`${getTextColor(theme, 'primary')} text-xl font-bold font-mono`}>
              {data.current_streak}
            </p>
          </div>
        </div>

        {/* Username (if set) */}
        {data.username && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <span className={`${getTextColor(theme, 'muted')} text-xs uppercase tracking-wider`}>
              Trader ID
            </span>
            <p className={`${getTextColor(theme, 'primary')} text-sm font-mono mt-1`}>
              @{data.username}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}


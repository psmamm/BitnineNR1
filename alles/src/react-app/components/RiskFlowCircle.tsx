import { motion } from 'framer-motion';
import { ShieldAlert, Zap, Bell } from 'lucide-react';
import { RiskSnapshot, RiskSettings } from '@/react-app/hooks/useRiskEngine';

interface RiskFlowCircleProps {
  snapshot: RiskSnapshot;
  settings: RiskSettings;
  onAdjustSettings?: () => void;
}

const statusColors: Record<RiskSnapshot['status'], string> = {
  safe: '#2ECC71',
  warn: '#F39C12',
  tilt: '#E74C3C'
};

export function RiskFlowCircle({ snapshot, settings, onAdjustSettings }: RiskFlowCircleProps) {
  const percent = Math.min(Math.abs(snapshot.dailyPnl) / (snapshot.dailyLimit || 1), 1);
  const circumference = 2 * Math.PI * 56;
  const strokeDashoffset = circumference - percent * circumference;
  const statusColor = statusColors[snapshot.status];

  return (
    <div className="bg-[#0D0F18] border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-[0_6px_24px_rgba(0,0,0,0.4)]">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r="56"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="12"
          />
          <motion.circle
            cx="70"
            cy="70"
            r="56"
            fill="none"
            stroke={statusColor}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs text-[#7F8C8D]">Drawdown Used</span>
          <span className="text-2xl font-bold text-white">{Math.round(percent * 100)}%</span>
          <span className="text-xs font-semibold" style={{ color: statusColor }}>
            {snapshot.status === 'tilt' ? 'Limit Hit' : snapshot.status === 'warn' ? 'Slow Down' : 'In Control'}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2 text-sm text-white font-semibold">
          <ShieldAlert className="w-4 h-4 text-[#6A3DF4]" />
          <span>Daily Loss Limit</span>
          <span className="text-[#7F8C8D] font-normal">{settings.dailyLossLimitPct}%</span>
        </div>
        <div className="text-sm text-[#AAB0C0]">
          Today P&L: <span className={snapshot.dailyPnl <= 0 ? 'text-[#E74C3C]' : 'text-[#2ECC71]'}>${snapshot.dailyPnl.toFixed(2)}</span> / ${snapshot.dailyLimit.toFixed(2)}
        </div>
        <div className="text-sm text-[#AAB0C0]">
          Suggested Size: <span className="text-white font-semibold">{snapshot.recommendedSize.toFixed(2)}</span>
        </div>
        <div className="text-sm text-[#AAB0C0]">
          Suggested Stop Distance: <span className="text-white font-semibold">{snapshot.recommendedStopDistance.toFixed(2)}</span>
        </div>
        {snapshot.breachReason && (
          <div className="text-xs text-[#E74C3C] flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {snapshot.breachReason}
          </div>
        )}
        <div className="flex items-center gap-3 pt-1">
          {settings.enableTiltAlerts && (
            <div className="text-xs text-[#7F8C8D] flex items-center gap-1">
              <Bell className="w-3 h-3" />
              Tilt alerts on
            </div>
          )}
          {onAdjustSettings && (
            <button
              onClick={onAdjustSettings}
              className="text-xs text-[#6A3DF4] hover:text-white transition-colors"
            >
              Adjust rules
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default RiskFlowCircle;

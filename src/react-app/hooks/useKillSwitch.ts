/**
 * Kill Switch Hook - Prop-Firm Standards
 * 
 * Implements hard-locks based on:
 * - MDL (Max Daily Loss): 5% of starting capital
 * - ML (Max Loss): 10% of starting capital (total loss)
 * 
 * These are industry-standard limits used by prop trading firms.
 */

import { useMemo } from 'react';
import { useUserEquity } from './useUserEquity';
import { useDailyStats } from './useTrades';

export interface KillSwitchResult {
  isBlocked: boolean;
  reason?: string;
  currentDailyLoss: number;
  totalLoss: number;
  mdlLimit: number;        // 5% of starting capital
  mlLimit: number;        // 10% of starting capital
  dailyLossPercent: number;
  totalLossPercent: number;
  canTrade: boolean;
}

export interface KillSwitchInput {
  calculatedRisk?: number;  // Risk amount for the proposed trade
  currentDailyLoss?: number; // Override daily loss (optional)
  totalLoss?: number;       // Override total loss (optional)
}

const MDL_PERCENT = 0.05;  // 5%
const ML_PERCENT = 0.10;   // 10%

/**
 * Custom hook for Kill Switch validation
 */
export function useKillSwitch(input: KillSwitchInput = {}) {
  const { equity } = useUserEquity();
  const { dailyStats } = useDailyStats();

  const killSwitch = useMemo<KillSwitchResult>(() => {
    const startingCapital = equity.startingCapital || 10000;
    const mdlLimit = startingCapital * MDL_PERCENT;
    const mlLimit = startingCapital * ML_PERCENT;

    // Calculate current daily loss
    const today = new Date().toISOString().split('T')[0];
    const todayStats = dailyStats.find(stat => stat.date === today);
    const currentDailyLoss = input.currentDailyLoss ?? (todayStats?.daily_pnl || 0);
    
    // Only count losses (negative PnL)
    const dailyLoss = currentDailyLoss < 0 ? Math.abs(currentDailyLoss) : 0;

    // Calculate total loss from all trades
    // This would ideally come from a total PnL calculation
    // For now, we'll use current equity vs starting capital
    const totalLoss = input.totalLoss ?? Math.max(0, startingCapital - equity.currentEquity);

    // Check if proposed trade would exceed MDL
    const proposedRisk = input.calculatedRisk || 0;
    const wouldExceedMDL = dailyLoss + proposedRisk >= mdlLimit;

    // Check current limits
    const exceedsMDL = dailyLoss >= mdlLimit;
    const exceedsML = totalLoss >= mlLimit;

    // Determine if trading is blocked
    let isBlocked = false;
    let reason: string | undefined;

    if (exceedsML) {
      isBlocked = true;
      reason = `Maximum Loss (ML) limit reached: $${totalLoss.toFixed(2)} / $${mlLimit.toFixed(2)} (10% of starting capital). Trading permanently locked.`;
    } else if (exceedsMDL) {
      isBlocked = true;
      reason = `Maximum Daily Loss (MDL) limit reached: $${dailyLoss.toFixed(2)} / $${mdlLimit.toFixed(2)} (5% of starting capital). Trading locked until next day.`;
    } else if (wouldExceedMDL && proposedRisk > 0) {
      isBlocked = true;
      reason = `This trade would exceed MDL limit. Current daily loss: $${dailyLoss.toFixed(2)}, Proposed risk: $${proposedRisk.toFixed(2)}, Limit: $${mdlLimit.toFixed(2)}`;
    }

    const dailyLossPercent = startingCapital > 0 ? (dailyLoss / startingCapital) * 100 : 0;
    const totalLossPercent = startingCapital > 0 ? (totalLoss / startingCapital) * 100 : 0;

    return {
      isBlocked,
      reason,
      currentDailyLoss: dailyLoss,
      totalLoss,
      mdlLimit,
      mlLimit,
      dailyLossPercent,
      totalLossPercent,
      canTrade: !isBlocked
    };
  }, [equity.startingCapital, equity.currentEquity, dailyStats, input.calculatedRisk, input.currentDailyLoss, input.totalLoss]);

  /**
   * Validates if a trade can be executed
   */
  const validateTrade = (calculatedRisk: number): KillSwitchResult => {
    return useKillSwitch({ calculatedRisk }).killSwitch;
  };

  return {
    killSwitch,
    validateTrade
  };
}

/**
 * Error class for Kill Switch violations
 */
export class RiskLimitExceededError extends Error {
  constructor(
    public readonly reason: string,
    public readonly currentDailyLoss: number,
    public readonly totalLoss: number,
    public readonly mdlLimit: number,
    public readonly mlLimit: number
  ) {
    super(`Risk limit exceeded: ${reason}`);
    this.name = 'RiskLimitExceededError';
  }
}

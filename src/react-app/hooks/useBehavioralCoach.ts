import { useMemo } from 'react';
import { Trade } from './useTrades';

export interface BehavioralInsight {
  tiltRisk: boolean;
  consecutiveLosses: number;
  overconfidenceRisk: boolean;
  oversizedTrades: number;
  summary: string[];
}

export function useBehavioralCoach(trades: Trade[]) {
  const insights = useMemo<BehavioralInsight>(() => {
    const closed = trades.filter(t => t.is_closed && t.pnl !== null);
    if (!closed.length) {
      return {
        tiltRisk: false,
        consecutiveLosses: 0,
        overconfidenceRisk: false,
        oversizedTrades: 0,
        summary: ['Not enough closed trades to generate insights.']
      };
    }

    let consecutiveLosses = 0;
    let maxConsecutiveLosses = 0;
    let oversizedTrades = 0;
    let overconfidenceRisk = false;

    const sorted = [...closed].sort((a, b) => new Date(a.exit_date || a.entry_date).getTime() - new Date(b.exit_date || b.entry_date).getTime());
    let rollingWinStreak = 0;
    sorted.forEach((trade) => {
      const pnl = trade.pnl || 0;
      if (pnl < 0) {
        consecutiveLosses += 1;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
        rollingWinStreak = 0;
      } else if (pnl > 0) {
        rollingWinStreak += 1;
        if (rollingWinStreak >= 3 && (trade.leverage || 1) > 5) {
          overconfidenceRisk = true;
        }
        consecutiveLosses = 0;
      }
    });

    const sizes = sorted.map(t => Math.abs(t.quantity));
    const median = sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)] || 0;
    oversizedTrades = sorted.filter(t => Math.abs(t.quantity) > median * 1.5).length;

    const tiltRisk = maxConsecutiveLosses >= 3;
    const summary: string[] = [];
    if (tiltRisk) summary.push(`High tilt risk: ${maxConsecutiveLosses} losing trades in a row.`);
    if (overconfidenceRisk) summary.push('Overconfidence risk: high leverage after a win streak.');
    if (oversizedTrades > 0) summary.push(`${oversizedTrades} trades sized 50% above your median.`);
    if (!summary.length) summary.push('Behavior stable. Keep following your plan.');

    return {
      tiltRisk,
      consecutiveLosses: maxConsecutiveLosses,
      overconfidenceRisk,
      oversizedTrades,
      summary
    };
  }, [trades]);

  return {
    insights
  };
}

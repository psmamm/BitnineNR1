import { useEffect, useMemo, useState } from 'react';
import { Trade, useDailyStats } from './useTrades';
import { useUserEquity } from './useUserEquity';

export type RiskStatus = 'safe' | 'warn' | 'tilt';

export interface RiskSettings {
  dailyLossLimitPct: number; // % of equity
  maxRiskPerTradePct: number; // % of equity
  maxLeverage: number;
  enableTiltAlerts: boolean;
  audioAlerts: boolean;
}

export interface RiskSnapshot {
  dailyPnl: number;
  dailyLimit: number;
  drawdownPct: number;
  status: RiskStatus;
  recommendedSize: number;
  recommendedStopDistance: number;
  breachReason?: string;
}

const SETTINGS_KEY = 'tradecircle_risk_settings';

const DEFAULT_SETTINGS: RiskSettings = {
  dailyLossLimitPct: 3,
  maxRiskPerTradePct: 1,
  maxLeverage: 25,
  enableTiltAlerts: true,
  audioAlerts: false
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function useRiskEngine(trades: Trade[] = []) {
  const { equity } = useUserEquity();
  const { dailyStats } = useDailyStats();
  const [settings, setSettings] = useState<RiskSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Failed to load risk settings', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to persist risk settings', error);
    }
  }, [settings]);

  const updateSettings = (partial: Partial<RiskSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  const snapshot = useMemo<RiskSnapshot>(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayStats = dailyStats.find(stat => stat.date === today);
    const dailyPnl = todayStats?.daily_pnl || 0;
    const dailyLimit = (equity.currentEquity || equity.startingCapital) * (settings.dailyLossLimitPct / 100);
    const drawdownPct = dailyLimit > 0 ? Math.abs(dailyPnl) / dailyLimit : 0;

    const status: RiskStatus =
      drawdownPct >= 1 ? 'tilt' :
        drawdownPct >= 0.75 ? 'warn' :
          'safe';

    const closedTrades = trades.filter(t => t.is_closed && t.pnl !== null);
    const avgStopDistance = closedTrades.length
      ? Math.abs(
        closedTrades.reduce((sum, t) => {
          const basis = Math.max(Math.abs(t.entry_price * 0.005), 1);
          return sum + basis;
        }, 0) / closedTrades.length
      )
      : equity.currentEquity * 0.0005;

    const riskBudget = (equity.currentEquity || equity.startingCapital) * (settings.maxRiskPerTradePct / 100);
    const recommendedSize = avgStopDistance > 0 ? clamp(riskBudget / avgStopDistance, 0, Number.MAX_SAFE_INTEGER) : 0;

    const breachReason = status === 'tilt'
      ? 'Daily loss limit hit'
      : undefined;

    return {
      dailyPnl,
      dailyLimit,
      drawdownPct,
      status,
      recommendedSize,
      recommendedStopDistance: avgStopDistance,
      breachReason
    };
  }, [dailyStats, equity.currentEquity, equity.startingCapital, settings.dailyLossLimitPct, settings.maxRiskPerTradePct, trades]);

  const enforceTrade = ({
    side,
    entryPrice,
    stopLoss,
    size,
    leverage = 1,
    currentBalance
  }: {
    side: 'Long' | 'Short';
    entryPrice: number;
    stopLoss?: number;
    size: number;
    leverage?: number;
    currentBalance?: number;
  }) => {
    const balance = currentBalance || equity.currentEquity || equity.startingCapital;
    const riskBudget = balance * (settings.maxRiskPerTradePct / 100);
    const resolvedStop = stopLoss ?? (side === 'Long'
      ? entryPrice * 0.99
      : entryPrice * 1.01);
    const stopDistance = Math.abs(entryPrice - resolvedStop);
    const potentialLoss = stopDistance * size * leverage;

    const adjustedSize = stopDistance > 0 ? clamp(riskBudget / (stopDistance * leverage), 0, size) : size;
    const exceedsLeverage = leverage > settings.maxLeverage;
    const blocksDaily = snapshot.status === 'tilt';
    const breachesRisk = potentialLoss > riskBudget;

    const blocked = blocksDaily || exceedsLeverage || snapshot.drawdownPct >= 0.9;
    const reasons: string[] = [];
    if (blocksDaily) reasons.push('Daily loss limit exceeded');
    if (exceedsLeverage) reasons.push(`Leverage cap ${settings.maxLeverage}x`);
    if (breachesRisk) reasons.push('Size trimmed to stay within per-trade risk');

    return {
      blocked,
      reasons,
      adjustedSize: breachesRisk ? adjustedSize : size,
      enforcedStop: resolvedStop,
      potentialLoss
    };
  };

  return {
    settings,
    updateSettings,
    snapshot,
    enforceTrade
  };
}

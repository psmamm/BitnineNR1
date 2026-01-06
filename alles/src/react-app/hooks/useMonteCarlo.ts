import { useMemo, useState } from 'react';
import { Trade } from './useTrades';

export interface MonteCarloParams {
  runs: number;
  pathLength: number;
  startingBalance: number;
  maxDrawdownPct: number;
}

export interface MonteCarloOutcome {
  survivalRate: number; // percentage of paths that did not breach drawdown
  averageEndingBalance: number;
  worstDrawdownPct: number;
}

export interface WhatIfParams {
  takeProfitAdjustmentPct: number; // e.g. +10 => TP 10% larger
  stopLossAdjustmentPct: number; // e.g. -10 => SL 10% tighter (loss larger)
}

function sampleTrades(trades: Trade[], count: number) {
  const result: Trade[] = [];
  for (let i = 0; i < count; i++) {
    const pick = trades[Math.floor(Math.random() * trades.length)];
    result.push(pick);
  }
  return result;
}

export function useMonteCarlo(trades: Trade[]) {
  const closedTrades = useMemo(() => trades.filter(t => t.is_closed && t.pnl !== null), [trades]);
  const [monteResult, setMonteResult] = useState<MonteCarloOutcome | null>(null);
  const [whatIfResult, setWhatIfResult] = useState<{ adjustedPnl: number; totalPnl: number; delta: number } | null>(null);

  const simulate = (params: MonteCarloParams) => {
    if (!closedTrades.length) {
      setMonteResult({ survivalRate: 0, averageEndingBalance: params.startingBalance, worstDrawdownPct: 0 });
      return;
    }

    let survived = 0;
    let endingBalances: number[] = [];
    let worstDrawdownSeen = 0;

    for (let i = 0; i < params.runs; i++) {
      const path = sampleTrades(closedTrades, params.pathLength);
      let balance = params.startingBalance;
      let peak = balance;
      let maxDrawdownPct = 0;

      for (const trade of path) {
        balance += trade.pnl || 0;
        if (balance > peak) peak = balance;
        if (peak > 0) {
          const dd = ((peak - balance) / peak) * 100;
          if (dd > maxDrawdownPct) maxDrawdownPct = dd;
        }
        if (maxDrawdownPct >= params.maxDrawdownPct) break; // breach
      }

      if (maxDrawdownPct < params.maxDrawdownPct) {
        survived += 1;
      }

      endingBalances.push(balance);
      if (maxDrawdownPct > worstDrawdownSeen) worstDrawdownSeen = maxDrawdownPct;
    }

    const averageEndingBalance = endingBalances.reduce((s, v) => s + v, 0) / endingBalances.length;
    setMonteResult({
      survivalRate: (survived / params.runs) * 100,
      averageEndingBalance,
      worstDrawdownPct: worstDrawdownSeen
    });
  };

  const runWhatIf = (params: WhatIfParams) => {
    if (!closedTrades.length) {
      setWhatIfResult({ adjustedPnl: 0, totalPnl: 0, delta: 0 });
      return;
    }

    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const adjusted = closedTrades.reduce((sum, t) => {
      if ((t.pnl || 0) > 0) {
        const boosted = (t.pnl || 0) * (1 + params.takeProfitAdjustmentPct / 100);
        return sum + boosted;
      }
      if ((t.pnl || 0) < 0) {
        const tightened = (t.pnl || 0) * (1 + params.stopLossAdjustmentPct / 100);
        return sum + tightened;
      }
      return sum;
    }, 0);

    setWhatIfResult({ adjustedPnl: adjusted, totalPnl, delta: adjusted - totalPnl });
  };

  return {
    closedTrades,
    monteResult,
    whatIfResult,
    simulate,
    runWhatIf
  };
}

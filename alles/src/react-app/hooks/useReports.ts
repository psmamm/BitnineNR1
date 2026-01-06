import { useMemo } from 'react';
import { useTrades } from './useTrades';
import { useStrategies } from './useStrategies';

export interface MonthlyData {
  month: string;
  profit: number;
  trades: number;
  winRate: number;
}

export interface StrategyPerformanceData {
  strategy: string;
  profit: number;
  trades: number;
  winRate: number;
  avgTrade: number;
}

export interface PeriodStats {
  period: string;
  trades: number;
  winRate: string;
  avgWin: string;
  avgLoss: string;
  pnl: number;
  profitFactor: number;
}

export function useReports() {
  const { trades } = useTrades(1000); // Get all trades
  const { strategies } = useStrategies();

  // Calculate monthly performance data
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, { profit: number; trades: number; wins: number }>();
    
    trades.forEach(trade => {
      if (!trade.pnl || !trade.entry_date) return;
      
      const date = new Date(trade.entry_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { profit: 0, trades: 0, wins: 0 });
      }
      
      const monthData = monthlyMap.get(monthKey)!;
      monthData.profit += trade.pnl;
      monthData.trades += 1;
      if (trade.pnl > 0) monthData.wins += 1;
    });
    
    const result: MonthlyData[] = [];
    const now = new Date();
    
    // Generate last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      const data = monthlyMap.get(monthKey) || { profit: 0, trades: 0, wins: 0 };
      result.push({
        month: monthName,
        profit: Math.round(data.profit * 100) / 100,
        trades: data.trades,
        winRate: data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0
      });
    }
    
    return result;
  }, [trades]);

  // Calculate strategy performance data
  const strategyData = useMemo(() => {
    const strategyMap = new Map<number, { profit: number; trades: number; wins: number }>();
    
    trades.forEach(trade => {
      if (!trade.pnl || !trade.strategy_id) return;
      
      if (!strategyMap.has(trade.strategy_id)) {
        strategyMap.set(trade.strategy_id, { profit: 0, trades: 0, wins: 0 });
      }
      
      const strategyData = strategyMap.get(trade.strategy_id)!;
      strategyData.profit += trade.pnl;
      strategyData.trades += 1;
      if (trade.pnl > 0) strategyData.wins += 1;
    });
    
    const result: StrategyPerformanceData[] = [];
    
    strategies.forEach(strategy => {
      const data = strategyMap.get(strategy.id) || { profit: 0, trades: 0, wins: 0 };
      result.push({
        strategy: strategy.name,
        profit: Math.round(data.profit * 100) / 100,
        trades: data.trades,
        winRate: data.trades > 0 ? Math.round((data.wins / data.trades) * 100) : 0,
        avgTrade: data.trades > 0 ? Math.round((data.profit / data.trades) * 100) / 100 : 0
      });
    });
    
    return result.filter(item => item.trades > 0); // Only show strategies with trades
  }, [trades, strategies]);

  // Calculate win/loss distribution
  const winLossData = useMemo(() => {
    const closedTrades = trades.filter(trade => trade.is_closed && trade.pnl !== null);
    if (closedTrades.length === 0) {
      return [
        { name: 'Wins', value: 0, color: '#10B981' },
        { name: 'Losses', value: 0, color: '#EF4444' },
      ];
    }
    
    const wins = closedTrades.filter(trade => trade.pnl! > 0).length;
    const winRate = (wins / closedTrades.length) * 100;
    
    return [
      { name: 'Wins', value: Math.round(winRate), color: '#10B981' },
      { name: 'Losses', value: Math.round(100 - winRate), color: '#EF4444' },
    ];
  }, [trades]);

  // Calculate period breakdown
  const periodStats = useMemo(() => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const currentQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    
    const calculatePeriodStats = (startDate: Date, endDate: Date, label: string): PeriodStats => {
      const periodTrades = trades.filter(trade => {
        if (!trade.entry_date || !trade.is_closed || trade.pnl === null) return false;
        const tradeDate = new Date(trade.entry_date);
        return tradeDate >= startDate && tradeDate <= endDate;
      });
      
      if (periodTrades.length === 0) {
        return {
          period: label,
          trades: 0,
          winRate: '0%',
          avgWin: '$0.00',
          avgLoss: '$0.00',
          pnl: 0,
          profitFactor: 0
        };
      }
      
      const wins = periodTrades.filter(trade => trade.pnl! > 0);
      
      const totalPnl = periodTrades.reduce((sum, trade) => sum + trade.pnl!, 0);
      const grossWins = wins.reduce((sum, trade) => sum + trade.pnl!, 0);
      const grossLosses = Math.abs(periodTrades.filter(trade => trade.pnl! < 0).reduce((sum, trade) => sum + trade.pnl!, 0));
      
      const winRate = (wins.length / periodTrades.length) * 100;
      const avgWin = wins.length > 0 ? grossWins / wins.length : 0;
      const lossTrades = periodTrades.filter(trade => trade.pnl! < 0);
      const avgLoss = lossTrades.length > 0 ? grossLosses / lossTrades.length : 0;
      const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 999 : 0;
      
      return {
        period: label,
        trades: periodTrades.length,
        winRate: `${Math.round(winRate * 10) / 10}%`,
        avgWin: `$${Math.round(avgWin * 100) / 100}`,
        avgLoss: `-$${Math.round(avgLoss * 100) / 100}`,
        pnl: Math.round(totalPnl * 100) / 100,
        profitFactor: Math.round(profitFactor * 100) / 100
      };
    };
    
    return [
      calculatePeriodStats(currentMonth, now, 'This Month'),
      calculatePeriodStats(lastMonth, lastMonthEnd, 'Last Month'),
      calculatePeriodStats(currentQuarter, now, 'This Quarter'),
    ];
  }, [trades]);

  // Calculate key metrics for overview
  const keyMetrics = useMemo(() => {
    const closedTrades = trades.filter(trade => trade.is_closed && trade.pnl !== null);
    
    if (closedTrades.length === 0) {
      return {
        totalPnl: 0,
        winRate: 0,
        avgTrade: 0,
        sharpeRatio: 0,
        change: { totalPnl: 0, winRate: 0, avgTrade: 0, sharpeRatio: 0 }
      };
    }
    
    const totalPnl = closedTrades.reduce((sum, trade) => sum + trade.pnl!, 0);
    const wins = closedTrades.filter(trade => trade.pnl! > 0);
    const winRate = (wins.length / closedTrades.length) * 100;
    const avgTrade = totalPnl / closedTrades.length;
    
    // Calculate Sharpe ratio (simplified)
    const returns = closedTrades.map(trade => (trade.pnl! / (trade.entry_price * trade.quantity)) * 100);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
    
    // Calculate month-over-month changes (simplified)
    const thisMonth = periodStats.find(p => p.period === 'This Month');
    const lastMonth = periodStats.find(p => p.period === 'Last Month');
    
    const change = {
      totalPnl: thisMonth && lastMonth && lastMonth.pnl !== 0 ? 
        ((thisMonth.pnl - lastMonth.pnl) / Math.abs(lastMonth.pnl)) * 100 : 0,
      winRate: thisMonth && lastMonth ? 
        parseFloat(thisMonth.winRate) - parseFloat(lastMonth.winRate) : 0,
      avgTrade: thisMonth && lastMonth && lastMonth.trades > 0 ? 
        ((thisMonth.pnl / thisMonth.trades) - (lastMonth.pnl / lastMonth.trades)) : 0,
      sharpeRatio: Math.random() * 0.2 - 0.1 // Mock change for now
    };
    
    return {
      totalPnl: Math.round(totalPnl * 100) / 100,
      winRate: Math.round(winRate * 10) / 10,
      avgTrade: Math.round(avgTrade * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      change
    };
  }, [trades, periodStats]);

  return {
    monthlyData,
    strategyData,
    winLossData,
    periodStats,
    keyMetrics
  };
}

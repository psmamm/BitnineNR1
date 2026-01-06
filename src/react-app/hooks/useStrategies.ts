import { useApi, useApiMutation } from './useApi';

export interface Strategy {
  id: number;
  name: string;
  description?: string;
  category?: string;
  rules?: string;
  risk_per_trade?: number;
  target_rr?: number;
  timeframe?: string;
  is_active: boolean;
  trade_count: number;
  win_rate: number;
  avg_return: number;
  total_pnl: number;
  last_used?: string;
  created_at: string;
  updated_at: string;
}

export interface StrategyPerformance {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  trades: any[];
}

export function useStrategies() {
  const { data, loading, error, refetch } = useApi<{ strategies: Strategy[] }>('/api/strategies');
  
  return {
    strategies: data?.strategies || [],
    loading,
    error,
    refetch
  };
}

export function useStrategyPerformance(id: number) {
  const { data, loading, error, refetch } = useApi<StrategyPerformance>(
    `/api/strategies/${id}/performance`
  );
  
  return {
    performance: data || {
      totalTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgPnl: 0,
      bestTrade: 0,
      worstTrade: 0,
      trades: []
    },
    loading,
    error,
    refetch
  };
}

export function useCreateStrategy() {
  return useApiMutation('/api/strategies');
}

export function useUpdateStrategy(id: number) {
  return useApiMutation(`/api/strategies/${id}`, { method: 'PUT' });
}

export function useDeleteStrategy(id: number) {
  return useApiMutation(`/api/strategies/${id}`, { method: 'DELETE' });
}

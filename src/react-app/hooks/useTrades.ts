import { useApi, useApiMutation } from './useApi';

export interface Trade {
  id: number;
  symbol: string;
  asset_type?: 'stocks' | 'crypto' | 'forex';
  direction: 'long' | 'short';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  entry_date: string;
  exit_date?: string;
  pnl?: number;
  commission?: number;
  notes?: string;
  tags?: string;
  strategy_id?: number;
  strategy_name?: string;
  leverage?: number;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
  screenshot_url?: string;
  setup?: string;
  mistakes?: string;
  session?: string;
  emotion?: string;
  checklist?: string[];
  source?: 'api' | 'imported';
  rating?: number;
}

export interface TradeStats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
}

export interface EquityPoint {
  date: string;
  value: number;
}

export function useTrades(limit = 50, offset = 0, searchTerm = '', symbol = '', direction = '', assetType = '') {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString()
  });

  if (searchTerm) params.append('search', searchTerm);
  if (symbol) params.append('symbol', symbol);
  if (direction) params.append('direction', direction);
  if (assetType) params.append('asset_type', assetType);

  const { data, loading, error, refetch } = useApi<{ trades: Trade[]; hasMore: boolean }>(
    `/api/trades?${params.toString()}`
  );

  return {
    trades: data?.trades || [],
    hasMore: data?.hasMore || false,
    loading,
    error,
    refetch
  };
}

export function useTradeStats() {
  const { data, loading, error, refetch } = useApi<TradeStats>('/api/trades/stats');

  return {
    stats: data || {
      totalTrades: 0,
      winRate: 0,
      totalPnl: 0,
      avgPnl: 0,
      bestTrade: 0,
      worstTrade: 0,
      profitFactor: 0
    },
    loading,
    error,
    refetch
  };
}

export function useEquityCurve(days = 365) {
  const { data, loading, error, refetch } = useApi<{ data: EquityPoint[] }>(
    `/api/trades/equity-curve?days=${days}`
  );

  return {
    equityData: data?.data || [],
    loading,
    error,
    refetch
  };
}

export function useCreateTrade() {
  return useApiMutation('/api/trades');
}

export function useUpdateTrade(id: number) {
  return useApiMutation(`/api/trades/${id}`, { method: 'PUT' });
}

export function useDeleteTrade(id: number) {
  return useApiMutation(`/api/trades/${id}`, { method: 'DELETE' });
}

export interface DailyStat {
  date: string;
  trade_count: number;
  daily_pnl: number;
  wins: number;
  losses: number;
}

export function useDailyStats() {
  const { data, loading, error, refetch } = useApi<{ dailyStats: DailyStat[] }>('/api/trades/daily-stats');

  return {
    dailyStats: data?.dailyStats || [],
    loading,
    error,
    refetch
  };
}

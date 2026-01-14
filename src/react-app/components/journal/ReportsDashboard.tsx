import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { buildApiUrl } from '../../hooks/useApi';
import {
  TrendingUp,
  BarChart3,
  LineChart,
  Calendar,
  Clock,
  Target,
  Brain,
  Sparkles,
  Download,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ReportCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  reports: Report[];
}

interface Report {
  id: string;
  name: string;
  type: 'number' | 'chart' | 'table' | 'timeline';
  description?: string;
}

interface PerformanceOverview {
  total_pnl: number;
  win_rate: number;
  profit_factor: number;
  expectancy: number;
  max_drawdown: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  avg_win: number;
  avg_loss: number;
  best_trade: number;
  worst_trade: number;
  avg_holding_time: number;
  consecutive_wins: number;
  consecutive_losses: number;
}

interface DailyPnL {
  date: string;
  pnl: number;
  cumulative: number;
  trades: number;
}

interface WinRateData {
  label: string;
  total: number;
  wins: number;
  win_rate: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ReportsDashboard() {
  // State
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<PerformanceOverview | null>(null);
  const [dailyPnl, setDailyPnl] = useState<DailyPnL[]>([]);
  const [winRateByDay, setWinRateByDay] = useState<WinRateData[]>([]);
  const [winRateByHour, setWinRateByHour] = useState<WinRateData[]>([]);
  const [activeCategory, setActiveCategory] = useState('performance');
  const [dateRange, setDateRange] = useState('30d');

  // Report categories
  const categories: ReportCategory[] = [
    {
      id: 'performance',
      name: 'Performance',
      description: 'Track your overall trading performance',
      icon: <TrendingUp size={20} />,
      reports: [
        { id: 'daily_pnl', name: 'Daily P&L Curve', type: 'chart' },
        { id: 'weekly_summary', name: 'Weekly Summary', type: 'table' },
        { id: 'monthly_performance', name: 'Monthly Performance', type: 'chart' },
        { id: 'cumulative_returns', name: 'Cumulative Returns', type: 'chart' },
        { id: 'drawdown_analysis', name: 'Drawdown Analysis', type: 'chart' },
      ],
    },
    {
      id: 'timing',
      name: 'Timing Analysis',
      description: 'Analyze your best trading times',
      icon: <Clock size={20} />,
      reports: [
        { id: 'win_rate_day', name: 'Win Rate by Day', type: 'chart' },
        { id: 'win_rate_hour', name: 'Win Rate by Hour', type: 'chart' },
        { id: 'session_analysis', name: 'Session Analysis', type: 'table' },
        { id: 'holding_time', name: 'Holding Time Analysis', type: 'chart' },
      ],
    },
    {
      id: 'strategy',
      name: 'Strategy',
      description: 'Compare strategy performance',
      icon: <Target size={20} />,
      reports: [
        { id: 'strategy_comparison', name: 'Strategy Comparison', type: 'table' },
        { id: 'symbol_ranking', name: 'Symbol Ranking', type: 'table' },
        { id: 'setup_analysis', name: 'Setup Analysis', type: 'chart' },
      ],
    },
    {
      id: 'psychology',
      name: 'Psychology',
      description: 'Understand your trading psychology',
      icon: <Brain size={20} />,
      reports: [
        { id: 'emotion_correlation', name: 'Emotion Correlation', type: 'chart' },
        { id: 'tilt_detection', name: 'Tilt Detection', type: 'timeline' },
        { id: 'discipline_score', name: 'Discipline Score', type: 'number' },
      ],
    },
    {
      id: 'ai',
      name: 'AI Insights',
      description: 'AI-generated analysis and suggestions',
      icon: <Sparkles size={20} />,
      reports: [
        { id: 'weekly_ai_summary', name: 'Weekly AI Summary', type: 'table' },
        { id: 'improvement_suggestions', name: 'Improvement Suggestions', type: 'table' },
        { id: 'pattern_detection', name: 'Pattern Detection', type: 'chart' },
      ],
    },
  ];

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [overviewRes, dailyPnlRes, winRateDayRes, winRateHourRes] = await Promise.all([
        fetch(buildApiUrl(`/api/reports/performance/overview?range=${dateRange}`), { credentials: 'include' }),
        fetch(buildApiUrl(`/api/reports/performance/daily-pnl?range=${dateRange}`), { credentials: 'include' }),
        fetch(buildApiUrl(`/api/reports/performance/win-rate-by-day?range=${dateRange}`), { credentials: 'include' }),
        fetch(buildApiUrl(`/api/reports/performance/win-rate-by-hour?range=${dateRange}`), { credentials: 'include' }),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data);
      }

      if (dailyPnlRes.ok) {
        const data = await dailyPnlRes.json();
        setDailyPnl(data.data || []);
      }

      if (winRateDayRes.ok) {
        const data = await winRateDayRes.json();
        setWinRateByDay(data.data || []);
      }

      if (winRateHourRes.ok) {
        const data = await winRateHourRes.json();
        setWinRateByHour(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(buildApiUrl(`/api/reports/export?range=${dateRange}&format=json`), {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trading-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderMetricCard = (
    label: string,
    value: number | string,
    suffix: string = '',
    trend?: 'up' | 'down' | 'neutral',
    isPercentage?: boolean,
    isCurrency?: boolean
  ) => {
    const formattedValue = typeof value === 'number'
      ? isCurrency
        ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : isPercentage
        ? `${value.toFixed(1)}%`
        : value.toFixed(2)
      : value;

    const trendColors = {
      up: 'text-success',
      down: 'text-danger',
      neutral: 'text-zinc-400',
    };

    const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;

    return (
      <div className="glass p-4 rounded-xl">
        <p className="text-xs text-zinc-500 mb-1">{label}</p>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-semibold">{formattedValue}</span>
          {suffix && <span className="text-sm text-zinc-400 mb-1">{suffix}</span>}
          {trend && (
            <TrendIcon size={16} className={`mb-1 ${trendColors[trend]}`} />
          )}
        </div>
      </div>
    );
  };

  const renderMiniChart = (data: DailyPnL[]) => {
    if (!data.length) return null;

    const maxPnl = Math.max(...data.map((d) => Math.abs(d.cumulative)));
    const width = 200;
    const height = 60;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height / 2 - (d.cumulative / (maxPnl || 1)) * (height / 2 - 5);
      return `${x},${y}`;
    }).join(' ');

    const lastPnl = data[data.length - 1]?.cumulative || 0;
    const color = lastPnl >= 0 ? '#10B981' : '#F43F5E';

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={`0,${height} ${points} ${width},${height}`}
          fill="url(#chartGradient)"
        />
      </svg>
    );
  };

  const renderWinRateChart = (data: WinRateData[], type: 'day' | 'hour') => {
    if (!data.length) return null;

    const maxTotal = Math.max(...data.map((d) => d.total));

    return (
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-12 text-xs text-zinc-500">
              {type === 'day' ? item.label.slice(0, 3) : `${item.label}:00`}
            </span>
            <div className="flex-1 h-6 bg-dark-overlay rounded-full overflow-hidden relative">
              {/* Total trades bar */}
              <div
                className="absolute inset-y-0 left-0 bg-dark-surface rounded-full"
                style={{ width: `${(item.total / (maxTotal || 1)) * 100}%` }}
              />
              {/* Wins bar */}
              <div
                className="absolute inset-y-0 left-0 bg-success/60 rounded-full"
                style={{ width: `${(item.wins / (maxTotal || 1)) * 100}%` }}
              />
            </div>
            <span
              className={`w-12 text-xs font-mono ${
                item.win_rate >= 50 ? 'text-success' : 'text-danger'
              }`}
            >
              {item.win_rate.toFixed(0)}%
            </span>
            <span className="w-8 text-xs text-zinc-500">{item.total}</span>
          </div>
        ))}
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Trading Reports</h2>
          <p className="text-sm text-zinc-400">
            Comprehensive analytics for your trading performance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <div className="flex items-center gap-1 bg-dark-surface rounded-lg p-1">
            {['7d', '30d', '90d', '1y', 'all'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-primary-600 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-dark-overlay'
                }`}
              >
                {range === 'all' ? 'All Time' : range.toUpperCase()}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {renderMetricCard(
            'Total P&L',
            overview.total_pnl,
            '',
            overview.total_pnl >= 0 ? 'up' : 'down',
            false,
            true
          )}
          {renderMetricCard(
            'Win Rate',
            overview.win_rate,
            '',
            overview.win_rate >= 50 ? 'up' : 'down',
            true
          )}
          {renderMetricCard(
            'Profit Factor',
            overview.profit_factor,
            '',
            overview.profit_factor >= 1.5 ? 'up' : overview.profit_factor >= 1 ? 'neutral' : 'down'
          )}
          {renderMetricCard(
            'Expectancy',
            overview.expectancy,
            '',
            overview.expectancy > 0 ? 'up' : 'down',
            false,
            true
          )}
          {renderMetricCard(
            'Max Drawdown',
            Math.abs(overview.max_drawdown),
            '%',
            'neutral',
            true
          )}
          {renderMetricCard(
            'Sharpe Ratio',
            overview.sharpe_ratio,
            '',
            overview.sharpe_ratio >= 1 ? 'up' : 'neutral'
          )}
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-dark-overlay pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeCategory === category.id
                ? 'bg-primary-600/20 text-primary-400'
                : 'text-zinc-400 hover:text-white hover:bg-dark-overlay'
            }`}
          >
            {category.icon}
            <span className="text-sm font-medium">{category.name}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P&L Curve */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart size={18} className="text-primary-400" />
              Cumulative P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyPnl.length > 0 ? (
              <>
                {renderMiniChart(dailyPnl)}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-zinc-400">
                    {dailyPnl.length} trading days
                  </span>
                  <span
                    className={`font-mono ${
                      (dailyPnl[dailyPnl.length - 1]?.cumulative || 0) >= 0
                        ? 'text-success'
                        : 'text-danger'
                    }`}
                  >
                    {(dailyPnl[dailyPnl.length - 1]?.cumulative || 0) >= 0 ? '+' : ''}
                    ${(dailyPnl[dailyPnl.length - 1]?.cumulative || 0).toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-zinc-500 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Win Rate by Day */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={18} className="text-primary-400" />
              Win Rate by Day
            </CardTitle>
          </CardHeader>
          <CardContent>
            {winRateByDay.length > 0 ? (
              renderWinRateChart(winRateByDay, 'day')
            ) : (
              <p className="text-zinc-500 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Win Rate by Hour */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={18} className="text-primary-400" />
              Win Rate by Hour
            </CardTitle>
          </CardHeader>
          <CardContent>
            {winRateByHour.length > 0 ? (
              renderWinRateChart(winRateByHour.slice(0, 12), 'hour')
            ) : (
              <p className="text-zinc-500 text-center py-8">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Trade Statistics */}
        {overview && (
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={18} className="text-primary-400" />
                Trade Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Total Trades</span>
                    <span className="font-mono">{overview.total_trades}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Winners</span>
                    <span className="font-mono text-success">{overview.winning_trades}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Losers</span>
                    <span className="font-mono text-danger">{overview.losing_trades}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Avg Holding</span>
                    <span className="font-mono">{overview.avg_holding_time.toFixed(1)}h</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Avg Win</span>
                    <span className="font-mono text-success">
                      +${overview.avg_win.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Avg Loss</span>
                    <span className="font-mono text-danger">
                      -${Math.abs(overview.avg_loss).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Best Trade</span>
                    <span className="font-mono text-success">
                      +${overview.best_trade.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Worst Trade</span>
                    <span className="font-mono text-danger">
                      -${Math.abs(overview.worst_trade).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Streaks */}
              <div className="mt-4 pt-4 border-t border-dark-overlay flex justify-between">
                <div className="text-center">
                  <p className="text-xs text-zinc-500">Best Win Streak</p>
                  <p className="text-lg font-semibold text-success">
                    {overview.consecutive_wins}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-500">Worst Loss Streak</p>
                  <p className="text-lg font-semibold text-danger">
                    {overview.consecutive_losses}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-zinc-500">Sortino Ratio</p>
                  <p className="text-lg font-semibold">{overview.sortino_ratio.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report List */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
                  {category.icon}
                  {category.name}
                </div>
                <div className="space-y-1">
                  {category.reports.map((report) => (
                    <button
                      key={report.id}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left hover:bg-dark-overlay transition-colors"
                    >
                      <span>{report.name}</span>
                      <ChevronRight size={14} className="text-zinc-500" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ReportsDashboard;








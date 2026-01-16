/**
 * AI Insights Dashboard Page (Day 4-5)
 *
 * Advanced analytics and insights for AI Clone performance:
 * - Pattern Statistics (Win-Rate by Asset)
 * - Performance Correlation (Time of Day, Session)
 * - Interactive Charts
 * - Training History
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Calendar,
  Target,
  Zap,
  Brain,
  Activity,
  PieChart,
  RefreshCw,
  ChevronRight,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Filter,
} from 'lucide-react';

// Types
interface PatternStats {
  symbol: string;
  asset_class: string;
  total_patterns: number;
  avg_win_rate: number;
  avg_confidence: number;
  total_samples: number;
  total_pnl: number;
  best_setup: string;
}

interface SessionStats {
  session: string;
  trades: number;
  win_rate: number;
  avg_pnl: number;
  best_hour: number;
  worst_hour: number;
}

interface HourlyStats {
  hour: number;
  trades: number;
  win_rate: number;
  avg_pnl: number;
}

interface DayStats {
  day: string;
  day_number: number;
  trades: number;
  win_rate: number;
  avg_pnl: number;
}

interface TrainingHistory {
  id: string;
  training_type: string;
  status: string;
  trades_analyzed: number;
  patterns_found: number;
  patterns_updated: number;
  training_duration_ms: number;
  created_at: string;
  completed_at: string;
}

interface InsightsData {
  pattern_stats: PatternStats[];
  session_stats: SessionStats[];
  hourly_stats: HourlyStats[];
  day_stats: DayStats[];
  training_history: TrainingHistory[];
  summary: {
    total_patterns: number;
    total_trades_analyzed: number;
    overall_win_rate: number;
    best_asset: string;
    best_session: string;
    best_day: string;
    best_hour: number;
  };
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Session icons and colors
const SESSION_CONFIG: Record<string, { icon: typeof Sun; color: string; bg: string }> = {
  asian: { icon: Sunrise, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  london: { icon: Sun, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  new_york: { icon: Sunset, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  overlap: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  off_hours: { icon: Moon, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
};

// Day names
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AIInsightsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const getToken = useCallback(async () => {
    if (!user) return null;
    return await user.getIdToken();
  }, [user]);

  const fetchInsights = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const token = await getToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch pattern stats
      const [patternsRes, trainingRes] = await Promise.all([
        fetch(`/api/ai-clone/patterns?limit=100`, { headers }),
        fetch(`/api/ai-clone/training/history?limit=10`, { headers }),
      ]);

      let patterns: PatternStats[] = [];
      let trainingHistory: TrainingHistory[] = [];

      if (patternsRes.ok) {
        const data = await patternsRes.json();
        // Aggregate patterns by symbol
        const patternsBySymbol = new Map<string, PatternStats>();

        for (const p of data.patterns || []) {
          const existing = patternsBySymbol.get(p.symbol);
          if (existing) {
            existing.total_patterns++;
            existing.total_samples += p.sample_size || 0;
            existing.avg_win_rate =
              (existing.avg_win_rate * (existing.total_patterns - 1) + (p.win_rate || 0)) /
              existing.total_patterns;
            existing.avg_confidence =
              (existing.avg_confidence * (existing.total_patterns - 1) + (p.confidence || 0)) /
              existing.total_patterns;
            existing.total_pnl += (p.avg_pnl || 0) * (p.sample_size || 1);
            if ((p.win_rate || 0) > existing.avg_win_rate) {
              existing.best_setup = p.setup_type;
            }
          } else {
            patternsBySymbol.set(p.symbol, {
              symbol: p.symbol,
              asset_class: p.asset_class || 'crypto',
              total_patterns: 1,
              avg_win_rate: p.win_rate || 0,
              avg_confidence: p.confidence || 0,
              total_samples: p.sample_size || 0,
              total_pnl: (p.avg_pnl || 0) * (p.sample_size || 1),
              best_setup: p.setup_type || 'unknown',
            });
          }
        }

        patterns = Array.from(patternsBySymbol.values()).sort(
          (a, b) => b.avg_win_rate - a.avg_win_rate
        );
      }

      if (trainingRes.ok) {
        const data = await trainingRes.json();
        trainingHistory = data.trainings || [];
      }

      // Generate session stats (mock data for now - would come from trades analysis)
      const sessionStats: SessionStats[] = [
        {
          session: 'asian',
          trades: 45,
          win_rate: 0.58,
          avg_pnl: 12.5,
          best_hour: 3,
          worst_hour: 7,
        },
        {
          session: 'london',
          trades: 82,
          win_rate: 0.65,
          avg_pnl: 28.3,
          best_hour: 9,
          worst_hour: 12,
        },
        {
          session: 'new_york',
          trades: 95,
          win_rate: 0.62,
          avg_pnl: 22.1,
          best_hour: 14,
          worst_hour: 17,
        },
        {
          session: 'overlap',
          trades: 38,
          win_rate: 0.71,
          avg_pnl: 45.2,
          best_hour: 13,
          worst_hour: 15,
        },
        {
          session: 'off_hours',
          trades: 22,
          win_rate: 0.45,
          avg_pnl: -5.8,
          best_hour: 22,
          worst_hour: 2,
        },
      ];

      // Generate hourly stats
      const hourlyStats: HourlyStats[] = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        trades: Math.floor(Math.random() * 20) + 5,
        win_rate: 0.4 + Math.random() * 0.35,
        avg_pnl: (Math.random() - 0.3) * 50,
      }));

      // Generate day stats
      const dayStats: DayStats[] = DAY_NAMES.map((day, i) => ({
        day,
        day_number: i,
        trades: Math.floor(Math.random() * 30) + 10,
        win_rate: 0.45 + Math.random() * 0.3,
        avg_pnl: (Math.random() - 0.3) * 40,
      }));

      // Calculate summary
      const totalPatterns = patterns.reduce((sum, p) => sum + p.total_patterns, 0);
      const totalTrades = patterns.reduce((sum, p) => sum + p.total_samples, 0);
      const overallWinRate =
        patterns.length > 0
          ? patterns.reduce((sum, p) => sum + p.avg_win_rate * p.total_samples, 0) / totalTrades
          : 0;

      const bestAsset = patterns.length > 0 ? patterns[0].symbol : 'N/A';
      const bestSession = sessionStats.reduce((best, s) =>
        s.win_rate > best.win_rate ? s : best
      ).session;
      const bestDay = dayStats.reduce((best, d) => (d.win_rate > best.win_rate ? d : best)).day;
      const bestHour = hourlyStats.reduce((best, h) => (h.win_rate > best.win_rate ? h : best)).hour;

      setInsights({
        pattern_stats: patterns,
        session_stats: sessionStats,
        hourly_stats: hourlyStats,
        day_stats: dayStats,
        training_history: trainingHistory,
        summary: {
          total_patterns: totalPatterns,
          total_trades_analyzed: totalTrades,
          overall_win_rate: overallWinRate,
          best_asset: bestAsset,
          best_session: bestSession,
          best_day: bestDay,
          best_hour: bestHour,
        },
      });
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights, timeRange]);

  const formatHour = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}${ampm}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-32 rounded-3xl" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-6 p-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#03AAC7] to-[#00A89C] flex items-center justify-center shadow-lg shadow-[#03AAC7]/20">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">AI Insights</h1>
              <p className="text-sm text-zinc-500">Deep analytics of your AI Clone performance</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timeRange === range
                      ? 'bg-[#03AAC7] text-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {range === 'all' ? 'All' : range}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchInsights()}
              className="w-12 h-12 rounded-xl border-zinc-800 hover:border-[#03AAC7]/50"
            >
              <RefreshCw className="w-5 h-5 text-zinc-400" />
            </Button>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-[#03AAC7]/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#03AAC7]" />
              </div>
              <span className="text-xs text-zinc-500">Patterns</span>
            </div>
            <p className="text-3xl font-bold text-white">{insights?.summary.total_patterns || 0}</p>
            <p className="text-xs text-zinc-500 mt-1">Learned patterns</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <span className="text-xs text-zinc-500">Win Rate</span>
            </div>
            <p className="text-3xl font-bold text-emerald-400">
              {((insights?.summary.overall_win_rate || 0) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-zinc-500 mt-1">Overall performance</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-xs text-zinc-500">Best Hour</span>
            </div>
            <p className="text-3xl font-bold text-amber-400">
              {formatHour(insights?.summary.best_hour || 0)}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Highest win rate</p>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-blue-500" />
              </div>
              <span className="text-xs text-zinc-500">Best Asset</span>
            </div>
            <p className="text-2xl font-bold text-blue-400 font-mono">
              {insights?.summary.best_asset || 'N/A'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Top performer</p>
          </div>
        </motion.div>

        {/* Pattern Stats by Asset */}
        <motion.div
          variants={itemVariants}
          className="rounded-3xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden"
        >
          <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#03AAC7]/15 flex items-center justify-center">
                <PieChart className="w-6 h-6 text-[#03AAC7]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Pattern Performance by Asset</h2>
                <p className="text-xs text-zinc-500">Win rates and patterns per trading pair</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-800 hover:border-zinc-700"
              onClick={() => setSelectedAsset(null)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {selectedAsset || 'All Assets'}
            </Button>
          </div>

          <div className="p-6">
            {insights?.pattern_stats && insights.pattern_stats.length > 0 ? (
              <div className="space-y-3">
                {insights.pattern_stats.slice(0, 10).map((stat, i) => (
                  <motion.div
                    key={stat.symbol}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedAsset(stat.symbol)}
                    className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedAsset === stat.symbol
                        ? 'bg-[#03AAC7]/10 border-[#03AAC7]/30'
                        : 'bg-zinc-800/30 border-zinc-700/50 hover:border-zinc-600/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {i + 1}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">{stat.symbol}</span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                            {stat.total_patterns} patterns
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Best setup: {stat.best_setup} | {stat.total_samples} trades
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Win Rate Bar */}
                      <div className="w-32">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-zinc-500">Win Rate</span>
                          <span
                            className={`font-bold ${
                              stat.avg_win_rate >= 0.6
                                ? 'text-emerald-400'
                                : stat.avg_win_rate >= 0.5
                                ? 'text-amber-400'
                                : 'text-red-400'
                            }`}
                          >
                            {(stat.avg_win_rate * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stat.avg_win_rate * 100}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className={`h-full rounded-full ${
                              stat.avg_win_rate >= 0.6
                                ? 'bg-emerald-500'
                                : stat.avg_win_rate >= 0.5
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* P&L */}
                      <div className="text-right min-w-[80px]">
                        <p
                          className={`font-mono font-bold ${
                            stat.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {stat.total_pnl >= 0 ? '+' : ''}${stat.total_pnl.toFixed(0)}
                        </p>
                        <p className="text-xs text-zinc-500">Total P&L</p>
                      </div>

                      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                  <PieChart className="w-10 h-10 text-zinc-600" />
                </div>
                <p className="text-zinc-400 font-medium text-lg">No pattern data yet</p>
                <p className="text-sm text-zinc-600 mt-1">Train your AI Clone to generate insights</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Session Performance */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trading Sessions */}
          <div className="rounded-3xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden">
            <div className="flex items-center gap-4 p-6 border-b border-zinc-800/50">
              <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Activity className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Session Performance</h2>
                <p className="text-xs text-zinc-500">Win rates by market session</p>
              </div>
            </div>

            <div className="p-6 space-y-3">
              {insights?.session_stats.map((session, i) => {
                const config = SESSION_CONFIG[session.session] || SESSION_CONFIG.off_hours;
                const Icon = config.icon;

                return (
                  <motion.div
                    key={session.session}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-white capitalize">
                          {session.session.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {session.trades} trades | Best: {formatHour(session.best_hour)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p
                          className={`font-mono font-bold ${
                            session.win_rate >= 0.6
                              ? 'text-emerald-400'
                              : session.win_rate >= 0.5
                              ? 'text-amber-400'
                              : 'text-red-400'
                          }`}
                        >
                          {(session.win_rate * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-zinc-500">Win Rate</p>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <p
                          className={`font-mono font-bold ${
                            session.avg_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {session.avg_pnl >= 0 ? '+' : ''}${session.avg_pnl.toFixed(0)}
                        </p>
                        <p className="text-xs text-zinc-500">Avg P&L</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Day of Week Performance */}
          <div className="rounded-3xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden">
            <div className="flex items-center gap-4 p-6 border-b border-zinc-800/50">
              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Day of Week</h2>
                <p className="text-xs text-zinc-500">Performance by day</p>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-7 gap-2">
                {insights?.day_stats.map((day, i) => {
                  const isWeekend = day.day_number === 0 || day.day_number === 6;
                  return (
                    <motion.div
                      key={day.day}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`relative p-3 rounded-xl border text-center ${
                        isWeekend
                          ? 'bg-zinc-800/20 border-zinc-800/30'
                          : 'bg-zinc-800/30 border-zinc-700/50'
                      }`}
                    >
                      <p className="text-xs text-zinc-500 mb-2">{day.day.slice(0, 3)}</p>
                      <p
                        className={`text-lg font-bold ${
                          day.win_rate >= 0.6
                            ? 'text-emerald-400'
                            : day.win_rate >= 0.5
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {(day.win_rate * 100).toFixed(0)}%
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-1">{day.trades} trades</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Best Day Highlight */}
              <div className="mt-4 p-4 rounded-xl bg-[#03AAC7]/5 border border-[#03AAC7]/20">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-[#03AAC7]" />
                  <div>
                    <p className="text-sm text-[#03AAC7] font-medium">
                      Best Day: {insights?.summary.best_day}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Consider focusing your trading on this day
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Hourly Heatmap */}
        <motion.div
          variants={itemVariants}
          className="rounded-3xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden"
        >
          <div className="flex items-center gap-4 p-6 border-b border-zinc-800/50">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Hourly Performance Heatmap</h2>
              <p className="text-xs text-zinc-500">Win rates by hour of day (UTC)</p>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-12 gap-2">
              {insights?.hourly_stats.map((hour, i) => {
                const intensity = hour.win_rate;
                const bgColor =
                  intensity >= 0.6
                    ? `rgba(16, 185, 129, ${intensity})`
                    : intensity >= 0.5
                    ? `rgba(245, 158, 11, ${intensity})`
                    : `rgba(239, 68, 68, ${intensity})`;

                return (
                  <motion.div
                    key={hour.hour}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="group relative aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: bgColor }}
                  >
                    <span className="text-xs font-medium text-white/80">{hour.hour}</span>
                    <span className="text-[10px] text-white/60">
                      {(hour.win_rate * 100).toFixed(0)}%
                    </span>

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      <p className="text-xs text-white font-medium">{formatHour(hour.hour)}</p>
                      <p className="text-xs text-zinc-400">{hour.trades} trades</p>
                      <p
                        className={`text-xs font-medium ${
                          hour.avg_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {hour.avg_pnl >= 0 ? '+' : ''}${hour.avg_pnl.toFixed(2)} avg
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/60" />
                <span className="text-xs text-zinc-500">&lt;50%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-500/60" />
                <span className="text-xs text-zinc-500">50-60%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500/60" />
                <span className="text-xs text-zinc-500">&gt;60%</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Training History */}
        <motion.div
          variants={itemVariants}
          className="rounded-3xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden"
        >
          <div className="flex items-center gap-4 p-6 border-b border-zinc-800/50">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Brain className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Training History</h2>
              <p className="text-xs text-zinc-500">Recent AI training sessions</p>
            </div>
          </div>

          <div className="p-6">
            {insights?.training_history && insights.training_history.length > 0 ? (
              <div className="space-y-3">
                {insights.training_history.map((training, i) => (
                  <motion.div
                    key={training.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          training.status === 'completed'
                            ? 'bg-emerald-500/10'
                            : training.status === 'running'
                            ? 'bg-amber-500/10'
                            : 'bg-red-500/10'
                        }`}
                      >
                        {training.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : training.status === 'running' ? (
                          <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white capitalize">
                          {training.training_type} Training
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(training.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-lg font-mono font-bold text-white">
                          {training.trades_analyzed}
                        </p>
                        <p className="text-xs text-zinc-500">Trades</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-mono font-bold text-[#03AAC7]">
                          {training.patterns_found}
                        </p>
                        <p className="text-xs text-zinc-500">New</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-mono font-bold text-amber-400">
                          {training.patterns_updated}
                        </p>
                        <p className="text-xs text-zinc-500">Updated</p>
                      </div>
                      <div className="text-center min-w-[60px]">
                        <p className="text-sm font-mono text-zinc-400">
                          {(training.training_duration_ms / 1000).toFixed(1)}s
                        </p>
                        <p className="text-xs text-zinc-500">Duration</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-10 h-10 text-zinc-600" />
                </div>
                <p className="text-zinc-400 font-medium text-lg">No training history</p>
                <p className="text-sm text-zinc-600 mt-1">
                  Train your AI Clone to see history here
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recommendations */}
        <motion.div
          variants={itemVariants}
          className="rounded-3xl bg-[#03AAC7]/5 border border-[#03AAC7]/20 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#03AAC7]/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-[#03AAC7]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#03AAC7]">AI Recommendations</h3>
              <ul className="mt-3 space-y-2">
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  Focus on trading during{' '}
                  <span className="font-medium text-[#03AAC7]">
                    {insights?.summary.best_session?.replace('_', ' ')} session
                  </span>{' '}
                  for highest win rates
                </li>
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  Your best performing asset is{' '}
                  <span className="font-mono font-medium text-[#03AAC7]">
                    {insights?.summary.best_asset}
                  </span>{' '}
                  - consider increasing position sizes
                </li>
                <li className="flex items-start gap-2 text-sm text-zinc-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  Avoid trading during off-hours sessions where win rates are significantly lower
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}

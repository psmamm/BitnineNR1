/**
 * AI Clone Page - Modern Bitget Style (No Gradients)
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from '../hooks/useApi';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import {
  Cpu,
  Gauge,
  Crosshair,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  SlidersHorizontal,
  Play,
  Pause,
  Settings,
  Check,
  X,
  Clock,
  Workflow,
  ScanEye,
  Lightbulb,
  CircuitBoard,
  RefreshCw,
  Activity,
  Lock,
  LineChart,
  Rocket,
  Network,
  Sparkles,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from 'lucide-react';

// Types
interface AICloneConfig {
  permission_level: 'observe' | 'suggest' | 'semi_auto' | 'full_auto';
  is_active: boolean;
  min_confidence: number;
  max_position_size: number;
  max_position_percent: number;
  max_daily_trades: number;
  max_daily_loss: number;
  max_daily_loss_percent: number;
  allowed_symbols: string[];
  learning_enabled: boolean;
}

interface Pattern {
  id: string;
  pattern_type: string;
  symbol: string;
  setup_type: string;
  win_rate: number;
  avg_pnl: number;
  avg_pnl_percent: number;
  sample_size: number;
  confidence: number;
}

interface Suggestion {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  confidence: number;
  reasoning: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  position_size?: number;
  created_at: string;
  suggested_at?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'executing' | 'executed';
}

interface Stats {
  totalPatterns: number;
  avgConfidence: number;
  totalSuggestions: number;
  approvedSuggestions: number;
  successRate: number;
  executedTrades: number;
  totalPnl: number;
  winRate: number;
}

const PERMISSION_LEVELS = [
  {
    id: 'observe',
    label: 'Observe',
    description: 'AI learns silently',
    icon: ScanEye,
    bg: 'bg-slate-600',
    bgLight: 'bg-slate-600/10',
    text: 'text-slate-400',
    ring: 'ring-slate-500/30',
  },
  {
    id: 'suggest',
    label: 'Suggest',
    description: 'Get AI suggestions',
    icon: Lightbulb,
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-500/10',
    text: 'text-blue-400',
    ring: 'ring-blue-500/30',
  },
  {
    id: 'semi_auto',
    label: 'Semi-Auto',
    description: 'One-click execute',
    icon: Workflow,
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-500/10',
    text: 'text-orange-400',
    ring: 'ring-orange-500/30',
  },
  {
    id: 'full_auto',
    label: 'Full Auto',
    description: 'Autonomous AI',
    icon: CircuitBoard,
    bg: 'bg-[#FCD535]',
    bgLight: 'bg-[#FCD535]/10',
    text: 'text-[#FCD535]',
    ring: 'ring-[#FCD535]/30',
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function AIClonePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AICloneConfig | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [executingSuggestion, setExecutingSuggestion] = useState<string | null>(null);

  const getToken = useCallback(async () => {
    if (!user) return null;
    return await user.getIdToken();
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const token = await getToken();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      const [configRes, patternsRes, suggestionsRes, statsRes] = await Promise.all([
        fetch(buildApiUrl('/api/ai-clone/config'), { headers }),
        fetch(buildApiUrl('/api/ai-clone/patterns?limit=10'), { headers }),
        fetch(buildApiUrl('/api/ai-clone/suggestions?limit=5'), { headers }),
        fetch(buildApiUrl('/api/ai-clone/stats'), { headers }),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData.config || configData);
      }

      if (patternsRes.ok) {
        const patternsData = await patternsRes.json();
        setPatterns(patternsData.patterns || []);
      }

      if (suggestionsRes.ok) {
        const suggestionsData = await suggestionsRes.json();
        setSuggestions(suggestionsData.suggestions || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          totalPatterns: statsData.patterns?.total || 0,
          avgConfidence: statsData.patterns?.avg_confidence || 0,
          totalSuggestions: statsData.config?.total_suggestions || 0,
          approvedSuggestions: statsData.config?.accepted_suggestions || 0,
          successRate: statsData.decisions?.win_rate || 0,
          executedTrades: statsData.decisions?.executed || 0,
          totalPnl: statsData.decisions?.total_pnl || 0,
          winRate: statsData.decisions?.win_rate || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching AI Clone data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStartTraining = async () => {
    if (!user) return;
    setIsTraining(true);

    try {
      const token = await getToken();
      const res = await fetch(buildApiUrl('/api/ai-clone/train'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Training complete! Found ${data.patterns_found} new patterns, updated ${data.patterns_updated} existing patterns.`);
        fetchData();
      }
    } catch (error) {
      console.error('Training failed:', error);
    } finally {
      setIsTraining(false);
    }
  };

  const handlePermissionChange = async (level: string) => {
    if (!user || !config) return;

    try {
      const token = await getToken();
      const res = await fetch(buildApiUrl('/api/ai-clone/config'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permission_level: level }),
      });

      if (res.ok) {
        setConfig({ ...config, permission_level: level as AICloneConfig['permission_level'] });
      }
    } catch (error) {
      console.error('Failed to update permission:', error);
    }
  };

  const handleExecuteTrade = async (suggestion: Suggestion) => {
    if (!user || !config) return;
    if (config.permission_level !== 'semi_auto' && config.permission_level !== 'full_auto') return;

    setExecutingSuggestion(suggestion.id);

    try {
      const token = await getToken();
      const res = await fetch(buildApiUrl('/api/ai-clone/execute'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestion_id: suggestion.id,
          symbol: suggestion.symbol,
          side: suggestion.side,
          entry_price: suggestion.entry_price,
          stop_loss: suggestion.stop_loss,
          take_profit: suggestion.take_profit,
          position_size: suggestion.position_size || config.max_position_size,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(suggestions.map(s =>
          s.id === suggestion.id ? { ...s, status: 'executed' } : s
        ));
        alert(`Trade executed! Order ID: ${data.order_id || 'Pending'}`);
        fetchData();
      } else {
        const error = await res.json();
        alert(`Execution failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Trade execution failed:', error);
    } finally {
      setExecutingSuggestion(null);
    }
  };

  const handleSuggestionAction = async (suggestionId: string, action: 'approve' | 'reject', suggestion?: Suggestion) => {
    if (!user) return;

    if (action === 'approve' && config?.permission_level === 'semi_auto' && suggestion) {
      await handleExecuteTrade(suggestion);
      return;
    }

    try {
      const token = await getToken();
      const res = await fetch(buildApiUrl(`/api/ai-clone/suggestions/${suggestionId}/${action}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        setSuggestions(suggestions.map(s =>
          s.id === suggestionId
            ? { ...s, status: action === 'approve' ? 'approved' : 'rejected' }
            : s
        ));
      }
    } catch (error) {
      console.error(`Failed to ${action} suggestion:`, error);
    }
  };

  const handleToggleActive = async () => {
    if (!user || !config) return;

    try {
      const token = await getToken();
      const res = await fetch(buildApiUrl('/api/ai-clone/config'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !config.is_active }),
      });

      if (res.ok) {
        setConfig({ ...config, is_active: !config.is_active });
      }
    } catch (error) {
      console.error('Failed to toggle active state:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-40 rounded-3xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-52 rounded-3xl" />
        </div>
      </DashboardLayout>
    );
  }

  const currentLevel = PERMISSION_LEVELS.find(l => l.id === config?.permission_level) || PERMISSION_LEVELS[0];

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-6 p-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl bg-[#151517] border border-zinc-800/50"
        >
          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

          <div className="relative p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* AI Clone Avatar */}
                <div className="relative">
                  <div className={`relative w-20 h-20 rounded-2xl ${currentLevel.bg} flex items-center justify-center shadow-2xl`}>
                    <Cpu className="h-10 w-10 text-white" />
                  </div>
                  {config?.is_active && (
                    <motion.span
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FCD535] rounded-full flex items-center justify-center border-2 border-[#0a0a0c]"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Zap className="h-3 w-3 text-black" />
                    </motion.span>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <h1 className="text-3xl font-bold text-white">
                      AI Clone
                    </h1>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${currentLevel.bg} text-white`}>
                      {currentLevel.label}
                    </span>
                    {config?.is_active ? (
                      <motion.span
                        className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#FCD535]/10 border border-[#FCD535]/30 text-[#FCD535] text-xs font-medium"
                        animate={{ borderColor: ['rgba(0,217,200,0.3)', 'rgba(0,217,200,0.6)', 'rgba(0,217,200,0.3)'] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <motion.span
                          className="w-2 h-2 rounded-full bg-[#FCD535]"
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        Online
                      </motion.span>
                    ) : (
                      <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 text-xs">
                        <span className="w-2 h-2 rounded-full bg-zinc-600" />
                        Offline
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-sm">Autonomous trading AI powered by your trading patterns</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link to="/ai-insights">
                  <Button
                    variant="outline"
                    size="icon"
                    className="w-12 h-12 rounded-xl border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-[#FCD535]/50 transition-all"
                  >
                    <BarChart3 className="h-5 w-5 text-zinc-400" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSettings(!showSettings)}
                  className="w-12 h-12 rounded-xl border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-[#FCD535]/50 transition-all"
                >
                  <Settings className="h-5 w-5 text-zinc-400" />
                </Button>
                <Button
                  onClick={handleToggleActive}
                  className={`h-12 px-6 rounded-xl font-semibold transition-all ${
                    config?.is_active
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                      : 'bg-[#FCD535] text-black hover:bg-[#FCD535]/90'
                  }`}
                >
                  {config?.is_active ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" /> Stop AI
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" /> Start AI
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Patterns', value: stats?.totalPatterns || 0, icon: Crosshair, color: 'text-[#FCD535]', bg: 'bg-[#FCD535]/10', suffix: '' },
            { label: 'Confidence', value: ((stats?.avgConfidence || 0) * 100).toFixed(0), icon: Gauge, color: 'text-amber-500', bg: 'bg-amber-500/10', suffix: '%' },
            { label: 'Trades', value: stats?.executedTrades || 0, icon: LineChart, color: 'text-blue-500', bg: 'bg-blue-500/10', suffix: '', extra: `${((stats?.winRate || 0) * 100).toFixed(0)}% WR` },
            { label: 'P&L', value: (stats?.totalPnl || 0).toFixed(2), icon: (stats?.totalPnl || 0) >= 0 ? TrendingUp : TrendingDown, color: (stats?.totalPnl || 0) >= 0 ? 'text-emerald-500' : 'text-red-500', bg: (stats?.totalPnl || 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10', prefix: (stats?.totalPnl || 0) >= 0 ? '+$' : '$' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              className="group relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-zinc-800/50 p-5 hover:border-zinc-700/50 transition-all cursor-pointer"
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  {stat.extra && <span className="text-xs text-emerald-400 font-medium">{stat.extra}</span>}
                </div>
                <p className="text-3xl font-bold text-white tracking-tight">
                  {stat.prefix}{stat.value}{stat.suffix}
                </p>
                <p className="text-sm text-zinc-500 mt-1">{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Permission Level */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-3xl bg-zinc-900/50 border border-zinc-800/50 p-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#FCD535]/15 flex items-center justify-center">
              <SlidersHorizontal className="h-6 w-6 text-[#FCD535]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Permission Level</h2>
              <p className="text-sm text-zinc-500">Control AI autonomy</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PERMISSION_LEVELS.map((level) => {
              const Icon = level.icon;
              const isActive = config?.permission_level === level.id;
              return (
                <motion.button
                  key={level.id}
                  onClick={() => handlePermissionChange(level.id)}
                  className={`relative overflow-hidden p-5 rounded-2xl border-2 transition-all duration-300 ${
                    isActive
                      ? `border-transparent ring-2 ${level.ring}`
                      : 'border-zinc-800/50 hover:border-zinc-700'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isActive && (
                    <motion.div
                      className={`absolute inset-0 ${level.bgLight}`}
                      layoutId="activePermission"
                    />
                  )}
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-xl mb-4 flex items-center justify-center ${
                      isActive ? level.bg : 'bg-zinc-800/50'
                    }`}>
                      <Icon className={`h-7 w-7 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                      {level.label}
                    </h3>
                    <p className="text-xs text-zinc-600">{level.description}</p>
                    {isActive && (
                      <motion.div
                        className="absolute top-3 right-3"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <Check className="h-5 w-5 text-white" />
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trade Suggestions */}
          <motion.div
            variants={itemVariants}
            className="rounded-3xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <Rocket className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Signals</h2>
                  <p className="text-xs text-zinc-500">AI trade opportunities</p>
                </div>
              </div>
              <Button
                size="icon"
                variant="outline"
                className="w-10 h-10 rounded-xl border-zinc-800 hover:border-zinc-700"
                onClick={() => fetchData()}
              >
                <RefreshCw className="h-4 w-4 text-zinc-400" />
              </Button>
            </div>

            <div className="p-6">
              <AnimatePresence mode="wait">
                {suggestions.filter(s => s.status === 'pending').length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                      <Lightbulb className="h-10 w-10 text-zinc-600" />
                    </div>
                    <p className="text-zinc-400 font-medium text-lg">No active signals</p>
                    <p className="text-sm text-zinc-600 mt-1">AI is scanning for opportunities</p>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    {suggestions.filter(s => s.status === 'pending').map((suggestion, i) => (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="relative rounded-2xl bg-zinc-800/30 border border-zinc-700/50 p-5 hover:border-zinc-600/50 transition-all"
                      >
                        {/* Confidence Bar */}
                        <div
                          className="absolute top-0 left-0 h-1 rounded-t-2xl bg-[#FCD535]"
                          style={{ width: `${suggestion.confidence * 100}%` }}
                        />

                        <div className="flex items-center justify-between mb-4 pt-1">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-xl text-white">{suggestion.symbol}</span>
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                              suggestion.side === 'long'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {suggestion.side === 'long' ? <ArrowUpRight className="w-3 h-3 inline mr-1" /> : <ArrowDownRight className="w-3 h-3 inline mr-1" />}
                              {suggestion.side.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <Gauge className="h-4 w-4 text-amber-500" />
                            <span className="text-sm font-bold text-amber-400">{(suggestion.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
                            <p className="text-xs text-zinc-500 mb-1">Entry</p>
                            <p className="text-sm font-mono font-bold text-white">${suggestion.entry_price?.toFixed(2)}</p>
                          </div>
                          <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
                            <p className="text-xs text-zinc-500 mb-1">Stop</p>
                            <p className="text-sm font-mono font-bold text-red-400">${suggestion.stop_loss?.toFixed(2)}</p>
                          </div>
                          <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
                            <p className="text-xs text-zinc-500 mb-1">Target</p>
                            <p className="text-sm font-mono font-bold text-emerald-400">${suggestion.take_profit?.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(suggestion.created_at || suggestion.suggested_at || '').toLocaleTimeString()}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSuggestionAction(suggestion.id, 'reject')}
                              className="h-9 px-3 text-red-400 hover:bg-red-500/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSuggestionAction(suggestion.id, 'approve', suggestion)}
                              disabled={executingSuggestion === suggestion.id}
                              className="h-9 px-5 bg-[#FCD535] text-black font-bold hover:bg-[#FCD535]/90 transition-all"
                            >
                              {executingSuggestion === suggestion.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-1" />
                                  {config?.permission_level === 'semi_auto' ? 'Execute' : 'Approve'}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Learned Patterns */}
          <motion.div
            variants={itemVariants}
            className="rounded-3xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#FCD535]/15 flex items-center justify-center">
                  <Network className="h-6 w-6 text-[#FCD535]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Patterns</h2>
                  <p className="text-xs text-zinc-500">Learned from your trades</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleStartTraining}
                disabled={isTraining}
                className="h-10 px-5 bg-[#FCD535] text-black font-bold hover:bg-[#FCD535]/90"
              >
                {isTraining ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Training...</>
                ) : (
                  <><Cpu className="h-4 w-4 mr-2" /> Train</>
                )}
              </Button>
            </div>

            <div className="p-6">
              {patterns.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-2xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4">
                    <Network className="h-10 w-10 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 font-medium text-lg">No patterns yet</p>
                  <p className="text-sm text-zinc-600 mt-1">Train AI to learn from your trades</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patterns.map((pattern, i) => (
                    <motion.div
                      key={pattern.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50 hover:border-zinc-600/50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          pattern.win_rate >= 0.6 ? 'bg-emerald-500/10' :
                          pattern.win_rate >= 0.5 ? 'bg-amber-500/10' : 'bg-red-500/10'
                        }`}>
                          {pattern.win_rate >= 0.5 ? (
                            <TrendingUp className={`h-5 w-5 ${pattern.win_rate >= 0.6 ? 'text-emerald-500' : 'text-amber-500'}`} />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">{pattern.symbol}</span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-[#FCD535]/10 text-[#FCD535] font-medium">
                              {pattern.setup_type}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 mt-0.5">{pattern.sample_size} trades</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-bold text-lg ${
                          pattern.win_rate >= 0.6 ? 'text-emerald-400' :
                          pattern.win_rate >= 0.5 ? 'text-amber-400' : 'text-red-400'
                        }`}>
                          {(pattern.win_rate * 100).toFixed(0)}%
                        </p>
                        <p className="text-xs text-zinc-500">{(pattern.confidence * 100).toFixed(0)}% conf</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-3xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden"
            >
              <div className="flex items-center gap-4 p-6 border-b border-zinc-800/50">
                <div className="w-12 h-12 rounded-xl bg-[#FCD535]/15 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-[#FCD535]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Risk Settings</h2>
                  <p className="text-sm text-zinc-500">AI safety limits</p>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Max Position', value: `${config?.max_position_percent || 5}%` },
                    { label: 'Daily Trades', value: config?.max_daily_trades || 10 },
                    { label: 'Max Loss', value: `${config?.max_daily_loss_percent || 5}%` },
                    { label: 'Min Confidence', value: `${((config?.min_confidence || 0.7) * 100).toFixed(0)}%` },
                  ].map((setting, i) => (
                    <div key={i} className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-700/50">
                      <p className="text-xs text-zinc-500 mb-1">{setting.label}</p>
                      <p className="text-xl font-mono font-bold text-white">{setting.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-400">Safety Enabled</p>
                      <p className="text-sm text-amber-400/70 mt-1">
                        AI will never exceed your configured limits. All trades are protected.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full Auto Banner */}
        <AnimatePresence>
          {config?.permission_level === 'full_auto' && config?.is_active && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative overflow-hidden rounded-3xl bg-amber-500/10 border border-amber-500/30 p-6"
            >
              <div className="relative flex items-start gap-5">
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center"
                  animate={{ rotate: [0, 5, 0, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <CircuitBoard className="h-7 w-7 text-white" />
                </motion.div>
                <div>
                  <p className="font-bold text-amber-400 text-xl">Full Auto Mode Active</p>
                  <p className="text-zinc-400 mt-1">
                    AI is trading autonomously within your limits. All trades execute automatically.
                  </p>
                  <div className="flex items-center gap-6 mt-4">
                    <span className="flex items-center gap-2 text-sm text-amber-400">
                      <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                        <Activity className="h-4 w-4" />
                      </motion.div>
                      Scanning markets
                    </span>
                    <span className="flex items-center gap-2 text-sm text-zinc-500">
                      <Lock className="h-4 w-4" />
                      Risk protected
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
}

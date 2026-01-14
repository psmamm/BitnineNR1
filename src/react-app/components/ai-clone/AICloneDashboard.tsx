import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { buildApiUrl } from '../../hooks/useApi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Brain,
  Zap,
  Shield,
  TrendingUp,
  TrendingDown,
  Settings,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Sparkles,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Rocket,
  Database,
  Search,
  Cpu,
  Save,
  Check,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface AICloneConfig {
  permission_level: 'observe' | 'suggest' | 'semi_auto' | 'full_auto';
  is_active: boolean;
  max_position_percent: number;
  max_daily_trades: number;
  max_daily_loss_percent: number;
  min_confidence: number;
  learning_enabled: boolean;
  allowed_asset_classes: string[];
  allowed_symbols: string[];
  last_retrain_at: string | null;
  // Auto-training settings (Day 2)
  auto_train_enabled?: boolean;
  auto_train_threshold?: number;
  trades_since_training?: number;
}

// Training Progress Types (SSE)
interface TrainingStep {
  step: number;
  total: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress?: number;
  message?: string;
}

interface TrainingProgress {
  status: 'initializing' | 'running' | 'completed' | 'error';
  current_step: number;
  total_steps: number;
  steps: TrainingStep[];
  result?: {
    trades_analyzed: number;
    patterns_found: number;
    confidence_avg: number;
    training_time_ms: number;
  };
  error?: string;
}

const TRAINING_STEPS = [
  { name: 'Loading Trades', icon: Database },
  { name: 'Analyzing Patterns', icon: Search },
  { name: 'Building Model', icon: Cpu },
  { name: 'Optimizing', icon: Zap },
  { name: 'Saving Results', icon: Save },
];

interface Pattern {
  id: string;
  symbol: string;
  pattern_type: string;
  setup_type: string;
  win_rate: number;
  confidence: number;
  sample_size: number;
  avg_pnl_percent: number;
}

interface Suggestion {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  confidence: number;
  reasoning: string[];
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  suggested_at: string;
}

interface AICloneStats {
  config: {
    total_suggestions: number;
    accepted_suggestions: number;
    executed_trades: number;
    acceptance_rate: number;
    last_trade_at: string | null;
    last_retrain_at: string | null;
  };
  patterns: {
    total: number;
    avg_confidence: number;
    avg_win_rate: number;
    total_samples: number;
  };
  decisions: {
    total: number;
    approved: number;
    executed: number;
    wins: number;
    losses: number;
    total_pnl: number;
    win_rate: number;
  };
}

// ============================================================================
// PERMISSION LEVEL DESCRIPTIONS
// ============================================================================

const PERMISSION_LEVELS = {
  observe: {
    label: 'Observe',
    description: 'AI learns from your trades but never suggests',
    icon: <Brain size={18} />,
    color: 'text-zinc-400',
  },
  suggest: {
    label: 'Suggest',
    description: 'AI suggests trades, you decide to execute',
    icon: <Sparkles size={18} />,
    color: 'text-primary-400',
  },
  semi_auto: {
    label: 'Semi-Auto',
    description: 'AI executes after your confirmation',
    icon: <Zap size={18} />,
    color: 'text-warning',
  },
  full_auto: {
    label: 'Full Auto',
    description: 'AI trades automatically within limits',
    icon: <Bot size={18} />,
    color: 'text-success',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function AICloneDashboard() {
  // State
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AICloneConfig | null>(null);
  const [stats, setStats] = useState<AICloneStats | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Training Progress State (Day 3: SSE-based)
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [configRes, statsRes, patternsRes, suggestionsRes] = await Promise.all([
        fetch(buildApiUrl('/api/ai-clone/config'), { credentials: 'include' }),
        fetch(buildApiUrl('/api/ai-clone/stats'), { credentials: 'include' }),
        fetch(buildApiUrl('/api/ai-clone/patterns?min_confidence=0.6&limit=10'), { credentials: 'include' }),
        fetch(buildApiUrl('/api/ai-clone/suggestions'), { credentials: 'include' }),
      ]);

      if (configRes.ok) {
        const data = await configRes.json();
        setConfig(data.config);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      if (patternsRes.ok) {
        const data = await patternsRes.json();
        setPatterns(data.patterns || []);
      }

      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching AI Clone data:', error);
    } finally {
      setLoading(false);
    }
  };

  // SSE-based Training with Real-Time Progress (Day 3)
  const handleTrainWithSSE = useCallback(() => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsTraining(true);
    setShowTrainingModal(true);

    // Initialize progress state
    const initialProgress: TrainingProgress = {
      status: 'initializing',
      current_step: 0,
      total_steps: 5,
      steps: TRAINING_STEPS.map((step, i) => ({
        step: i + 1,
        total: 5,
        name: step.name,
        status: 'pending',
      })),
    };
    setTrainingProgress(initialProgress);

    // Create EventSource for SSE (GET request, cookies sent automatically)
    const eventSource = new EventSource(buildApiUrl('/api/ai-clone/training/start'));
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'start') {
          setTrainingProgress((prev) => prev ? { ...prev, status: 'running' } : prev);
        } else if (data.type === 'progress') {
          setTrainingProgress((prev) => {
            if (!prev) return prev;

            const updatedSteps = [...prev.steps];
            // Mark current step as running
            if (data.step > 0 && data.step <= 5) {
              // Mark previous steps as completed
              for (let i = 0; i < data.step - 1; i++) {
                updatedSteps[i] = { ...updatedSteps[i], status: 'completed' };
              }
              // Mark current step as running
              updatedSteps[data.step - 1] = {
                ...updatedSteps[data.step - 1],
                status: 'running',
                message: data.message,
              };
            }

            return {
              ...prev,
              status: 'running',
              current_step: data.step,
              steps: updatedSteps,
            };
          });
        } else if (data.type === 'complete') {
          setTrainingProgress((prev) => {
            if (!prev) return prev;

            // Mark all steps as completed
            const completedSteps = prev.steps.map((step) => ({
              ...step,
              status: 'completed' as const,
            }));

            return {
              ...prev,
              status: 'completed',
              current_step: 5,
              steps: completedSteps,
              result: {
                trades_analyzed: data.trades_analyzed,
                patterns_found: data.patterns_found,
                confidence_avg: data.confidence_avg || 0,
                training_time_ms: data.duration_ms || 0,
              },
            };
          });

          // Close connection on complete
          eventSource.close();
          setIsTraining(false);
          fetchData(); // Refresh data
        } else if (data.type === 'error') {
          setTrainingProgress((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: 'error',
              error: data.message || 'Training failed',
            };
          });
          eventSource.close();
          setIsTraining(false);
        }
      } catch (e) {
        console.error('Error parsing SSE data:', e);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource error:', err);
      setTrainingProgress((prev) => ({
        ...prev!,
        status: 'error',
        error: 'Connection lost. Please try again.',
      }));
      eventSource.close();
      setIsTraining(false);
    };
  }, [fetchData]);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Handle Auto-Training Toggle
  const handleAutoTrainToggle = async () => {
    if (!config) return;

    try {
      const response = await fetch(buildApiUrl('/api/ai-clone/config'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          auto_train_enabled: !config.auto_train_enabled,
        }),
      });

      if (response.ok) {
        setConfig({
          ...config,
          auto_train_enabled: !config.auto_train_enabled,
        });
      }
    } catch (error) {
      console.error('Error toggling auto-train:', error);
    }
  };

  const handleToggleActive = async () => {
    if (!config) return;

    try {
      const response = await fetch(buildApiUrl('/api/ai-clone/config'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !config.is_active }),
      });

      if (response.ok) {
        setConfig({ ...config, is_active: !config.is_active });
      }
    } catch (error) {
      console.error('Error toggling AI Clone:', error);
    }
  };

  const handlePermissionChange = async (level: AICloneConfig['permission_level']) => {
    try {
      const response = await fetch(buildApiUrl('/api/ai-clone/config'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permission_level: level }),
      });

      if (response.ok) {
        setConfig((prev) => prev ? { ...prev, permission_level: level } : null);
      }
    } catch (error) {
      console.error('Error updating permission level:', error);
    }
  };

  const handleSuggestionResponse = async (suggestionId: string, approved: boolean) => {
    try {
      const response = await fetch(buildApiUrl(`/api/ai-clone/suggestions/${suggestionId}/respond`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approved }),
      });

      if (response.ok) {
        setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
        fetchData(); // Refresh stats
      }
    } catch (error) {
      console.error('Error responding to suggestion:', error);
    }
  };

  const handleGenerateSuggestions = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/ai-clone/suggestions/generate'), {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestions?.length > 0) {
          setSuggestions(data.suggestions);
        } else {
          alert(data.message || 'No new suggestions available');
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate suggestions');
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Training Progress Modal */}
      <AnimatePresence>
        {showTrainingModal && trainingProgress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              if (trainingProgress.status === 'completed' || trainingProgress.status === 'error') {
                setShowTrainingModal(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#161A1E] border border-[#2B2F36] rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00D9C8] to-[#00A89C] flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#EAECEF]">
                    {trainingProgress.status === 'completed'
                      ? 'Training Complete!'
                      : trainingProgress.status === 'error'
                      ? 'Training Failed'
                      : 'Training Your AI Clone'}
                  </h3>
                  <p className="text-sm text-[#848E9C]">
                    {trainingProgress.status === 'completed'
                      ? 'Your AI Clone has been updated'
                      : trainingProgress.status === 'error'
                      ? trainingProgress.error
                      : 'Analyzing your trading patterns...'}
                  </p>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="space-y-3 mb-6">
                {trainingProgress.steps.map((step, index) => {
                  const StepIcon = TRAINING_STEPS[index]?.icon || Brain;
                  const isActive = step.status === 'running';
                  const isCompleted = step.status === 'completed';

                  return (
                    <motion.div
                      key={step.step}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-[#00D9C8]/10 border border-[#00D9C8]/30'
                          : isCompleted
                          ? 'bg-[#2EAD65]/10 border border-[#2EAD65]/30'
                          : 'bg-[#0B0E11] border border-[#2B2F36]'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isCompleted
                            ? 'bg-[#2EAD65]'
                            : isActive
                            ? 'bg-[#00D9C8]'
                            : 'bg-[#2B2F36]'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : isActive ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <RefreshCw className="w-4 h-4 text-white" />
                          </motion.div>
                        ) : (
                          <StepIcon className="w-4 h-4 text-[#848E9C]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm font-medium ${
                            isActive || isCompleted ? 'text-[#EAECEF]' : 'text-[#848E9C]'
                          }`}
                        >
                          {step.name}
                        </p>
                        {isActive && step.message && (
                          <p className="text-xs text-[#00D9C8]">{step.message}</p>
                        )}
                      </div>
                      <span className="text-xs text-[#848E9C]">{step.step}/5</span>
                    </motion.div>
                  );
                })}
              </div>

              {/* Results */}
              {trainingProgress.status === 'completed' && trainingProgress.result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0B0E11] border border-[#2B2F36] rounded-xl p-4 mb-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#848E9C]">Trades Analyzed</p>
                      <p className="text-xl font-mono font-semibold text-[#00D9C8]">
                        {trainingProgress.result.trades_analyzed}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#848E9C]">Patterns Found</p>
                      <p className="text-xl font-mono font-semibold text-[#2EAD65]">
                        {trainingProgress.result.patterns_found}
                      </p>
                    </div>
                    {trainingProgress.result.confidence_avg > 0 && (
                      <div>
                        <p className="text-xs text-[#848E9C]">Avg Confidence</p>
                        <p className="text-xl font-mono font-semibold text-[#F0B90B]">
                          {(trainingProgress.result.confidence_avg * 100).toFixed(0)}%
                        </p>
                      </div>
                    )}
                    {trainingProgress.result.training_time_ms > 0 && (
                      <div>
                        <p className="text-xs text-[#848E9C]">Training Time</p>
                        <p className="text-xl font-mono font-semibold text-[#EAECEF]">
                          {(trainingProgress.result.training_time_ms / 1000).toFixed(1)}s
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Close Button */}
              {(trainingProgress.status === 'completed' || trainingProgress.status === 'error') && (
                <Button
                  className="w-full bg-[#00D9C8] hover:bg-[#00C4B4] text-black font-medium"
                  onClick={() => setShowTrainingModal(false)}
                >
                  {trainingProgress.status === 'completed' ? 'Done' : 'Close'}
                </Button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Bot size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              AI Clone
              {config?.is_active && (
                <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
              )}
            </h2>
            <p className="text-sm text-zinc-400">
              Your personal trading AI that learns from your style
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={config?.is_active ? 'destructive' : 'success'}
            onClick={handleToggleActive}
          >
            {config?.is_active ? <Pause size={18} className="mr-2" /> : <Play size={18} className="mr-2" />}
            {config?.is_active ? 'Pause' : 'Activate'}
          </Button>

          <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={18} className="mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* PROMINENT: Train My Clone Card (Day 3) */}
      <Card className="glass border-[#00D9C8]/30 bg-gradient-to-br from-[#00D9C8]/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00D9C8] to-[#00A89C] flex items-center justify-center shadow-lg shadow-[#00D9C8]/20">
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-[#EAECEF] flex items-center gap-2">
                  Train My Clone
                  {config?.auto_train_enabled && (
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-[#2EAD65]/20 text-[#2EAD65] rounded-full">
                      AUTO
                    </span>
                  )}
                </h3>
                <p className="text-sm text-[#848E9C]">
                  {stats?.patterns.total_samples
                    ? `${stats.patterns.total_samples} trades available for analysis`
                    : 'Analyze your trading history to improve AI predictions'}
                </p>
                {config?.trades_since_training !== undefined && config.trades_since_training > 0 && (
                  <p className="text-xs text-[#F0B90B] mt-1">
                    {config.trades_since_training} new trades since last training
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-Train Toggle */}
              <button
                onClick={handleAutoTrainToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                  config?.auto_train_enabled
                    ? 'bg-[#2EAD65]/10 border-[#2EAD65]/50 text-[#2EAD65]'
                    : 'bg-[#2B2F36]/50 border-[#2B2F36] text-[#848E9C] hover:text-[#EAECEF]'
                }`}
              >
                {config?.auto_train_enabled ? (
                  <ToggleRight className="w-5 h-5" />
                ) : (
                  <ToggleLeft className="w-5 h-5" />
                )}
                <span className="text-sm font-medium">Auto-Train</span>
              </button>

              {/* Train Button */}
              <Button
                onClick={handleTrainWithSSE}
                disabled={isTraining}
                className="bg-[#00D9C8] hover:bg-[#00C4B4] text-black font-semibold px-6 py-3 h-auto text-base shadow-lg shadow-[#00D9C8]/20 hover:shadow-[#00D9C8]/30 transition-all"
              >
                {isTraining ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Training...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5 mr-2" />
                    Train Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Level Selector */}
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">Permission Level:</span>
            <div className="flex items-center gap-2">
              {Object.entries(PERMISSION_LEVELS).map(([level, info]) => (
                <button
                  key={level}
                  onClick={() => handlePermissionChange(level as AICloneConfig['permission_level'])}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    config?.permission_level === level
                      ? 'bg-primary-600/20 text-primary-400 border border-primary-500/50'
                      : 'bg-dark-surface text-zinc-400 hover:text-white hover:bg-dark-overlay'
                  }`}
                >
                  {info.icon}
                  <span className="text-sm font-medium">{info.label}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            {config && PERMISSION_LEVELS[config.permission_level].description}
          </p>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Target size={20} className="text-primary-400" />
                <span className={`text-xs ${stats.patterns.total > 0 ? 'text-success' : 'text-zinc-500'}`}>
                  {stats.patterns.total > 0 ? 'Active' : 'No patterns'}
                </span>
              </div>
              <p className="text-2xl font-semibold mt-2">{stats.patterns.total}</p>
              <p className="text-xs text-zinc-500">Learned Patterns</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Sparkles size={20} className="text-warning" />
                <span className="text-xs text-zinc-500">
                  {stats.config.acceptance_rate.toFixed(0)}% accepted
                </span>
              </div>
              <p className="text-2xl font-semibold mt-2">{stats.config.total_suggestions}</p>
              <p className="text-xs text-zinc-500">Total Suggestions</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <BarChart3 size={20} className="text-success" />
                <span className={`text-xs ${stats.decisions.win_rate >= 50 ? 'text-success' : 'text-danger'}`}>
                  {stats.decisions.win_rate.toFixed(1)}% win rate
                </span>
              </div>
              <p className="text-2xl font-semibold mt-2">{stats.decisions.executed}</p>
              <p className="text-xs text-zinc-500">Executed Trades</p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {stats.decisions.total_pnl >= 0 ? (
                  <TrendingUp size={20} className="text-success" />
                ) : (
                  <TrendingDown size={20} className="text-danger" />
                )}
              </div>
              <p className={`text-2xl font-semibold mt-2 ${
                stats.decisions.total_pnl >= 0 ? 'text-success' : 'text-danger'
              }`}>
                {stats.decisions.total_pnl >= 0 ? '+' : ''}${stats.decisions.total_pnl.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500">AI Clone P&L</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Suggestions */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap size={18} className="text-warning" />
              Trade Suggestions
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleGenerateSuggestions}>
              <RefreshCw size={14} className="mr-1" />
              Generate
            </Button>
          </CardHeader>
          <CardContent>
            {suggestions.length > 0 ? (
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-4 bg-dark-surface rounded-lg border border-dark-overlay"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">{suggestion.symbol}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            suggestion.side === 'long'
                              ? 'bg-success/20 text-success'
                              : 'bg-danger/20 text-danger'
                          }`}
                        >
                          {suggestion.side.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-zinc-500">Confidence:</span>
                        <span
                          className={`text-sm font-mono ${
                            suggestion.confidence >= 0.8
                              ? 'text-success'
                              : suggestion.confidence >= 0.7
                              ? 'text-warning'
                              : 'text-zinc-400'
                          }`}
                        >
                          {(suggestion.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-400 mb-3">
                      {suggestion.reasoning.slice(0, 2).map((reason, i) => (
                        <p key={i}>• {reason}</p>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">
                        {new Date(suggestion.suggested_at).toLocaleTimeString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSuggestionResponse(suggestion.id, false)}
                          className="text-danger hover:bg-danger/10"
                        >
                          <XCircle size={16} className="mr-1" />
                          Reject
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleSuggestionResponse(suggestion.id, true)}
                        >
                          <CheckCircle2 size={16} className="mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Sparkles className="mx-auto text-zinc-600 mb-2" size={32} />
                <p className="text-zinc-500">No active suggestions</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Train your AI Clone or generate new suggestions
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Patterns */}
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain size={18} className="text-primary-400" />
              Learned Patterns
            </CardTitle>
            <Button
              variant="premium"
              size="sm"
              onClick={handleTrainWithSSE}
              disabled={isTraining}
            >
              {isTraining ? (
                <RefreshCw size={14} className="mr-1 animate-spin" />
              ) : (
                <Zap size={14} className="mr-1" />
              )}
              {isTraining ? 'Training...' : 'Train'}
            </Button>
          </CardHeader>
          <CardContent>
            {patterns.length > 0 ? (
              <div className="space-y-2">
                {patterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="flex items-center justify-between p-3 bg-dark-surface rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          pattern.win_rate >= 0.6
                            ? 'bg-success/20'
                            : pattern.win_rate >= 0.5
                            ? 'bg-warning/20'
                            : 'bg-danger/20'
                        }`}
                      >
                        {pattern.win_rate >= 0.5 ? (
                          <ArrowUpRight className="text-success" size={18} />
                        ) : (
                          <ArrowDownRight className="text-danger" size={18} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{pattern.symbol}</p>
                        <p className="text-xs text-zinc-500">
                          {pattern.setup_type} • {pattern.sample_size} trades
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-sm font-mono ${
                          pattern.win_rate >= 0.5 ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {(pattern.win_rate * 100).toFixed(0)}% WR
                      </p>
                      <p className="text-xs text-zinc-500">
                        {(pattern.confidence * 100).toFixed(0)}% conf
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="mx-auto text-zinc-600 mb-2" size={32} />
                <p className="text-zinc-500">No patterns learned yet</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Complete at least 10 trades to train your AI Clone
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield size={18} className="text-primary-400" />
              Risk & Safety Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-sm text-zinc-400 block mb-2">
                  Max Position Size (%)
                </label>
                <input
                  type="number"
                  value={config?.max_position_percent || 5}
                  className="w-full bg-dark-surface border border-dark-overlay rounded-lg px-3 py-2"
                  disabled
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2">
                  Max Daily Trades
                </label>
                <input
                  type="number"
                  value={config?.max_daily_trades || 10}
                  className="w-full bg-dark-surface border border-dark-overlay rounded-lg px-3 py-2"
                  disabled
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2">
                  Max Daily Loss (%)
                </label>
                <input
                  type="number"
                  value={config?.max_daily_loss_percent || 5}
                  className="w-full bg-dark-surface border border-dark-overlay rounded-lg px-3 py-2"
                  disabled
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2">
                  Minimum Confidence (%)
                </label>
                <input
                  type="number"
                  value={(config?.min_confidence || 0.7) * 100}
                  className="w-full bg-dark-surface border border-dark-overlay rounded-lg px-3 py-2"
                  disabled
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2">
                  Allowed Asset Classes
                </label>
                <div className="flex flex-wrap gap-2">
                  {(config?.allowed_asset_classes || ['crypto']).map((asset) => (
                    <span
                      key={asset}
                      className="px-2 py-1 bg-primary-600/20 text-primary-400 rounded text-xs"
                    >
                      {asset}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2">
                  Learning Status
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      config?.learning_enabled ? 'bg-success' : 'bg-zinc-500'
                    }`}
                  />
                  <span className="text-sm">
                    {config?.learning_enabled ? 'Active' : 'Paused'}
                  </span>
                </div>
              </div>
            </div>

            {config?.last_retrain_at && (
              <div className="mt-4 pt-4 border-t border-dark-overlay flex items-center gap-2 text-xs text-zinc-500">
                <Clock size={12} />
                Last trained: {new Date(config.last_retrain_at).toLocaleString()}
              </div>
            )}

            <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-warning mt-0.5" />
                <div className="text-sm text-warning">
                  <p className="font-medium">Safety First</p>
                  <p className="text-xs text-warning/80 mt-1">
                    AI Clone will never exceed your risk limits. You can always pause or stop
                    the AI at any time. All automated trades require your prior authorization.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AICloneDashboard;


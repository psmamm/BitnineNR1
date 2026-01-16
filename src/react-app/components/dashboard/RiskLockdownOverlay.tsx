/**
 * Risk Lockdown Overlay Component
 *
 * Iron-Fist Discipline UI - Full-screen lockout overlay
 * Displayed when user hits 3 consecutive losses or MDL/ML limits
 *
 * Features:
 * - Live countdown timer (updates every second)
 * - Shows trigger trades that caused lockout
 * - Discipline history modal
 * - Animated warning visuals
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, History, X, TrendingDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../hooks/useApi';

interface DisciplineStatus {
  isLockedOut: boolean;
  lockoutUntil?: string;
  lockoutUntilTimestamp?: number;
  remainingSeconds?: number;
  remainingFormatted?: string;
  triggerTrades?: string[];
  eventId?: string;
  message?: string;
}

interface DisciplineEvent {
  id: string;
  eventType: string;
  triggerTrades: string[];
  lockoutUntil: string | null;
  createdAt: string;
  resolvedAt: string | null;
  wasForceUnlocked: boolean;
}

export default function RiskLockdownOverlay() {
  const { user } = useAuth();
  const [status, setStatus] = useState<DisciplineStatus | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<DisciplineEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch discipline status from new API
  const fetchDisciplineStatus = useCallback(async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(buildApiUrl('/api/discipline/status'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: DisciplineStatus = await response.json();
        setStatus(data);
      } else {
        setStatus({ isLockedOut: false });
      }
    } catch (error) {
      console.error('Failed to fetch discipline status:', error);
      setStatus({ isLockedOut: false });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch discipline history
  const fetchHistory = useCallback(async () => {
    if (!user) return;

    setHistoryLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(buildApiUrl('/api/discipline/history'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch discipline history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  // Initial fetch and polling
  useEffect(() => {
    fetchDisciplineStatus();
    const interval = setInterval(fetchDisciplineStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchDisciplineStatus]);

  // Calculate time remaining and update countdown
  useEffect(() => {
    if (!status?.lockoutUntilTimestamp) {
      setTimeRemaining('');
      return;
    }

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = status.lockoutUntilTimestamp! - now;

      if (remaining <= 0) {
        setStatus(null);
        setTimeRemaining('');
        fetchDisciplineStatus(); // Re-fetch to confirm lockout expired
        return;
      }

      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const seconds = remaining % 60;

      const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setTimeRemaining(formatted);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [status?.lockoutUntilTimestamp, fetchDisciplineStatus]);

  // Open history modal
  const handleShowHistory = () => {
    setShowHistory(true);
    fetchHistory();
  };

  // Don't show overlay if loading, no lockout, or lockout expired
  if (loading || !status?.isLockedOut || timeRemaining === '') {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center overflow-hidden"
        style={{ pointerEvents: 'auto' }}
      >
        {/* Animated background pulse */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-gradient-radial from-red-900/20 via-transparent to-transparent"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          {/* Danger stripes at top and bottom */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 animate-pulse" />
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 animate-pulse" />
        </div>

        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ duration: 0.4, type: "spring" }}
          className="text-center px-6 relative z-10 max-w-lg"
        >
          {/* Warning Icon with glow */}
          <motion.div
            className="mb-6 relative inline-block"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="absolute inset-0 bg-red-500/30 blur-3xl rounded-full" />
            <AlertTriangle className="w-24 h-24 text-red-500 relative z-10" strokeWidth={1.5} />
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-5xl font-black text-white mb-3 tracking-tight"
            animate={{ opacity: [1, 0.8, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            TRADING HALTED
          </motion.h1>

          {/* Reason */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <p className="text-xl text-red-400 font-semibold">
              3 Consecutive Losses Detected
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="bg-black/50 border border-red-500/30 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">
                Lockout Expires In
              </p>
            </div>
            <motion.div
              className="text-6xl font-mono font-black text-white tracking-wider"
              key={timeRemaining}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {timeRemaining}
            </motion.div>
            {status.lockoutUntil && (
              <p className="text-xs text-gray-500 mt-3">
                Until {new Date(status.lockoutUntil).toLocaleString()}
              </p>
            )}
          </div>

          {/* Trigger Trades */}
          {status.triggerTrades && status.triggerTrades.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-red-400 uppercase tracking-wider mb-2 font-medium">
                Trades That Triggered Lockout
              </p>
              <div className="space-y-1">
                {status.triggerTrades.map((tradeId, index) => (
                  <div key={tradeId} className="flex items-center gap-2 text-sm">
                    <span className="text-red-500">#{index + 1}</span>
                    <span className="text-gray-400 font-mono text-xs truncate">
                      {tradeId}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            Your trading has been temporarily suspended to protect your capital.
            Take this time to review your strategy and reset mentally.
          </p>

          {/* History Button */}
          <button
            onClick={handleShowHistory}
            className="flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-sm text-gray-300 transition-all"
          >
            <History className="w-4 h-4" />
            View Lockout History
          </button>
        </motion.div>
      </motion.div>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[101] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#161A1E] border border-[#2B2F36] rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2B2F36]">
                <h2 className="text-lg font-semibold text-white">Lockout History</h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-[#2B2F36] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#03AAC7] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No lockout history yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Lockouts will appear here when triggered
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((event) => (
                      <div
                        key={event.id}
                        className="bg-[#0B0E11] border border-[#2B2F36] rounded-xl p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-red-400 uppercase">
                            {event.eventType.replace(/_/g, ' ')}
                          </span>
                          {event.wasForceUnlocked && (
                            <span className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                              Force Unlocked
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 space-y-1">
                          <p>
                            <span className="text-gray-500">Triggered:</span>{' '}
                            {new Date(event.createdAt).toLocaleString()}
                          </p>
                          {event.lockoutUntil && (
                            <p>
                              <span className="text-gray-500">Until:</span>{' '}
                              {new Date(event.lockoutUntil).toLocaleString()}
                            </p>
                          )}
                          {event.resolvedAt && (
                            <p>
                              <span className="text-gray-500">Resolved:</span>{' '}
                              {new Date(event.resolvedAt).toLocaleString()}
                            </p>
                          )}
                          {event.triggerTrades.length > 0 && (
                            <p>
                              <span className="text-gray-500">Trades:</span>{' '}
                              {event.triggerTrades.length} losing trades
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

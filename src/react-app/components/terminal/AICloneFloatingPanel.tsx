/**
 * AI Clone Floating Panel Component
 *
 * Draggable, collapsible floating panel displaying AI Clone trading suggestions
 * in the Terminal. Features:
 * - Floating overlay (draggable, collapsible)
 * - Live suggestions feed from AI Clone
 * - Quick action buttons (Execute, Dismiss)
 * - Semi-auto mode: One-click execution
 * - Position persistence in localStorage
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useDragControls, AnimatePresence } from 'framer-motion';
import {
  Bot,
  X,
  Minimize2,
  GripVertical,
  TrendingUp,
  TrendingDown,
  Check,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Suggestion {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  reasoning: string;
  createdAt: Date;
  status: 'pending' | 'executed' | 'dismissed';
}

interface AICloneFloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'ai-clone-panel-position';

export function AICloneFloatingPanel({ isOpen, onClose }: AICloneFloatingPanelProps) {
  const { user } = useAuth();
  const dragControls = useDragControls();
  const containerRef = useRef<HTMLDivElement>(null);

  const [isMinimized, setIsMinimized] = useState(false);
  const [, setPosition] = useState({ x: 0, y: 0 });
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPosition(parsed);
      } catch {
        // Invalid JSON, use default position
      }
    }
  }, []);

  // Save position to localStorage on drag end
  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: { point: { x: number; y: number } }) => {
    const newPosition = { x: info.point.x, y: info.point.y };
    setPosition(newPosition);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPosition));
  }, []);

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/ai-clone/suggestions', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(
        (data.suggestions || []).map((s: Suggestion) => ({
          ...s,
          createdAt: new Date(s.createdAt),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suggestions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch and polling
  useEffect(() => {
    if (isOpen && user) {
      fetchSuggestions();
      const interval = setInterval(fetchSuggestions, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [isOpen, user, fetchSuggestions]);

  // Execute suggestion
  const handleExecute = async (suggestionId: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/ai-clone/suggestions/${suggestionId}/execute`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setSuggestions((prev) =>
          prev.map((s) => (s.id === suggestionId ? { ...s, status: 'executed' } : s))
        );
      }
    } catch (err) {
      console.error('Failed to execute suggestion:', err);
    }
  };

  // Dismiss suggestion
  const handleDismiss = async (suggestionId: string) => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      await fetch(`/api/ai-clone/suggestions/${suggestionId}/dismiss`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestionId ? { ...s, status: 'dismissed' } : s))
      );
    } catch (err) {
      console.error('Failed to dismiss suggestion:', err);
    }
  };

  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        className={`fixed z-50 bg-[#161A1E] border border-[#2B2F36] rounded-xl shadow-2xl overflow-hidden ${
          isMinimized ? 'w-12 h-12' : 'w-80'
        }`}
        style={{
          right: 20,
          bottom: 20,
        }}
      >
        {isMinimized ? (
          // Minimized state - just icon with badge
          <button
            onClick={() => setIsMinimized(false)}
            className="w-full h-full flex items-center justify-center relative bg-[#00D9C8]/10 hover:bg-[#00D9C8]/20 transition-colors"
          >
            <Bot className="w-6 h-6 text-[#00D9C8]" />
            {pendingSuggestions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#F6465D] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {pendingSuggestions.length}
              </span>
            )}
          </button>
        ) : (
          <>
            {/* Header */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex items-center justify-between px-3 py-2 bg-[#0B0E11] border-b border-[#2B2F36] cursor-grab active:cursor-grabbing"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-[#848E9C]" />
                <Bot className="w-4 h-4 text-[#00D9C8]" />
                <span className="text-sm font-medium text-[#EAECEF]">AI Clone</span>
                {pendingSuggestions.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#00D9C8]/20 text-[#00D9C8] text-[10px] font-medium rounded">
                    {pendingSuggestions.length} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchSuggestions}
                  disabled={loading}
                  className="p-1 hover:bg-[#2B2F36] rounded transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#848E9C] ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 hover:bg-[#2B2F36] rounded transition-colors"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-[#848E9C]" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-[#2B2F36] rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-[#848E9C]" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">
              {error && (
                <div className="px-3 py-2 bg-[#F6465D]/10 border-b border-[#F6465D]/20">
                  <div className="flex items-center gap-2 text-[#F6465D] text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {loading && suggestions.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 text-[#848E9C] animate-spin" />
                </div>
              ) : suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Bot className="w-8 h-8 text-[#848E9C] mb-2" />
                  <p className="text-sm text-[#848E9C]">No suggestions yet</p>
                  <p className="text-[10px] text-[#848E9C] mt-1">
                    AI Clone is analyzing market conditions
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#2B2F36]">
                  {suggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onExecute={handleExecute}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onExecute: (id: string) => void;
  onDismiss: (id: string) => void;
}

function SuggestionCard({ suggestion, onExecute, onDismiss }: SuggestionCardProps) {
  const isLong = suggestion.side === 'LONG';
  const sideColor = isLong ? 'text-[#2EAD65]' : 'text-[#F6465D]';
  const sideBg = isLong ? 'bg-[#2EAD65]/10' : 'bg-[#F6465D]/10';
  const SideIcon = isLong ? TrendingUp : TrendingDown;

  const isActioned = suggestion.status !== 'pending';

  return (
    <div className={`px-3 py-3 ${isActioned ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#EAECEF]">{suggestion.symbol}</span>
          <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${sideBg} ${sideColor}`}>
            <SideIcon className="w-3 h-3" />
            {suggestion.side}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#848E9C]">Confidence</span>
          <span
            className={`text-xs font-mono font-medium ${
              suggestion.confidence >= 80
                ? 'text-[#2EAD65]'
                : suggestion.confidence >= 60
                ? 'text-[#F0B90B]'
                : 'text-[#F6465D]'
            }`}
          >
            {suggestion.confidence}%
          </span>
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <span className="text-[10px] text-[#848E9C]">Entry</span>
          <p className="text-xs font-mono text-[#EAECEF]">${suggestion.entry.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-[10px] text-[#848E9C]">Stop Loss</span>
          <p className="text-xs font-mono text-[#F6465D]">${suggestion.stopLoss.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-[10px] text-[#848E9C]">Take Profit</span>
          <p className="text-xs font-mono text-[#2EAD65]">${suggestion.takeProfit.toLocaleString()}</p>
        </div>
      </div>

      {/* Reasoning */}
      <p className="text-[10px] text-[#848E9C] mb-2 line-clamp-2">{suggestion.reasoning}</p>

      {/* Actions */}
      {!isActioned ? (
        <div className="flex gap-2">
          <button
            onClick={() => onExecute(suggestion.id)}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#2EAD65]/10 hover:bg-[#2EAD65]/20 text-[#2EAD65] text-xs font-medium rounded transition-colors"
          >
            <Check className="w-3 h-3" />
            Execute
          </button>
          <button
            onClick={() => onDismiss(suggestion.id)}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#F6465D]/10 hover:bg-[#F6465D]/20 text-[#F6465D] text-xs font-medium rounded transition-colors"
          >
            <XCircle className="w-3 h-3" />
            Dismiss
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-1 text-[10px] text-[#848E9C]">
          {suggestion.status === 'executed' ? (
            <>
              <Check className="w-3 h-3 text-[#2EAD65]" />
              <span>Executed</span>
            </>
          ) : (
            <>
              <XCircle className="w-3 h-3 text-[#F6465D]" />
              <span>Dismissed</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

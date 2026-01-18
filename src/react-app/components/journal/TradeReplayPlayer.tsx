import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Maximize2,
  Minimize2,
  Pencil,
  MessageSquare,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Annotation {
  id: string;
  type: 'line' | 'horizontal' | 'vertical' | 'rectangle' | 'text' | 'arrow' | 'fibonacci';
  data: Record<string, unknown>;
  color: string;
  timestamp: number;
}

interface Note {
  id: string;
  timestamp: number;
  content: string;
  type: 'entry' | 'exit' | 'observation' | 'mistake' | 'lesson';
}

interface AIAnnotation {
  timestamp: number;
  type: 'entry_signal' | 'exit_signal' | 'pattern' | 'news' | 'divergence' | 'support' | 'resistance';
  description: string;
  confidence: number;
}

interface ReplayData {
  id: string;
  trade_id: string;
  tick_data: OHLCV[];
  timeframes_data?: Record<string, OHLCV[]>;
  drawings: Annotation[];
  notes: Note[];
  screenshots: Array<{ id: string; url: string; timestamp: number }>;
  ai_annotations: AIAnnotation[];
  what_if_scenarios: Array<{
    exitTimestamp: number;
    exitPrice: number;
    wouldBePnl: number;
    wouldBePnlPercent: number;
  }>;
}

interface Trade {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  exit_price: number;
  pnl: number;
  entry_date: string;
  exit_date: string;
}

interface TradeReplayPlayerProps {
  trade: Trade;
  replay: ReplayData | null;
  onAddNote?: (note: Omit<Note, 'id'>) => Promise<void>;
  onRequestAIAnalysis?: () => Promise<void>;
  onWhatIf?: (exitTimestamp: number, exitPrice: number) => Promise<void>;
}

// ============================================================================
// SPEED OPTIONS
// ============================================================================

const SPEED_OPTIONS = [
  { label: '0.25x', value: 0.25 },
  { label: '0.5x', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '5x', value: 5 },
  { label: '10x', value: 10 },
  { label: '25x', value: 25 },
  { label: '50x', value: 50 },
  { label: '100x', value: 100 },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function TradeReplayPlayer({
  trade,
  replay,
  onAddNote,
  onRequestAIAnalysis,
  onWhatIf,
}: TradeReplayPlayerProps) {
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [showAIAnnotations, setShowAIAnnotations] = useState(true);
  const [activeTimeframe, setActiveTimeframe] = useState('1m');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteType, setNoteType] = useState<Note['type']>('observation');

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Get current data based on timeframe
  const tickData = replay?.timeframes_data?.[activeTimeframe] || replay?.tick_data || [];
  const currentCandle = tickData[currentIndex];

  // Calculate progress percentage
  const progress = tickData.length > 0 ? (currentIndex / (tickData.length - 1)) * 100 : 0;

  // ============================================================================
  // PLAYBACK LOGIC
  // ============================================================================

  const tick = useCallback((timestamp: number) => {
    if (!isPlaying) return;

    const elapsed = timestamp - lastTickRef.current;
    const interval = 100 / speed; // Base interval adjusted by speed

    if (elapsed >= interval) {
      setCurrentIndex((prev) => {
        if (prev >= tickData.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
      lastTickRef.current = timestamp;
    }

    animationRef.current = requestAnimationFrame(tick);
  }, [isPlaying, speed, tickData.length]);

  useEffect(() => {
    if (isPlaying) {
      lastTickRef.current = performance.now();
      animationRef.current = requestAnimationFrame(tick);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, tick]);

  // ============================================================================
  // CANVAS RENDERING
  // ============================================================================

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tickData.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = '#0F0F12';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Calculate visible data range
    const visibleCandles = Math.min(100, currentIndex + 1);
    const startIndex = Math.max(0, currentIndex - visibleCandles + 1);
    const visibleData = tickData.slice(startIndex, currentIndex + 1);

    if (visibleData.length === 0) return;

    // Find price range
    const prices = visibleData.flatMap((d) => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.1;

    // Drawing helpers
    const candleWidth = (rect.width - 60) / visibleCandles;
    const gap = candleWidth * 0.2;
    const actualCandleWidth = candleWidth - gap;

    const priceToY = (price: number) => {
      const normalized = (maxPrice + padding - price) / (priceRange + padding * 2);
      return normalized * (rect.height - 40) + 20;
    };

    const indexToX = (i: number) => {
      return 40 + (i - startIndex) * candleWidth + candleWidth / 2;
    };

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const price = minPrice + (priceRange * i) / gridLines;
      const y = priceToY(price);
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();

      // Price labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(price.toFixed(2), 35, y + 3);
    }

    // Draw candles
    visibleData.forEach((candle, i) => {
      const x = indexToX(startIndex + i);
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#10B981' : '#F43F5E';

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, priceToY(candle.high));
      ctx.lineTo(x, priceToY(candle.low));
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      const bodyTop = priceToY(Math.max(candle.open, candle.close));
      const bodyBottom = priceToY(Math.min(candle.open, candle.close));
      const bodyHeight = Math.max(1, bodyBottom - bodyTop);
      ctx.fillRect(x - actualCandleWidth / 2, bodyTop, actualCandleWidth, bodyHeight);
    });

    // Draw entry line
    if (trade.entry_price) {
      const entryY = priceToY(trade.entry_price);
      ctx.strokeStyle = '#A855F7';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(40, entryY);
      ctx.lineTo(rect.width, entryY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#A855F7';
      ctx.font = 'bold 10px Inter';
      ctx.fillText(`Entry: ${trade.entry_price.toFixed(2)}`, rect.width - 80, entryY - 5);
    }

    // Draw exit line
    if (trade.exit_price) {
      const exitY = priceToY(trade.exit_price);
      const exitColor = trade.pnl >= 0 ? '#10B981' : '#F43F5E';
      ctx.strokeStyle = exitColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(40, exitY);
      ctx.lineTo(rect.width, exitY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = exitColor;
      ctx.font = 'bold 10px Inter';
      ctx.fillText(`Exit: ${trade.exit_price.toFixed(2)}`, rect.width - 80, exitY + 12);
    }

    // Draw AI annotations
    if (showAIAnnotations && replay?.ai_annotations) {
      replay.ai_annotations.forEach((annotation) => {
        const candleIndex = tickData.findIndex((d) => d.timestamp >= annotation.timestamp);
        if (candleIndex >= startIndex && candleIndex <= currentIndex) {
          const x = indexToX(candleIndex);
          const candle = tickData[candleIndex];
          const y = priceToY(candle.high) - 15;

          // Draw marker
          ctx.fillStyle = getAnnotationColor(annotation.type);
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();

          // Draw label on hover (simplified - always show for now)
          if (annotation.confidence > 0.7) {
            ctx.font = '9px Inter';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.textAlign = 'center';
            ctx.fillText(annotation.type.replace('_', ' '), x, y - 10);
          }
        }
      });
    }

    // Draw notes markers
    if (showNotes && replay?.notes) {
      replay.notes.forEach((note) => {
        const candleIndex = tickData.findIndex((d) => d.timestamp >= note.timestamp);
        if (candleIndex >= startIndex && candleIndex <= currentIndex) {
          const x = indexToX(candleIndex);
          const candle = tickData[candleIndex];
          const y = priceToY(candle.low) + 15;

          ctx.fillStyle = getNoteColor(note.type);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 5, y + 10);
          ctx.lineTo(x + 5, y + 10);
          ctx.closePath();
          ctx.fill();
        }
      });
    }
  }, [currentIndex, tickData, trade, replay, showAIAnnotations, showNotes]);

  // ============================================================================
  // CONTROLS
  // ============================================================================

  const handlePlayPause = () => setIsPlaying(!isPlaying);

  const handleSkipBack = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const handleSkipForward = () => {
    setCurrentIndex(tickData.length - 1);
    setIsPlaying(false);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newIndex = Math.floor(percent * (tickData.length - 1));
    setCurrentIndex(Math.max(0, Math.min(newIndex, tickData.length - 1)));
  };

  const handleAddNote = async () => {
    if (!noteContent.trim() || !onAddNote || !currentCandle) return;

    await onAddNote({
      timestamp: currentCandle.timestamp,
      content: noteContent,
      type: noteType,
    });

    setNoteContent('');
    setIsAddingNote(false);
  };

  const handleWhatIf = async () => {
    if (!onWhatIf || !currentCandle) return;
    await onWhatIf(currentCandle.timestamp, currentCandle.close);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!replay || !tickData.length) {
    return (
      <Card className="glass">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-zinc-400 text-center">
            <p className="text-lg font-medium">No Replay Data Available</p>
            <p className="text-sm mt-2">
              Replay data needs to be imported for this trade.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${isFullscreen ? 'fixed inset-0 z-50 bg-dark-base' : ''}`}
    >
      <Card className="glass overflow-hidden">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg">Trade Replay</CardTitle>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-mono ${
                  trade.pnl >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {trade.pnl >= 0 ? '+' : ''}
                {trade.pnl?.toFixed(2)} USD
              </span>
              <span className="text-xs text-zinc-500">{trade.symbol}</span>
            </div>
          </div>

          {/* Timeframe selector */}
          {replay.timeframes_data && (
            <div className="flex items-center gap-1 bg-dark-surface rounded-lg p-1">
              {Object.keys(replay.timeframes_data).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActiveTimeframe(tf)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    activeTimeframe === tf
                      ? 'bg-primary-600 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-dark-overlay'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Chart Canvas */}
          <div className="relative aspect-[2/1] min-h-[300px] bg-dark-base rounded-lg overflow-hidden">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            {/* Current price overlay */}
            {currentCandle && (
              <div className="absolute top-2 right-2 glass px-3 py-1 rounded-lg">
                <div className="flex items-center gap-3 text-sm font-mono">
                  <span className="text-zinc-400">O:</span>
                  <span>{currentCandle.open.toFixed(2)}</span>
                  <span className="text-zinc-400">H:</span>
                  <span className="text-success">{currentCandle.high.toFixed(2)}</span>
                  <span className="text-zinc-400">L:</span>
                  <span className="text-danger">{currentCandle.low.toFixed(2)}</span>
                  <span className="text-zinc-400">C:</span>
                  <span
                    className={
                      currentCandle.close >= currentCandle.open
                        ? 'text-success'
                        : 'text-danger'
                    }
                  >
                    {currentCandle.close.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div
            className="h-2 bg-dark-surface rounded-full cursor-pointer overflow-hidden"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-gradient-to-r from-primary-600 to-primary-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleSkipBack}>
                <SkipBack size={18} />
              </Button>

              <Button
                variant="premium"
                size="icon"
                onClick={handlePlayPause}
                className="w-12 h-12"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </Button>

              <Button variant="ghost" size="icon" onClick={handleSkipForward}>
                <SkipForward size={18} />
              </Button>

              {/* Speed selector */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center gap-1"
                >
                  <FastForward size={14} />
                  {speed}x
                  <ChevronDown size={14} />
                </Button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full left-0 mb-2 glass rounded-lg overflow-hidden z-10">
                    {SPEED_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSpeed(option.value);
                          setShowSpeedMenu(false);
                        }}
                        className={`block w-full px-4 py-2 text-left text-sm hover:bg-dark-overlay transition-colors ${
                          speed === option.value ? 'bg-primary-600/20 text-primary-400' : ''
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Time display */}
            <div className="text-sm text-zinc-400 font-mono">
              {currentCandle && new Date(currentCandle.timestamp).toLocaleString()}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotes(!showNotes)}
                className={showNotes ? 'text-primary-400' : ''}
              >
                <MessageSquare size={16} className="mr-1" />
                Notes
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAIAnnotations(!showAIAnnotations)}
                className={showAIAnnotations ? 'text-primary-400' : ''}
              >
                <Sparkles size={16} className="mr-1" />
                AI
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingNote(true)}
              >
                <Pencil size={16} className="mr-1" />
                Add Note
              </Button>

              {onWhatIf && (
                <Button variant="outline" size="sm" onClick={handleWhatIf}>
                  What If?
                </Button>
              )}

              {onRequestAIAnalysis && (
                <Button variant="premium" size="sm" onClick={onRequestAIAnalysis}>
                  <Sparkles size={16} className="mr-1" />
                  Analyze
                </Button>
              )}
            </div>
          </div>

          {/* Add Note Modal */}
          {isAddingNote && (
            <div className="glass rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as Note['type'])}
                  className="bg-dark-surface border border-dark-overlay rounded-lg px-3 py-2 text-sm"
                >
                  <option value="observation">Observation</option>
                  <option value="entry">Entry</option>
                  <option value="exit">Exit</option>
                  <option value="mistake">Mistake</option>
                  <option value="lesson">Lesson</option>
                </select>
              </div>

              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add your note for this moment..."
                className="w-full bg-dark-surface border border-dark-overlay rounded-lg px-3 py-2 text-sm resize-none h-20"
                autoFocus
              />

              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingNote(false)}
                >
                  Cancel
                </Button>
                <Button variant="default" size="sm" onClick={handleAddNote}>
                  Add Note
                </Button>
              </div>
            </div>
          )}

          {/* Notes List */}
          {showNotes && replay.notes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-400">Notes</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {replay.notes.map((note) => (
                  <div
                    key={note.id}
                    className="glass px-3 py-2 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ backgroundColor: getNoteColor(note.type) + '20', color: getNoteColor(note.type) }}
                      >
                        {note.type}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(note.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-zinc-300">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAnnotationColor(type: AIAnnotation['type']): string {
  const colors: Record<AIAnnotation['type'], string> = {
    entry_signal: '#10B981',
    exit_signal: '#F43F5E',
    pattern: '#A855F7',
    news: '#F59E0B',
    divergence: '#06B6D4',
    support: '#22C55E',
    resistance: '#EF4444',
  };
  return colors[type] || '#A855F7';
}

function getNoteColor(type: Note['type']): string {
  const colors: Record<Note['type'], string> = {
    entry: '#10B981',
    exit: '#F43F5E',
    observation: '#A855F7',
    mistake: '#F59E0B',
    lesson: '#06B6D4',
  };
  return colors[type] || '#A855F7';
}

export default TradeReplayPlayer;









/**
 * WebGL Orderbook Component
 *
 * High-performance orderbook visualization using WebGL for 60fps rendering.
 * Features:
 * - GPU-accelerated depth bar rendering
 * - Heat map color gradients (teal/green for bids, orange/red for asks)
 * - Aggregation toggle (0.1, 0.5, 1.0 tick sizes)
 * - Real-time updates via Bybit V5 WebSocket
 * - Click-to-set-price functionality
 * - Smooth animation on updates
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSymbol } from '../../contexts/SymbolContext';
import { useBybitOrderbook } from '../../hooks/useBybitOrderbook';
import { ScrollArea } from '../ui/scroll-area';
import { RAFThrottle } from '../../utils/rafThrottle';
import { RingBuffer } from '../../utils/ringBuffer';
import {
  initializeWebGLRenderer,
  renderOrderbook,
  disposeRenderer,
  type WebGLOrderbookRenderer,
} from '../../utils/webgl/orderbookShaders';
import type { OrderbookLevel, TickSize, OrderbookData } from '../../types/terminal';

interface WebGLOrderbookProps {
  onPriceClick?: (price: number) => void;
}

export function WebGLOrderbook({ onPriceClick }: WebGLOrderbookProps) {
  const { symbol } = useSymbol();
  const [activeTab, setActiveTab] = useState<'orderbook' | 'trades'>('orderbook');
  const [tickSize, setTickSize] = useState<TickSize>(0.1);
  const [useWebGL, setUseWebGL] = useState(true);

  const { orderbook, error } = useBybitOrderbook(symbol);

  // Canvas and WebGL refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLOrderbookRenderer | null>(null);
  const animationFrameRef = useRef<number>(0);
  const animationProgressRef = useRef(0);

  // Performance optimizations
  const rafThrottleRef = useRef<RAFThrottle | null>(null);
  const ringBufferRef = useRef<RingBuffer<OrderbookData>>(new RingBuffer<OrderbookData>(50));
  const [aggregatedLevels, setAggregatedLevels] = useState<{
    bids: OrderbookLevel[];
    asks: OrderbookLevel[];
  }>({ bids: [], asks: [] });

  // Initialize RAF throttle
  useEffect(() => {
    rafThrottleRef.current = new RAFThrottle(60);
    return () => {
      rafThrottleRef.current?.cancel();
    };
  }, []);

  // Initialize WebGL renderer
  useEffect(() => {
    if (!canvasRef.current || !useWebGL) return;

    const renderer = initializeWebGLRenderer(canvasRef.current);
    if (renderer) {
      rendererRef.current = renderer;
    } else {
      setUseWebGL(false);
    }

    return () => {
      if (rendererRef.current) {
        disposeRenderer(rendererRef.current);
        rendererRef.current = null;
      }
    };
  }, [useWebGL]);

  // Aggregate orderbook levels based on tick size
  const aggregateLevels = useCallback(
    (orderbookData: OrderbookData): { bids: OrderbookLevel[]; asks: OrderbookLevel[] } => {
      const aggregate = (levels: OrderbookLevel[], sortDesc: boolean): OrderbookLevel[] => {
        const grouped = new Map<number, number>();

        levels.forEach((level) => {
          const roundedPrice = Math.floor(level.price / tickSize) * tickSize;
          const existing = grouped.get(roundedPrice) || 0;
          grouped.set(roundedPrice, existing + level.size);
        });

        const aggregated: OrderbookLevel[] = [];
        let cumulative = 0;

        const entries = Array.from(grouped.entries()).sort((a, b) =>
          sortDesc ? b[0] - a[0] : a[0] - b[0]
        );

        entries.forEach(([price, size]) => {
          cumulative += size;
          aggregated.push({ price, size, total: cumulative });
        });

        return aggregated;
      };

      return {
        bids: aggregate(orderbookData.bids, true),
        asks: aggregate(orderbookData.asks, false),
      };
    },
    [tickSize]
  );

  // Update orderbook with RAF throttling and ring buffer
  useEffect(() => {
    if (!orderbook) return;

    ringBufferRef.current.push(orderbook);

    if (rafThrottleRef.current) {
      rafThrottleRef.current.schedule(() => {
        const latest = ringBufferRef.current.getLatest();
        if (latest) {
          const aggregated = aggregateLevels(latest);
          setAggregatedLevels(aggregated);

          // Trigger animation
          animationProgressRef.current = 0;
        }
      });
    }
  }, [orderbook, aggregateLevels]);

  // WebGL render loop
  useEffect(() => {
    if (!useWebGL || !rendererRef.current || !canvasRef.current) return;

    const render = () => {
      if (!rendererRef.current || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();

      // Update canvas size if needed
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      // Animate progress
      animationProgressRef.current = Math.min(1, animationProgressRef.current + 0.1);

      // Render orderbook
      renderOrderbook(rendererRef.current, aggregatedLevels.bids, aggregatedLevels.asks, {
        width: canvas.width,
        height: canvas.height,
        animationProgress: animationProgressRef.current,
        opacity: 0.8,
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [useWebGL, aggregatedLevels]);

  // Calculate max totals for depth bar width
  const maxBidTotal = useMemo(
    () => aggregatedLevels.bids[aggregatedLevels.bids.length - 1]?.total || 1,
    [aggregatedLevels.bids]
  );
  const maxAskTotal = useMemo(
    () => aggregatedLevels.asks[aggregatedLevels.asks.length - 1]?.total || 1,
    [aggregatedLevels.asks]
  );

  const handlePriceClick = (price: number) => {
    onPriceClick?.(price);
  };

  return (
    <div className="h-full flex flex-col bg-[#161A1E] terminal-panel">
      {/* Header */}
      <div className="h-10 border-b border-[#2B2F36] flex items-center px-3 gap-3 shrink-0">
        <button
          onClick={() => setActiveTab('orderbook')}
          className={`text-xs transition-colors ${
            activeTab === 'orderbook' ? 'text-[#EAECEF]' : 'text-[#848E9C] hover:text-[#EAECEF]'
          }`}
        >
          Order Book
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`text-xs transition-colors ${
            activeTab === 'trades' ? 'text-[#EAECEF]' : 'text-[#848E9C] hover:text-[#EAECEF]'
          }`}
        >
          Trades
        </button>

        {activeTab === 'orderbook' && (
          <div className="ml-auto flex gap-1">
            {([0.1, 0.5, 1.0] as TickSize[]).map((tick) => (
              <button
                key={tick}
                onClick={() => setTickSize(tick)}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  tickSize === tick
                    ? 'bg-[#2B2F36] text-[#FCD535]'
                    : 'text-[#848E9C] hover:text-[#EAECEF]'
                }`}
              >
                {tick}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'orderbook' ? (
        <>
          {/* Column Headers */}
          <div className="flex justify-between px-3 py-1.5 text-[10px] text-[#848E9C] border-b border-[#2B2F36] shrink-0">
            <span>Price(USDT)</span>
            <span>Size(BTC)</span>
            <span>Total</span>
          </div>

          {/* Orderbook Content */}
          <div className="flex-1 relative overflow-hidden">
            {/* WebGL Canvas Layer (background depth bars) */}
            {useWebGL && (
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ opacity: 0.5 }}
              />
            )}

            {/* Scrollable Content Layer */}
            <ScrollArea className="h-full relative z-10">
              {/* Asks (Sells) - Reversed for display */}
              <div className="flex flex-col-reverse">
                {aggregatedLevels.asks.map((order, i) => {
                  const depthPercent = (order.total / maxAskTotal) * 100;
                  return (
                    <div
                      key={`ask-${i}`}
                      onClick={() => handlePriceClick(order.price)}
                      className="flex justify-between px-3 py-0.5 text-[11px] relative hover:bg-[#2B2F36]/50 transition-colors cursor-pointer group"
                    >
                      {/* CSS Depth bar fallback (shown when WebGL is disabled) */}
                      {!useWebGL && (
                        <div
                          className="absolute right-0 top-0 bottom-0 bg-[#F6465D]/10"
                          style={{ width: `${depthPercent}%` }}
                        />
                      )}
                      <span className="text-[#F6465D] relative z-10 font-mono group-hover:text-[#F6465D]/80">
                        {order.price.toFixed(2)}
                      </span>
                      <span className="text-[#EAECEF] relative z-10 font-mono">
                        {order.size.toFixed(4)}
                      </span>
                      <span className="text-[#848E9C] relative z-10 font-mono">
                        {order.total.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Spread */}
              {orderbook && (
                <div className="py-2 px-3 border-y border-[#2B2F36] bg-[#161A1E] sticky top-1/2 -translate-y-1/2 z-20">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-[#2EAD65] font-mono">
                      {orderbook.bids[0]?.price.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      }) || '0.00'}
                    </span>
                    <span className="text-xs text-[#848E9C]">
                      Spread:{' '}
                      {orderbook.asks[0] && orderbook.bids[0]
                        ? (
                            ((orderbook.asks[0].price - orderbook.bids[0].price) /
                              orderbook.bids[0].price) *
                            100
                          ).toFixed(4)
                        : '0.00'}
                      %
                    </span>
                  </div>
                </div>
              )}

              {/* Bids (Buys) */}
              <div>
                {aggregatedLevels.bids.map((order, i) => {
                  const depthPercent = (order.total / maxBidTotal) * 100;
                  return (
                    <div
                      key={`bid-${i}`}
                      onClick={() => handlePriceClick(order.price)}
                      className="flex justify-between px-3 py-0.5 text-[11px] relative hover:bg-[#2B2F36]/50 transition-colors cursor-pointer group"
                    >
                      {/* CSS Depth bar fallback */}
                      {!useWebGL && (
                        <div
                          className="absolute right-0 top-0 bottom-0 bg-[#2EAD65]/10"
                          style={{ width: `${depthPercent}%` }}
                        />
                      )}
                      <span className="text-[#2EAD65] relative z-10 font-mono group-hover:text-[#2EAD65]/80">
                        {order.price.toFixed(2)}
                      </span>
                      <span className="text-[#EAECEF] relative z-10 font-mono">
                        {order.size.toFixed(4)}
                      </span>
                      <span className="text-[#848E9C] relative z-10 font-mono">
                        {order.total.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#848E9C] text-xs">
          Trades view coming soon
        </div>
      )}

      {error && (
        <div className="px-3 py-2 text-[10px] text-[#F6465D] bg-[#2B2F36]/50">{error}</div>
      )}
    </div>
  );
}

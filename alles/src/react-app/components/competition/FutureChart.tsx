import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries, IPriceLine } from 'lightweight-charts';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface Position {
    id: string;
    symbol: string;
    type: 'Long' | 'Short';
    leverage: number;
    size: number;
    entryPrice: number;
    markPrice: number;
    pnl: number;
    pnlPercent: number;
    takeProfit?: number;
    stopLoss?: number;
    commission: number;
}

interface MarketEvent {
    id: string;
    type: 'flash_crash' | 'fake_news' | 'liquidity_shock' | 'exchange_outage' | 'whale_dump' | 'volatility_spike';
    title: string;
    description: string;
    impact: string;
    timestamp: number;
    duration?: number;
}

interface FutureChartProps {
    historicalCandles: CandlestickData[];
    futureCandles: CandlestickData[];
    currentPrice?: number;
    positions: Position[];
    activeEvent: MarketEvent | null;
    activeIndicators?: string[];
}

export function FutureChart({
    historicalCandles,
    futureCandles,
    currentPrice: _currentPrice,
    positions,
    activeEvent,
    activeIndicators: _activeIndicators,
}: FutureChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const positionLinesRef = useRef<Map<string, IPriceLine[]>>(new Map());
    const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
    const [isReady, setIsReady] = useState(false);

    // Combine historical and future candles
    const allCandles = [...historicalCandles, ...futureCandles];

    // Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const container = chartContainerRef.current;

        // Remove existing chart
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
            seriesRef.current = null;
            indicatorSeriesRef.current.clear();
        }

        // Create chart with TradingView-like styling
        const chart = createChart(container, {
            layout: {
                background: { type: ColorType.Solid, color: '#131722' },
                textColor: '#D1D4DC',
                fontSize: 12,
            },
            grid: {
                vertLines: {
                    color: '#2A2E39',
                    style: 0,
                    visible: true,
                },
                horzLines: {
                    color: '#2A2E39',
                    style: 0,
                    visible: true,
                },
            },
            width: container.clientWidth,
            height: container.clientHeight,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: '#2A2E39',
            },
            rightPriceScale: {
                borderColor: '#2A2E39',
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            leftPriceScale: {
                visible: false,
            },
            crosshair: {
                mode: 1,
                vertLine: {
                    color: '#787B86',
                    width: 1,
                    style: 2,
                },
                horzLine: {
                    color: '#787B86',
                    width: 1,
                    style: 2,
                },
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
        });

        // Main candlestick series
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26A69A',
            downColor: '#EF5350',
            borderVisible: false,
            wickUpColor: '#26A69A',
            wickDownColor: '#EF5350',
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;

        // Set initial data
        if (allCandles.length > 0) {
            candlestickSeries.setData(allCandles);
            chart.timeScale().fitContent();

            // Draw a vertical line to separate historical from future
            // Note: Vertical time lines are not directly supported by lightweight-charts
            // We'll use a visual indicator in the UI instead
        }

        setIsReady(true);

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            if (chartRef.current && container) {
                chartRef.current.applyOptions({
                    width: container.clientWidth,
                    height: container.clientHeight,
                });
            }
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
                seriesRef.current = null;
                indicatorSeriesRef.current.clear();
            }
            setIsReady(false);
        };
    }, []);

    // Update chart data when future candles change
    useEffect(() => {
        if (!seriesRef.current || !chartRef.current || !isReady) return;

        if (allCandles.length > 0) {
            seriesRef.current.setData(allCandles);
        }
    }, [allCandles, isReady]);

    // Update latest candle
    useEffect(() => {
        if (seriesRef.current && futureCandles.length > 0) {
            const latestCandle = futureCandles[futureCandles.length - 1];
            seriesRef.current.update(latestCandle);
        }
    }, [futureCandles]);

    // Sync Positions
    useEffect(() => {
        if (!seriesRef.current) return;

        positions.forEach(pos => {
            if (!positionLinesRef.current.has(pos.id)) {
                const lines: IPriceLine[] = [];

                lines.push(seriesRef.current!.createPriceLine({
                    price: pos.entryPrice,
                    color: pos.type === 'Long' ? '#26A69A' : '#EF5350',
                    lineWidth: 2,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: `${pos.type} Entry`,
                }));

                if (pos.takeProfit) {
                    lines.push(seriesRef.current!.createPriceLine({
                        price: pos.takeProfit,
                        color: '#26A69A',
                        lineWidth: 1,
                        lineStyle: 0,
                        axisLabelVisible: true,
                        title: `TP`,
                    }));
                }

                if (pos.stopLoss) {
                    lines.push(seriesRef.current!.createPriceLine({
                        price: pos.stopLoss,
                        color: '#EF5350',
                        lineWidth: 1,
                        lineStyle: 0,
                        axisLabelVisible: true,
                        title: `SL`,
                    }));
                }

                positionLinesRef.current.set(pos.id, lines);
            } else {
                // Update existing position lines
                const lines = positionLinesRef.current.get(pos.id)!;
                // Update entry price line if needed
                if (lines[0]) {
                    seriesRef.current!.removePriceLine(lines[0]);
                    lines[0] = seriesRef.current!.createPriceLine({
                        price: pos.entryPrice,
                        color: pos.type === 'Long' ? '#26A69A' : '#EF5350',
                        lineWidth: 2,
                        lineStyle: 2,
                        axisLabelVisible: true,
                        title: `${pos.type} Entry`,
                    });
                }
            }
        });

        const activeIds = new Set(positions.map(p => p.id));
        positionLinesRef.current.forEach((lines, id) => {
            if (!activeIds.has(id)) {
                lines.forEach(line => seriesRef.current!.removePriceLine(line));
                positionLinesRef.current.delete(id);
            }
        });
    }, [positions]);

    return (
        <div className="relative w-full h-full bg-[#131722]">
            {/* Active Event Banner */}
            <AnimatePresence>
                {activeEvent && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-red-500/90 backdrop-blur-md px-6 py-3 rounded-lg border border-red-400 shadow-2xl min-w-[400px]"
                    >
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="text-white animate-pulse" size={24} />
                            <div>
                                <div className="text-white font-bold text-sm">{activeEvent.title}</div>
                                <div className="text-white/80 text-xs">{activeEvent.description}</div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chart Container */}
            <div
                ref={chartContainerRef}
                className="w-full h-full"
            />

            {allCandles.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-[#787B86] z-10 pointer-events-none bg-[#131722]">
                    <div className="text-center">
                        <div className="text-sm">Loading future chart...</div>
                    </div>
                </div>
            )}
        </div>
    );
}


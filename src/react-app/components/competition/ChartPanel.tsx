
import { useEffect, useRef } from 'react';
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

interface ChartPanelProps {
    allCandles: CandlestickData[];
    replayIndex: number;
    currentPrice: number;
    positions: Position[];
    activeEvent: MarketEvent | null;
    onChartReady?: (seriesRef: React.MutableRefObject<ISeriesApi<"Candlestick"> | null>) => void;
}

export function ChartPanel({
    allCandles,
    replayIndex,
    currentPrice: _currentPrice,
    positions,
    activeEvent,
    onChartReady,
}: ChartPanelProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const positionLinesRef = useRef<Map<string, IPriceLine[]>>(new Map());

    // Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current || allCandles.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: '#131722' },
                textColor: '#D1D4DC',
            },
            grid: {
                vertLines: { color: '#2A2E39' },
                horzLines: { color: '#2A2E39' },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: {
                mode: 1,
            }
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#2EBD85',
            downColor: '#F6465D',
            borderVisible: false,
            wickUpColor: '#2EBD85',
            wickDownColor: '#F6465D',
        });

        // Initial Data Render
        const startIndex = Math.min(replayIndex, allCandles.length - 1);
        const initialData = allCandles.slice(0, startIndex);
        candlestickSeries.setData(initialData);
        chart.timeScale().fitContent();

        chartRef.current = chart;
        seriesRef.current = candlestickSeries;

        // Notify parent that chart is ready
        if (onChartReady) {
            onChartReady(seriesRef);
        }

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [allCandles, onChartReady]);

    // Sync Positions with Chart Lines
    useEffect(() => {
        if (!seriesRef.current) return;

        positions.forEach(pos => {
            if (!positionLinesRef.current.has(pos.id)) {
                const lines: IPriceLine[] = [];

                lines.push(seriesRef.current!.createPriceLine({
                    price: pos.entryPrice,
                    color: pos.type === 'Long' ? '#2EBD85' : '#F6465D',
                    lineWidth: 2,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: `${pos.type} Entry`,
                }));

                if (pos.takeProfit) {
                    lines.push(seriesRef.current!.createPriceLine({
                        price: pos.takeProfit,
                        color: '#2EBD85',
                        lineWidth: 1,
                        lineStyle: 0,
                        axisLabelVisible: true,
                        title: `TP`,
                    }));
                }

                if (pos.stopLoss) {
                    lines.push(seriesRef.current!.createPriceLine({
                        price: pos.stopLoss,
                        color: '#F6465D',
                        lineWidth: 1,
                        lineStyle: 0,
                        axisLabelVisible: true,
                        title: `SL`,
                    }));
                }

                positionLinesRef.current.set(pos.id, lines);
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

    // Update chart when replay index changes - only update the latest candle
    useEffect(() => {
        if (seriesRef.current && allCandles.length > 0 && replayIndex > 0 && replayIndex <= allCandles.length) {
            const latestCandle = allCandles[replayIndex - 1];
            seriesRef.current.update(latestCandle);
        }
    }, [replayIndex, allCandles]);

    return (
        <div className="flex-1 bg-[#131722] overflow-hidden relative flex flex-col group">
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
            <div className="w-full h-full">
                <div ref={chartContainerRef} className="w-full h-full" />
            </div>
        </div>
    );
}


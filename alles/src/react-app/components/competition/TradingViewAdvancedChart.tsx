import { useEffect, useRef, memo } from 'react';
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

interface TradingViewAdvancedChartProps {
    symbol: string;
    interval?: string;
    activeEvent?: MarketEvent | null;
    positions?: Position[];
}

function TradingViewAdvancedChartComponent({
    symbol,
    interval = '1',
    activeEvent,
}: TradingViewAdvancedChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<any>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clean up previous widget
        if (widgetRef.current) {
            containerRef.current.innerHTML = '';
            widgetRef.current = null;
        }

        // Create TradingView Widget
        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.type = 'text/javascript';
        script.async = true;

        // Format symbol for TradingView (e.g., BTCUSDT -> BINANCE:BTCUSDT)
        const tvSymbol = symbol.includes(':') ? symbol : `BINANCE:${symbol}`;

        script.innerHTML = JSON.stringify({
            autosize: true,
            symbol: tvSymbol,
            interval: interval,
            timezone: "Etc/UTC",
            theme: "dark",
            style: "1",
            locale: "en",
            enable_publishing: false,
            backgroundColor: "rgba(19, 23, 34, 1)",
            gridColor: "rgba(42, 46, 57, 0.5)",
            hide_top_toolbar: false,
            hide_legend: false,
            save_image: false,
            calendar: false,
            hide_volume: false,
            support_host: "https://www.tradingview.com",
            container_id: "tradingview-widget-container",
            withdateranges: true,
            allow_symbol_change: false,
            details: false,
            hotlist: false,
            show_popup_button: false,
            popup_width: "1000",
            popup_height: "650",
            studies: [],
        });

        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'tradingview-widget-container';
        widgetContainer.style.height = '100%';
        widgetContainer.style.width = '100%';

        const widgetInner = document.createElement('div');
        widgetInner.id = 'tradingview-widget-container';
        widgetInner.style.height = '100%';
        widgetInner.style.width = '100%';

        widgetContainer.appendChild(widgetInner);
        widgetContainer.appendChild(script);

        containerRef.current.appendChild(widgetContainer);
        widgetRef.current = widgetContainer;

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
            widgetRef.current = null;
        };
    }, [symbol, interval]);

    return (
        <div className="relative w-full h-full bg-[#131722]">
            {/* Active Event Banner */}
            <AnimatePresence>
                {activeEvent && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-red-500/90 backdrop-blur-md px-6 py-3 rounded-lg border border-red-400 shadow-2xl min-w-[400px]"
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

            {/* TradingView Widget Container */}
            <div 
                ref={containerRef} 
                className="w-full h-full"
            />
        </div>
    );
}

export const TradingViewAdvancedChart = memo(TradingViewAdvancedChartComponent);

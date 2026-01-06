import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface TradingViewWidgetProps {
  symbol: string;
  interval?: string;
  width?: number | string;
  height?: number | string;
  theme?: 'light' | 'dark';
  autosize?: boolean;
}

// Convert symbol to TradingView format - Always use USDT pairs
const formatSymbolForTradingView = (symbol: string): string => {
  // If the symbol is just "USDT", return it as is (though likely invalid for charting without a pair)
  if (symbol === 'USDT') return 'BINANCE:USDTUSDC'; // Fallback to a valid stable pair or similar if needed, or just let it fail gracefully

  // Check if it already ends with a known quote asset AND has a base asset before it
  // Common quotes: USDT, BTC, ETH, BNB, FDUSD, TUSD, USDC, DAI
  const quoteAssets = ['USDT', 'BTC', 'BNB', 'FDUSD', 'TUSD', 'USDC', 'DAI', 'ETH'];
  const hasQuote = quoteAssets.some(quote =>
    symbol.toUpperCase().endsWith(quote) &&
    symbol.length > quote.length // Ensure there is a base asset (e.g. "BTC" ends with "BTC" but length is same)
  );

  if (hasQuote) {
    return `BINANCE:${symbol.toUpperCase()}`;
  }

  // If no quote detected, assume it's a base asset and append USDT
  return `BINANCE:${symbol.toUpperCase()}USDT`;
};

export default function TradingViewWidget({
  symbol,
  interval = 'D',
  width = '100%',
  height = 400,
  theme = 'dark',
  autosize = true
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWidget = () => {
      try {
        if (!containerRef.current || !symbol) return;

        const container = containerRef.current;
        container.innerHTML = '';

        const tradingViewSymbol = formatSymbolForTradingView(symbol);

        // Create script element
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.async = true;

        const config: any = {
          autosize: autosize,
          symbol: tradingViewSymbol,
          interval: interval,
          timezone: 'Etc/UTC',
          theme: theme,
          style: '1',
          locale: 'en',
          enable_publishing: false,
          allow_symbol_change: false,
          calendar: false,
          support_host: 'https://tradecircle.app'
        };

        if (!autosize) {
          config.width = width;
          config.height = height;
        }

        script.innerHTML = JSON.stringify(config);

        // Create widget container
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'tradingview-widget-container';
        widgetContainer.style.height = typeof height === 'number' ? `${height}px` : height.toString();
        widgetContainer.style.width = typeof width === 'number' ? `${width}px` : width.toString();

        const widgetDiv = document.createElement('div');
        widgetDiv.className = 'tradingview-widget-container__widget';

        widgetContainer.appendChild(widgetDiv);
        widgetContainer.appendChild(script);

        container.appendChild(widgetContainer);

        // Set loaded after delay
        setTimeout(() => {
          setIsLoaded(true);
          setError(null);
        }, 3000);

      } catch (err) {
        console.error('TradingView widget error:', err);
        setError('Failed to load TradingView chart');
        setIsLoaded(false);
      }
    };

    // Load widget after short delay
    const timer = setTimeout(loadWidget, 500);

    return () => {
      clearTimeout(timer);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      setIsLoaded(false);
    };
  }, [symbol, interval, width, height, theme, autosize]);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center bg-[#0D0F18]/30 rounded-xl border border-white/10 p-8"
        style={{ width: typeof width === 'number' ? `${width}px` : width, height: typeof height === 'number' ? `${height}px` : height }}
      >
        <div className="text-center">
          <div className="text-[#E74C3C] text-lg font-semibold mb-2">Chart Loading Error</div>
          <div className="text-[#7F8C8D] text-sm mb-4">{error}</div>
          <div className="text-[#AAB0C0] text-xs">Using free TradingView widgets</div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative bg-[#0D0F18]/30 rounded-xl overflow-hidden"
    >
      {/* Loading overlay */}
      {!isLoaded && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 3, duration: 0.5 }}
          className="absolute inset-0 flex items-center justify-center bg-[#0D0F18]/80 z-10 rounded-xl"
        >
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#6A3DF4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-white font-semibold mb-2">Loading TradingView Chart</div>
            <div className="text-[#7F8C8D] text-sm">Professional trading analysis for {symbol}</div>
          </div>
        </motion.div>
      )}

      {/* TradingView container */}
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden"
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          minHeight: typeof height === 'number' ? `${height}px` : height
        }}
      />
    </motion.div>
  );
}

// Mini Chart Component for markets table
export function TradingViewMiniChart({
  symbol,
  width = 200,
  height = 100,
  theme = 'dark'
}: {
  symbol: string;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadMiniWidget = () => {
      if (!containerRef.current || !symbol) return;

      const container = containerRef.current;
      container.innerHTML = '';

      try {
        const tradingViewSymbol = formatSymbolForTradingView(symbol);

        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
        script.async = true;

        const config = {
          symbol: tradingViewSymbol,
          width: width,
          height: height,
          locale: 'en',
          dateRange: '12M',
          colorTheme: theme,
          trendLineColor: theme === 'dark' ? 'rgba(106, 61, 244, 1)' : 'rgba(41, 98, 255, 1)',
          underLineColor: theme === 'dark' ? 'rgba(106, 61, 244, 0.3)' : 'rgba(41, 98, 255, 0.12)',
          underLineBottomColor: theme === 'dark' ? 'rgba(106, 61, 244, 0)' : 'rgba(41, 98, 255, 0)',
          isTransparent: false,
          autosize: false,
          largeChartUrl: '',
          noTimeScale: false,
          chartOnly: true
        };

        script.innerHTML = JSON.stringify(config);

        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'tradingview-widget-container';
        widgetContainer.style.height = `${height}px`;
        widgetContainer.style.width = `${width}px`;

        const widgetDiv = document.createElement('div');
        widgetDiv.className = 'tradingview-widget-container__widget';

        widgetContainer.appendChild(widgetDiv);
        widgetContainer.appendChild(script);

        container.appendChild(widgetContainer);

        setTimeout(() => setIsLoaded(true), 2000);
      } catch (error) {
        console.error('Mini chart error:', error);
      }
    };

    const timer = setTimeout(loadMiniWidget, 300);

    return () => {
      clearTimeout(timer);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      setIsLoaded(false);
    };
  }, [symbol, width, height, theme]);

  return (
    <div className="relative">
      {!isLoaded && (
        <div
          className="absolute inset-0 bg-[#0D0F18]/30 rounded flex items-center justify-center"
          style={{ width: `${width}px`, height: `${height}px` }}
        >
          <div className="w-4 h-4 border-2 border-[#6A3DF4] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <div
        ref={containerRef}
        className="rounded overflow-hidden"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    </div>
  );
}

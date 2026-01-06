import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface TradingViewMarketOverviewProps {
  width?: number | string;
  height?: number | string;
  colorTheme?: 'light' | 'dark';
  showSymbolLogo?: boolean;
  isTransparent?: boolean;
  autosize?: boolean;
  locale?: string;
}

export default function TradingViewMarketOverview({
  width = '100%',
  height = 400,
  colorTheme = 'dark',
  showSymbolLogo = true,
  isTransparent = false,
  autosize = true,
  locale = 'en'
}: TradingViewMarketOverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMarketOverview = () => {
      try {
        if (!containerRef.current) return;

        const container = containerRef.current;
        container.innerHTML = '';

        // Create widget container first
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'tradingview-widget-container';
        widgetContainer.style.height = typeof height === 'number' ? `${height}px` : height.toString();
        widgetContainer.style.width = '100%';

        const widgetDiv = document.createElement('div');
        widgetDiv.className = 'tradingview-widget-container__widget';
        widgetDiv.style.height = 'calc(100% - 32px)';
        widgetDiv.style.width = '100%';

        const copyrightDiv = document.createElement('div');
        copyrightDiv.className = 'tradingview-widget-copyright';
        copyrightDiv.style.fontSize = '13px';
        copyrightDiv.style.lineHeight = '32px';
        copyrightDiv.style.textAlign = 'center';
        copyrightDiv.style.verticalAlign = 'middle';
        copyrightDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
        copyrightDiv.innerHTML = '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" style="color: #2962FF; text-decoration: none;">Track all markets on TradingView</a>';

        // Create script element for market screener
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js';
        script.async = true;

        const config = {
          width: '100%',
          height: typeof height === 'number' ? height - 32 : height,
          defaultColumn: 'overview',
          defaultScreen: 'general',
          market: 'crypto',
          showToolbar: true,
          colorTheme: colorTheme,
          locale: locale,
          isTransparent: false
        };

        script.innerHTML = JSON.stringify(config);

        widgetContainer.appendChild(widgetDiv);
        widgetContainer.appendChild(copyrightDiv);
        widgetContainer.appendChild(script);

        container.appendChild(widgetContainer);

        // Longer delay for TradingView widget loading
        setTimeout(() => {
          setIsLoaded(true);
          setError(null);
        }, 8000);

      } catch (err) {
        console.error('Failed to load TradingView market overview:', err);
        setError(err instanceof Error ? err.message : 'Failed to load market overview');
        setIsLoaded(false);
      }
    };

    const timer = setTimeout(loadMarketOverview, 1000);

    return () => {
      clearTimeout(timer);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      setIsLoaded(false);
    };
  }, [width, height, colorTheme, showSymbolLogo, isTransparent, autosize, locale]);

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center bg-[#0D0F18]/30 rounded-xl border border-white/10 p-8"
        style={{ 
          width: typeof width === 'number' ? `${width}px` : width, 
          height: typeof height === 'number' ? `${height}px` : height 
        }}
      >
        <div className="text-center">
          <div className="text-[#E74C3C] text-lg font-semibold mb-2">Market Overview Error</div>
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
      transition={{ duration: 0.5 }}
      className="relative bg-[#1E2232] rounded-xl border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] overflow-hidden"
    >
      {/* Loading overlay */}
      {!isLoaded && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 8, duration: 0.5 }}
          className="absolute inset-0 flex items-center justify-center bg-[#0D0F18]/80 z-10 rounded-xl"
        >
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#6A3DF4] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-white font-semibold mb-2">Loading Market Overview</div>
            <div className="text-[#7F8C8D] text-sm">Comprehensive crypto market data</div>
            <div className="text-[#AAB0C0] text-xs mt-2">Powered by TradingView</div>
          </div>
        </motion.div>
      )}
      
      {/* Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#6A3DF4]/10 rounded-lg flex items-center justify-center">
              <span className="text-[#6A3DF4] font-bold text-lg">📊</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Crypto Market Screener</h3>
              <p className="text-[#7F8C8D] text-sm">Powered by TradingView</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* TradingView container */}
      <div
        ref={containerRef}
        className="w-full bg-[#0D0F18]/30"
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          minHeight: typeof height === 'number' ? `${height}px` : height
        }}
      />
    </motion.div>
  );
}

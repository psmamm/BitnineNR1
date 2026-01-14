/**
 * Lightweight Chart Fallback Component
 *
 * Uses TradingView's Lightweight Charts library with real Binance data.
 * This is a fallback for when the TradingView widget fails to load.
 */

import { useEffect, useRef, useState, memo } from 'react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries, type IChartApi, type ISeriesApi, type CandlestickData, type Time } from 'lightweight-charts';
import { Loader2, WifiOff, RefreshCw } from 'lucide-react';

interface LightweightChartFallbackProps {
  symbol: string;
  interval?: string;
}

// Map TradingView intervals to Binance kline intervals
const intervalMap: Record<string, string> = {
  '1S': '1s',
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '1h',
  '120': '2h',
  '240': '4h',
  'D': '1d',
  'W': '1w',
  'M': '1M',
};

function LightweightChartFallbackComponent({ symbol, interval = '60' }: LightweightChartFallbackProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    // Create chart
    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E11' },
        textColor: '#848E9C',
      },
      grid: {
        vertLines: { color: '#1E2329' },
        horzLines: { color: '#1E2329' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#2B3139',
          labelBackgroundColor: '#2B3139',
        },
        horzLine: {
          color: '#2B3139',
          labelBackgroundColor: '#2B3139',
        },
      },
      rightPriceScale: {
        borderColor: '#2B3139',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#2B3139',
        timeVisible: true,
        secondsVisible: false,
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    // Add candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#0ECB81',
      downColor: '#F6465D',
      borderUpColor: '#0ECB81',
      borderDownColor: '#F6465D',
      wickUpColor: '#0ECB81',
      wickDownColor: '#F6465D',
    });

    // Add volume series as histogram
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Fetch historical data and setup WebSocket
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const binanceInterval = intervalMap[interval] || '1h';
    const cleanSymbol = symbol.replace('/', '').toUpperCase();

    setLoading(true);
    setError(null);

    // Fetch historical klines
    const fetchKlines = async () => {
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=${binanceInterval}&limit=500`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('No data available');
        }

        const candles: CandlestickData<Time>[] = data.map((d: number[]) => ({
          time: (d[0] / 1000) as Time,
          open: parseFloat(d[1] as unknown as string),
          high: parseFloat(d[2] as unknown as string),
          low: parseFloat(d[3] as unknown as string),
          close: parseFloat(d[4] as unknown as string),
        }));

        const volumes = data.map((d: number[]) => ({
          time: (d[0] / 1000) as Time,
          value: parseFloat(d[5] as unknown as string),
          color: parseFloat(d[4] as unknown as string) >= parseFloat(d[1] as unknown as string) ? '#0ECB8180' : '#F6465D80',
        }));

        candleSeriesRef.current?.setData(candles);
        volumeSeriesRef.current?.setData(volumes);
        chartRef.current?.timeScale().fitContent();
        setLoading(false);

      } catch (err) {
        console.error('Failed to fetch klines:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
        setLoading(false);
      }
    };

    fetchKlines();

    // Setup WebSocket for real-time updates
    const wsUrl = `wss://stream.binance.com:9443/ws/${cleanSymbol.toLowerCase()}@kline_${binanceInterval}`;

    const connectWs = () => {
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onclose = () => {
        setWsConnected(false);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.k) {
            const kline = data.k;
            const candle: CandlestickData<Time> = {
              time: (kline.t / 1000) as Time,
              open: parseFloat(kline.o),
              high: parseFloat(kline.h),
              low: parseFloat(kline.l),
              close: parseFloat(kline.c),
            };

            candleSeriesRef.current?.update(candle);

            const volume = {
              time: (kline.t / 1000) as Time,
              value: parseFloat(kline.v),
              color: parseFloat(kline.c) >= parseFloat(kline.o) ? '#0ECB8180' : '#F6465D80',
            };

            volumeSeriesRef.current?.update(volume);
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      };
    };

    connectWs();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [symbol, interval]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Force re-render by updating state
    window.location.reload();
  };

  return (
    <div className="relative w-full h-full bg-[#0B0E11]">
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0B0E11]/80 z-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#00D9C8] animate-spin" />
            <span className="text-sm text-[#848E9C]">Loading chart data...</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0B0E11]/80 z-20">
          <div className="flex flex-col items-center gap-3 max-w-[300px] text-center">
            <WifiOff className="w-10 h-10 text-[#F6465D]" />
            <span className="text-sm text-[#848E9C]">{error}</span>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-[#2B3139] hover:bg-[#3B4149] text-white text-sm rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Connection status */}
      {!loading && !error && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          {wsConnected ? (
            <span className="flex items-center gap-1 text-[10px] text-[#0ECB81] bg-[#0B0E11]/80 px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 bg-[#0ECB81] rounded-full animate-pulse" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-[#F6465D] bg-[#0B0E11]/80 px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 bg-[#F6465D] rounded-full" />
              Disconnected
            </span>
          )}
        </div>
      )}

      {/* Chart container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

export const LightweightChartFallback = memo(LightweightChartFallbackComponent);

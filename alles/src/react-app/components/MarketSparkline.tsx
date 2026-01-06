import { useRef, useEffect, useState } from 'react';
import { TradingViewMiniChart } from './TradingViewWidget';

interface MarketSparklineProps {
  data: number[];
  symbol?: string;
  color?: string;
  width?: number;
  height?: number;
  showTradingView?: boolean;
}

export default function MarketSparkline({
  data,
  symbol,
  color = '#6A3DF4',
  width = 120,
  height = 40,
  showTradingView = false
}: MarketSparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [useTradingView, setUseTradingView] = useState(showTradingView);

  useEffect(() => {
    if (useTradingView && symbol) return;
    
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate min/max for scaling
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    if (range === 0) {
      // Draw flat line if no variance
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color + '40'); // 25% opacity
    gradient.addColorStop(1, color + '00'); // 0% opacity

    // Draw area fill
    ctx.beginPath();
    data.forEach((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((point - min) / range) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    // Complete the area path
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw the line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    data.forEach((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((point - min) / range) * height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

  }, [data, color, width, height, useTradingView, symbol]);

  // Toggle between sparkline and TradingView
  const toggleChart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (symbol) {
      setUseTradingView(!useTradingView);
    }
  };

  if (useTradingView && symbol) {
    return (
      <div 
        className="relative cursor-pointer group"
        onClick={toggleChart}
        title="Click to switch to sparkline"
      >
        <TradingViewMiniChart
          symbol={symbol}
          width={width}
          height={height}
          theme="dark"
        />
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-3 h-3 bg-[#6A3DF4] rounded-full flex items-center justify-center">
            <span className="text-white text-xs">↺</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length < 2) {
    return (
      <div 
        className="bg-white/5 rounded flex items-center justify-center"
        style={{ width, height }}
      >
        <div className="text-[#7F8C8D] text-xs">No data</div>
      </div>
    );
  }

  return (
    <div 
      className={`relative ${symbol ? 'cursor-pointer group' : ''}`}
      onClick={symbol ? toggleChart : undefined}
      title={symbol ? "Click to switch to TradingView" : undefined}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
      {symbol && (
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-3 h-3 bg-[#6A3DF4] rounded-full flex items-center justify-center">
            <span className="text-white text-xs">📈</span>
          </div>
        </div>
      )}
    </div>
  );
}

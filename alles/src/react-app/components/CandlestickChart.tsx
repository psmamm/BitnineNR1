import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { type KlineData, type TechnicalIndicators } from '@/react-app/hooks/useCoinDetail';

interface CandlestickChartProps {
  data: KlineData[];
  interval: string;
  technicalIndicators?: TechnicalIndicators;
  showIndicators?: {
    sma7?: boolean;
    sma25?: boolean;
    sma99?: boolean;
    ema20?: boolean;
    ema50?: boolean;
    rsi?: boolean;
    macd?: boolean;
  };
  width?: number;
  height?: number;
  className?: string;
}

export default function CandlestickChart({
  data,
  interval,
  technicalIndicators,
  showIndicators = {},
  width = 800,
  height = 400,
  className = ''
}: CandlestickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<KlineData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Chart padding
    const padding = { top: 20, right: 60, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate price range
    const prices = data.flatMap(candle => [
      parseFloat(candle.high),
      parseFloat(candle.low),
      parseFloat(candle.open),
      parseFloat(candle.close)
    ]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const priceMargin = priceRange * 0.05; // 5% margin

    // Scaling functions
    const xScale = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
    const yScale = (price: number) => padding.top + ((maxPrice + priceMargin - price) / (priceRange + 2 * priceMargin)) * chartHeight;

    // Draw grid
    ctx.strokeStyle = '#2A2F42';
    ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price labels
      const price = maxPrice + priceMargin - (i / 5) * (priceRange + 2 * priceMargin);
      ctx.fillStyle = '#7F8C8D';
      ctx.font = '12px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(`$${price.toFixed(2)}`, width - padding.right + 5, y + 4);
    }

    // Vertical grid lines
    const timeSteps = Math.min(6, data.length);
    for (let i = 0; i < timeSteps; i++) {
      const x = padding.left + (i / (timeSteps - 1)) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();

      // Time labels
      if (i < data.length) {
        const dataIndex = Math.floor((i / (timeSteps - 1)) * (data.length - 1));
        const time = new Date(data[dataIndex].openTime);
        ctx.fillStyle = '#7F8C8D';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(
          time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          x,
          height - padding.bottom + 20
        );
      }
    }

    // Draw candlesticks
    const candleWidth = Math.max(1, chartWidth / data.length * 0.8);
    
    data.forEach((candle, index) => {
      const open = parseFloat(candle.open);
      const high = parseFloat(candle.high);
      const low = parseFloat(candle.low);
      const close = parseFloat(candle.close);
      
      const x = xScale(index);
      const openY = yScale(open);
      const highY = yScale(high);
      const lowY = yScale(low);
      const closeY = yScale(close);
      
      const isGreen = close > open;
      const bodyTop = isGreen ? closeY : openY;
      const bodyBottom = isGreen ? openY : closeY;
      const bodyHeight = Math.abs(bodyBottom - bodyTop);
      
      // Draw wick
      ctx.strokeStyle = isGreen ? '#2ECC71' : '#E74C3C';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();
      
      // Draw body
      ctx.fillStyle = isGreen ? '#2ECC71' : '#E74C3C';
      if (bodyHeight < 1) {
        // Draw line for doji
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - candleWidth / 2, bodyTop);
        ctx.lineTo(x + candleWidth / 2, bodyTop);
        ctx.stroke();
      } else {
        // Draw rectangle for body
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      }
    });

    // Draw technical indicators
    if (technicalIndicators && data.length > 0) {
      // Draw moving averages (would need historical data for proper implementation)
      if (showIndicators.sma7 && technicalIndicators.sma7) {
        // Simplified representation - would need full historical SMA data
        const smaY = yScale(technicalIndicators.sma7);
        ctx.strokeStyle = '#F39C12';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding.left, smaY);
        ctx.lineTo(width - padding.right, smaY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (showIndicators.ema20 && technicalIndicators.ema20) {
        const emaY = yScale(technicalIndicators.ema20);
        ctx.strokeStyle = '#9B59B6';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(padding.left, emaY);
        ctx.lineTo(width - padding.right, emaY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw crosshair on hover
    if (mousePos) {
      ctx.strokeStyle = '#6A3DF4';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(mousePos.x, padding.top);
      ctx.lineTo(mousePos.x, height - padding.bottom);
      ctx.stroke();
      
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding.left, mousePos.y);
      ctx.lineTo(width - padding.right, mousePos.y);
      ctx.stroke();
      
      ctx.setLineDash([]);
    }

  }, [data, width, height, technicalIndicators, showIndicators, mousePos]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setMousePos({ x, y });

    // Find hovered candle
    const padding = { top: 20, right: 60, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const candleIndex = Math.floor(((x - padding.left) / chartWidth) * data.length);
    
    if (candleIndex >= 0 && candleIndex < data.length) {
      setHoveredCandle(data[candleIndex]);
    } else {
      setHoveredCandle(null);
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setHoveredCandle(null);
  };

  const formatPrice = (price: string): string => {
    const num = parseFloat(price);
    if (num >= 1) return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `$${num.toFixed(6)}`;
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!data || data.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center bg-[#0D0F18]/50 rounded-xl`} style={{ width, height }}>
        <div className="text-center">
          <div className="text-[#7F8C8D] text-sm">No chart data available</div>
          <div className="text-[#AAB0C0] text-xs mt-1">Loading {interval} candlestick data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair"
        style={{ width, height }}
      />
      
      {/* Tooltip */}
      {hoveredCandle && mousePos && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bg-[#1E2232] border border-white/10 rounded-lg p-3 pointer-events-none z-10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
          style={{
            left: Math.min(mousePos.x + 10, width - 200),
            top: Math.max(mousePos.y - 100, 10)
          }}
        >
          <div className="text-[#AAB0C0] text-xs mb-2">{formatTime(hoveredCandle.openTime)}</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-[#7F8C8D]">Open:</span>
              <span className="text-white font-medium">{formatPrice(hoveredCandle.open)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7F8C8D]">High:</span>
              <span className="text-[#2ECC71] font-medium">{formatPrice(hoveredCandle.high)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7F8C8D]">Low:</span>
              <span className="text-[#E74C3C] font-medium">{formatPrice(hoveredCandle.low)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7F8C8D]">Close:</span>
              <span className="text-white font-medium">{formatPrice(hoveredCandle.close)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7F8C8D]">Volume:</span>
              <span className="text-[#AAB0C0] font-medium">
                {parseFloat(hoveredCandle.volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

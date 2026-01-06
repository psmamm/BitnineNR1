import DashboardLayout from "@/react-app/components/DashboardLayout";
import {
  BarChart3,
  Activity
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useOrderBookHeatmap } from "@/react-app/hooks/useOrderBookHeatmap";

export default function OrderHeatmapPage() {
  const {
    orderBookData,
    liveOrders,
    isConnected,
    selectedCoin,
    currentPrice,
    connect,
    disconnect
  } = useOrderBookHeatmap();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [resizeTrigger, setResizeTrigger] = useState(0);

  // Format numbers with better precision
  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
    return volume.toFixed(4);
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  // Enhanced Depth Chart drawing
  useEffect(() => {
    if (!canvasRef.current || !orderBookData || orderBookData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const padding = { top: 20, right: 0, bottom: 30, left: 0 };

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Gradient Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0D0F18');
    bgGradient.addColorStop(1, '#151925');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Process Data for Depth Chart (Cumulative Volume)
    const buyOrders = orderBookData.filter(o => o.side === 'buy').sort((a, b) => b.price - a.price);
    const sellOrders = orderBookData.filter(o => o.side === 'sell').sort((a, b) => a.price - b.price);

    // Calculate Cumulative Volume
    let cumBuy = 0;
    const buyPoints = buyOrders.map(o => {
      cumBuy += o.volume;
      return { price: o.price, volume: cumBuy };
    });

    let cumSell = 0;
    const sellPoints = sellOrders.map(o => {
      cumSell += o.volume;
      return { price: o.price, volume: cumSell };
    });

    if (buyPoints.length === 0 || sellPoints.length === 0) return;

    const maxVol = Math.max(cumBuy, cumSell);
    const minPrice = buyPoints[buyPoints.length - 1].price;
    const maxPrice = sellPoints[sellPoints.length - 1].price;
    const priceRange = maxPrice - minPrice;

    // Scales
    const getX = (price: number) => ((price - minPrice) / priceRange) * width;
    const getY = (vol: number) => height - padding.bottom - ((vol / maxVol) * (height - padding.top - padding.bottom));

    // Draw Buy Area (Green)
    ctx.beginPath();
    ctx.moveTo(getX(buyPoints[0].price), height - padding.bottom); // Start at bottom middle
    buyPoints.forEach(p => {
      ctx.lineTo(getX(p.price), getY(p.volume));
    });
    ctx.lineTo(getX(buyPoints[buyPoints.length - 1].price), height - padding.bottom);
    ctx.closePath();

    const buyGradient = ctx.createLinearGradient(0, 0, 0, height);
    buyGradient.addColorStop(0, 'rgba(46, 204, 113, 0.5)');
    buyGradient.addColorStop(1, 'rgba(46, 204, 113, 0.05)');
    ctx.fillStyle = buyGradient;
    ctx.fill();
    ctx.strokeStyle = '#2ECC71';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Sell Area (Red)
    ctx.beginPath();
    ctx.moveTo(getX(sellPoints[0].price), height - padding.bottom); // Start at bottom middle
    sellPoints.forEach(p => {
      ctx.lineTo(getX(p.price), getY(p.volume));
    });
    ctx.lineTo(getX(sellPoints[sellPoints.length - 1].price), height - padding.bottom);
    ctx.closePath();

    const sellGradient = ctx.createLinearGradient(0, 0, 0, height);
    sellGradient.addColorStop(0, 'rgba(231, 76, 60, 0.5)');
    sellGradient.addColorStop(1, 'rgba(231, 76, 60, 0.05)');
    ctx.fillStyle = sellGradient;
    ctx.fill();
    ctx.strokeStyle = '#E74C3C';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Middle Line (Current Price)
    const midX = getX(currentPrice);
    ctx.beginPath();
    ctx.moveTo(midX, padding.top);
    ctx.lineTo(midX, height - padding.bottom);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Price Labels on X Axis
    ctx.fillStyle = '#7F8C8D';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(formatPrice(minPrice), 30, height - 10);
    ctx.fillText(formatPrice(maxPrice), width - 30, height - 10);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(formatPrice(currentPrice), midX, height - 10);

  }, [orderBookData, currentPrice, resizeTrigger]);

  // Add resize listener to redraw canvas
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && orderBookData && orderBookData.length > 0) {
        setResizeTrigger(prev => prev + 1);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [orderBookData]);



  const buyOrdersList = orderBookData.filter(o => o.side === 'buy').sort((a, b) => b.price - a.price).slice(0, 15);
  const sellOrdersList = orderBookData.filter(o => o.side === 'sell').sort((a, b) => a.price - b.price).slice(0, 15);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#1E2232] p-4 rounded-2xl border border-white/5">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-[#6A3DF4]/10 rounded-xl">
              <BarChart3 className="w-6 h-6 text-[#6A3DF4]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Market Depth</h1>
              <div className="flex items-center space-x-2 text-sm text-[#7F8C8D]">
                <span>{selectedCoin}</span>
                <span className="text-white font-mono">${formatPrice(currentPrice)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-4 py-2 bg-[#F7931A]/10 text-[#F7931A] rounded-lg text-sm font-medium border border-[#F7931A]/20 flex items-center gap-2">
              <span>₿</span>
              <span>Bitcoin Only</span>
            </div>
            <button
              onClick={isConnected ? disconnect : connect}
              className={`hidden px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isConnected ? 'bg-[#2ECC71]/10 text-[#2ECC71]' : 'bg-[#6A3DF4] text-white'
                }`}
            >
              {isConnected ? 'Connected' : 'Connect'}
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Depth Chart (Takes up 2 columns) */}
          <div className="lg:col-span-2 bg-[#1E2232] rounded-2xl border border-white/5 p-4 flex flex-col">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#6A3DF4]" />
              Depth Chart
            </h3>
            <div className="flex-1 min-h-[400px] relative">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full cursor-crosshair"
              />
            </div>
          </div>

          {/* Order Book List (Takes up 1 column) */}
          <div className="bg-[#1E2232] rounded-2xl border border-white/5 p-4 flex flex-col h-[500px]">
            <h3 className="text-white font-semibold mb-4">Order Book</h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              <div className="grid grid-cols-2 gap-4 text-xs font-medium text-[#7F8C8D] mb-2 sticky top-0 bg-[#1E2232] py-2">
                <div>Price (USDT)</div>
                <div className="text-right">Amount</div>
              </div>

              {/* Asks (Sells) - Red - Reversed order for visual stack */}
              <div className="flex flex-col-reverse">
                {sellOrdersList.slice(0, 10).reverse().map((order, i) => (
                  <div key={`sell-${i}`} className="grid grid-cols-2 gap-4 py-1 hover:bg-[#E74C3C]/5 cursor-pointer">
                    <span className="text-[#E74C3C] font-mono">{formatPrice(order.price)}</span>
                    <span className="text-right text-white font-mono">{formatVolume(order.volume)}</span>
                  </div>
                ))}
              </div>

              {/* Current Price Divider */}
              <div className="py-3 my-2 border-y border-white/5 text-center font-bold text-lg text-white font-mono">
                ${formatPrice(currentPrice)}
              </div>

              {/* Bids (Buys) - Green */}
              <div>
                {buyOrdersList.map((order, i) => (
                  <div key={`buy-${i}`} className="grid grid-cols-2 gap-4 py-1 hover:bg-[#2ECC71]/5 cursor-pointer">
                    <span className="text-[#2ECC71] font-mono">{formatPrice(order.price)}</span>
                    <span className="text-right text-white font-mono">{formatVolume(order.volume)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Trades Table */}
        <div className="bg-[#1E2232] rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-white font-semibold">Recent Trades</h3>
            <span className="text-xs text-[#7F8C8D]">Last {liveOrders.length} trades</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[#7F8C8D] bg-[#0D0F18]/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {liveOrders.slice(0, 10).map((trade) => (
                  <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-[#7F8C8D] font-mono">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </td>
                    <td className={`px-4 py-3 font-mono font-medium ${trade.side === 'buy' ? 'text-[#2ECC71]' : 'text-[#E74C3C]'}`}>
                      ${formatPrice(trade.price)}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {formatVolume(trade.volume)}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {formatNumber(trade.usdValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

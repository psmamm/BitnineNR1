import { useState } from 'react';
import DealTicket from '@/react-app/components/trading/DealTicket';
import { Star, ChevronDown, Settings } from 'lucide-react';

// Mock Order Book Data
const generateOrderBook = (basePrice: number) => {
  const asks = Array.from({ length: 15 }, (_, i) => ({
    price: basePrice + (15 - i) * 10,
    size: Math.random() * 2 + 0.1,
    total: Math.random() * 50 + 5,
  }));
  const bids = Array.from({ length: 15 }, (_, i) => ({
    price: basePrice - (i + 1) * 10,
    size: Math.random() * 2 + 0.1,
    total: Math.random() * 50 + 5,
  }));
  return { asks, bids };
};

// Mock Recent Trades
const generateRecentTrades = (basePrice: number) => 
  Array.from({ length: 20 }, (_, i) => ({
    price: basePrice + (Math.random() - 0.5) * 100,
    size: Math.random() * 0.5 + 0.01,
    time: new Date(Date.now() - i * 1000 * Math.random() * 60).toLocaleTimeString(),
    side: Math.random() > 0.5 ? 'buy' : 'sell',
  }));

export default function TradingPage() {
  const currentPrice = 98456.78;
  const symbol = 'BTCUSDT';
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');
  
  const { asks, bids } = generateOrderBook(currentPrice);
  const recentTrades = generateRecentTrades(currentPrice);

  return (
    <div className="h-screen w-full bg-[#121212] flex flex-col overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-14 bg-[#1e2026] border-b border-[#2b3139] flex items-center px-4 shrink-0">
        <div className="flex items-center gap-6">
          {/* Symbol */}
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#848e9c] hover:text-[#f0b90b] cursor-pointer" />
            <span className="text-white font-semibold text-lg">{symbol}</span>
            <span className="text-[#848e9c] text-xs bg-[#2b3139] px-1.5 py-0.5 rounded">Perpetual</span>
            <ChevronDown className="w-4 h-4 text-[#848e9c]" />
          </div>
          
          {/* Price */}
          <div className="flex items-center gap-3">
            <span className="text-[#2ead65] text-xl font-mono font-semibold">
              {currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[#2ead65] text-xs">+2.34%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 ml-auto text-xs">
          <div className="flex flex-col">
            <span className="text-[#848e9c]">Mark</span>
            <span className="text-[#eaecef] font-mono">98,445.12</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#848e9c]">Index</span>
            <span className="text-[#eaecef] font-mono">98,432.89</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#848e9c]">24h High</span>
            <span className="text-[#eaecef] font-mono">99,850.00</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#848e9c]">24h Low</span>
            <span className="text-[#eaecef] font-mono">95,120.00</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#848e9c]">24h Vol(BTC)</span>
            <span className="text-[#eaecef] font-mono">45,892.34</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#848e9c]">Open Interest</span>
            <span className="text-[#eaecef] font-mono">$2.4B</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[#848e9c]">Funding</span>
            <span className="text-[#2ead65] font-mono">0.0100%</span>
          </div>
          <Settings className="w-4 h-4 text-[#848e9c] hover:text-white cursor-pointer ml-2" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chart Area (60%) */}
        <div className="flex-[6] bg-[#121212] border-r border-[#2b3139] flex flex-col">
          {/* Chart Toolbar */}
          <div className="h-10 bg-[#1e2026] border-b border-[#2b3139] flex items-center px-3 gap-4 text-xs shrink-0">
            {['1m', '5m', '15m', '1H', '4H', '1D', '1W'].map((tf) => (
              <button
                key={tf}
                className={`px-2 py-1 rounded ${tf === '1H' ? 'bg-[#2b3139] text-white' : 'text-[#848e9c] hover:text-white'}`}
              >
                {tf}
              </button>
            ))}
            <div className="w-px h-4 bg-[#2b3139]" />
            <button className="text-[#848e9c] hover:text-white">Indicators</button>
            <button className="text-[#848e9c] hover:text-white">Templates</button>
          </div>
          
          {/* Chart Placeholder */}
          <div className="flex-1 flex items-center justify-center bg-[#121212]">
            <div className="text-center">
              <div className="text-6xl mb-4">📈</div>
              <p className="text-[#848e9c] text-sm">TradingView Chart</p>
              <p className="text-[#5e6673] text-xs mt-1">AdvancedRealTimeChart integration</p>
            </div>
          </div>
        </div>

        {/* Order Book & Trades (20%) */}
        <div className="w-[280px] bg-[#1e2026] border-r border-[#2b3139] flex flex-col shrink-0">
          {/* Order Book Header */}
          <div className="h-10 border-b border-[#2b3139] flex items-center px-3 gap-3 shrink-0">
            <button className="text-xs text-white">Order Book</button>
            <button className="text-xs text-[#848e9c] hover:text-white">Trades</button>
          </div>
          
          {/* Order Book Column Headers */}
          <div className="flex justify-between px-3 py-1.5 text-[10px] text-[#848e9c] border-b border-[#2b3139]">
            <span>Price(USDT)</span>
            <span>Size(BTC)</span>
            <span>Total</span>
          </div>

          {/* Asks (Sells) */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto flex flex-col-reverse scrollbar-thin">
              {asks.map((order, i) => (
                <div key={`ask-${i}`} className="flex justify-between px-3 py-0.5 text-[11px] relative hover:bg-[#2b3139]/50">
                  <div className="absolute right-0 top-0 bottom-0 bg-[#f6465d]/10" style={{ width: `${order.total}%` }} />
                  <span className="text-[#f6465d] relative z-10 font-mono">{order.price.toFixed(2)}</span>
                  <span className="text-[#eaecef] relative z-10 font-mono">{order.size.toFixed(4)}</span>
                  <span className="text-[#848e9c] relative z-10 font-mono">{order.total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Spread */}
            <div className="py-2 px-3 border-y border-[#2b3139] bg-[#1e2026]">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-[#2ead65] font-mono">
                  {currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-[#848e9c]">≈ ${currentPrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Bids (Buys) */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {bids.map((order, i) => (
                <div key={`bid-${i}`} className="flex justify-between px-3 py-0.5 text-[11px] relative hover:bg-[#2b3139]/50">
                  <div className="absolute right-0 top-0 bottom-0 bg-[#2ead65]/10" style={{ width: `${order.total}%` }} />
                  <span className="text-[#2ead65] relative z-10 font-mono">{order.price.toFixed(2)}</span>
                  <span className="text-[#eaecef] relative z-10 font-mono">{order.size.toFixed(4)}</span>
                  <span className="text-[#848e9c] relative z-10 font-mono">{order.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Trades */}
          <div className="h-48 border-t border-[#2b3139] flex flex-col shrink-0">
            <div className="flex justify-between px-3 py-1.5 text-[10px] text-[#848e9c] border-b border-[#2b3139]">
              <span>Price(USDT)</span>
              <span>Size(BTC)</span>
              <span>Time</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {recentTrades.map((trade, i) => (
                <div key={i} className="flex justify-between px-3 py-0.5 text-[11px]">
                  <span className={`font-mono ${trade.side === 'buy' ? 'text-[#2ead65]' : 'text-[#f6465d]'}`}>
                    {trade.price.toFixed(2)}
                  </span>
                  <span className="text-[#eaecef] font-mono">{trade.size.toFixed(4)}</span>
                  <span className="text-[#848e9c] font-mono">{trade.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deal Ticket (320px) */}
        <div className="w-[320px] shrink-0">
          <DealTicket currentPrice={currentPrice} symbol={symbol} />
        </div>
      </div>

      {/* Bottom Panel - Positions/Orders */}
      <div className="h-[250px] bg-[#1e2026] border-t border-[#2b3139] flex flex-col shrink-0">
        {/* Tabs */}
        <div className="h-10 flex items-center px-4 gap-6 border-b border-[#2b3139] shrink-0">
          {[
            { key: 'positions', label: 'Positions (0)' },
            { key: 'orders', label: 'Open Orders (0)' },
            { key: 'history', label: 'Order History' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`text-sm py-2 ${
                activeTab === tab.key
                  ? 'text-[#eaecef] border-b-2 border-[#f0b90b]'
                  : 'text-[#848e9c] hover:text-[#eaecef]'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 text-[#848e9c]">
              <input type="checkbox" className="accent-[#f0b90b]" />
              <span>Hide Other Symbols</span>
            </label>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-10 gap-2 px-4 py-2 text-xs text-[#848e9c] border-b border-[#2b3139] shrink-0">
          <span>Symbol</span>
          <span>Size</span>
          <span>Entry Price</span>
          <span>Mark Price</span>
          <span>Liq. Price</span>
          <span>Margin</span>
          <span>PNL (ROE%)</span>
          <span>TP/SL</span>
          <span>Trailing Stop</span>
          <span>Close Position</span>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center text-[#848e9c] text-sm">
          {activeTab === 'positions' && 'No open positions'}
          {activeTab === 'orders' && 'No open orders'}
          {activeTab === 'history' && 'No order history'}
        </div>
      </div>
    </div>
  );
}

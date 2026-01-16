/**
 * Professional Trading Terminal - Lighter DEX Integration
 * Real data, no mocks. All symbols in USDC.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ChevronDown, Search, X, Loader2, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import TopNavigation from '../components/TopNavigation';
import { useWallet } from '../contexts/WalletContext';
import { useLighter } from '../hooks/useLighter';
import { LighterOnboarding } from '../components/lighter/LighterOnboarding';

export type TradingType = 'spot' | 'margin' | 'futures';

// Lighter symbols (all USDC pairs)
const LIGHTER_SYMBOLS = [
  { symbol: 'BTC-USD', baseAsset: 'BTC', quoteAsset: 'USDC', tradingviewSymbol: 'BINANCE:BTCUSDT' },
  { symbol: 'ETH-USD', baseAsset: 'ETH', quoteAsset: 'USDC', tradingviewSymbol: 'BINANCE:ETHUSDT' },
  { symbol: 'SOL-USD', baseAsset: 'SOL', quoteAsset: 'USDC', tradingviewSymbol: 'BINANCE:SOLUSDT' },
  { symbol: 'ARB-USD', baseAsset: 'ARB', quoteAsset: 'USDC', tradingviewSymbol: 'BINANCE:ARBUSDT' },
  { symbol: 'DOGE-USD', baseAsset: 'DOGE', quoteAsset: 'USDC', tradingviewSymbol: 'BINANCE:DOGEUSDT' },
  { symbol: 'AVAX-USD', baseAsset: 'AVAX', quoteAsset: 'USDC', tradingviewSymbol: 'BINANCE:AVAXUSDT' },
  { symbol: 'LINK-USD', baseAsset: 'LINK', quoteAsset: 'USDC', tradingviewSymbol: 'BINANCE:LINKUSDT' },
  { symbol: 'MATIC-USD', baseAsset: 'MATIC', quoteAsset: 'USDC', tradingviewSymbol: 'BINANCE:MATICUSDT' },
];

export default function TradingPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Trading type from URL path (for future use)
  void location.pathname; // Used by URL routing
  const urlSymbol = searchParams.get('symbol');
  const [symbol, setSymbol] = useState(urlSymbol || 'BTC-USD');
  const [showSymbolSelector, setShowSymbolSelector] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [interval, setInterval] = useState('30');

  // Lighter Integration
  const {
    state: lighterState,
    setSelectedSymbol,
    placeOrder,
    formatPrice,
  } = useLighter(symbol);

  useWallet(); // Initialize wallet context
  const [showLighterOnboarding, setShowLighterOnboarding] = useState(false);

  // Order form state
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [marginMode, setMarginMode] = useState<'isolated' | 'cross'>('isolated');
  const [leverage] = useState(10);
  const [orderPrice, setOrderPrice] = useState('');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [sliderValue, setSliderValue] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const symbolSelectorRef = useRef<HTMLDivElement>(null);

  // Get current symbol info
  const currentSymbolInfo = useMemo(() => {
    return LIGHTER_SYMBOLS.find(s => s.symbol === symbol) || LIGHTER_SYMBOLS[0];
  }, [symbol]);

  // Filter symbols by search
  const filteredSymbols = useMemo(() => {
    if (!symbolSearch) return LIGHTER_SYMBOLS;
    const search = symbolSearch.toLowerCase();
    return LIGHTER_SYMBOLS.filter(s =>
      s.symbol.toLowerCase().includes(search) ||
      s.baseAsset.toLowerCase().includes(search)
    );
  }, [symbolSearch]);

  // Orderbook data from Lighter
  const orderbook = lighterState.orderbook;
  const bids = orderbook?.bids || [];
  const asks = orderbook?.asks || [];
  const currentPrice = lighterState.currentPrice || 0;

  // Max total for depth visualization
  const maxTotal = useMemo(() => {
    const allTotals = [...bids, ...asks].map(l => l.total);
    return Math.max(...allTotals, 1);
  }, [bids, asks]);

  // Buy/Sell volume ratio
  const buyVolume = useMemo(() => bids.reduce((sum, b) => sum + b.size, 0), [bids]);
  const sellVolume = useMemo(() => asks.reduce((sum, a) => sum + a.size, 0), [asks]);
  const totalVolume = buyVolume + sellVolume;
  const buyPercent = totalVolume > 0 ? Math.round((buyVolume / totalVolume) * 100) : 50;

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (symbolSelectorRef.current && !symbolSelectorRef.current.contains(e.target as Node)) {
        setShowSymbolSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // TradingView Widget with Lighter symbol
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const containerId = `tv-widget-${Date.now()}`;
    chartContainerRef.current.innerHTML = '';

    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.cssText = 'height: 100%; width: 100%;';

    const widgetInner = document.createElement('div');
    widgetInner.className = 'tradingview-widget-container__widget';
    widgetInner.id = containerId;
    widgetInner.style.cssText = 'height: 100%; width: 100%;';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: currentSymbolInfo.tradingviewSymbol,
      interval: interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      withdateranges: true,
      support_host: "https://www.tradingview.com",
      container_id: containerId,
    });

    widgetContainer.appendChild(widgetInner);
    widgetContainer.appendChild(script);
    chartContainerRef.current.appendChild(widgetContainer);

    return () => {
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = '';
      }
    };
  }, [currentSymbolInfo.tradingviewSymbol, interval]);

  // Handle symbol change
  const handleSymbolSelect = (newSymbol: string) => {
    setSymbol(newSymbol);
    setSelectedSymbol(newSymbol);
    setShowSymbolSelector(false);
    setSymbolSearch('');
  };

  // Handle order placement
  const handlePlaceOrder = useCallback(async (side: 'buy' | 'sell') => {
    if (!lighterState.isConnected) {
      setShowLighterOnboarding(true);
      return;
    }

    const quantity = parseFloat(orderQuantity);
    const price = orderType === 'market' ? undefined : parseFloat(orderPrice || String(currentPrice));

    if (!quantity || quantity <= 0) {
      setNotification({ message: 'Enter a valid quantity', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setIsSubmitting(true);

    try {
      await placeOrder({
        symbol,
        side,
        type: orderType,
        quantity,
        price,
        leverage,
      });

      const sideLabel = side === 'buy' ? 'Long' : 'Short';
      setNotification({
        message: `${sideLabel} ${quantity} ${currentSymbolInfo.baseAsset} @ ${orderType === 'market' ? 'Market' : formatPrice(price || 0)}`,
        type: 'success'
      });

      setOrderQuantity('');
      setSliderValue(0);
    } catch (error) {
      setNotification({
        message: error instanceof Error ? error.message : 'Order failed',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setNotification(null), 4000);
    }
  }, [lighterState.isConnected, orderQuantity, orderPrice, orderType, currentPrice, symbol, leverage, placeOrder, currentSymbolInfo.baseAsset, formatPrice]);

  // Slider change
  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    const balance = lighterState.availableBalance || 0;
    const maxQty = balance > 0 && currentPrice > 0 ? (balance * leverage * value / 100) / currentPrice : 0;
    setOrderQuantity(maxQty > 0 ? maxQty.toFixed(6) : '');
  };

  // Format helpers
  const fmtPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  };

  const fmtVol = (v: number) => {
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
    return v.toFixed(2);
  };

  return (
    <div className="h-screen w-full bg-[#0b0e11] text-white flex flex-col overflow-hidden pt-16">
      <TopNavigation />

      {/* Symbol Bar */}
      <div className="h-10 bg-[#0b0e11] border-b border-[#1e2329] flex items-center px-3 shrink-0">
        {/* Symbol Selector */}
        <div className="relative" ref={symbolSelectorRef}>
          <button
            className="flex items-center gap-2 hover:bg-[#1e2329] px-2 py-1 rounded"
            onClick={() => setShowSymbolSelector(!showSymbolSelector)}
          >
            <span className="font-semibold text-sm">{symbol}</span>
            <span className="text-[10px] text-[#848e9c]">Perp</span>
            <ChevronDown className="w-3 h-3 text-[#848e9c]" />
          </button>

          {showSymbolSelector && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-[#1e2329] border border-[#2b2f36] rounded shadow-xl z-50">
              <div className="p-2 border-b border-[#2b2f36]">
                <div className="flex items-center bg-[#0b0e11] rounded px-2 py-1">
                  <Search className="w-3 h-3 text-[#848e9c]" />
                  <input
                    type="text"
                    value={symbolSearch}
                    onChange={(e) => setSymbolSearch(e.target.value)}
                    placeholder="Search"
                    className="flex-1 bg-transparent outline-none text-xs ml-2 placeholder-[#848e9c]"
                    autoFocus
                  />
                  {symbolSearch && <X className="w-3 h-3 text-[#848e9c] cursor-pointer" onClick={() => setSymbolSearch('')} />}
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredSymbols.map((s) => (
                  <button
                    key={s.symbol}
                    className={`w-full flex items-center justify-between px-3 py-2 hover:bg-[#2b2f36] text-left ${s.symbol === symbol ? 'bg-[#2b2f36]' : ''}`}
                    onClick={() => handleSymbolSelect(s.symbol)}
                  >
                    <span className="text-xs font-medium">{s.baseAsset}/USDC</span>
                    <span className="text-[10px] text-[#848e9c]">Perp</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="ml-4">
          <span className={`text-lg font-semibold ${lighterState.ticker?.changePercent24h && lighterState.ticker.changePercent24h >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
            {fmtPrice(currentPrice)}
          </span>
        </div>

        {/* Market Stats */}
        <div className="ml-6 flex items-center gap-4 text-[10px]">
          <div>
            <span className="text-[#848e9c]">24h Change</span>
            <div className={lighterState.ticker?.changePercent24h && lighterState.ticker.changePercent24h >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
              {lighterState.ticker?.changePercent24h?.toFixed(2) || '0.00'}%
            </div>
          </div>
          <div>
            <span className="text-[#848e9c]">24h High</span>
            <div className="text-white">{fmtPrice(lighterState.ticker?.high24h || 0)}</div>
          </div>
          <div>
            <span className="text-[#848e9c]">24h Low</span>
            <div className="text-white">{fmtPrice(lighterState.ticker?.low24h || 0)}</div>
          </div>
          <div>
            <span className="text-[#848e9c]">24h Vol</span>
            <div className="text-white">{fmtVol(lighterState.ticker?.quoteVolume24h || 0)}</div>
          </div>
        </div>

        {/* Lighter Connection Status */}
        <div className="ml-auto flex items-center gap-2">
          {lighterState.isConnected ? (
            <span className="flex items-center gap-1 text-[10px] text-[#0ecb81]">
              <span className="w-1.5 h-1.5 bg-[#0ecb81] rounded-full" />
              Lighter
            </span>
          ) : (
            <button
              onClick={() => setShowLighterOnboarding(true)}
              className="flex items-center gap-1 px-2 py-1 bg-[#0ecb81] hover:bg-[#1ed696] rounded text-[10px] text-black font-medium"
            >
              <Wallet className="w-3 h-3" />
              Connect Lighter
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Chart */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#1e2329]">
          {/* Timeframes */}
          <div className="h-7 bg-[#0b0e11] border-b border-[#1e2329] flex items-center px-2 text-[10px] shrink-0 gap-1">
            {['1', '5', '15', '30', '60', '240', 'D'].map((tf) => {
              const label = tf === '1' ? '1m' : tf === '5' ? '5m' : tf === '15' ? '15m' : tf === '30' ? '30m' : tf === '60' ? '1h' : tf === '240' ? '4h' : '1D';
              return (
                <button
                  key={tf}
                  onClick={() => setInterval(tf)}
                  className={`px-2 py-0.5 rounded ${interval === tf ? 'bg-[#f0b90b]/20 text-[#f0b90b]' : 'text-[#848e9c] hover:text-white'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div ref={chartContainerRef} className="flex-1 bg-[#0b0e11] min-h-0" />

          {/* Positions/Orders */}
          <div className="h-32 bg-[#0b0e11] border-t border-[#1e2329] flex flex-col shrink-0">
            <div className="h-6 border-b border-[#1e2329] flex items-center px-2 text-[10px] gap-3">
              <span className="text-white">Positions ({lighterState.positions.length})</span>
              <span className="text-[#848e9c]">Orders ({lighterState.activeOrders.length})</span>
            </div>
            <div className="flex-1 flex items-center justify-center text-[#848e9c] text-xs">
              {lighterState.positions.length === 0 && lighterState.activeOrders.length === 0 ? (
                <span>No open positions or orders</span>
              ) : (
                <div className="w-full px-2 overflow-auto">
                  {lighterState.positions.map((pos) => (
                    <div key={pos.id} className="flex items-center justify-between py-1 text-[10px]">
                      <span className={pos.side === 'long' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>{pos.symbol} {pos.side.toUpperCase()}</span>
                      <span>{pos.size} @ {fmtPrice(pos.entryPrice)}</span>
                      <span className={pos.unrealizedPnl >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>{pos.unrealizedPnl >= 0 ? '+' : ''}{pos.unrealizedPnl.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Orderbook */}
        <div className="w-44 flex flex-col bg-[#0b0e11] border-r border-[#1e2329] shrink-0">
          <div className="h-6 border-b border-[#1e2329] flex items-center px-2 text-[10px] text-white font-medium">
            Order Book
          </div>

          <div className="flex justify-between px-2 py-1 text-[9px] text-[#848e9c]">
            <span>Price</span>
            <span>Size</span>
            <span>Total</span>
          </div>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden text-[9px]">
            {/* Asks */}
            <div className="flex-1 flex flex-col justify-end overflow-hidden">
              {asks.slice(0, 12).reverse().map((o, i) => (
                <div key={`a${i}`} className="flex justify-between px-2 py-[1px] relative">
                  <div className="absolute right-0 top-0 bottom-0 bg-[#f6465d]/10" style={{ width: `${(o.total / maxTotal) * 100}%` }} />
                  <span className="text-[#f6465d] z-10 font-mono">{fmtPrice(o.price)}</span>
                  <span className="z-10 font-mono">{o.size.toFixed(4)}</span>
                  <span className="text-[#848e9c] z-10 font-mono">{o.total.toFixed(4)}</span>
                </div>
              ))}
            </div>

            {/* Spread */}
            <div className="py-1 px-2 flex items-center justify-center border-y border-[#1e2329]">
              <span className={`text-sm font-semibold ${lighterState.ticker?.changePercent24h && lighterState.ticker.changePercent24h >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                {fmtPrice(currentPrice)}
              </span>
            </div>

            {/* Bids */}
            <div className="flex-1 overflow-hidden">
              {bids.slice(0, 12).map((o, i) => (
                <div key={`b${i}`} className="flex justify-between px-2 py-[1px] relative">
                  <div className="absolute right-0 top-0 bottom-0 bg-[#0ecb81]/10" style={{ width: `${(o.total / maxTotal) * 100}%` }} />
                  <span className="text-[#0ecb81] z-10 font-mono">{fmtPrice(o.price)}</span>
                  <span className="z-10 font-mono">{o.size.toFixed(4)}</span>
                  <span className="text-[#848e9c] z-10 font-mono">{o.total.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Buy/Sell Ratio */}
          <div className="h-5 border-t border-[#1e2329] flex items-center px-2">
            <div className="flex-1 h-1 bg-[#1e2329] rounded overflow-hidden flex">
              <div className="bg-[#0ecb81] h-full" style={{ width: `${buyPercent}%` }} />
              <div className="bg-[#f6465d] h-full" style={{ width: `${100 - buyPercent}%` }} />
            </div>
            <span className="ml-2 text-[8px] text-[#848e9c]">{buyPercent}%</span>
          </div>
        </div>

        {/* Trade Panel */}
        <div className="w-48 flex flex-col bg-[#0b0e11] shrink-0">
          {/* Margin & Leverage */}
          <div className="px-2 py-1.5 border-b border-[#1e2329] flex items-center gap-1 text-[10px]">
            <button
              onClick={() => setMarginMode(marginMode === 'isolated' ? 'cross' : 'isolated')}
              className="px-1.5 py-0.5 bg-[#1e2329] rounded text-white"
            >
              {marginMode === 'isolated' ? 'Isolated' : 'Cross'}
            </button>
            <button className="px-1.5 py-0.5 bg-[#1e2329] rounded text-[#f0b90b]">
              {leverage}x
            </button>
          </div>

          {/* Order Type */}
          <div className="px-2 py-1.5 border-b border-[#1e2329] flex items-center gap-2 text-[10px]">
            <button onClick={() => setOrderType('limit')} className={orderType === 'limit' ? 'text-white' : 'text-[#848e9c]'}>Limit</button>
            <button onClick={() => setOrderType('market')} className={orderType === 'market' ? 'text-white' : 'text-[#848e9c]'}>Market</button>
          </div>

          {/* Order Form */}
          <div className="flex-1 overflow-auto px-2 py-1.5">
            {/* Price */}
            {orderType === 'limit' && (
              <div className="mb-1.5">
                <div className="text-[9px] text-[#848e9c] mb-0.5">Price (USDC)</div>
                <input
                  type="text"
                  value={orderPrice || fmtPrice(currentPrice)}
                  onChange={(e) => setOrderPrice(e.target.value)}
                  className="w-full bg-[#1e2329] rounded px-2 py-1 text-[10px] text-white outline-none border border-[#2b2f36] focus:border-[#f0b90b]"
                />
              </div>
            )}

            {/* Quantity */}
            <div className="mb-1.5">
              <div className="text-[9px] text-[#848e9c] mb-0.5">Size ({currentSymbolInfo.baseAsset})</div>
              <input
                type="text"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#1e2329] rounded px-2 py-1 text-[10px] text-white outline-none border border-[#2b2f36] focus:border-[#f0b90b]"
              />
            </div>

            {/* Slider */}
            <div className="mb-2">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                className="w-full h-1 bg-[#2b2f36] rounded appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, #f0b90b 0%, #f0b90b ${sliderValue}%, #2b2f36 ${sliderValue}%, #2b2f36 100%)` }}
              />
              <div className="flex justify-between text-[8px] text-[#848e9c] mt-0.5">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </div>

            {/* Balance Info */}
            <div className="mb-2 text-[9px] text-[#848e9c]">
              <div className="flex justify-between">
                <span>Available</span>
                <span className="text-white">{lighterState.availableBalance.toFixed(2)} USDC</span>
              </div>
            </div>

            {/* Long/Short Buttons */}
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => handlePlaceOrder('buy')}
                disabled={isSubmitting}
                className="flex-1 py-1.5 bg-[#0ecb81] hover:bg-[#1ed696] rounded text-[10px] text-white font-medium disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 mx-auto animate-spin" /> : 'Long'}
              </button>
              <button
                onClick={() => handlePlaceOrder('sell')}
                disabled={isSubmitting}
                className="flex-1 py-1.5 bg-[#f6465d] hover:bg-[#ff5f73] rounded text-[10px] text-white font-medium disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 mx-auto animate-spin" /> : 'Short'}
              </button>
            </div>

            {/* Account Info */}
            {lighterState.isConnected && (
              <div className="border-t border-[#1e2329] pt-1.5 text-[9px]">
                <div className="flex justify-between text-[#848e9c]">
                  <span>Margin Used</span>
                  <span className="text-white">{lighterState.marginUsed.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#848e9c]">
                  <span>Unrealized P&L</span>
                  <span className={lighterState.unrealizedPnl >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                    {lighterState.unrealizedPnl >= 0 ? '+' : ''}{lighterState.unrealizedPnl.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded shadow-xl border ${
          notification.type === 'success'
            ? 'bg-[#0ecb81]/20 border-[#0ecb81]/50 text-[#0ecb81]'
            : 'bg-[#f6465d]/20 border-[#f6465d]/50 text-[#f6465d]'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-xs">{notification.message}</span>
        </div>
      )}

      {/* Lighter Onboarding Modal */}
      {showLighterOnboarding && (
        <LighterOnboarding
          isOpen={showLighterOnboarding}
          onClose={() => setShowLighterOnboarding(false)}
          onSuccess={() => setShowLighterOnboarding(false)}
        />
      )}
    </div>
  );
}

/**
 * Professional Trading Terminal - Bitget Style Layout
 * Exact replica of Bitget's trading interface
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Star, ChevronDown, Search, X, Loader2, LayoutGrid, Eye, EyeOff, GripVertical } from 'lucide-react';
import { useBinanceMarkets } from '../hooks/useBinanceMarkets';
import { useBinanceOrderbook } from '../hooks/useBinanceOrderbook';
import TopNavigation from '../components/TopNavigation';

export type TradingType = 'spot' | 'margin' | 'futures';

const MARKET_TABS = ['Favorites', 'Spot', 'Futures', 'Margin'] as const;

export default function TradingPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const getTradingTypeFromPath = (): TradingType => {
    const path = location.pathname;
    if (path.includes('/trading/spot')) return 'spot';
    if (path.includes('/trading/margin')) return 'margin';
    if (path.includes('/trading/futures')) return 'futures';
    return 'spot';
  };

  const tradingType: TradingType = getTradingTypeFromPath();
  const { enhancedData, loading: marketsLoading, wsConnected } = useBinanceMarkets();

  const urlSymbol = searchParams.get('symbol');
  const [symbol, setSymbol] = useState(urlSymbol || 'BTCUSDT');
  const [showSymbolSelector, setShowSymbolSelector] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [interval, setInterval] = useState('5');
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('tradingFavorites');
    return saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
  });
  const [marketTab, setMarketTab] = useState<typeof MARKET_TABS[number]>('Spot');
  const [activeBottomTab, setActiveBottomTab] = useState('positions');
  const [orderType, setOrderType] = useState<'limit' | 'market' | 'conditional'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [marginMode, setMarginMode] = useState<'isolated' | 'cross'>('isolated');
  const [leverage] = useState(15);
  const [orderbookTab, setOrderbookTab] = useState<'orderbook' | 'trades'>('orderbook');
  const [tradeTab, setTradeTab] = useState<'trade' | 'bots'>('trade');

  // Resizable & toggleable panels
  const [showOrderbook, setShowOrderbook] = useState(true);
  const [positionsHeight, setPositionsHeight] = useState(180);
  const [isResizing, setIsResizing] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const symbolSelectorRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const currentPair = enhancedData[symbol];
  const currentPrice = currentPair ? parseFloat(currentPair.lastPrice) : 0;
  const priceChangePercent = currentPair ? parseFloat(currentPair.priceChangePercent) : 0;
  const volume24h = currentPair ? parseFloat(currentPair.quoteVolume) : 0;
  const high24h = currentPair ? parseFloat(currentPair.highPrice) : 0;
  const low24h = currentPair ? parseFloat(currentPair.lowPrice) : 0;

  const { orderbook, connected: orderbookConnected } = useBinanceOrderbook({
    symbol,
    limit: 20,
    type: tradingType === 'spot' ? 'spot' : 'futures'
  });

  const filteredPairs = useMemo(() => {
    let pairs = Object.values(enhancedData);
    pairs = pairs.filter(p => p.quoteAsset === 'USDT');
    if (marketTab === 'Favorites') {
      pairs = pairs.filter(p => favorites.includes(p.symbol));
    }
    if (symbolSearch) {
      const search = symbolSearch.toLowerCase();
      pairs = pairs.filter(p =>
        p.symbol.toLowerCase().includes(search) ||
        p.baseAsset.toLowerCase().includes(search)
      );
    }
    pairs.sort((a, b) => parseFloat(b.quoteVolume || '0') - parseFloat(a.quoteVolume || '0'));
    return pairs.slice(0, 100);
  }, [enhancedData, symbolSearch, marketTab, favorites]);

  useEffect(() => {
    localStorage.setItem('tradingFavorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (symbolSelectorRef.current && !symbolSelectorRef.current.contains(e.target as Node)) {
        setShowSymbolSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resize handler for positions panel
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const windowHeight = window.innerHeight;
      const newHeight = windowHeight - e.clientY - 64; // 64 is TopNav height
      setPositionsHeight(Math.max(100, Math.min(400, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // TradingView Widget
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
      symbol: `BINANCE:${symbol}`,
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
  }, [symbol, interval]);

  const asks = orderbook.asks;
  const bids = orderbook.bids;
  const maxTotal = useMemo(() => {
    const allTotals = [...asks, ...bids].map(l => parseFloat(l.total));
    return Math.max(...allTotals, 1);
  }, [asks, bids]);

  const handleSymbolSelect = (newSymbol: string) => {
    setSymbol(newSymbol);
    setShowSymbolSelector(false);
    setSymbolSearch('');
  };

  const toggleFavorite = (sym: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(6);
  };

  const baseAsset = symbol.replace('USDT', '').replace('USDC', '');

  return (
    <div className="h-screen w-full bg-[#0b0e11] text-white flex flex-col overflow-hidden">
      <TopNavigation />

      {/* Main Content - No scroll */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* Symbol Header Bar */}
        <div className="h-[52px] bg-[#161a1e] border-b border-[#2b2f36] flex items-center px-4 shrink-0">
          <div className="relative" ref={symbolSelectorRef}>
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-[#1e2329] px-2 py-1 rounded transition-colors"
              onClick={() => setShowSymbolSelector(!showSymbolSelector)}
            >
              <Star
                className={`w-4 h-4 ${favorites.includes(symbol) ? 'text-[#00d9c8] fill-[#00d9c8]' : 'text-[#848e9c]'}`}
                onClick={(e) => toggleFavorite(symbol, e)}
              />
              <span className="font-semibold text-base">{symbol}</span>
              <span className="text-[10px] text-[#0ecb81] bg-[#0ecb81]/10 px-1.5 py-0.5 rounded">Perpetual</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showSymbolSelector ? 'rotate-180' : ''}`} />
            </div>

            {showSymbolSelector && (
              <div className="absolute top-full left-0 mt-1 w-[360px] bg-[#1e2329] border border-[#2b2f36] rounded-lg shadow-2xl z-50">
                <div className="p-2 border-b border-[#2b2f36]">
                  <div className="flex items-center bg-[#2b2f36] rounded px-2 py-1.5">
                    <Search className="w-4 h-4 text-[#848e9c]" />
                    <input
                      type="text"
                      value={symbolSearch}
                      onChange={(e) => setSymbolSearch(e.target.value)}
                      placeholder="Search"
                      className="flex-1 bg-transparent outline-none text-sm ml-2 placeholder-[#848e9c]"
                      autoFocus
                    />
                    {symbolSearch && <X className="w-4 h-4 text-[#848e9c] cursor-pointer" onClick={() => setSymbolSearch('')} />}
                  </div>
                </div>
                <div className="flex gap-1 px-2 py-1.5 border-b border-[#2b2f36]">
                  {MARKET_TABS.map((tab) => (
                    <button key={tab} onClick={() => setMarketTab(tab)}
                      className={`px-2 py-1 text-xs rounded ${marketTab === tab ? 'bg-[#2b2f36] text-white' : 'text-[#848e9c]'}`}>
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {marketsLoading ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-[#00d9c8] animate-spin" /></div>
                  ) : filteredPairs.map((pair) => (
                    <div key={pair.symbol}
                      className={`flex items-center justify-between px-3 py-2 hover:bg-[#2b2f36] cursor-pointer ${pair.symbol === symbol ? 'bg-[#2b2f36]' : ''}`}
                      onClick={() => handleSymbolSelect(pair.symbol)}>
                      <div className="flex items-center gap-2">
                        <Star className={`w-3 h-3 ${favorites.includes(pair.symbol) ? 'text-[#00d9c8] fill-[#00d9c8]' : 'text-[#848e9c]'}`}
                          onClick={(e) => toggleFavorite(pair.symbol, e)} />
                        <span className="text-sm">{pair.baseAsset}/USDT</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono">{formatPrice(parseFloat(pair.lastPrice || '0'))}</div>
                        <div className={`text-xs ${parseFloat(pair.priceChangePercent || '0') >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                          {parseFloat(pair.priceChangePercent || '0') >= 0 ? '+' : ''}{parseFloat(pair.priceChangePercent || '0').toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="ml-3 flex items-center gap-1">
            <span className={`text-lg font-semibold ${priceChangePercent >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
              {formatPrice(currentPrice)}
            </span>
            <span className={`text-xs ${priceChangePercent >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
              {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
            </span>
          </div>

          <div className="ml-4 flex items-center gap-4 text-xs text-[#848e9c]">
            <span>Mark price <span className="text-white">{formatPrice(currentPrice)}</span></span>
            <span>24h high <span className="text-white">{formatPrice(high24h)}</span></span>
            <span>24h low <span className="text-white">{formatPrice(low24h)}</span></span>
            <span>24h total <span className="text-white">{formatVolume(volume24h)}</span></span>
          </div>

          {/* Layout Controls */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowOrderbook(!showOrderbook)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-colors ${showOrderbook ? 'bg-[#00d9c8]/10 text-[#00d9c8]' : 'bg-[#2b2f36] text-[#848e9c] hover:text-white'}`}
            >
              {showOrderbook ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <span className="hidden sm:inline">Orderbook</span>
            </button>
            <button className="flex items-center gap-1.5 px-2 py-1 bg-[#2b2f36] hover:bg-[#363c45] rounded text-[11px] text-[#848e9c] hover:text-white transition-colors">
              <LayoutGrid className="w-3 h-3" />
            </button>
            {wsConnected && (
              <span className="flex items-center gap-1 text-[10px] text-[#0ecb81]">
                <span className="w-1.5 h-1.5 bg-[#0ecb81] rounded-full animate-pulse" />
              </span>
            )}
          </div>
        </div>

        {/* Main Trading Grid */}
        <div className="flex-1 flex min-h-0">

          {/* Left: Chart + Positions */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-[#2b2f36]">

            {/* Chart Section */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Single header row like Bitget */}
              <div className="h-8 bg-[#161a1e] border-b border-[#2b2f36] flex items-center px-2 shrink-0 text-xs">
                <span className="text-white font-medium mr-3">Chart</span>
                <span className="text-[#848e9c] mr-3 cursor-pointer hover:text-white">About</span>
                <span className="text-[#848e9c] mr-3 cursor-pointer hover:text-white">News</span>
                <span className="text-[#848e9c] cursor-pointer hover:text-white">Trading data</span>
              </div>

              {/* Timeframes row */}
              <div className="h-7 bg-[#161a1e] border-b border-[#2b2f36] flex items-center px-2 shrink-0 text-[11px]">
                <span className="text-[#848e9c] mr-2">Time</span>
                {['1s', '5m', '15m', '1h', '1D'].map((tf) => (
                  <button key={tf} onClick={() => setInterval(tf === '1s' ? '1S' : tf === '5m' ? '5' : tf === '15m' ? '15' : tf === '1h' ? '60' : 'D')}
                    className={`px-1.5 py-0.5 rounded mr-1 ${interval === (tf === '1s' ? '1S' : tf === '5m' ? '5' : tf === '15m' ? '15' : tf === '1h' ? '60' : 'D') ? 'bg-[#2b2f36] text-white' : 'text-[#848e9c] hover:text-white'}`}>
                    {tf}
                  </button>
                ))}
                <span className="ml-auto text-[#848e9c]">TradingView</span>
              </div>

              {/* Chart */}
              <div ref={chartContainerRef} className="flex-1 bg-[#161a1e] min-h-0" />
            </div>

            {/* Resize Handle */}
            <div
              ref={resizeRef}
              onMouseDown={handleResizeMouseDown}
              className={`h-1 bg-[#2b2f36] hover:bg-[#00d9c8] cursor-ns-resize transition-colors shrink-0 group flex items-center justify-center ${isResizing ? 'bg-[#00d9c8]' : ''}`}
            >
              <GripVertical className="w-3 h-3 text-[#848e9c] group-hover:text-white rotate-90 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Positions Panel */}
            <div style={{ height: positionsHeight }} className="bg-[#161a1e] flex flex-col shrink-0">
              <div className="h-8 border-b border-[#2b2f36] flex items-center px-3 text-[11px] shrink-0 overflow-x-auto scrollbar-hide">
                {['Positions (0)', 'Copy trades (0)', 'Trading bots (0)', 'Open orders (0)', 'Order history', 'Position history', 'Order details', 'Transaction history', 'Assets'].map((tab) => (
                  <button key={tab} onClick={() => setActiveBottomTab(tab.toLowerCase().split(' ')[0])}
                    className={`px-2 py-1.5 whitespace-nowrap transition-colors ${activeBottomTab === tab.toLowerCase().split(' ')[0] ? 'text-white border-b-2 border-[#00d9c8]' : 'text-[#848e9c] hover:text-white'}`}>
                    {tab}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2 text-[#848e9c] text-[10px]">
                  <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                    <input type="checkbox" className="w-3 h-3 rounded bg-[#2b2f36] border-[#363c45]" />
                    <span>Current</span>
                  </label>
                  <button className="hover:text-white transition-colors">Close all</button>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="text-[#848e9c] text-[11px] mb-0.5">Available balance: 0.00</div>
                <div className="text-[#5a6068] text-[10px] mb-2 max-w-[300px]">Transfer funds to your futures account to get started</div>
                <div className="flex gap-1.5">
                  <button className="px-2.5 py-1 bg-[#2b2f36] hover:bg-[#363c45] rounded text-[10px] text-white transition-colors">Deposit</button>
                  <button className="px-2.5 py-1 bg-[#2b2f36] hover:bg-[#363c45] rounded text-[10px] text-white transition-colors">Transfer</button>
                  <button className="px-2.5 py-1 bg-[#2b2f36] hover:bg-[#363c45] rounded text-[10px] text-white transition-colors">Demo</button>
                  <button className="px-2.5 py-1 bg-[#00d9c8] hover:bg-[#00c4b5] rounded text-[10px] text-black font-medium transition-colors">Start Trading</button>
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Orderbook */}
          {showOrderbook && (
          <div className="w-[180px] flex flex-col bg-[#161a1e] shrink-0 border-l border-[#2b2f36]">
            <div className="h-8 border-b border-[#2b2f36] flex items-center px-2 text-xs shrink-0">
              <button onClick={() => setOrderbookTab('orderbook')}
                className={`mr-3 ${orderbookTab === 'orderbook' ? 'text-white' : 'text-[#848e9c]'}`}>Order book</button>
              <button onClick={() => setOrderbookTab('trades')}
                className={orderbookTab === 'trades' ? 'text-white' : 'text-[#848e9c]'}>Market trades</button>
              {orderbookConnected && <span className="ml-auto w-1.5 h-1.5 bg-[#0ecb81] rounded-full" />}
            </div>

            <div className="flex justify-between px-2 py-1 text-[10px] text-[#848e9c] border-b border-[#2b2f36] shrink-0">
              <span>Price</span>
              <span>Quantity ({baseAsset})</span>
              <span>Total ({baseAsset})</span>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Asks */}
              <div className="flex-1 flex flex-col justify-end overflow-hidden">
                {asks.slice(0, 14).reverse().map((o, i) => (
                  <div key={`a${i}`} className="flex justify-between px-2 py-[1px] text-[10px] relative">
                    <div className="absolute left-0 top-0 bottom-0 bg-[#f6465d]/10" style={{ width: `${(parseFloat(o.total) / maxTotal) * 100}%` }} />
                    <span className="text-[#f6465d] z-10 font-mono">{parseFloat(o.price).toFixed(1)}</span>
                    <span className="z-10 font-mono text-[#eaecef]">{parseFloat(o.quantity).toFixed(4)}</span>
                    <span className="text-[#848e9c] z-10 font-mono">{parseFloat(o.total).toFixed(4)}</span>
                  </div>
                ))}
              </div>

              {/* Current Price */}
              <div className="py-1 px-2 bg-[#1e2329] flex items-center gap-2 shrink-0">
                <span className={`text-sm font-semibold ${priceChangePercent >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                  {formatPrice(currentPrice)}
                </span>
                <span className="text-[10px] text-[#848e9c]">{formatPrice(currentPrice)}</span>
              </div>

              {/* Bids */}
              <div className="flex-1 overflow-hidden">
                {bids.slice(0, 14).map((o, i) => (
                  <div key={`b${i}`} className="flex justify-between px-2 py-[1px] text-[10px] relative">
                    <div className="absolute left-0 top-0 bottom-0 bg-[#0ecb81]/10" style={{ width: `${(parseFloat(o.total) / maxTotal) * 100}%` }} />
                    <span className="text-[#0ecb81] z-10 font-mono">{parseFloat(o.price).toFixed(1)}</span>
                    <span className="z-10 font-mono text-[#eaecef]">{parseFloat(o.quantity).toFixed(4)}</span>
                    <span className="text-[#848e9c] z-10 font-mono">{parseFloat(o.total).toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Right: Trade Panel */}
          <div className="w-[260px] flex flex-col bg-[#161a1e] border-l border-[#2b2f36] shrink-0">
            {/* Trade/Bots tabs */}
            <div className="h-8 border-b border-[#2b2f36] flex items-center px-3 text-xs shrink-0">
              <button onClick={() => setTradeTab('trade')}
                className={`mr-4 font-medium ${tradeTab === 'trade' ? 'text-white' : 'text-[#848e9c]'}`}>Trade</button>
              <button onClick={() => setTradeTab('bots')}
                className={tradeTab === 'bots' ? 'text-white' : 'text-[#848e9c]'}>Bots</button>
            </div>

            {/* Margin Mode & Leverage */}
            <div className="px-3 py-2 border-b border-[#2b2f36] shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <button onClick={() => setMarginMode(marginMode === 'isolated' ? 'cross' : 'isolated')}
                  className="flex items-center gap-1 px-2 py-1 bg-[#2b2f36] rounded text-white">
                  {marginMode === 'isolated' ? 'Isolated' : 'Cross'}
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button className="flex items-center gap-1 px-2 py-1 bg-[#2b2f36] rounded text-[#00d9c8] font-medium">
                  {leverage}.00x
                </button>
                <button className="ml-auto px-2 py-1 bg-[#2b2f36] rounded text-[#848e9c]">$</button>
              </div>
            </div>

            {/* Order Type Tabs */}
            <div className="px-3 py-2 border-b border-[#2b2f36] shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <button onClick={() => setOrderType('limit')}
                  className={orderType === 'limit' ? 'text-white font-medium' : 'text-[#848e9c]'}>Limit</button>
                <button onClick={() => setOrderType('market')}
                  className={orderType === 'market' ? 'text-white font-medium' : 'text-[#848e9c]'}>Market</button>
                <button onClick={() => setOrderType('conditional')}
                  className={`flex items-center gap-1 ${orderType === 'conditional' ? 'text-white font-medium' : 'text-[#848e9c]'}`}>
                  Conditional <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Order Form */}
            <div className="flex-1 overflow-auto px-3 py-2">
              <div className="text-xs text-[#848e9c] mb-2 flex justify-between">
                <span>Available</span>
                <span className="text-white">0.0000 USDT</span>
              </div>

              {/* Price Input */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-[#848e9c] mb-1">
                  <span>Price</span>
                  <span className="text-[#00d9c8] cursor-pointer">Last</span>
                </div>
                <div className="flex items-center bg-[#2b2f36] rounded px-2 py-1.5">
                  <input type="text" value={formatPrice(currentPrice)} className="flex-1 bg-transparent text-white text-sm outline-none" />
                </div>
              </div>

              {/* Quantity Input */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-xs text-[#848e9c] mb-1">
                  <span>Quantity</span>
                  <span className="text-white">{baseAsset}</span>
                </div>
                <div className="flex items-center bg-[#2b2f36] rounded px-2 py-1.5">
                  <input type="text" value="0.000000" className="flex-1 bg-transparent text-white text-sm outline-none" />
                </div>
              </div>

              {/* Slider */}
              <div className="mb-3">
                <input type="range" min="0" max="100" className="w-full h-1 bg-[#2b2f36] rounded-lg appearance-none cursor-pointer" />
              </div>

              {/* Buy/Sell Buttons */}
              <div className="flex gap-2 mb-3">
                <button onClick={() => setSide('buy')}
                  className={`flex-1 py-2.5 rounded text-sm font-medium ${side === 'buy' ? 'bg-[#0ecb81] text-white' : 'bg-[#0ecb81]/20 text-[#0ecb81]'}`}>
                  Open long
                </button>
                <button onClick={() => setSide('sell')}
                  className={`flex-1 py-2.5 rounded text-sm font-medium ${side === 'sell' ? 'bg-[#f6465d] text-white' : 'bg-[#f6465d]/20 text-[#f6465d]'}`}>
                  Open short
                </button>
              </div>

              {/* Max Info */}
              <div className="flex justify-between text-xs text-[#848e9c] mb-1">
                <span>Max: 0.0000 {baseAsset}</span>
                <span>Max: 0.0000 {baseAsset}</span>
              </div>

              {/* Account Info */}
              <div className="mt-4 pt-3 border-t border-[#2b2f36]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[#848e9c]">Unified Trading Account</span>
                  <span className="text-[#848e9c]">P&L</span>
                </div>
                <div className="text-xs text-[#848e9c] space-y-1">
                  <div className="flex justify-between"><span>Margin Mode</span><span className="text-white">Isolated Margin</span></div>
                  <div className="flex justify-between"><span>Margin Balance</span><span className="text-white">0.0000 USDT</span></div>
                  <div className="flex justify-between"><span>Available Balance</span><span className="text-white">0.0000 USDT</span></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-3">
                <button className="flex-1 py-2 bg-[#00d9c8] hover:bg-[#00f5e1] rounded text-black text-xs font-medium">Deposit</button>
                <button className="flex-1 py-2 bg-[#2b2f36] hover:bg-[#363c45] rounded text-white text-xs">Convert</button>
                <button className="flex-1 py-2 bg-[#2b2f36] hover:bg-[#363c45] rounded text-white text-xs">Transfer</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

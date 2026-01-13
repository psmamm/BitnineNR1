/**
 * Professional Trading Terminal - Bitget Style
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Star, ChevronDown, Settings, TrendingUp, TrendingDown, Search, X, Loader2 } from 'lucide-react';
import { useBinanceMarkets } from '../hooks/useBinanceMarkets';
import { useBinanceOrderbook } from '../hooks/useBinanceOrderbook';

export type TradingType = 'spot' | 'margin' | 'futures';

// Categories for symbol filtering
const MARKET_TABS = ['Favorites', 'Spot', 'Futures', 'Margin'] as const;

export default function TradingPage() {
  const location = useLocation();

  // Extract trading type from URL path
  const getTradingTypeFromPath = (): TradingType => {
    const path = location.pathname;
    if (path.includes('/trading/spot')) return 'spot';
    if (path.includes('/trading/margin')) return 'margin';
    if (path.includes('/trading/futures')) return 'futures';
    return 'futures'; // default
  };

  const tradingType: TradingType = getTradingTypeFromPath();

  // Use Binance markets hook for live data
  const { enhancedData, loading: marketsLoading, wsConnected } = useBinanceMarkets();

  const [symbol, setSymbol] = useState('BTCUSDT');
  const [showSymbolSelector, setShowSymbolSelector] = useState(false);
  const [symbolSearch, setSymbolSearch] = useState('');
  const [chartTab, setChartTab] = useState<'chart' | 'about' | 'news'>('chart');
  const [interval, setInterval] = useState('60');
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('tradingFavorites');
    return saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
  });

  // Symbol selector filters - default based on trading type
  const getDefaultMarketTab = () => {
    if (tradingType === 'futures') return 'Futures';
    if (tradingType === 'margin') return 'Margin';
    return 'Spot';
  };
  const [marketTab, setMarketTab] = useState<typeof MARKET_TABS[number]>(getDefaultMarketTab());

  // Get current pair data
  const currentPair = enhancedData[symbol];
  const currentPrice = currentPair ? parseFloat(currentPair.lastPrice) : 0;
  const priceChangePercent = currentPair ? parseFloat(currentPair.priceChangePercent) : 0;
  const volume24h = currentPair ? parseFloat(currentPair.quoteVolume) : 0;
  const high24h = currentPair ? parseFloat(currentPair.highPrice) : 0;
  const low24h = currentPair ? parseFloat(currentPair.lowPrice) : 0;

  const [orderType, setOrderType] = useState<'limit' | 'market' | 'conditional'>('limit');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState(currentPrice.toFixed(2));
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const symbolSelectorRef = useRef<HTMLDivElement>(null);

  // Filter trading pairs based on search and filters
  const filteredPairs = useMemo(() => {
    let pairs = Object.values(enhancedData);

    // Always filter by USDT quote asset
    pairs = pairs.filter(p => p.quoteAsset === 'USDT');

    // Filter by market tab
    if (marketTab === 'Favorites') {
      pairs = pairs.filter(p => favorites.includes(p.symbol));
    }

    // Filter by search
    if (symbolSearch) {
      const search = symbolSearch.toLowerCase();
      pairs = pairs.filter(p =>
        p.symbol.toLowerCase().includes(search) ||
        p.baseAsset.toLowerCase().includes(search)
      );
    }

    // Sort by volume
    pairs.sort((a, b) => parseFloat(b.quoteVolume || '0') - parseFloat(a.quoteVolume || '0'));

    return pairs.slice(0, 100); // Limit for performance
  }, [enhancedData, symbolSearch, marketTab, favorites]);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('tradingFavorites', JSON.stringify(favorites));
  }, [favorites]);

  // Close symbol selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (symbolSelectorRef.current && !symbolSelectorRef.current.contains(e.target as Node)) {
        setShowSymbolSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update price when symbol changes
  useEffect(() => {
    if (currentPrice > 0) {
      setPrice(currentPrice.toFixed(2));
    }
  }, [currentPrice, symbol]);

  // Real orderbook from Binance WebSocket
  const { orderbook, connected: orderbookConnected } = useBinanceOrderbook({
    symbol,
    limit: 12,
    type: tradingType === 'spot' ? 'spot' : 'futures'
  });

  // TradingView Widget initialization - recreates on symbol or interval change
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const containerId = `tv-widget-${Date.now()}`;

    // Clear previous content
    chartContainerRef.current.innerHTML = '';

    // Create widget container
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    widgetContainer.style.cssText = 'height: 100%; width: 100%;';

    // Create inner container for widget
    const widgetInner = document.createElement('div');
    widgetInner.className = 'tradingview-widget-container__widget';
    widgetInner.id = containerId;
    widgetInner.style.cssText = 'height: 100%; width: 100%;';

    // Create script
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
      save_image: true,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      withdateranges: true,
      details: false,
      hotlist: false,
      calendar: false,
      show_popup_button: false,
      support_host: "https://www.tradingview.com",
      container_id: containerId,
    });

    // Assemble and append
    widgetContainer.appendChild(widgetInner);
    widgetContainer.appendChild(script);
    chartContainerRef.current.appendChild(widgetContainer);

    return () => {
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = '';
      }
    };
  }, [symbol, interval]);

  // Real orderbook data from Binance
  const asks = orderbook.asks;
  const bids = orderbook.bids;

  // Calculate max total for depth visualization
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

  const timeframes = [
    { label: '1s', value: '1S' },
    { label: '1m', value: '1' },
    { label: '5m', value: '5' },
    { label: '15m', value: '15' },
    { label: '1h', value: '60' },
    { label: '4h', value: '240' },
    { label: '1D', value: 'D' },
    { label: '1W', value: 'W' },
  ];

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  return (
    <div className="h-screen w-full bg-[#0b0e11] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-[56px] bg-[#161a1e] border-b border-[#2b2f36] flex items-center px-4 shrink-0">
        {/* Symbol Selector */}
        <div className="relative" ref={symbolSelectorRef}>
          <div
            className="flex items-center gap-2 cursor-pointer hover:bg-[#1e2329] px-3 py-2 rounded-lg transition-colors"
            onClick={() => setShowSymbolSelector(!showSymbolSelector)}
          >
            <Star
              className={`w-4 h-4 cursor-pointer transition-colors ${
                favorites.includes(symbol) ? 'text-[#f0b90b] fill-[#f0b90b]' : 'text-[#848e9c] hover:text-[#f0b90b]'
              }`}
              onClick={(e) => toggleFavorite(symbol, e)}
            />
            <span className="font-bold text-lg">{symbol}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showSymbolSelector ? 'rotate-180' : ''}`} />
          </div>

          {/* Symbol Dropdown - Bitget Style */}
          {showSymbolSelector && (
            <div className="absolute top-full left-0 mt-1 w-[420px] bg-[#1e2329] border border-[#2b2f36] rounded-lg shadow-2xl z-50">
              {/* Search */}
              <div className="p-3 border-b border-[#2b2f36]">
                <div className="flex items-center bg-[#2b2f36] rounded-lg px-3 py-2">
                  <Search className="w-4 h-4 text-[#848e9c]" />
                  <input
                    type="text"
                    value={symbolSearch}
                    onChange={(e) => setSymbolSearch(e.target.value)}
                    placeholder="Search"
                    className="flex-1 bg-transparent outline-none text-sm ml-2 placeholder-[#848e9c]"
                    autoFocus
                  />
                  {symbolSearch && (
                    <X
                      className="w-4 h-4 text-[#848e9c] cursor-pointer hover:text-white"
                      onClick={() => setSymbolSearch('')}
                    />
                  )}
                </div>
              </div>

              {/* Market Tabs */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-[#2b2f36]">
                {MARKET_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMarketTab(tab)}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      marketTab === tab
                        ? 'bg-[#2b2f36] text-white'
                        : 'text-[#848e9c] hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* USDT-M indicator */}
              {marketTab !== 'Favorites' && (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2b2f36]">
                  <span className="px-2 py-1 text-xs bg-[#00D9C8] text-black font-medium rounded">USDT-M</span>
                  <span className="text-[10px] text-[#848e9c]">All pairs in USDT</span>
                </div>
              )}

              {/* Table Header */}
              <div className="flex items-center justify-between px-4 py-2 text-[11px] text-[#848e9c] border-b border-[#2b2f36]">
                <span className="w-[140px]">Coin / Trading volume</span>
                <span className="w-[100px] text-right">Last price</span>
                <span className="w-[80px] text-right">24h change</span>
              </div>

              {/* Pairs List */}
              <div className="max-h-[400px] overflow-y-auto">
                {marketsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-[#00D9C8] animate-spin" />
                  </div>
                ) : filteredPairs.length === 0 ? (
                  <div className="text-center py-8 text-[#848e9c]">
                    {marketTab === 'Favorites' ? 'No favorites yet' : 'No pairs found'}
                  </div>
                ) : (
                  filteredPairs.map((pair) => (
                    <div
                      key={pair.symbol}
                      className={`flex items-center justify-between px-4 py-2.5 hover:bg-[#2b2f36] cursor-pointer transition-colors ${
                        pair.symbol === symbol ? 'bg-[#2b2f36]' : ''
                      }`}
                      onClick={() => handleSymbolSelect(pair.symbol)}
                    >
                      <div className="flex items-center gap-2 w-[140px]">
                        <Star
                          className={`w-3.5 h-3.5 cursor-pointer transition-colors shrink-0 ${
                            favorites.includes(pair.symbol) ? 'text-[#f0b90b] fill-[#f0b90b]' : 'text-[#848e9c] hover:text-[#f0b90b]'
                          }`}
                          onClick={(e) => toggleFavorite(pair.symbol, e)}
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-sm flex items-center gap-1">
                            {pair.baseAsset}
                            <span className="text-[10px] px-1 py-0.5 bg-[#2b2f36] text-[#848e9c] rounded">
                              Perpetual
                            </span>
                          </div>
                          <div className="text-[10px] text-[#848e9c]">
                            {formatVolume(parseFloat(pair.quoteVolume || '0'))}
                          </div>
                        </div>
                      </div>
                      <div className="w-[100px] text-right font-mono text-sm">
                        {formatPrice(parseFloat(pair.lastPrice || '0'))}
                      </div>
                      <div className={`w-[80px] text-right text-sm ${
                        parseFloat(pair.priceChangePercent || '0') >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                      }`}>
                        {parseFloat(pair.priceChangePercent || '0') >= 0 ? '+' : ''}
                        {parseFloat(pair.priceChangePercent || '0').toFixed(2)}%
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Price Info */}
        <div className="ml-4 flex items-center gap-6">
          <div>
            <div className={`text-xl font-bold ${priceChangePercent >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
              {formatPrice(currentPrice)}
            </div>
            <div className="text-xs text-[#848e9c]">≈ ${formatPrice(currentPrice)}</div>
          </div>

          <div className="flex gap-6 text-xs">
            <div>
              <div className="text-[#848e9c] mb-0.5">24h Change</div>
              <div className={priceChangePercent >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>
                {priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-[#848e9c] mb-0.5">24h High</div>
              <div>{formatPrice(high24h)}</div>
            </div>
            <div>
              <div className="text-[#848e9c] mb-0.5">24h Low</div>
              <div>{formatPrice(low24h)}</div>
            </div>
            <div>
              <div className="text-[#848e9c] mb-0.5">24h Volume</div>
              <div>{formatVolume(volume24h)} USDT</div>
            </div>
            {tradingType === 'futures' && (
              <>
                <div>
                  <div className="text-[#848e9c] mb-0.5">Open Interest</div>
                  <div>$2.4B</div>
                </div>
                <div>
                  <div className="text-[#848e9c] mb-0.5">Funding Rate</div>
                  <div className="text-[#0ecb81]">0.0100%</div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {wsConnected && (
            <span className="flex items-center gap-1 text-[10px] text-[#0ecb81]">
              <span className="w-1.5 h-1.5 bg-[#0ecb81] rounded-full animate-pulse" />
              Live
            </span>
          )}
          <span className="text-xs px-2 py-1 bg-[#2b2f36] text-[#848e9c] rounded">
            {tradingType === 'futures' ? 'Perpetual' : tradingType === 'margin' ? 'Margin' : 'Spot'}
          </span>
          <button className="p-2 hover:bg-[#2b2f36] rounded">
            <Settings className="w-5 h-5 text-[#848e9c]" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Chart */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-[#2b2f36]">
          {/* Chart Tabs - Bitget Style */}
          <div className="h-10 border-b border-[#2b2f36] flex items-center px-4 shrink-0">
            <div className="flex items-center gap-4">
              {[
                { id: 'chart', label: 'Chart' },
                { id: 'about', label: 'About' },
                { id: 'news', label: 'News' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setChartTab(tab.id as typeof chartTab)}
                  className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                    chartTab === tab.id
                      ? 'text-white border-[#00D9C8]'
                      : 'text-[#848e9c] border-transparent hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Timeframe Selector */}
            {chartTab === 'chart' && (
              <div className="ml-6 flex items-center gap-1">
                <span className="text-xs text-[#848e9c] mr-2">Time</span>
                {timeframes.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setInterval(tf.value)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      interval === tf.value
                        ? 'bg-[#00D9C8] text-black font-medium'
                        : 'text-[#848e9c] hover:text-white hover:bg-[#2b2f36]'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chart Content */}
          {chartTab === 'chart' ? (
            <div
              ref={chartContainerRef}
              className="flex-1 w-full"
              style={{ minHeight: '400px', height: '100%' }}
            />
          ) : chartTab === 'about' ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">{currentPair?.baseAsset || symbol.replace('USDT', '')} ({symbol.replace('USDT', '')})</h3>
              <p className="text-[#848e9c] text-sm leading-relaxed">
                Trade {symbol} with up to 125x leverage on perpetual futures.
              </p>
            </div>
          ) : (
            <div className="flex-1 p-6 overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Latest News</h3>
              <p className="text-[#848e9c] text-sm">No news available for {symbol}</p>
            </div>
          )}
        </div>

        {/* Right: Order Book */}
        <div className="w-[280px] flex flex-col border-r border-[#2b2f36] shrink-0">
          <div className="h-10 border-b border-[#2b2f36] flex items-center px-3 gap-4 shrink-0">
            <span className="text-sm font-medium text-white">Order book</span>
            <span className="text-sm text-[#848e9c] hover:text-white cursor-pointer">Market trades</span>
            {orderbookConnected && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-[#0ecb81]">
                <span className="w-1.5 h-1.5 bg-[#0ecb81] rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>

          <div className="flex justify-between px-3 py-2 text-[11px] text-[#848e9c] border-b border-[#2b2f36]">
            <span>Price (USDT)</span>
            <span>Qty ({symbol.replace('USDT', '')})</span>
            <span>Total</span>
          </div>

          {/* Asks */}
          <div className="flex-1 overflow-hidden flex flex-col-reverse">
            {asks.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[#848e9c] text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </div>
            ) : (
              asks.map((o, i) => (
                <div
                  key={`a${i}`}
                  className="flex justify-between px-3 py-[3px] text-[12px] relative hover:bg-[#1e2329] cursor-pointer"
                  onClick={() => setPrice(o.price)}
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-[#f6465d]/15"
                    style={{ width: `${(parseFloat(o.total) / maxTotal) * 100}%` }}
                  />
                  <span className="text-[#f6465d] z-10 font-mono">{parseFloat(o.price).toFixed(2)}</span>
                  <span className="z-10 font-mono text-[#eaecef]">{parseFloat(o.quantity).toFixed(4)}</span>
                  <span className="text-[#848e9c] z-10 font-mono">{parseFloat(o.total).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>

          {/* Spread / Current Price */}
          <div className="py-3 px-3 border-y border-[#2b2f36] bg-[#1e2329]">
            <div className="flex items-center justify-between">
              <span className={`text-lg font-bold ${priceChangePercent >= 0 ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                {formatPrice(currentPrice)}
              </span>
              <div className="text-right">
                <span className="text-xs text-[#848e9c]">Spread: </span>
                <span className="text-xs text-[#f0b90b]">{orderbook.spread.toFixed(2)} ({orderbook.spreadPercent.toFixed(3)}%)</span>
              </div>
            </div>
          </div>

          {/* Bids */}
          <div className="flex-1 overflow-hidden">
            {bids.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[#848e9c] text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </div>
            ) : (
              bids.map((o, i) => (
                <div
                  key={`b${i}`}
                  className="flex justify-between px-3 py-[3px] text-[12px] relative hover:bg-[#1e2329] cursor-pointer"
                  onClick={() => setPrice(o.price)}
                >
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-[#0ecb81]/15"
                    style={{ width: `${(parseFloat(o.total) / maxTotal) * 100}%` }}
                  />
                  <span className="text-[#0ecb81] z-10 font-mono">{parseFloat(o.price).toFixed(2)}</span>
                  <span className="z-10 font-mono text-[#eaecef]">{parseFloat(o.quantity).toFixed(4)}</span>
                  <span className="text-[#848e9c] z-10 font-mono">{parseFloat(o.total).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Deal Ticket */}
        <div className="w-[280px] flex flex-col shrink-0">
          <div className="h-10 border-b border-[#2b2f36] flex items-center px-3 gap-3 shrink-0">
            {['limit', 'market', 'conditional'].map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t as typeof orderType)}
                className={`text-xs capitalize ${orderType === t ? 'text-[#00D9C8] font-medium' : 'text-[#848e9c] hover:text-white'}`}
              >
                {t}
              </button>
            ))}
            {tradingType !== 'spot' && (
              <select className="ml-auto bg-[#2b2f36] text-xs px-2 py-1 rounded text-white border-none outline-none">
                <option>Isolated {leverage}x</option>
                <option>Cross</option>
              </select>
            )}
          </div>

          <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            {/* Price */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#848e9c]">Price</span>
                <span className="text-[#00D9C8] cursor-pointer hover:underline">Last</span>
              </div>
              <div className="flex bg-[#2b2f36] rounded-lg">
                <input
                  type="text"
                  value={orderType === 'market' ? 'Market' : price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={orderType === 'market'}
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none disabled:text-[#848e9c] font-mono"
                />
                <span className="px-3 py-2.5 text-sm text-[#848e9c]">USDT</span>
              </div>
            </div>

            {/* Size */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-[#848e9c]">Quantity</span>
              </div>
              <div className="flex bg-[#2b2f36] rounded-lg">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder-[#5e6673] font-mono"
                />
                <span className="px-3 py-2.5 text-sm text-[#848e9c]">{symbol.replace('USDT', '')}</span>
              </div>
            </div>

            {/* Leverage */}
            {tradingType !== 'spot' && (
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-[#848e9c]">Leverage</span>
                  <span className="text-[#00D9C8] font-medium">{leverage}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="125"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#2b2f36] rounded appearance-none cursor-pointer accent-[#00D9C8]"
                />
                <div className="flex justify-between text-[10px] text-[#848e9c] mt-1.5">
                  {['1x', '25x', '50x', '75x', '100x', '125x'].map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </div>
              </div>
            )}

            {/* TP/SL */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-[#848e9c]">Take Profit</span>
                <input
                  type="text"
                  placeholder="--"
                  className="w-full mt-1 bg-[#2b2f36] px-3 py-2 text-xs rounded-lg outline-none placeholder-[#5e6673] font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#848e9c]">Stop Loss</span>
                <input
                  type="text"
                  placeholder="--"
                  className="w-full mt-1 bg-[#2b2f36] px-3 py-2 text-xs rounded-lg outline-none placeholder-[#5e6673] font-mono"
                />
              </div>
            </div>

            {/* Buy/Sell */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setSide('buy')}
                className={`py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 transition-colors ${
                  side === 'buy' ? 'bg-[#0ecb81] text-white' : 'bg-[#0ecb81]/20 text-[#0ecb81] hover:bg-[#0ecb81]/30'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                {tradingType === 'spot' ? 'Buy' : 'Buy/Long'}
              </button>
              <button
                onClick={() => setSide('sell')}
                className={`py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 transition-colors ${
                  side === 'sell' ? 'bg-[#f6465d] text-white' : 'bg-[#f6465d]/20 text-[#f6465d] hover:bg-[#f6465d]/30'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                {tradingType === 'spot' ? 'Sell' : 'Sell/Short'}
              </button>
            </div>

            <div className="flex justify-between text-xs pt-1">
              <span className="text-[#848e9c]">Available</span>
              <span>0.00 USDT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Positions */}
      <div className="h-[200px] border-t border-[#2b2f36] bg-[#161a1e] shrink-0">
        <div className="h-10 border-b border-[#2b2f36] flex items-center px-4 gap-5">
          {[
            { id: 'positions', label: 'Open orders', count: 0 },
            { id: 'orders', label: 'Order history' },
            { id: 'history', label: 'Order details' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as typeof activeTab)}
              className={`text-sm flex items-center gap-1.5 ${activeTab === t.id ? 'text-white font-medium' : 'text-[#848e9c] hover:text-white'}`}
            >
              {t.label}
              {'count' in t && <span className="px-1.5 py-0.5 bg-[#2b2f36] rounded text-[10px]">{t.count}</span>}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-[#848e9c] cursor-pointer">
              <input type="checkbox" className="accent-[#00D9C8] w-3.5 h-3.5" />
              Show current
            </label>
            <span className="text-xs text-[#00D9C8] cursor-pointer hover:underline">More</span>
          </div>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#848e9c]">
              {['Symbol', 'Size', 'Entry Price', 'Mark Price', 'Liq. Price', 'Margin', 'PNL (ROE%)', 'TP/SL', 'Close'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={9} className="text-center py-8 text-[#848e9c]">No open positions</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

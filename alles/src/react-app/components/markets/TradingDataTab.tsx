import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useBinanceMarkets, EnhancedMarketData } from '@/react-app/hooks/useBinanceMarkets';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router';

type TradingDataSubTab = 'rankings' | 'usd-futures' | 'coin-futures' | 'options';

interface DataCardProps {
  title: string;
  showFilter?: boolean;
  children: React.ReactNode;
}

function DataCard({ title, showFilter = false, children }: DataCardProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="bg-[#0D0F18] rounded-xl p-4 border border-white/10 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {showFilter && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-1 px-2 py-1 text-xs text-[#7F8C8D] hover:text-white border border-white/10 rounded transition-colors"
            >
              <span>Crypto</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}

interface CoinRowProps {
  rank: number;
  item: EnhancedMarketData;
  onNavigate: (symbol: string) => void;
}

function CoinRow({ rank, item, onNavigate }: CoinRowProps) {
  const formatPrice = (price: string): string => {
    const num = parseFloat(price);
    if (num >= 1) {
      return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${num.toFixed(6)}`;
  };

  const formatPercent = (percent: string | undefined): string => {
    if (!percent) return '—';
    const num = parseFloat(percent);
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const getPercentColor = (percent: string | undefined): string => {
    if (!percent) return 'text-[#7F8C8D]';
    const num = parseFloat(percent);
    return num >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]';
  };

  return (
    <div
      onClick={() => onNavigate(item.symbol)}
      className="flex items-center justify-between py-2 hover:bg-white/5 cursor-pointer transition-colors rounded"
    >
      <div className="flex items-center space-x-2.5 flex-1 min-w-0">
        <div className="text-[#7F8C8D] text-xs font-medium w-6 text-center">{rank}</div>
        <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 bg-[#0D0F18]/50">
          {item.logo ? (
            <img
              src={item.logo}
              alt={item.baseAsset}
              className="w-5 h-5 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `<span class="text-[#BDC3C7] font-bold text-xs">${item.baseAsset.slice(0, 2)}</span>`;
                }
              }}
            />
          ) : (
            <span className="text-[#BDC3C7] font-bold text-xs">{item.baseAsset.slice(0, 2)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-white text-sm truncate">{item.baseAsset}</div>
        </div>
      </div>
      <div className="flex items-center space-x-4 ml-2 flex-shrink-0">
        <div className="text-right min-w-[80px]">
          <div className="font-semibold text-white text-sm whitespace-nowrap">{formatPrice(item.lastPrice)}</div>
        </div>
        <div className="text-right min-w-[80px]">
          <div className={`text-sm font-medium ${getPercentColor(item.priceChangePercent)} whitespace-nowrap`}>
            {formatPercent(item.priceChangePercent)}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PriceDistributionProps {
  data: EnhancedMarketData[];
}

function PriceDistribution({ data }: PriceDistributionProps) {
  const distribution = useMemo(() => {
    // Filter out invalid data
    const validData = data.filter(item => {
      const change = parseFloat(item.priceChangePercent || '0');
      return !isNaN(change) && isFinite(change);
    });

    const ranges = [
      { label: '>10%', min: 10, max: Infinity },
      { label: '7-10%', min: 7, max: 10 },
      { label: '5-7%', min: 5, max: 7 },
      { label: '3-5%', min: 3, max: 5 },
      { label: '0-3%', min: 0.01, max: 3 },
      { label: '0%', min: -0.01, max: 0.01 },
      { label: '0-3%', min: -3, max: -0.01 },
      { label: '3-5%', min: -5, max: -3 },
      { label: '5-7%', min: -7, max: -5 },
      { label: '7-10%', min: -10, max: -7 },
      { label: '<-10%', min: -Infinity, max: -10 },
    ];

    const counts = ranges.map(range => {
      return validData.filter(item => {
        const change = parseFloat(item.priceChangePercent || '0');
        if (range.min === -Infinity) {
          return change < range.max;
        }
        if (range.max === Infinity) {
          return change >= range.min;
        }
        return change >= range.min && change < range.max;
      }).length;
    });

    const maxCount = Math.max(...counts, 1);
    const priceUp = validData.filter(item => parseFloat(item.priceChangePercent || '0') > 0).length;
    const priceDown = validData.filter(item => parseFloat(item.priceChangePercent || '0') < 0).length;
    const zeroCount = validData.filter(item => {
      const change = parseFloat(item.priceChangePercent || '0');
      return change >= -0.01 && change <= 0.01;
    }).length;
    const total = priceUp + priceDown + zeroCount;
    const priceUpPercent = total > 0 ? (priceUp / total) * 100 : 0;
    const zeroPercent = total > 0 ? (zeroCount / total) * 100 : 0;

    return { ranges, counts, maxCount, priceUp, priceDown, zeroCount, total, priceUpPercent, zeroPercent };
  }, [data]);

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Bar Chart */}
      <div className="relative h-[240px] bg-[#0A0C12] rounded-lg p-5">
        {/* Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between p-5 pointer-events-none">
          {[0, 20, 40, 60, 80, 100].map((percent) => (
            <div
              key={percent}
              className="w-full border-t border-white/5"
            />
          ))}
        </div>
        
        {/* Bars */}
        <div className="relative flex items-end justify-between h-full gap-4">
          {distribution.ranges.map((range, index) => {
            const count = distribution.counts[index];
            // Calculate height proportionally to maxCount
            const containerHeight = 240 - 40; // Account for padding (p-5 = 20px top + 20px bottom)
            const heightPercent = distribution.maxCount > 0 ? (count / distribution.maxCount) * 100 : 0;
            const heightPx = count > 0 ? Math.max((heightPercent / 100) * containerHeight, 2) : 0;
            const isPositive = index < 5;
            const isZero = index === 5;
            // Use lighter vivid red color
            const color = isZero ? '#4A5568' : isPositive ? '#2ECC71' : '#EF4444';

            return (
              <div key={index} className="flex-1 flex flex-col items-center min-w-0 h-full justify-end">
                <div className="relative w-full flex flex-col items-center justify-end" style={{ height: `${containerHeight}px` }}>
                  {count > 0 && (
                    <>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-white font-semibold whitespace-nowrap z-10">
                        {count}
                      </div>
                      <div
                        className="w-full rounded-t-lg transition-all"
                        style={{
                          height: `${heightPx}px`,
                          backgroundColor: color,
                          minHeight: '2px',
                        }}
                      />
                    </>
                  )}
                </div>
                <div className="text-[10px] text-[#7F8C8D] mt-3 text-center leading-tight whitespace-nowrap font-medium">
                  {range.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="pt-3 border-t border-white/10">
        <div className="relative w-full h-6 rounded-full overflow-hidden flex">
          {distribution.priceUp > 0 && (
            <div
              className="h-full bg-[#2ECC71]"
              style={{ width: `${distribution.priceUpPercent}%` }}
            />
          )}
          {distribution.zeroCount > 0 && (
            <div
              className="h-full bg-[#4A5568]"
              style={{ width: `${distribution.zeroPercent}%` }}
            />
          )}
          <div
            className="h-full bg-[#EF4444] flex-1"
            style={{ width: `${100 - distribution.priceUpPercent - distribution.zeroPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-white">Price up: {distribution.priceUp}</span>
          <span className="text-sm text-white">Price down: {distribution.priceDown}</span>
        </div>
      </div>
    </div>
  );
}

export default function TradingDataTab() {
  const navigate = useNavigate();
  const { enhancedData } = useBinanceMarkets();
  const [activeSubTab, setActiveSubTab] = useState<TradingDataSubTab>('rankings');

  // Filter only USDT pairs (like Binance)
  const allData = useMemo(() => {
    return Object.values(enhancedData).filter(item => item.quoteAsset === 'USDT');
  }, [enhancedData]);

  // Hot Coins - Top by volume
  const hotCoins = useMemo(() => {
    return [...allData]
      .sort((a, b) => parseFloat(b.quoteVolume || '0') - parseFloat(a.quoteVolume || '0'))
      .slice(0, 10);
  }, [allData]);

  // Top Gainers - Positive 24h change
  const topGainers = useMemo(() => {
    return [...allData]
      .filter(item => parseFloat(item.priceChangePercent || '0') > 0)
      .sort((a, b) => parseFloat(b.priceChangePercent || '0') - parseFloat(a.priceChangePercent || '0'))
      .slice(0, 10);
  }, [allData]);

  // Top Losers - Negative 24h change
  const topLosers = useMemo(() => {
    return [...allData]
      .filter(item => parseFloat(item.priceChangePercent || '0') < 0)
      .sort((a, b) => parseFloat(a.priceChangePercent || '0') - parseFloat(b.priceChangePercent || '0'))
      .slice(0, 10);
  }, [allData]);

  // Top Volume
  const topVolume = useMemo(() => {
    return [...allData]
      .sort((a, b) => parseFloat(b.quoteVolume || '0') - parseFloat(a.quoteVolume || '0'))
      .slice(0, 10);
  }, [allData]);

  // USD Futures - USDT perpetuals (mock for now, would need Binance Futures API)
  const usdFutures = useMemo(() => {
    // Filter USDT pairs and simulate futures data
    return [...allData]
      .filter(item => item.quoteAsset === 'USDT')
      .map(item => ({
        ...item,
        symbol: `${item.symbol}Perpetual`,
        priceChangePercent: (parseFloat(item.priceChangePercent || '0') * 1.2).toFixed(2),
      }))
      .sort((a, b) => parseFloat(b.priceChangePercent || '0') - parseFloat(a.priceChangePercent || '0'))
      .slice(0, 10);
  }, [allData]);

  // Coin Futures - BTC/ETH pairs (mock for now)
  // Note: Use enhancedData directly since allData only contains USDT pairs
  const coinFutures = useMemo(() => {
    return Object.values(enhancedData)
      .filter(item => item.quoteAsset === 'BTC' || item.quoteAsset === 'ETH')
      .map(item => ({
        ...item,
        symbol: `${item.symbol}Perpetual`,
        priceChangePercent: (parseFloat(item.priceChangePercent || '0') * 0.8).toFixed(2),
      }))
      .sort((a, b) => parseFloat(b.priceChangePercent || '0') - parseFloat(a.priceChangePercent || '0'))
      .slice(0, 10);
  }, [enhancedData]);

  // Top Movers - Biggest changes with status
  const topMovers = useMemo(() => {
    return [...allData]
      .map(item => {
        const change = parseFloat(item.priceChangePercent || '0');
        const absChange = Math.abs(change);
        // Determine status based on change and volume
        let status = 'Pullback';
        const volume = parseFloat(item.quoteVolume || '0');
        if (change > 5 && volume > 1000000) status = 'New';
        else if (change < -5) status = 'Pullback';
        else if (change > 0) status = 'Rising';
        else status = 'Falling';

        // Determine icon type (A or ---)
        const iconType = absChange > 7 ? 'A' : '---';

        return {
          ...item,
          absChange,
          status,
          iconType,
        };
      })
      .sort((a, b) => b.absChange - a.absChange)
      .slice(0, 10);
  }, [allData]);

  const subTabs: { id: TradingDataSubTab; label: string }[] = [
    { id: 'rankings', label: 'Rankings' },
    { id: 'usd-futures', label: 'USD-M Futures' },
    { id: 'coin-futures', label: 'COIN-M Futures' },
    { id: 'options', label: 'Options' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Sub-Tabs */}
      <div className="border-b border-white/10 pb-2">
        <div className="flex items-center space-x-6">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className="relative px-2 py-2 text-sm font-medium transition-colors"
            >
              <span className={activeSubTab === tab.id ? 'text-white' : 'text-[#7F8C8D] hover:text-[#AAB0C0]'}>
                {tab.label}
              </span>
              {activeSubTab === tab.id && (
                <motion.div
                  layoutId="activeSubTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFD700]"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content based on active sub-tab */}
      {activeSubTab === 'rankings' && (
        <div className="space-y-4">
          {/* Top 6 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Hot Coins */}
            <DataCard title="Hot Coins" showFilter>
              <div className="space-y-1">
                {hotCoins.length > 0 ? (
                  hotCoins.map((item, index) => (
                    <CoinRow key={item.symbol} rank={index + 1} item={item} onNavigate={(symbol) => navigate(`/markets/${symbol}`)} />
                  ))
                ) : (
                  <div className="text-center py-4 text-[#7F8C8D] text-sm">No data available</div>
                )}
              </div>
            </DataCard>

            {/* Top Gainers */}
            <DataCard title="Top Gainers" showFilter>
              <div className="space-y-1">
                {topGainers.length > 0 ? (
                  topGainers.map((item, index) => (
                    <CoinRow key={item.symbol} rank={index + 1} item={item} onNavigate={(symbol) => navigate(`/markets/${symbol}`)} />
                  ))
                ) : (
                  <div className="text-center py-4 text-[#7F8C8D] text-sm">No data available</div>
                )}
              </div>
            </DataCard>

            {/* Top Losers */}
            <DataCard title="Top Losers" showFilter>
              <div className="space-y-1">
                {topLosers.length > 0 ? (
                  topLosers.map((item, index) => (
                    <CoinRow key={item.symbol} rank={index + 1} item={item} onNavigate={(symbol) => navigate(`/markets/${symbol}`)} />
                  ))
                ) : (
                  <div className="text-center py-4 text-[#7F8C8D] text-sm">No data available</div>
                )}
              </div>
            </DataCard>

            {/* Top Volume */}
            <DataCard title="Top Volume" showFilter>
              <div className="space-y-1">
                {topVolume.length > 0 ? (
                  topVolume.map((item, index) => (
                    <CoinRow key={item.symbol} rank={index + 1} item={item} onNavigate={(symbol) => navigate(`/markets/${symbol}`)} />
                  ))
                ) : (
                  <div className="text-center py-4 text-[#7F8C8D] text-sm">No data available</div>
                )}
              </div>
            </DataCard>

            {/* USD Futures */}
            <DataCard title="USD Futures">
              <div className="space-y-1">
                {usdFutures.length > 0 ? (
                  usdFutures.map((item, index) => (
                    <CoinRow key={item.symbol} rank={index + 1} item={item} onNavigate={(symbol) => navigate(`/markets/${symbol}`)} />
                  ))
                ) : (
                  <div className="text-center py-4 text-[#7F8C8D] text-sm">No data available</div>
                )}
              </div>
            </DataCard>

            {/* Coin Futures */}
            <DataCard title="Coin Futures">
              <div className="space-y-1">
                {coinFutures.length > 0 ? (
                  coinFutures.map((item, index) => (
                    <CoinRow key={item.symbol} rank={index + 1} item={item} onNavigate={(symbol) => navigate(`/markets/${symbol}`)} />
                  ))
                ) : (
                  <div className="text-center py-4 text-[#7F8C8D] text-sm">No data available</div>
                )}
              </div>
            </DataCard>
          </div>

          {/* Bottom Row: Price Change Distribution and Top Movers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Price Change Distribution - Takes 2 columns on desktop for wider display */}
            <div className="lg:col-span-2">
              <DataCard title="Price Change Distribution">
                <PriceDistribution data={allData} />
              </DataCard>
            </div>

            {/* Top Movers - Takes 1 column, same width as cards above */}
            <div>
              <DataCard title="Top Movers">
              <div className="space-y-1">
                {topMovers.length > 0 ? (
                  topMovers.map((item, index) => {
                    const change = parseFloat(item.priceChangePercent || '0');
                    const statusText = item.status === 'Pullback' ? 'Pullba...' : item.status === 'New' ? 'New...' : item.status;
                    
                    return (
                      <div
                        key={item.symbol}
                        onClick={() => navigate(`/markets/${item.symbol}`)}
                        className="flex items-center justify-between py-2 hover:bg-white/5 cursor-pointer transition-colors rounded"
                      >
                        <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                          <div className="text-[#7F8C8D] text-xs font-medium w-4 text-center">{index + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white text-sm truncate">
                              {item.baseAsset}<span className="font-normal text-[#7F8C8D]">/{item.quoteAsset}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 ml-2 flex-shrink-0">
                          <div className="text-right min-w-[60px]">
                            <div className="text-xs text-[#7F8C8D] truncate">{statusText}</div>
                          </div>
                          <div className="text-right min-w-[70px] flex items-center justify-end space-x-1">
                            <div className="w-3 h-3 bg-[#E74C3C] rounded flex items-center justify-center">
                              <span className="text-[8px] text-white font-bold">{item.iconType}</span>
                            </div>
                            <div className={`text-sm font-medium text-[#E74C3C] whitespace-nowrap`}>
                              {change.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-[#7F8C8D] text-sm">No data available</div>
                )}
              </div>
            </DataCard>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'usd-futures' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DataCard title="USD Futures">
            <div className="space-y-1">
              {usdFutures.length > 0 ? (
                usdFutures.map((item, index) => (
                  <CoinRow key={item.symbol} rank={index + 1} item={item} onNavigate={(symbol) => navigate(`/markets/${symbol}`)} />
                ))
              ) : (
                <div className="text-center py-4 text-[#7F8C8D] text-sm">No data available</div>
              )}
            </div>
          </DataCard>
        </div>
      )}

      {activeSubTab === 'coin-futures' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DataCard title="Coin Futures">
            <div className="space-y-1">
              {coinFutures.length > 0 ? (
                coinFutures.map((item, index) => (
                  <CoinRow key={item.symbol} rank={index + 1} item={item} onNavigate={(symbol) => navigate(`/markets/${symbol}`)} />
                ))
              ) : (
                <div className="text-center py-4 text-[#7F8C8D] text-sm">No data available</div>
              )}
            </div>
          </DataCard>
        </div>
      )}

      {activeSubTab === 'options' && (
        <div className="text-center py-12 text-[#7F8C8D]">
          Options data coming soon
        </div>
      )}
    </motion.div>
  );
}

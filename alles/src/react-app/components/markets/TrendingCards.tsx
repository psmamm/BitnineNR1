import { motion } from 'framer-motion';
import { TrendingUp, Flame, Sparkles, BarChart3 } from 'lucide-react';
import { EnhancedMarketData } from '@/react-app/hooks/useBinanceMarkets';
import { useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { getLogoUrl, getLogoUrls } from '@/react-app/utils/coinLogos';

// Helper function to get logo URL - uses Binance CDN as primary
function getLogoUrlForCoin(baseAsset: string): string {
  return getLogoUrl(baseAsset);
}

interface TrendingCardsProps {
  hot: EnhancedMarketData[];
  newCoins: EnhancedMarketData[];
  topGainer: EnhancedMarketData[];
  topVolume: EnhancedMarketData[];
}

interface TrendingCardProps {
  title: string;
  icon: React.ReactNode;
  items: EnhancedMarketData[];
  color: string;
  onMoreClick: () => void;
  quoteAssetPrices: Record<string, number>;
}

function TrendingCard({ title, icon, items, color, onMoreClick, quoteAssetPrices }: TrendingCardProps) {
  const navigate = useNavigate();

  // Convert price to USDT if needed
  const convertToUSDT = (price: string, quoteAsset: string): number => {
    const priceNum = parseFloat(price);
    if (quoteAsset === 'USDT') return priceNum;
    
    // For fiat currencies (IDR, TRY, etc.), we need to divide by the USDT price in that currency
    // For example: if USDT/IDR = 16,734, then 1 IDR = 1/16,734 USDT
    const fiatCurrencies = ['IDR', 'TRY', 'BRL', 'EUR', 'GBP', 'JPY', 'KRW', 'RUB', 'CNY'];
    if (fiatCurrencies.includes(quoteAsset)) {
      // For fiat, we need to get the USDT price in that fiat currency
      // If we have USDT/IDR price, then priceInIDR / usdtPriceInIDR = priceInUSDT
      const usdtPriceInFiat = quoteAssetPrices[`USDT_${quoteAsset}`] || quoteAssetPrices[quoteAsset];
      if (usdtPriceInFiat && usdtPriceInFiat > 0) {
        return priceNum / usdtPriceInFiat;
      }
      // Fallback: use approximate rate
      if (quoteAsset === 'IDR') return priceNum / 15000; // Approximate: 1 USDT ≈ 15,000 IDR
      if (quoteAsset === 'TRY') return priceNum / 30; // Approximate: 1 USDT ≈ 30 TRY
      return priceNum; // Fallback
    }
    
    // For crypto quote assets (BTC, ETH, BNB, etc.), multiply by their USDT price
    const quotePriceInUSDT = quoteAssetPrices[quoteAsset] || 1;
    return priceNum * quotePriceInUSDT;
  };

  const formatPrice = (price: string, quoteAsset: string): string => {
    const priceInUSDT = convertToUSDT(price, quoteAsset);
    if (priceInUSDT >= 1) {
      // Binance-style formatting with commas
      return `$${priceInUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${priceInUSDT.toFixed(6)}`;
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0D0F18] rounded-xl p-4 border border-white/10 flex-1 min-w-[280px]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded ${color}`}>
            {icon}
          </div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
      </div>

      <div className="space-y-2.5">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div
              key={item.symbol}
              onClick={() => navigate(`/markets/${item.symbol}`)}
              className="flex items-center justify-between py-2 hover:bg-white/5 cursor-pointer transition-colors rounded"
            >
              <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 bg-[#0D0F18]/50">
                  <img
                    src={item.logo || getLogoUrlForCoin(item.baseAsset)}
                    alt={item.baseAsset}
                    className="w-6 h-6 object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      let attemptCount = parseInt(target.dataset.attemptCount || '0');
                      
                      // Track attempts to prevent infinite loops
                      target.dataset.attemptCount = (attemptCount + 1).toString();
                      
                      // Get all possible logo URLs (synchronous)
                      const urls = getLogoUrls(item.baseAsset);
                      
                      if (attemptCount < urls.length) {
                        // Try next URL in the list
                        target.src = urls[attemptCount];
                      } else {
                        // Final fallback to text
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('span')) {
                          parent.innerHTML = `<span class="text-[#BDC3C7] font-bold text-xs">${item.baseAsset.slice(0, 2)}</span>`;
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm truncate">{item.baseAsset}</div>
                  <div className="text-xs text-[#7F8C8D] truncate">{item.baseAsset}/USDT</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 ml-2 flex-shrink-0">
                <div className="text-right">
                  <div className="font-semibold text-white text-sm whitespace-nowrap">{formatPrice(item.lastPrice, item.quoteAsset)}</div>
                  <div className={`text-xs font-medium ${getPercentColor(item.priceChangePercent)} whitespace-nowrap`}>
                    {formatPercent(item.priceChangePercent)}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-[#7F8C8D] text-sm">No data available</div>
        )}
      </div>
    </motion.div>
  );
}

export default function TrendingCards({ hot, newCoins, topGainer, topVolume }: TrendingCardsProps) {
  // Quote asset prices in USDT for conversion
  const [quoteAssetPrices, setQuoteAssetPrices] = useState<Record<string, number>>({ USDT: 1 });

  // Fetch quote asset prices in USDT for conversion
  useEffect(() => {
    const fetchQuoteAssetPrices = async () => {
      try {
        // Fetch crypto quote assets (BTC, ETH, BNB, etc.) in USDT
        const cryptoQuoteAssets = ['BTC', 'ETH', 'BNB', 'USDC', 'TUSD', 'PAX', 'BUSD', 'FDUSD', 'DAI'];
        const usdtPairs = cryptoQuoteAssets.map(asset => `${asset}USDT`).filter(pair => pair !== 'USDTUSDT');
        
        const response = await fetch('https://api.binance.com/api/v3/ticker/price');
        if (!response.ok) throw new Error('Failed to fetch quote asset prices');
        
        const data = await response.json();
        const prices: Record<string, number> = { USDT: 1 }; // USDT is always 1
        
        // Get crypto quote asset prices in USDT
        data.forEach((ticker: any) => {
          if (usdtPairs.includes(ticker.symbol)) {
            const asset = ticker.symbol.replace('USDT', '');
            prices[asset] = parseFloat(ticker.price);
          }
        });
        
        // For fiat currencies (IDR, TRY), we need to get USDT price in that fiat
        // For example: USDT/IDR tells us how many IDR = 1 USDT
        const fiatPairs = ['USDTIDR', 'USDTRY'];
        data.forEach((ticker: any) => {
          if (fiatPairs.includes(ticker.symbol)) {
            const fiat = ticker.symbol.replace('USDT', '');
            // Store the USDT price in this fiat currency (e.g., 1 USDT = 16,734 IDR)
            prices[`USDT_${fiat}`] = parseFloat(ticker.price);
            prices[fiat] = parseFloat(ticker.price); // Also store for backward compatibility
          }
        });
        
        setQuoteAssetPrices(prices);
      } catch (err) {
        console.error('Failed to fetch quote asset prices:', err);
        // Set default prices with approximate rates
        setQuoteAssetPrices({ 
          USDT: 1, 
          BTC: 50000, 
          ETH: 3000, 
          BNB: 600, 
          USDC: 1, 
          TUSD: 1, 
          PAX: 1, 
          BUSD: 1, 
          FDUSD: 1, 
          DAI: 1,
          'USDT_IDR': 15000, // 1 USDT = 15,000 IDR (approximate)
          'USDT_TRY': 30, // 1 USDT = 30 TRY (approximate)
          IDR: 15000,
          TRY: 30
        });
      }
    };
    
    fetchQuoteAssetPrices();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <TrendingCard
        title="Hot"
        icon={<Flame className="w-4 h-4 text-white" />}
        items={hot}
        color="bg-[#E74C3C]/20"
        onMoreClick={() => {}}
        quoteAssetPrices={quoteAssetPrices}
      />
      <TrendingCard
        title="New"
        icon={<Sparkles className="w-4 h-4 text-white" />}
        items={newCoins}
        color="bg-[#6A3DF4]/20"
        onMoreClick={() => {}}
        quoteAssetPrices={quoteAssetPrices}
      />
      <TrendingCard
        title="Top Gainer"
        icon={<TrendingUp className="w-4 h-4 text-white" />}
        items={topGainer}
        color="bg-[#2ECC71]/20"
        onMoreClick={() => {}}
        quoteAssetPrices={quoteAssetPrices}
      />
      <TrendingCard
        title="Top Volume"
        icon={<BarChart3 className="w-4 h-4 text-white" />}
        items={topVolume}
        color="bg-[#3498DB]/20"
        onMoreClick={() => {}}
        quoteAssetPrices={quoteAssetPrices}
      />
    </div>
  );
}

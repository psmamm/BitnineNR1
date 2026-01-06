import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import {
  Search,
  Star,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useBinanceMarkets, type MarketFilters } from "@/react-app/hooks/useBinanceMarkets";
import { useCoinGeckoMarketCap } from "@/react-app/hooks/useCoinGeckoMarketCap";
import MarketTabs, { type MarketTab } from "@/react-app/components/markets/MarketTabs";
import TrendingCards from "@/react-app/components/markets/TrendingCards";
import CategoryFilters, { type CategoryType, type SubFilterType } from "@/react-app/components/markets/CategoryFilters";
import TradingDataTab from "@/react-app/components/markets/TradingDataTab";
import AISelectTab from "@/react-app/components/markets/AISelectTab";
import TokenUnlockTab from "@/react-app/components/markets/TokenUnlockTab";
import { useNavigate } from "react-router";
import { getLogoUrl, getLogoUrls } from '@/react-app/utils/coinLogos';

// Helper function to get logo URL - uses Binance CDN as primary
function getLogoUrlForCoin(baseAsset: string): string {
  return getLogoUrl(baseAsset);
}

export default function MarketsPage() {
  const navigate = useNavigate();
  const {
    enhancedData,
    loading,
    error,
    getFilteredData,
    calculateMarketStats,
    getTrendingData,
    refetch
  } = useBinanceMarkets();
  
  const { getMarketCap } = useCoinGeckoMarketCap();

  // Tab state
  const [activeTab, setActiveTab] = useState<MarketTab>('overview');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('cryptos');
  const [activeSubFilter, setActiveSubFilter] = useState<SubFilterType>('all');

  // Quote asset prices in USDT for conversion
  const [quoteAssetPrices, setQuoteAssetPrices] = useState<Record<string, number>>({ USDT: 1 });

  // Filters state - ONLY USDT pairs
  const [filters, setFilters] = useState<MarketFilters>(() => {
    const saved = localStorage.getItem('tradecircle-market-filters');
    const defaultFilters = {
      search: '',
      quoteAssets: ['USDT'], // Only USDT pairs
      timeframe: '24h' as const,
      sortBy: 'marketCap' as const,
      sortOrder: 'desc' as const,
      pageSize: 100 as const
    };

    if (saved) {
      const parsed = JSON.parse(saved);
      // Force USDT only
      return { ...parsed, quoteAssets: ['USDT'], sortBy: parsed.sortBy || 'marketCap' };
    }
    return defaultFilters;
  });


  // UI state
  const [currentPage, setCurrentPage] = useState(1);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [searchFocus, setSearchFocus] = useState(false);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem('tradecircle-market-filters', JSON.stringify(filters));
  }, [filters]);

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tradecircle-watchlist');
    if (saved) {
      setWatchlist(new Set(JSON.parse(saved)));
    }
  }, []);

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
        const fiatPairs = ['USDTIDR', 'USDTRY'];
        data.forEach((ticker: any) => {
          if (fiatPairs.includes(ticker.symbol)) {
            const fiat = ticker.symbol.replace('USDT', '');
            // Store the USDT price in this fiat currency (e.g., 1 USDT = 16,734 IDR)
            prices[`USDT_${fiat}`] = parseFloat(ticker.price);
            prices[fiat] = parseFloat(ticker.price);
          }
        });
        
        setQuoteAssetPrices(prices);
      } catch (err) {
        console.error('Failed to fetch quote asset prices:', err);
        // Set default prices
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
          'USDT_IDR': 15000,
          'USDT_TRY': 30,
          IDR: 15000,
          TRY: 30
        });
      }
    };
    
    fetchQuoteAssetPrices();
  }, []);


  // Save watchlist to localStorage
  const saveWatchlist = (newWatchlist: Set<string>) => {
    setWatchlist(newWatchlist);
    localStorage.setItem('tradecircle-watchlist', JSON.stringify([...newWatchlist]));
  };

  // Toggle watchlist
  const toggleWatchlist = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newWatchlist = new Set(watchlist);

    if (newWatchlist.has(symbol)) {
      newWatchlist.delete(symbol);
    } else {
      newWatchlist.add(symbol);
    }

    saveWatchlist(newWatchlist);
  };


  // Get filtered and paginated data with market cap
  const { filteredData, paginatedData, totalPages } = useMemo(() => {
    if (!enhancedData || Object.keys(enhancedData).length === 0) {
      return { 
        filteredData: [], 
        stats: { totalPairs: 0, totalQuoteVolume: 0, topGainer: null, topLoser: null }, 
        paginatedData: [], 
        totalPages: 0,
        enhancedFilteredData: []
      };
    }

    // Create a filter copy without marketCap sort for getFilteredData
    const filtersForData = filters.sortBy === 'marketCap' 
      ? { ...filters, sortBy: 'quoteVolume' as const }
      : filters;
    
    let filtered = getFilteredData(filtersForData);

    // Apply category filter
    if (activeCategory === 'favorites') {
      filtered = filtered.filter(item => watchlist.has(item.symbol));
    }

    // Apply sub-filter based on category
    if (activeSubFilter !== 'all') {
      filtered = filtered.filter(item => {
        const baseAsset = item.baseAsset.toUpperCase();
        
        switch (activeSubFilter) {
          case 'bnb-chain':
            // BNB Chain tokens (BNB and tokens that typically run on BSC)
            return baseAsset === 'BNB' || 
                   ['CAKE', 'BUSD', 'BETH', 'BETH', 'BETH', 'BETH'].includes(baseAsset);
          
          case 'solana':
            // Solana ecosystem tokens
            return baseAsset === 'SOL' || 
                   ['RAY', 'SRM', 'FIDA', 'COPE', 'STEP', 'MEDIA', 'ROPE', 'ALEPH', 'TULIP', 'SLRS', 'SNY', 'LIKE', 'PORT', 'MNGO', 'MNDE', 'HBB', 'SAMO', 'GMT', 'GST', 'APT', 'WIF', 'JTO', 'JUP', 'PYTH', 'BONK', 'POPCAT'].includes(baseAsset);
          
          case 'rwa':
            // Real World Assets tokens
            return ['ONDO', 'TRU', 'CFG', 'RIO', 'TOKEN', 'POLYX', 'PROPS', 'CPOOL', 'LAND', 'IXS', 'MPL', 'GFI', 'SNX', 'MKR', 'COMP', 'AAVE'].includes(baseAsset);
          
          case 'meme':
            // Meme coins
            return ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'POPCAT', 'BABYDOGE', 'ELON', 'FLOKI', 'MYRO', 'MEME', '1000PEPE', '1000FLOKI', '1000BONK', '1000SHIB'].includes(baseAsset);
          
          case 'payments':
            // Payment-focused tokens
            return ['XRP', 'XLM', 'ALGO', 'NANO', 'DASH', 'LTC', 'BCH', 'ZEC', 'XMR', 'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'PAX', 'USDP', 'FDUSD'].includes(baseAsset);
          
          case 'ai':
            // AI-related tokens
            return ['TAO', 'RENDER', 'FET', 'AGIX', 'OCEAN', 'NMR', 'GRT', 'AI', 'VAI', 'COTI', 'DIA', 'BAND', 'LINK', 'UMA', 'API3', 'DOT', 'ATOM'].includes(baseAsset);
          
          case 'layer1-layer2':
            // Layer 1 and Layer 2 blockchains
            return ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'AVAX', 'DOT', 'ATOM', 'NEAR', 'APT', 'SUI', 'ARB', 'OP', 'MATIC', 'IMX', 'METIS', 'MNT', 'STRK', 'ZKSYNC', 'BASE', 'LINEA', 'SCROLL'].includes(baseAsset);
          
          case 'metaverse':
            // Metaverse and gaming-related tokens
            return ['SAND', 'MANA', 'AXS', 'ENJ', 'GALA', 'TLM', 'ALICE', 'CHR', 'ALPHA', 'TVK', 'REVV', 'MBOX', 'GMT', 'GST', 'APX', 'RACA', 'HIGH', 'CVX', 'QNT', 'WAXP', 'IMX', 'GFT', 'HOOK', 'MAGIC', 'BEAMX'].includes(baseAsset);
          
          case 'seed':
            // Seed/early stage tokens (newer or smaller market cap tokens)
            // This is harder to determine, so we'll use a combination of factors
            return item.marketCapRank && item.marketCapRank > 100; // Lower ranked = newer/smaller
          
          case 'launchpool':
            // Binance Launchpool tokens
            return ['BNB', 'FDUSD', 'BETH', 'TUSD', 'USDT', 'USDC', 'DAI', 'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'DOGE', 'AVAX', 'SHIB', 'MATIC', 'LTC', 'UNI', 'ATOM', 'ETC', 'XLM', 'NEAR', 'ALGO', 'ICP', 'FIL', 'LINK', 'TRX', 'APT', 'HBAR', 'ARB', 'OP', 'INJ', 'SUI', 'SEI', 'TIA', 'WLD', 'PIXEL', 'PORTAL', 'AEVO', 'REZ', 'BB', 'NOT', 'IO', 'ZRO', 'LISTA', 'ENA', 'W', 'TNSR', 'SAGA', 'REZ', 'BB', 'NOT', 'IO', 'ZRO', 'LISTA', 'ENA', 'W', 'TNSR', 'SAGA'].includes(baseAsset);
          
          case 'megadrop':
            // Binance Megadrop tokens
            return ['BNB', 'FDUSD', 'BETH', 'TUSD', 'USDT', 'USDC', 'DAI', 'BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'DOGE', 'AVAX', 'SHIB', 'MATIC', 'LTC', 'UNI', 'ATOM', 'ETC', 'XLM', 'NEAR', 'ALGO', 'ICP', 'FIL', 'LINK', 'TRX', 'APT', 'HBAR', 'ARB', 'OP', 'INJ', 'SUI', 'SEI', 'TIA', 'WLD', 'PIXEL', 'PORTAL', 'AEVO', 'REZ', 'BB', 'NOT', 'IO', 'ZRO', 'LISTA', 'ENA', 'W', 'TNSR', 'SAGA', 'BOME', 'REZ', 'BB', 'NOT', 'IO', 'ZRO', 'LISTA', 'ENA', 'W', 'TNSR', 'SAGA'].includes(baseAsset);
          
          case 'gaming':
            // Gaming tokens
            return ['AXS', 'SAND', 'MANA', 'ENJ', 'GALA', 'TLM', 'ALICE', 'CHR', 'ALPHA', 'TVK', 'REVV', 'MBOX', 'GMT', 'GST', 'APX', 'RACA', 'HIGH', 'CVX', 'QNT', 'WAXP', 'IMX', 'GFT', 'HOOK', 'MAGIC', 'BEAMX', 'PIXEL', 'PORTAL', 'ACE', 'XAI', 'PIXEL', 'PORTAL', 'ACE', 'XAI', 'RON', 'GMT', 'GST', 'PIXEL', 'PORTAL', 'ACE', 'XAI', 'RON'].includes(baseAsset);
          
          case 'defi':
            // DeFi tokens
            return ['UNI', 'AAVE', 'COMP', 'MKR', 'SNX', 'CRV', 'SUSHI', '1INCH', 'BAL', 'YFI', 'SUSHI', 'CAKE', 'DYDX', 'GMX', 'GNS', 'JOE', 'RAY', 'ORCA', 'JUP', 'PENDLE', 'RDNT', 'LDO', 'RPL', 'FXS', 'FRAX', 'CVX', 'CRV', 'BAL', 'AURA', 'VELO', 'VELA', 'GMX', 'GNS', 'DYDX', 'PERP', 'MUX', 'GNS', 'GMX', 'DYDX', 'PERP', 'MUX'].includes(baseAsset);
          
          default:
            return true;
        }
      });
    }

    // Enhance with market cap data
    const enhanced = filtered.map(item => {
      const marketCapInfo = getMarketCap(item.baseAsset);
      // Ensure market cap is a number and properly formatted
      const marketCap = marketCapInfo?.market_cap ? Number(marketCapInfo.market_cap) : undefined;
      return {
        ...item,
        marketCap: marketCap,
        marketCapRank: marketCapInfo?.market_cap_rank,
      };
    });

    // Sort by market cap if selected (handled separately since it's added after market cap data)
    if (filters.sortBy === 'marketCap') {
      enhanced.sort((a, b) => {
        const aCap = a.marketCap || 0;
        const bCap = b.marketCap || 0;
        return filters.sortOrder === 'asc' ? aCap - bCap : bCap - aCap;
      });
    }

    const stats = calculateMarketStats(enhanced);

    // Pagination
    const startIndex = (currentPage - 1) * filters.pageSize;
    const endIndex = startIndex + filters.pageSize;
    const paginated = enhanced.slice(startIndex, endIndex);
    const totalPages = Math.ceil(enhanced.length / filters.pageSize);

    return {
      filteredData: enhanced,
      stats,
      paginatedData: paginated,
      totalPages
    };
  }, [enhancedData, filters, currentPage, activeCategory, watchlist, getFilteredData, calculateMarketStats, getMarketCap]);

  // Get trending data
  const trendingData = useMemo(() => {
    if (!enhancedData || Object.keys(enhancedData).length === 0) {
      return { hot: [], new: [], topGainer: [], topVolume: [] };
    }
    return getTrendingData();
  }, [enhancedData, getTrendingData]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.search, filters.quoteAssets, filters.timeframe, activeCategory, activeSubFilter]);

  // Format numbers
  // Format numbers in USD (no currency conversion)
  const formatNumber = (num: number, compact = true): string => {
    if (compact) {
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Convert price to USDT if needed
  const convertToUSDT = (price: string, quoteAsset: string): number => {
    const priceNum = parseFloat(price);
    if (quoteAsset === 'USDT') return priceNum;
    
    // For fiat currencies (IDR, TRY, etc.), we need to divide by the USDT price in that currency
    const fiatCurrencies = ['IDR', 'TRY', 'BRL', 'EUR', 'GBP', 'JPY', 'KRW', 'RUB', 'CNY'];
    if (fiatCurrencies.includes(quoteAsset)) {
      // For fiat, we need to get the USDT price in that fiat currency
      const usdtPriceInFiat = quoteAssetPrices[`USDT_${quoteAsset}`] || quoteAssetPrices[quoteAsset];
      if (usdtPriceInFiat && usdtPriceInFiat > 0) {
        return priceNum / usdtPriceInFiat;
      }
      // Fallback: use approximate rate
      if (quoteAsset === 'IDR') return priceNum / 15000;
      if (quoteAsset === 'TRY') return priceNum / 30;
      return priceNum;
    }
    
    // For crypto quote assets (BTC, ETH, BNB, etc.), multiply by their USDT price
    const quotePriceInUSDT = quoteAssetPrices[quoteAsset] || 1;
    return priceNum * quotePriceInUSDT;
  };

  // Convert volume to USDT
  const convertVolumeToUSDT = (volume: string, quoteAsset: string): number => {
    const volumeNum = parseFloat(volume);
    if (quoteAsset === 'USDT') return volumeNum;
    
    const quotePriceInUSDT = quoteAssetPrices[quoteAsset] || 1;
    return volumeNum * quotePriceInUSDT;
  };

  // Format price in USDT (no currency conversion)
  const formatPrice = (price: string, quoteAsset: string, precision = 6): string => {
    const priceInUSDT = convertToUSDT(price, quoteAsset);
    
    if (priceInUSDT >= 1) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(priceInUSDT);
    }
    
    // For small numbers, use the precision parameter
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: Math.min(precision, 8),
      maximumFractionDigits: Math.min(precision, 8),
    }).format(priceInUSDT);
  };

  const formatPercent = (percent: number | string | undefined): string => {
    if (percent === undefined || percent === null) return '—';
    const num = typeof percent === 'string' ? parseFloat(percent) : percent;
    if (isNaN(num)) return '—';
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const getPercentColor = (percent: number | string | undefined): string => {
    if (percent === undefined || percent === null) return 'text-[#7F8C8D]';
    const num = typeof percent === 'string' ? parseFloat(percent) : percent;
    if (isNaN(num)) return 'text-[#7F8C8D]';
    return num >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]';
  };


  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Tab Navigation - Direct on main background */}
        <MarketTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Trending Cards */}
            <TrendingCards
              hot={trendingData.hot}
              newCoins={trendingData.new}
              topGainer={trendingData.topGainer}
              topVolume={trendingData.topVolume}
            />

            {/* Category Filters with Search */}
            <CategoryFilters
              activeCategory={activeCategory}
              activeSubFilter={activeSubFilter}
              onCategoryChange={setActiveCategory}
              onSubFilterChange={setActiveSubFilter}
              searchElement={
                <div className="relative">
                  {!searchFocus ? (
                    <button
                      onClick={() => {
                        setSearchFocus(true);
                        setTimeout(() => searchInputRef.current?.focus(), 0);
                      }}
                      className="flex items-center justify-center w-10 h-10 bg-[#0D0F18]/50 border border-white/10 hover:border-[#6A3DF4]/50 rounded-lg text-[#7F8C8D] hover:text-white transition-all"
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#7F8C8D]" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search by symbol or name..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        onBlur={() => {
                          if (!filters.search) {
                            setSearchFocus(false);
                          }
                        }}
                        className="w-64 pl-10 pr-10 py-2 bg-[#0D0F18]/50 border border-[#6A3DF4]/50 rounded-lg text-white placeholder-[#7F8C8D] focus:outline-none transition-all text-sm"
                        autoFocus
                      />
                      {filters.search && (
                        <button
                          onClick={() => {
                            setFilters(prev => ({ ...prev, search: '' }));
                            setSearchFocus(false);
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#7F8C8D] hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              }
            />

            {/* Markets Table - Direct on main background, no container */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="overflow-x-auto">
              {loading && Object.keys(enhancedData).length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 border-4 border-[#6A3DF4] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-white mb-2">Loading Market Data</h3>
                  <p className="text-[#7F8C8D]">Fetching real-time data from Binance...</p>
                </div>
              ) : error ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-[#E74C3C]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-[#E74C3C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Market Data</h3>
                  <p className="text-[#7F8C8D] mb-6">{error}</p>
                  <button
                    onClick={refetch}
                    className="px-6 py-3 bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white rounded-lg font-medium transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : paginatedData.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-[#6A3DF4]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-8 h-8 text-[#6A3DF4]" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No Markets Found</h3>
                  <p className="text-[#7F8C8D] mb-6">Try adjusting your search or filters</p>
                  <button
                    onClick={() => {
                      setFilters(prev => ({ ...prev, search: '', quoteAssets: ['USDT'] }));
                    }}
                    className="px-6 py-3 bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white rounded-lg font-medium transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div>
                  {/* Table */}
                  <table className="w-full">
                    <thead>
                      <tr className="text-sm font-medium text-[#7F8C8D] border-b border-white/10">
                        <th className="text-left py-3 px-4">
                          <button
                            onClick={() => {
                              const newSortBy = filters.sortBy === 'symbol' && filters.sortOrder === 'asc' ? 'symbol' : 'symbol';
                              const newOrder = filters.sortBy === 'symbol' ? (filters.sortOrder === 'asc' ? 'desc' : 'asc') : 'asc';
                              setFilters(prev => ({ ...prev, sortBy: newSortBy, sortOrder: newOrder }));
                            }}
                            className="flex items-center space-x-1 hover:text-white transition-colors"
                          >
                            <span>Name</span>
                            <div className="flex flex-col">
                              <ChevronUp className={`w-3 h-3 ${filters.sortBy === 'symbol' && filters.sortOrder === 'asc' ? 'text-[#F39C12]' : 'text-[#7F8C8D]'}`} />
                              <ChevronDown className={`w-3 h-3 -mt-1 ${filters.sortBy === 'symbol' && filters.sortOrder === 'desc' ? 'text-[#F39C12]' : 'text-[#7F8C8D]'}`} />
                            </div>
                          </button>
                        </th>
                        <th className="text-right py-3 px-4">
                          <button
                            onClick={() => {
                              const newSortBy = 'price';
                              const newOrder = filters.sortBy === 'price' ? (filters.sortOrder === 'asc' ? 'desc' : 'asc') : 'desc';
                              setFilters(prev => ({ ...prev, sortBy: newSortBy, sortOrder: newOrder }));
                            }}
                            className="flex items-center space-x-1 hover:text-white transition-colors ml-auto"
                          >
                            <span>Price</span>
                            <div className="flex flex-col">
                              <ChevronUp className={`w-3 h-3 ${filters.sortBy === 'price' && filters.sortOrder === 'asc' ? 'text-[#F39C12]' : 'text-[#7F8C8D]'}`} />
                              <ChevronDown className={`w-3 h-3 -mt-1 ${filters.sortBy === 'price' && filters.sortOrder === 'desc' ? 'text-[#F39C12]' : 'text-[#7F8C8D]'}`} />
                            </div>
                          </button>
                        </th>
                        <th className="text-right py-3 px-4">
                          <button
                            onClick={() => {
                              const newSortBy = 'change24h';
                              const newOrder = filters.sortBy === 'change24h' ? (filters.sortOrder === 'asc' ? 'desc' : 'asc') : 'desc';
                              setFilters(prev => ({ ...prev, sortBy: newSortBy, sortOrder: newOrder }));
                            }}
                            className={`flex items-center space-x-1 transition-colors ml-auto px-2 py-1 rounded ${
                              filters.sortBy === 'change24h' 
                                ? 'text-white bg-white/10' 
                                : 'text-[#7F8C8D] hover:text-white'
                            }`}
                          >
                            <span>24h</span>
                            <div className="flex flex-col">
                              <ChevronUp className={`w-3 h-3 ${filters.sortBy === 'change24h' && filters.sortOrder === 'asc' ? 'text-[#F39C12]' : 'text-[#7F8C8D]'}`} />
                              <ChevronDown className={`w-3 h-3 -mt-1 ${filters.sortBy === 'change24h' && filters.sortOrder === 'desc' ? 'text-[#F39C12]' : 'text-[#7F8C8D]'}`} />
                            </div>
                          </button>
                        </th>
                        <th className="text-right py-3 px-4">
                          <button
                            onClick={() => {
                              const newSortBy = 'change24h';
                              const newOrder = filters.sortBy === 'change24h' ? (filters.sortOrder === 'asc' ? 'desc' : 'asc') : 'desc';
                              setFilters(prev => ({ ...prev, sortBy: newSortBy, sortOrder: newOrder }));
                            }}
                            className="flex items-center space-x-1 hover:text-white transition-colors ml-auto"
                          >
                            <span>Change</span>
                            <div className="flex flex-col">
                              <ChevronUp className={`w-3 h-3 ${filters.sortBy === 'change24h' && filters.sortOrder === 'asc' ? 'text-[#F39C12]' : 'text-[#7F8C8D]'}`} />
                              <ChevronDown className={`w-3 h-3 -mt-1 ${filters.sortBy === 'change24h' && filters.sortOrder === 'desc' ? 'text-[#F39C12]' : 'text-[#7F8C8D]'}`} />
                            </div>
                          </button>
                        </th>
                        <th className="text-right py-3 px-4 hidden lg:table-cell">
                          <button
                            onClick={() => {
                              const newSortBy = 'quoteVolume';
                              const newOrder = filters.sortBy === 'quoteVolume' ? (filters.sortOrder === 'asc' ? 'desc' : 'asc') : 'desc';
                              setFilters(prev => ({ ...prev, sortBy: newSortBy, sortOrder: newOrder }));
                            }}
                            className="flex items-center space-x-1 hover:text-white transition-colors ml-auto"
                          >
                            <span>24h Volume</span>
                            <div className="flex flex-col">
                              <ChevronUp className={`w-3 h-3 ${filters.sortBy === 'quoteVolume' && filters.sortOrder === 'asc' ? 'text-[#F39C12]' : 'text-[#7F8C8D]'}`} />
                              <ChevronDown className={`w-3 h-3 -mt-1 ${filters.sortBy === 'quoteVolume' && filters.sortOrder === 'desc' ? 'text-[#F39C12]' : 'text-[#7F8C8D]'}`} />
                            </div>
                          </button>
                        </th>
                        <th className="text-right py-3 px-4 hidden xl:table-cell">
                          <button
                            onClick={() => {
                              const newSortBy = 'marketCap';
                              const newOrder = filters.sortBy === 'marketCap' ? (filters.sortOrder === 'asc' ? 'desc' : 'asc') : 'desc';
                              setFilters(prev => ({ ...prev, sortBy: newSortBy, sortOrder: newOrder }));
                            }}
                            className="flex items-center space-x-1 hover:text-white transition-colors ml-auto"
                          >
                            <span>Market Cap</span>
                            <div className="flex flex-col">
                              <ChevronUp className={`w-3 h-3 ${filters.sortBy === 'marketCap' && filters.sortOrder === 'asc' ? 'text-[#F39C12]' : 'text-[#7F8C8D]'}`} />
                              <ChevronDown className={`w-3 h-3 -mt-1 ${filters.sortBy === 'marketCap' && filters.sortOrder === 'desc' ? 'text-[#F39C12]' : 'text-[#7F8C8D]'}`} />
                            </div>
                          </button>
                        </th>
                        <th className="text-center py-3 px-4">
                          <span>Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedData.map((item, index) => (
                        <motion.tr
                          key={item.symbol}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => navigate(`/markets/${item.symbol}`)}
                          className="hover:bg-white/5 cursor-pointer transition-all group border-b border-white/5"
                        >
                          {/* Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={(e) => toggleWatchlist(item.symbol, e)}
                                className={`flex-shrink-0 transition-all ${
                                  watchlist.has(item.symbol)
                                    ? 'text-[#F39C12] hover:text-[#E67E22]'
                                    : 'text-[#7F8C8D] hover:text-[#AAB0C0]'
                                }`}
                              >
                                <Star className={`w-4 h-4 ${watchlist.has(item.symbol) ? 'fill-current' : ''}`} />
                              </button>
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
                              <div>
                                <div className="font-semibold text-white text-sm">{item.baseAsset}</div>
                                <div className="text-xs text-[#7F8C8D]">{item.baseAsset}/USDT</div>
                              </div>
                            </div>
                          </td>

                          {/* Price */}
                          <td className="py-3 px-4 text-right">
                            <div className="font-semibold text-white text-sm">{formatPrice(item.lastPrice, item.quoteAsset)}</div>
                          </td>

                          {/* 24h % */}
                          <td className="py-3 px-4 text-right">
                            <span className={`font-semibold text-sm ${getPercentColor(item.priceChangePercent)}`}>
                              {formatPercent(item.priceChangePercent)}
                            </span>
                          </td>

                          {/* 7d Change */}
                          <td className="py-3 px-4 text-right">
                            <span className={`font-semibold text-sm ${getPercentColor(item.priceChangePercent7d || 0)}`}>
                              {formatPercent(item.priceChangePercent7d || 0)}
                            </span>
                          </td>

                          {/* 24h Volume */}
                          <td className="py-3 px-4 text-right hidden lg:table-cell">
                            <div className="text-[#AAB0C0] text-sm">
                              {formatNumber(convertVolumeToUSDT(item.quoteVolume || '0', item.quoteAsset))}
                            </div>
                          </td>

                          {/* Market Cap */}
                          <td className="py-3 px-4 text-right hidden xl:table-cell">
                            <div className="text-[#AAB0C0] text-sm">
                              {item.marketCap && item.marketCap > 0 
                                ? formatNumber(item.marketCap) 
                                : '—'}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/markets/${item.symbol}`);
                                }}
                                className="p-1.5 text-[#7F8C8D] hover:text-white transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          </motion.tr>
                        ))}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pt-4 mt-4 border-t border-white/10">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-[#7F8C8D]">
                          Showing {(currentPage - 1) * filters.pageSize + 1} to {Math.min(currentPage * filters.pageSize, filteredData.length)} of {filteredData.length} results
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-[#0D0F18]/50 border border-white/10 rounded-lg text-[#AAB0C0] hover:bg-[#0D0F18]/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            Previous
                          </button>

                          <div className="flex items-center space-x-1">
                            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                              let page;
                              if (totalPages <= 7) {
                                page = i + 1;
                              } else if (currentPage <= 4) {
                                page = i + 1;
                              } else if (currentPage >= totalPages - 3) {
                                page = totalPages - 6 + i;
                              } else {
                                page = currentPage - 3 + i;
                              }

                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    currentPage === page
                                      ? 'bg-[#6A3DF4] text-white shadow-lg'
                                      : 'text-[#AAB0C0] hover:bg-[#0D0F18]/50'
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-[#0D0F18]/50 border border-white/10 rounded-lg text-[#AAB0C0] hover:bg-[#0D0F18]/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'trading-data' && <TradingDataTab />}
        {activeTab === 'ai-select' && <AISelectTab />}
        {activeTab === 'token-unlock' && <TokenUnlockTab />}
      </div>
    </DashboardLayout>
  );
}

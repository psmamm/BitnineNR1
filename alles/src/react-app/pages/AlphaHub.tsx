import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Eye,
  ExternalLink,
  RefreshCw,
  BarChart3,
  Newspaper,
  Zap,
  Globe,
  Copy,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useWhaleTransactions } from "@/react-app/hooks/useWhaleTransactions";
import { useCryptoNews } from "@/react-app/hooks/useCryptoNews";
import EconomicCalendar from "@/react-app/components/EconomicCalendar";

interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  logo: string;
}

interface SmartMoneyAlert {
  id: string;
  coin: string;
  logo: string;
  headline: string;
  walletId: string;
  amount: number;
  usdValue: number;
  explorerLink: string;
  timestamp: Date;
  outcome: 'buy' | 'sell';
}

interface BreakingNews {
  id: string;
  headline: string;
  summary: string;
  source: string;
  timestamp: Date;
  isBreaking: boolean;
  url: string;
}

export default function AlphaHubPage() {
  const { transactions: whaleTransactions, loading: whaleLoading, error: whaleError, refetch: refetchWhales } = useWhaleTransactions();
  const { news: cryptoNews, loading: newsLoading, refetch: refetchNews } = useCryptoNews();

  const [keyCoins, setKeyCoins] = useState<MarketMover[]>([]);
  const [smartMoneyAlerts, setSmartMoneyAlerts] = useState<SmartMoneyAlert[]>([]);
  const [breakingNews, setBreakingNews] = useState<BreakingNews[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [activeNews, setActiveNews] = useState<BreakingNews | null>(null);

  // Fetch Market Movers from Binance API
  const fetchMarketMovers = async () => {
    try {
      setMarketLoading(true);

      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!response.ok) throw new Error('Failed to fetch market data');

      const data = await response.json();

      // Filter for major USDT pairs
      const usdtPairs = data.filter((ticker: any) =>
        ticker.symbol.endsWith('USDT') &&
        !ticker.symbol.includes('UP') &&
        !ticker.symbol.includes('DOWN') &&
        parseFloat(ticker.volume) > 10000000 // High volume filter
      );

      // Transform data
      const movers: MarketMover[] = usdtPairs.map((ticker: any) => {
        const symbol = ticker.symbol.replace('USDT', '');
        return {
          symbol: symbol,
          name: symbol,
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChangePercent),
          volume24h: parseFloat(ticker.volume) * parseFloat(ticker.lastPrice),
          logo: `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${symbol.toLowerCase()}.png`
        };
      });

      // Key coins (BTC, ETH, SOL, BNB, ADA, XRP, ATOM)
      const keySymbols = ['BTC', 'ETH', 'SOL', 'BNB', 'ADA', 'XRP', 'ATOM'];
      const keyCoinsData = movers.filter(coin => keySymbols.includes(coin.symbol));
      setKeyCoins(keyCoinsData);

    } catch (error) {
      console.error('Failed to fetch market movers:', error);
    } finally {
      setMarketLoading(false);
    }
  };

  // Generate Smart Money Alerts from real whale transactions
  const generateSmartMoneyAlerts = useCallback(() => {
    if (!whaleTransactions || whaleTransactions.length === 0) {
      console.log('⚠️ No whale transactions available for Smart Money Alerts');
      setSmartMoneyAlerts([]);
      return;
    }

    console.log(`📊 Generating Smart Money Alerts from ${whaleTransactions.length} whale transactions`);

    // Filter for significant transactions (>$100K) and convert to Smart Money Alerts
    // Lower threshold to ensure we have data to show
    const significantTransactions = whaleTransactions
      .filter(tx => tx.usdValue >= 100000) // Show transactions >$100K (same as Whale Tracker threshold)
      .sort((a, b) => b.usdValue - a.usdValue) // Sort by USD value descending
      .slice(0, 4) // Limit to 4 most significant
      .map((tx) => {
        const shortenAddress = (address: string): string => {
          if (!address || address.length <= 10) return address;
          return `${address.slice(0, 6)}...${address.slice(-4)}`;
        };

        const getHeadline = (tx: typeof whaleTransactions[0]): string => {
          const formatAmount = (amount: number): string => {
            if (amount >= 1000000) return (amount / 1000000).toFixed(2) + 'M';
            if (amount >= 1000) return (amount / 1000).toFixed(2) + 'K';
            return amount.toFixed(2);
          };

          const amountStr = formatAmount(tx.amount);
          
          switch (tx.transferType) {
            case 'exchange_to_wallet':
              return `Whale withdraws ${amountStr} ${tx.coin} to cold wallet`;
            case 'wallet_to_exchange':
              return `Smart money deposits ${amountStr} ${tx.coin} to exchange`;
            case 'whale_to_whale':
              return `Whale transfers ${amountStr} ${tx.coin} between wallets`;
            default:
              return `Whale moves ${amountStr} ${tx.coin}`;
          }
        };

        const outcome: 'buy' | 'sell' = tx.transferType === 'exchange_to_wallet' ? 'buy' : 'sell';
        const walletId = tx.fromAddress ? shortenAddress(tx.fromAddress) : shortenHash(tx.hash);

        return {
          id: `sm-${tx.id}`,
          coin: tx.coin,
          logo: `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${tx.coin.toLowerCase()}.png`,
          headline: getHeadline(tx),
          walletId: walletId,
          amount: tx.amount,
          usdValue: tx.usdValue,
          explorerLink: tx.blockchainExplorerUrl,
          timestamp: tx.timestamp,
          outcome: outcome
        };
      });

    console.log(`✅ Generated ${significantTransactions.length} Smart Money Alerts from real data`);
    setSmartMoneyAlerts(significantTransactions);
  }, [whaleTransactions]);

  // Generate Breaking News (from real crypto news API + whale transactions)
  const generateBreakingNews = () => {
    const news: BreakingNews[] = [];

    // Convert large whale transactions (>$1M) to breaking news
    const largeWhaleTransactions = whaleTransactions.filter(tx => tx.usdValue >= 1000000);

    largeWhaleTransactions.slice(0, 2).forEach((tx) => {
      const formatUSD = (amount: number): string => {
        if (amount >= 1000000000) return '$' + (amount / 1000000000).toFixed(2) + 'B';
        if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(2) + 'M';
        return '$' + amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
      };

      const formatAmount = (amount: number): string => {
        if (amount >= 1000000) return (amount / 1000000).toFixed(2) + 'M';
        if (amount >= 1000) return (amount / 1000).toFixed(2) + 'K';
        return amount.toFixed(4);
      };

      const getTransferDescription = (transferType: string) => {
        switch (transferType) {
          case 'wallet_to_exchange':
            return 'moves to exchange platform';
          case 'exchange_to_wallet':
            return 'withdraws to cold wallet';
          default:
            return 'transfers between wallets';
        }
      };

      news.push({
        id: `whale-${tx.id}`,
        headline: `🐋 WHALE ALERT: ${formatUSD(tx.usdValue)} ${tx.coin} ${getTransferDescription(tx.transferType)}`,
        summary: `Major ${tx.coin} holder ${getTransferDescription(tx.transferType)} involving ${formatAmount(tx.amount)} ${tx.coin} on ${tx.chain.toUpperCase()} blockchain.`,
        source: 'Whale Tracker',
        timestamp: tx.timestamp,
        isBreaking: true,
        url: tx.blockchainExplorerUrl
      });
    });

    // Add real crypto news from API
    if (cryptoNews && cryptoNews.length > 0) {
      news.push(...cryptoNews);
    }

    setBreakingNews(news);

    // Set active breaking news, prioritizing whale alerts
    const whaleBreaking = news.filter(n => n.isBreaking && n.source === 'Whale Tracker')[0];
    const regularBreaking = news.filter(n => n.isBreaking && n.source !== 'Whale Tracker')[0];
    const breaking = whaleBreaking || regularBreaking;

    if (breaking) {
      setActiveNews(breaking);
      // Show whale alerts longer since they're more urgent
      const duration = breaking.source === 'Whale Tracker' ? 25000 : 15000;
      setTimeout(() => setActiveNews(null), duration);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchMarketMovers();
  }, []);

  // Update Smart Money Alerts when whale transactions change
  useEffect(() => {
    generateSmartMoneyAlerts();
  }, [generateSmartMoneyAlerts]);

  // Update Breaking News when whale transactions or crypto news change
  useEffect(() => {
    generateBreakingNews();
  }, [whaleTransactions, cryptoNews]);

  // Refresh market data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMarketMovers();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - timestamp.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const formatAmount = (amount: number): string => {
    if (amount >= 1000000) return (amount / 1000000).toFixed(2) + 'M';
    if (amount >= 1000) return (amount / 1000).toFixed(2) + 'K';
    return amount.toFixed(4);
  };

  const formatUSD = (amount: number): string => {
    if (amount >= 1000000000) return '$' + (amount / 1000000000).toFixed(2) + 'B';
    if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(2) + 'M';
    return '$' + amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const shortenHash = (hash: string): string => {
    if (hash.length <= 10) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRefresh = () => {
    refetchWhales();
    refetchNews();
    fetchMarketMovers();
    generateSmartMoneyAlerts();
    generateBreakingNews();
  };

  const getTransferIcon = (transferType: string) => {
    switch (transferType) {
      case 'wallet_to_exchange':
        return <ArrowDownLeft className="w-4 h-4 text-[#E74C3C]" />;
      case 'exchange_to_wallet':
        return <ArrowUpRight className="w-4 h-4 text-[#2ECC71]" />;
      default:
        return <ArrowRightLeft className="w-4 h-4 text-[#6A3DF4]" />;
    }
  };

  const getTransferColor = (transferType: string) => {
    switch (transferType) {
      case 'wallet_to_exchange':
        return 'bg-[#E74C3C]/10 text-[#E74C3C] border-[#E74C3C]/20';
      case 'exchange_to_wallet':
        return 'bg-[#2ECC71]/10 text-[#2ECC71] border-[#2ECC71]/20';
      default:
        return 'bg-[#6A3DF4]/10 text-[#6A3DF4] border-[#6A3DF4]/20';
    }
  };

  const getTransferText = (transferType: string) => {
    switch (transferType) {
      case 'wallet_to_exchange':
        return 'Wallet ➝ Exchange';
      case 'exchange_to_wallet':
        return 'Exchange ➝ Wallet';
      default:
        return 'Wallet ➝ Wallet';
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1E2232] rounded-2xl p-8 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="mb-2 lg:mb-0">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-[#6A3DF4]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-[#6A3DF4]" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white">
                    Alpha Hub
                  </h1>
                  <p className="text-[#AAB0C0] text-base sm:text-lg">
                    Live Market Intelligence • Whale Activity • Breaking News
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 px-3 py-2 bg-[#6A3DF4]/10 border border-[#6A3DF4]/20 rounded-lg">
                <div className="w-2 h-2 bg-[#6A3DF4] rounded-full animate-pulse" />
                <span className="text-[#6A3DF4] text-sm font-medium">LIVE</span>
              </div>
              <div className="flex items-center space-x-2 px-3 py-2 bg-[#2ECC71]/10 border border-[#2ECC71]/20 rounded-lg">
                <Globe className="w-4 h-4 text-[#2ECC71]" />
                <span className="text-[#2ECC71] text-sm font-medium">7 Chains</span>
              </div>
              <button
                onClick={handleRefresh}
                className="flex items-center space-x-2 bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] hover:from-[#5A2DE3] hover:to-[#7A4CFF] text-white px-4 py-2 rounded-lg font-medium transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${whaleLoading || marketLoading || newsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Breaking News Ticker */}
        <AnimatePresence>
          {activeNews && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] rounded-2xl p-4 border border-[#6A3DF4]/30 shadow-[0_0_30px_rgba(106,61,244,0.3)]"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-white animate-pulse" />
                  <span className="text-white font-bold text-lg">BREAKING</span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: "-100%" }}
                    transition={{ duration: 20, ease: "linear", repeat: Infinity }}
                    className="whitespace-nowrap text-white font-medium text-lg"
                  >
                    {activeNews.headline}
                  </motion.div>
                </div>
                <div className="text-white/80 text-sm">
                  {activeNews.source}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Whale Tracker and Economic Calendar */}
          <div className="xl:col-span-8 space-y-6">
            {/* Whale Tracker */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="bg-[#1E2232] rounded-2xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#6A3DF4]/10 rounded-xl flex items-center justify-center">
                      <Activity className="w-5 h-5 text-[#6A3DF4]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">🐋 Whale Tracker</h2>
                      <p className="text-[#7F8C8D] text-sm">Last 24 hours • Transactions &gt; $100K • 7 Blockchains</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-[#2ECC71] rounded-full animate-pulse" />
                    <span className="text-[#2ECC71] text-sm font-semibold">LIVE</span>
                  </div>
                </div>

                {/* Whale Transactions Feed */}
                <div className="bg-[#0D0F18] rounded-xl p-4 font-mono text-sm max-h-[600px] overflow-y-auto custom-scrollbar">
                {whaleLoading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 text-[#6A3DF4] animate-spin mx-auto mb-3" />
                    <p className="text-[#7F8C8D] text-base">Scanning last 24 hours for whale movements...</p>
                    <p className="text-[#AAB0C0] text-sm mt-2">ETH • BSC • AVAX • ARB • OP • TRX • SOL</p>
                  </div>
                ) : whaleError || whaleTransactions.length === 0 ? (
                  <div className="text-center py-16 bg-[#6A3DF4]/5 border border-[#6A3DF4]/20 rounded-xl">
                    <div className="w-20 h-20 bg-[#6A3DF4]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-5xl">🐋</span>
                    </div>
                    <p className="text-[#6A3DF4] text-lg font-semibold mb-2">No whale moves &gt;$100K in the last 24 hours</p>
                    <p className="text-[#7F8C8D] text-sm">Feed updates when new large transactions are detected</p>
                    <div className="flex justify-center space-x-4 mt-4 text-xs text-[#AAB0C0]">
                      <span>ETH</span>
                      <span>•</span>
                      <span>BSC</span>
                      <span>•</span>
                      <span>AVAX</span>
                      <span>•</span>
                      <span>ARB</span>
                      <span>•</span>
                      <span>OP</span>
                      <span>•</span>
                      <span>TRX</span>
                      <span>•</span>
                      <span>SOL</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {whaleTransactions.map((transaction, index) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#1E2232] rounded-xl border border-white/10 hover:border-[#6A3DF4]/50 transition-all group cursor-pointer gap-4 ${transaction.usdValue >= 1000000 ? 'shadow-[0_0_20px_rgba(106,61,244,0.3)] border-[#6A3DF4]/30' : ''
                          }`}
                        onClick={() => window.open(transaction.blockchainExplorerUrl, '_blank')}
                      >
                        <div className="flex items-center space-x-4">
                          <span className="text-[#7F8C8D] text-xs w-16 flex-shrink-0 hidden sm:block">
                            {formatTimeAgo(transaction.timestamp)}
                          </span>

                          <div className="flex items-center space-x-3">
                            <img
                              src={`https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${transaction.coin.toLowerCase()}.png`}
                              alt={transaction.coin}
                              className="w-8 h-8 rounded-full flex-shrink-0"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/generic.png';
                              }}
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-[#6A3DF4] font-bold">{transaction.coin}</span>
                                <span className="text-white">
                                  {formatAmount(transaction.amount)} {transaction.coin}
                                </span>
                                <span className="text-[#7F8C8D] text-xs sm:hidden">• {formatTimeAgo(transaction.timestamp)}</span>
                              </div>
                              <div className="text-[#AAB0C0] text-xs">
                                {formatUSD(transaction.usdValue)}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end space-x-3 w-full sm:w-auto pl-12 sm:pl-0">
                          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${getTransferColor(transaction.transferType)}`}>
                            {getTransferIcon(transaction.transferType)}
                            <span>{getTransferText(transaction.transferType)}</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(transaction.hash);
                              }}
                              className="text-[#7F8C8D] hover:text-[#6A3DF4] text-xs font-mono px-2 py-1 rounded hover:bg-[#6A3DF4]/10 transition-colors"
                            >
                              {shortenHash(transaction.hash)}
                            </button>
                            <Copy
                              className="w-3 h-3 text-[#7F8C8D] hover:text-[#6A3DF4] cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(transaction.hash);
                              }}
                            />
                          </div>

                          <ExternalLink className="w-4 h-4 text-[#7F8C8D] group-hover:text-[#6A3DF4] transition-colors hidden sm:block" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

            {/* Economic Calendar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <EconomicCalendar />
            </motion.div>
          </div>

          {/* Right Column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="xl:col-span-4 space-y-6"
          >
            {/* Smart Money Alerts */}
            <div className="bg-[#1E2232] rounded-2xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-[#6A3DF4]/10 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[#6A3DF4]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Smart Money Alerts</h3>
                  <p className="text-[#7F8C8D] text-xs">Powered by Lookonchain</p>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {smartMoneyAlerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => window.open(alert.explorerLink, '_blank')}
                    className="p-3 bg-[#0D0F18]/50 rounded-lg border border-white/10 hover:border-[#6A3DF4]/50 cursor-pointer transition-all group"
                  >
                    <div className="flex items-start space-x-3">
                      <img
                        src={alert.logo}
                        alt={alert.coin}
                        className="w-6 h-6 rounded-full mt-1 flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/generic.png';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold leading-relaxed">{alert.headline}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[#7F8C8D] text-xs font-mono">{alert.walletId}</span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${alert.outcome === 'buy'
                            ? 'bg-[#2ECC71]/10 text-[#2ECC71]'
                            : 'bg-[#E74C3C]/10 text-[#E74C3C]'
                            }`}>
                            {alert.outcome === 'buy' ? 'Accumulation' : 'Offload'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[#6A3DF4] text-xs font-medium">{formatUSD(alert.usdValue)}</span>
                          <span className="text-[#7F8C8D] text-xs">{formatTimeAgo(alert.timestamp)}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-3 h-3 text-[#7F8C8D] group-hover:text-[#6A3DF4] transition-colors mt-1 flex-shrink-0" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Market Overview */}
            <div className="bg-[#1E2232] rounded-2xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-[#6A3DF4]/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-[#6A3DF4]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Market Overview</h3>
                  <p className="text-[#7F8C8D] text-xs">Live from Binance API</p>
                </div>
              </div>

              {/* Key Coins */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {keyCoins.slice(0, 6).map((coin) => (
                  <div key={coin.symbol} className="p-3 bg-[#0D0F18]/50 rounded-lg border border-white/5 hover:border-[#6A3DF4]/30 transition-colors">
                    <div className="flex items-center space-x-2">
                      <img
                        src={coin.logo}
                        alt={coin.symbol}
                        className="w-5 h-5 rounded-full flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/generic.png';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium">{coin.symbol}</div>
                        <div className={`text-xs font-medium ${coin.change24h >= 0 ? 'text-[#2ECC71]' : 'text-[#E74C3C]'
                          }`}>
                          {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Market Intelligence */}
              <div className="space-y-2 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#7F8C8D]">Total Whale Volume</span>
                  <span className="text-white font-semibold">
                    ${(whaleTransactions.reduce((sum, t) => sum + t.usdValue, 0) / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#7F8C8D]">Exchange Inflows</span>
                  <span className="text-[#E74C3C] font-semibold">
                    {whaleTransactions.filter(t => t.transferType === 'wallet_to_exchange').length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#7F8C8D]">Exchange Outflows</span>
                  <span className="text-[#2ECC71] font-semibold">
                    {whaleTransactions.filter(t => t.transferType === 'exchange_to_wallet').length}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Crypto News Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#1E2232] rounded-2xl p-6 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#6A3DF4]/10 rounded-xl flex items-center justify-center">
                <Newspaper className="w-5 h-5 text-[#6A3DF4]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Crypto News</h2>
                <p className="text-[#7F8C8D] text-sm">Latest market headlines from trusted sources</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-[#2ECC71] rounded-full animate-pulse" />
              <span className="text-[#2ECC71] text-sm font-semibold">LIVE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {breakingNews.map((item, index) => (
              <motion.div
                key={item.id}
                onClick={() => window.open(item.url, '_blank')}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.02] ${item.isBreaking
                  ? 'bg-[#6A3DF4]/5 border-[#6A3DF4]/30 hover:border-[#6A3DF4]/50 shadow-[0_0_20px_rgba(106,61,244,0.2)]'
                  : 'bg-[#0D0F18]/50 border-white/10 hover:border-white/20'
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className={`font-medium line-clamp-2 pr-2 ${item.isBreaking ? 'text-[#6A3DF4]' : 'text-white'
                      }`}>
                      {item.headline}
                    </h3>
                    {item.isBreaking && (
                      <div className="px-2 py-1 bg-[#6A3DF4] text-white text-xs rounded-full font-medium flex-shrink-0">
                        Breaking
                      </div>
                    )}
                  </div>

                  <p className="text-[#AAB0C0] text-sm line-clamp-2">
                    {item.summary}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${item.source === 'WatcherGuru' ? 'text-[#6A3DF4]' : 'text-[#7F8C8D]'
                      }`}>
                      {item.source}
                    </span>
                    <span className="text-[#7F8C8D] text-xs">
                      {formatTimeAgo(item.timestamp)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

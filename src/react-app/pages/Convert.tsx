import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  Search,
  ArrowDownUp,
  Settings,
  ChevronDown,
  RefreshCw,
  Info
} from "lucide-react";
import { useNavigate } from "react-router";

// Crypto Convert Page (Swap Interface)
export default function ConvertPage() {
  const navigate = useNavigate();
  const [fromCoin, setFromCoin] = useState('USDT');
  const [toCoin, setToCoin] = useState('BTC');
  const [fromAmount, setFromAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [showSlippage, setShowSlippage] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const coins = [
    { symbol: 'USDT', name: 'Tether', balance: 0, price: 1 },
    { symbol: 'BTC', name: 'Bitcoin', balance: 0, price: 97500 },
    { symbol: 'ETH', name: 'Ethereum', balance: 0, price: 3450 },
    { symbol: 'SOL', name: 'Solana', balance: 0, price: 195 },
    { symbol: 'BNB', name: 'BNB', balance: 0, price: 710 },
    { symbol: 'XRP', name: 'Ripple', balance: 0, price: 2.45 },
    { symbol: 'ADA', name: 'Cardano', balance: 0, price: 1.05 },
    { symbol: 'DOGE', name: 'Dogecoin', balance: 0, price: 0.38 },
  ];

  const filteredCoins = coins.filter(coin =>
    coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coin.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fromCoinData = coins.find(c => c.symbol === fromCoin);
  const toCoinData = coins.find(c => c.symbol === toCoin);

  const swapCoins = () => {
    const temp = fromCoin;
    setFromCoin(toCoin);
    setToCoin(temp);
    setFromAmount('');
  };

  const calculateToAmount = () => {
    if (!fromAmount || !fromCoinData || !toCoinData) return '0';
    const fromValue = parseFloat(fromAmount) * fromCoinData.price;
    const toAmount = fromValue / toCoinData.price;
    return toAmount.toFixed(8);
  };

  const getRate = () => {
    if (!fromCoinData || !toCoinData) return '0';
    return (fromCoinData.price / toCoinData.price).toFixed(8);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const CoinSelector = ({
    selected,
    onSelect,
    isOpen,
    setIsOpen,
    exclude
  }: {
    selected: string;
    onSelect: (symbol: string) => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    exclude: string;
  }) => {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-2 bg-[#252629] hover:bg-[#2B2F36] rounded-lg transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-[#2B2F36] flex items-center justify-center">
            <span className="text-xs font-bold text-white">{selected.slice(0, 2)}</span>
          </div>
          <span className="text-white font-medium">{selected}</span>
          <ChevronDown className="w-4 h-4 text-[#6B7280]" />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-[#1B1B1D] border border-[#2B2F36] rounded-lg shadow-xl z-20">
            <div className="p-2 border-b border-[#2B2F36]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#252629] border border-[#2B2F36] rounded-lg text-white placeholder-[#6B7280] focus:border-[#03AAC7] focus:outline-none text-sm"
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredCoins.filter(c => c.symbol !== exclude).map((coin) => (
                <button
                  key={coin.symbol}
                  onClick={() => {
                    onSelect(coin.symbol);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                    selected === coin.symbol ? 'bg-[#03AAC7]/10' : 'hover:bg-[#252629]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#2B2F36] flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{coin.symbol.slice(0, 2)}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-white text-sm font-medium block">{coin.symbol}</span>
                      <span className="text-[#6B7280] text-xs">{coin.name}</span>
                    </div>
                  </div>
                  <span className="text-[#9CA3AF] text-sm">{coin.balance.toFixed(4)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-[#252629] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#9CA3AF]" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-white">Convert</h1>
                <p className="text-[#9CA3AF] text-sm">Swap crypto instantly</p>
              </div>
            </div>
            <button
              onClick={() => setShowSlippage(!showSlippage)}
              className="p-2 hover:bg-[#252629] rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5 text-[#9CA3AF]" />
            </button>
          </div>

          {/* Slippage Settings */}
          {showSlippage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#9CA3AF] text-sm">Slippage Tolerance</span>
                <div className="flex items-center gap-1">
                  <Info className="w-4 h-4 text-[#6B7280]" />
                </div>
              </div>
              <div className="flex gap-2">
                {['0.1', '0.5', '1.0'].map((value) => (
                  <button
                    key={value}
                    onClick={() => setSlippage(value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      slippage === value
                        ? 'bg-[#03AAC7] text-[#151517]'
                        : 'bg-[#252629] text-white hover:bg-[#2B2F36]'
                    }`}
                  >
                    {value}%
                  </button>
                ))}
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-full py-2 px-3 bg-[#252629] border border-[#2B2F36] rounded-lg text-white text-sm text-center focus:border-[#03AAC7] focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] text-sm">%</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Convert Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] overflow-hidden"
          >
            {/* From Section */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] text-sm">From</span>
                <span className="text-[#6B7280] text-xs">
                  Balance: <span className="text-white">{fromCoinData?.balance.toFixed(4) || 0} {fromCoin}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CoinSelector
                  selected={fromCoin}
                  onSelect={setFromCoin}
                  isOpen={showFromDropdown}
                  setIsOpen={setShowFromDropdown}
                  exclude={toCoin}
                />
                <input
                  type="number"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="flex-1 bg-transparent text-right text-2xl font-semibold text-white placeholder-[#6B7280] focus:outline-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setFromAmount(String(fromCoinData?.balance || 0))}
                  className="text-[#03AAC7] text-xs font-medium hover:text-[#26BFD4]"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Swap Button */}
            <div className="relative h-0">
              <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <button
                  onClick={swapCoins}
                  className="w-10 h-10 bg-[#252629] hover:bg-[#2B2F36] border-4 border-[#151517] rounded-full flex items-center justify-center transition-colors"
                >
                  <ArrowDownUp className="w-4 h-4 text-[#03AAC7]" />
                </button>
              </div>
            </div>

            {/* To Section */}
            <div className="p-5 pt-6 space-y-3 bg-[#151517]/50">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] text-sm">To</span>
                <span className="text-[#6B7280] text-xs">
                  Balance: <span className="text-white">{toCoinData?.balance.toFixed(4) || 0} {toCoin}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CoinSelector
                  selected={toCoin}
                  onSelect={setToCoin}
                  isOpen={showToDropdown}
                  setIsOpen={setShowToDropdown}
                  exclude={fromCoin}
                />
                <div className="flex-1 text-right">
                  <span className="text-2xl font-semibold text-white">
                    {calculateToAmount()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Rate Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[#9CA3AF] text-sm">1 {fromCoin} =</span>
                <span className="text-white font-medium">{getRate()} {toCoin}</span>
              </div>
              <button
                onClick={handleRefresh}
                className={`p-1.5 hover:bg-[#252629] rounded-lg transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
              >
                <RefreshCw className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-[#2B2F36] space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">Slippage</span>
                <span className="text-white">{slippage}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">Network Fee</span>
                <span className="text-white">~ $0.50</span>
              </div>
            </div>
          </motion.div>

          {/* Convert Button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            disabled={!fromAmount || parseFloat(fromAmount) <= 0}
            className="w-full py-3.5 bg-[#03AAC7] hover:bg-[#26BFD4] text-[#151517] rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Convert
          </motion.button>

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-[#252629] rounded-lg p-4"
          >
            <p className="text-[#9CA3AF] text-sm">
              Convert between cryptocurrencies instantly at the best available rates.
              No hidden fees, real-time pricing.
            </p>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}

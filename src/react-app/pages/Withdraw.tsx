import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  Search,
  Globe,
  Shield
} from "lucide-react";
import { useNavigate } from "react-router";

// Bitget-Style Withdraw Page
export default function WithdrawPage() {
  const navigate = useNavigate();
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [amount, setAmount] = useState('');

  const coins = [
    { symbol: 'USDT', name: 'Tether', balance: 0, networks: ['TRC20', 'ERC20', 'BEP20', 'SOL'] },
    { symbol: 'BTC', name: 'Bitcoin', balance: 0, networks: ['Bitcoin', 'Lightning'] },
    { symbol: 'ETH', name: 'Ethereum', balance: 0, networks: ['ERC20', 'Arbitrum', 'Optimism'] },
    { symbol: 'SOL', name: 'Solana', balance: 0, networks: ['Solana'] },
    { symbol: 'BNB', name: 'BNB', balance: 0, networks: ['BEP20', 'BEP2'] },
  ];

  const filteredCoins = coins.filter(coin =>
    coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coin.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCoinData = coins.find(c => c.symbol === selectedCoin);

  const networkFees: Record<string, number> = {
    'TRC20': 1,
    'ERC20': 5,
    'BEP20': 0.5,
    'Bitcoin': 0.0001,
    'Lightning': 0,
    'Solana': 0.01,
    'Arbitrum': 0.5,
    'Optimism': 0.5,
    'BEP2': 0.1,
    'SOL': 0.01,
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-[#252629] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#9CA3AF]" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-white">Withdraw</h1>
              <p className="text-[#9CA3AF] text-sm">Transfer funds to external wallet</p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl p-4">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[#F59E0B] font-medium text-sm">Security Reminder</h4>
                <p className="text-[#9CA3AF] text-sm mt-1">
                  Please ensure the withdrawal address is correct. Withdrawals to wrong addresses cannot be recovered.
                </p>
              </div>
            </div>
          </div>

          {/* Step 1: Select Coin */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#FCD535] flex items-center justify-center text-xs font-bold text-[#151517]">
                1
              </div>
              <h3 className="text-white font-medium">Select Coin</h3>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <input
                type="text"
                placeholder="Search coin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#252629] border border-[#2B2F36] rounded-lg text-white placeholder-[#6B7280] focus:border-[#FCD535] focus:outline-none transition-colors text-sm"
              />
            </div>

            {/* Coin List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredCoins.map((coin) => (
                <button
                  key={coin.symbol}
                  onClick={() => {
                    setSelectedCoin(coin.symbol);
                    setSelectedNetwork(null);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    selectedCoin === coin.symbol
                      ? 'bg-[#FCD535]/10 border border-[#FCD535]'
                      : 'bg-[#252629] border border-transparent hover:border-[#2B2F36]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#2B2F36] flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{coin.symbol.slice(0, 2)}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-white text-sm font-medium block">{coin.symbol}</span>
                      <span className="text-[#6B7280] text-xs">{coin.name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-white text-sm font-medium block">{coin.balance.toFixed(4)}</span>
                    <span className="text-[#6B7280] text-xs">Available</span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Step 2: Select Network */}
          {selectedCoin && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-[#FCD535] flex items-center justify-center text-xs font-bold text-[#151517]">
                  2
                </div>
                <h3 className="text-white font-medium">Select Network</h3>
              </div>

              <div className="space-y-2">
                {selectedCoinData?.networks.map((network) => (
                  <button
                    key={network}
                    onClick={() => setSelectedNetwork(network)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      selectedNetwork === network
                        ? 'bg-[#FCD535]/10 border border-[#FCD535]'
                        : 'bg-[#252629] border border-transparent hover:border-[#2B2F36]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-[#9CA3AF]" />
                      <span className="text-white text-sm font-medium">{network}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#6B7280] text-xs">Fee: {networkFees[network] || 0} {selectedCoin}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 3: Enter Details */}
          {selectedCoin && selectedNetwork && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-[#FCD535] flex items-center justify-center text-xs font-bold text-[#151517]">
                  3
                </div>
                <h3 className="text-white font-medium">Withdrawal Details</h3>
              </div>

              <div className="space-y-4">
                {/* Address */}
                <div>
                  <label className="text-[#9CA3AF] text-xs mb-2 block">Withdrawal Address</label>
                  <input
                    type="text"
                    placeholder="Enter wallet address"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    className="w-full px-4 py-3 bg-[#252629] border border-[#2B2F36] rounded-lg text-white placeholder-[#6B7280] focus:border-[#FCD535] focus:outline-none transition-colors text-sm font-mono"
                  />
                </div>

                {/* Amount */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#9CA3AF] text-xs">Amount</label>
                    <span className="text-[#6B7280] text-xs">
                      Available: <span className="text-white">{selectedCoinData?.balance.toFixed(4)} {selectedCoin}</span>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-3 pr-20 bg-[#252629] border border-[#2B2F36] rounded-lg text-white placeholder-[#6B7280] focus:border-[#FCD535] focus:outline-none transition-colors text-sm"
                    />
                    <button
                      onClick={() => setAmount(String(selectedCoinData?.balance || 0))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FCD535] text-sm font-medium hover:text-[#FFE066]"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-2 pt-4 border-t border-[#2B2F36]">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Network Fee</span>
                    <span className="text-white">{networkFees[selectedNetwork] || 0} {selectedCoin}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">You will receive</span>
                    <span className="text-white font-medium">
                      {Math.max(0, parseFloat(amount || '0') - (networkFees[selectedNetwork] || 0)).toFixed(4)} {selectedCoin}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  disabled={!withdrawAddress || !amount || parseFloat(amount) <= 0}
                  className="w-full py-3 bg-[#FCD535] hover:bg-[#FFE066] text-[#151517] rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Withdraw
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

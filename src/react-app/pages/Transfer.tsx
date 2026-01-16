import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  Search,
  ArrowDownUp,
  Wallet,
  ChevronDown,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router";

// Bitget-Style Transfer Page (Internal Transfers)
export default function TransferPage() {
  const navigate = useNavigate();
  const [fromAccount, setFromAccount] = useState('spot');
  const [toAccount, setToAccount] = useState('futures');
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [amount, setAmount] = useState('');
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  const accounts = [
    { id: 'spot', name: 'Spot Account', balance: 0 },
    { id: 'futures', name: 'Futures Account', balance: 0 },
    { id: 'margin', name: 'Margin Account', balance: 0 },
    { id: 'funding', name: 'Funding Account', balance: 0 },
  ];

  const coins = [
    { symbol: 'USDT', name: 'Tether', balance: { spot: 0, futures: 0, margin: 0, funding: 0 } },
    { symbol: 'BTC', name: 'Bitcoin', balance: { spot: 0, futures: 0, margin: 0, funding: 0 } },
    { symbol: 'ETH', name: 'Ethereum', balance: { spot: 0, futures: 0, margin: 0, funding: 0 } },
    { symbol: 'SOL', name: 'Solana', balance: { spot: 0, futures: 0, margin: 0, funding: 0 } },
    { symbol: 'BNB', name: 'BNB', balance: { spot: 0, futures: 0, margin: 0, funding: 0 } },
  ];

  const filteredCoins = coins.filter(coin =>
    coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coin.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCoinData = coins.find(c => c.symbol === selectedCoin);
  const fromAccountData = accounts.find(a => a.id === fromAccount);
  const toAccountData = accounts.find(a => a.id === toAccount);

  const swapAccounts = () => {
    const temp = fromAccount;
    setFromAccount(toAccount);
    setToAccount(temp);
  };

  const getAvailableBalance = () => {
    if (!selectedCoinData) return 0;
    return selectedCoinData.balance[fromAccount as keyof typeof selectedCoinData.balance] || 0;
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
              <h1 className="text-2xl font-semibold text-white">Transfer</h1>
              <p className="text-[#9CA3AF] text-sm">Move funds between accounts</p>
            </div>
          </div>

          {/* Transfer Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-5 space-y-6"
          >
            {/* From/To Selection */}
            <div className="space-y-4">
              {/* From Account */}
              <div className="relative">
                <label className="text-[#6B7280] text-xs mb-2 block">From</label>
                <button
                  onClick={() => setShowFromDropdown(!showFromDropdown)}
                  className="w-full flex items-center justify-between p-3 bg-[#252629] border border-[#2B2F36] rounded-lg hover:border-[#3A3E45] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-[#9CA3AF]" />
                    <span className="text-white font-medium">{fromAccountData?.name}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#6B7280]" />
                </button>
                {showFromDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1B1B1D] border border-[#2B2F36] rounded-lg shadow-xl z-10">
                    {accounts.filter(a => a.id !== toAccount).map((account) => (
                      <button
                        key={account.id}
                        onClick={() => {
                          setFromAccount(account.id);
                          setShowFromDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 hover:bg-[#252629] transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          fromAccount === account.id ? 'bg-[#252629]' : ''
                        }`}
                      >
                        <span className="text-white">{account.name}</span>
                        {fromAccount === account.id && (
                          <CheckCircle2 className="w-4 h-4 text-[#03AAC7]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <button
                  onClick={swapAccounts}
                  className="p-2 bg-[#252629] hover:bg-[#222226] rounded-lg transition-colors"
                >
                  <ArrowDownUp className="w-5 h-5 text-[#03AAC7]" />
                </button>
              </div>

              {/* To Account */}
              <div className="relative">
                <label className="text-[#6B7280] text-xs mb-2 block">To</label>
                <button
                  onClick={() => setShowToDropdown(!showToDropdown)}
                  className="w-full flex items-center justify-between p-3 bg-[#252629] border border-[#2B2F36] rounded-lg hover:border-[#3A3E45] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-[#9CA3AF]" />
                    <span className="text-white font-medium">{toAccountData?.name}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#6B7280]" />
                </button>
                {showToDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1B1B1D] border border-[#2B2F36] rounded-lg shadow-xl z-10">
                    {accounts.filter(a => a.id !== fromAccount).map((account) => (
                      <button
                        key={account.id}
                        onClick={() => {
                          setToAccount(account.id);
                          setShowToDropdown(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 hover:bg-[#252629] transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          toAccount === account.id ? 'bg-[#252629]' : ''
                        }`}
                      >
                        <span className="text-white">{account.name}</span>
                        {toAccount === account.id && (
                          <CheckCircle2 className="w-4 h-4 text-[#03AAC7]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[#2B2F36]" />

            {/* Coin Selection */}
            <div>
              <label className="text-[#6B7280] text-xs mb-2 block">Coin</label>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Search coin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#252629] border border-[#2B2F36] rounded-lg text-white placeholder-[#6B7280] focus:border-[#03AAC7] focus:outline-none transition-colors text-sm"
                />
              </div>

              {/* Coin List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredCoins.map((coin) => (
                  <button
                    key={coin.symbol}
                    onClick={() => setSelectedCoin(coin.symbol)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      selectedCoin === coin.symbol
                        ? 'bg-[#03AAC7]/10 border border-[#03AAC7]'
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
                      <span className="text-white text-sm font-medium block">
                        {coin.balance[fromAccount as keyof typeof coin.balance].toFixed(4)}
                      </span>
                      <span className="text-[#6B7280] text-xs">Available</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Input */}
            {selectedCoin && (
              <>
                <div className="border-t border-[#2B2F36]" />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[#6B7280] text-xs">Amount</label>
                    <span className="text-[#6B7280] text-xs">
                      Available: <span className="text-white">{getAvailableBalance().toFixed(4)} {selectedCoin}</span>
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-3 pr-20 bg-[#252629] border border-[#2B2F36] rounded-lg text-white placeholder-[#6B7280] focus:border-[#03AAC7] focus:outline-none transition-colors text-sm"
                    />
                    <button
                      onClick={() => setAmount(String(getAvailableBalance()))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#03AAC7] text-sm font-medium hover:text-[#26BFD4]"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Info Box */}
            <div className="bg-[#252629] rounded-lg p-4">
              <p className="text-[#9CA3AF] text-sm">
                Internal transfers between accounts are instant and free. No fees apply.
              </p>
            </div>

            {/* Submit Button */}
            <button
              disabled={!selectedCoin || !amount || parseFloat(amount) <= 0}
              className="w-full py-3 bg-[#03AAC7] hover:bg-[#26BFD4] text-[#151517] rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Transfer
            </button>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}

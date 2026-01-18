import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  Search,
  Copy,
  Check,
  QrCode,
  AlertTriangle,
  Wallet,
  CreditCard,
  Globe
} from "lucide-react";
import { useNavigate } from "react-router";

// Bitget-Style Deposit Page
export default function DepositPage() {
  const navigate = useNavigate();
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [depositMethod, setDepositMethod] = useState<'crypto' | 'fiat'>('crypto');

  const coins = [
    { symbol: 'USDT', name: 'Tether', networks: ['TRC20', 'ERC20', 'BEP20', 'SOL', 'POLYGON'] },
    { symbol: 'BTC', name: 'Bitcoin', networks: ['Bitcoin', 'Lightning'] },
    { symbol: 'ETH', name: 'Ethereum', networks: ['ERC20', 'Arbitrum', 'Optimism'] },
    { symbol: 'SOL', name: 'Solana', networks: ['Solana'] },
    { symbol: 'BNB', name: 'BNB', networks: ['BEP20', 'BEP2'] },
    { symbol: 'XRP', name: 'Ripple', networks: ['XRP'] },
    { symbol: 'USDC', name: 'USD Coin', networks: ['ERC20', 'SOL', 'POLYGON'] },
  ];

  const filteredCoins = coins.filter(coin =>
    coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coin.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCoinData = coins.find(c => c.symbol === selectedCoin);

  const depositAddress = selectedCoin && selectedNetwork
    ? `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
    : null;

  const copyAddress = () => {
    if (depositAddress) {
      navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
              <h1 className="text-2xl font-semibold text-white">Deposit</h1>
              <p className="text-[#9CA3AF] text-sm">Add funds to your account</p>
            </div>
          </div>

          {/* Deposit Method Tabs */}
          <div className="flex items-center gap-1 bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-1">
            <button
              onClick={() => setDepositMethod('crypto')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                depositMethod === 'crypto'
                  ? 'bg-[#252629] text-white'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              <Wallet className="w-4 h-4" />
              Crypto
            </button>
            <button
              onClick={() => setDepositMethod('fiat')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                depositMethod === 'fiat'
                  ? 'bg-[#252629] text-white'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Buy Crypto
            </button>
          </div>

          {depositMethod === 'crypto' ? (
            <>
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
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {filteredCoins.map((coin) => (
                    <button
                      key={coin.symbol}
                      onClick={() => {
                        setSelectedCoin(coin.symbol);
                        setSelectedNetwork(null);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        selectedCoin === coin.symbol
                          ? 'bg-[#FCD535]/10 border border-[#FCD535]'
                          : 'bg-[#252629] border border-transparent hover:border-[#2B2F36]'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#2B2F36] flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{coin.symbol.slice(0, 2)}</span>
                      </div>
                      <div className="text-left">
                        <span className="text-white text-sm font-medium block">{coin.symbol}</span>
                        <span className="text-[#6B7280] text-xs">{coin.name}</span>
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
                          <span className="text-[#6B7280] text-xs">Fee: 0 {selectedCoin}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Deposit Address */}
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
                    <h3 className="text-white font-medium">Deposit Address</h3>
                  </div>

                  {/* Warning */}
                  <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-lg p-3 mb-4">
                    <div className="flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                      <p className="text-[#F59E0B] text-xs">
                        Only deposit {selectedCoin} via {selectedNetwork} network. Sending other assets may result in permanent loss.
                      </p>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="flex justify-center mb-4">
                    <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center">
                      <QrCode className="w-32 h-32 text-[#151517]" />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <label className="text-[#9CA3AF] text-xs">Deposit Address</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={depositAddress || ''}
                        readOnly
                        className="flex-1 px-4 py-3 bg-[#252629] border border-[#2B2F36] rounded-lg text-white text-sm font-mono"
                      />
                      <button
                        onClick={copyAddress}
                        className="px-4 py-3 bg-[#FCD535] hover:bg-[#FFE066] text-[#151517] rounded-lg font-medium transition-colors"
                      >
                        {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="mt-4 space-y-2 text-xs text-[#6B7280]">
                    <div className="flex justify-between">
                      <span>Minimum deposit</span>
                      <span className="text-white">0.0001 {selectedCoin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expected arrival</span>
                      <span className="text-white">1 network confirmation</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expected unlock</span>
                      <span className="text-white">2 network confirmations</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            /* Buy Crypto Section */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#1B1B1D] rounded-xl border border-[#2B2F36] p-6 text-center"
            >
              <div className="w-16 h-16 bg-[#FCD535]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-[#FCD535]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Buy Crypto with Card</h3>
              <p className="text-[#9CA3AF] text-sm mb-6 max-w-sm mx-auto">
                Purchase crypto directly with your credit or debit card through our trusted partners.
              </p>
              <button className="px-6 py-3 bg-[#FCD535] hover:bg-[#FFE066] text-[#151517] rounded-lg font-semibold transition-colors">
                Coming Soon
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

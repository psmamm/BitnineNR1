/**
 * Exchange Connection Modal
 *
 * Modal for connecting new exchanges/brokers to the platform.
 * Supports API key authentication and OAuth flows.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Link2, Key, Shield, Eye, EyeOff, Check, AlertCircle,
  ChevronRight, Loader2, ExternalLink, HelpCircle
} from 'lucide-react';
import { useTheme } from '@/react-app/contexts/ThemeContext';
import { getCardBg, getCardBorder, getTextColor, getHoverBg } from '@/react-app/utils/themeUtils';

// ============================================================================
// Types
// ============================================================================

interface ExchangeInfo {
  id: string;
  name: string;
  logo: string;
  category: 'crypto_cex' | 'crypto_dex' | 'stocks' | 'forex' | 'futures' | 'options';
  features: string[];
  supported: boolean;
  apiDocsUrl?: string;
  oauthSupported?: boolean;
}

interface ExchangeConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (exchangeId: string, credentials: ExchangeCredentials) => void;
}

interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  testnet?: boolean;
}

// ============================================================================
// Exchange Data
// ============================================================================

const EXCHANGES: ExchangeInfo[] = [
  // Crypto CEXs
  {
    id: 'bybit',
    name: 'Bybit',
    logo: '/exchanges/bybit.svg',
    category: 'crypto_cex',
    features: ['Spot', 'Futures', 'Options', 'Copy Trading'],
    supported: true,
    apiDocsUrl: 'https://bybit-exchange.github.io/docs/'
  },
  {
    id: 'binance',
    name: 'Binance',
    logo: '/exchanges/binance.svg',
    category: 'crypto_cex',
    features: ['Spot', 'Futures', 'Margin', 'Staking'],
    supported: true,
    apiDocsUrl: 'https://binance-docs.github.io/apidocs/'
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    logo: '/exchanges/coinbase.svg',
    category: 'crypto_cex',
    features: ['Spot', 'Advanced Trading'],
    supported: false,
    oauthSupported: true,
    apiDocsUrl: 'https://docs.cloud.coinbase.com/'
  },
  {
    id: 'kraken',
    name: 'Kraken',
    logo: '/exchanges/kraken.svg',
    category: 'crypto_cex',
    features: ['Spot', 'Futures', 'Margin'],
    supported: false,
    apiDocsUrl: 'https://docs.kraken.com/'
  },
  {
    id: 'okx',
    name: 'OKX',
    logo: '/exchanges/okx.svg',
    category: 'crypto_cex',
    features: ['Spot', 'Futures', 'Options'],
    supported: false,
    apiDocsUrl: 'https://www.okx.com/docs/'
  },

  // Stock Brokers
  {
    id: 'interactive_brokers',
    name: 'Interactive Brokers',
    logo: '/brokers/ibkr.svg',
    category: 'stocks',
    features: ['Stocks', 'Options', 'Futures', 'Forex'],
    supported: false,
    apiDocsUrl: 'https://interactivebrokers.github.io/tws-api/'
  },
  {
    id: 'td_ameritrade',
    name: 'TD Ameritrade',
    logo: '/brokers/tda.svg',
    category: 'stocks',
    features: ['Stocks', 'Options', 'ETFs'],
    supported: false,
    oauthSupported: true
  },

  // Forex
  {
    id: 'oanda',
    name: 'OANDA',
    logo: '/brokers/oanda.svg',
    category: 'forex',
    features: ['Forex', 'CFDs'],
    supported: false,
    apiDocsUrl: 'https://developer.oanda.com/'
  },

  // DEXs
  {
    id: 'hyperliquid',
    name: 'Hyperliquid',
    logo: '/exchanges/hyperliquid.svg',
    category: 'crypto_dex',
    features: ['Perpetuals', 'Orderbook DEX'],
    supported: false
  }
];

const CATEGORY_LABELS: Record<string, string> = {
  crypto_cex: 'Crypto Exchanges',
  crypto_dex: 'Decentralized Exchanges',
  stocks: 'Stock Brokers',
  forex: 'Forex Brokers',
  futures: 'Futures Platforms',
  options: 'Options Platforms'
};

// ============================================================================
// Component
// ============================================================================

export default function ExchangeConnectionModal({
  isOpen,
  onClose,
  onSuccess
}: ExchangeConnectionModalProps) {
  const { theme } = useTheme();
  const [step, setStep] = useState<'select' | 'credentials' | 'testing'>('select');
  const [selectedExchange, setSelectedExchange] = useState<ExchangeInfo | null>(null);
  const [credentials, setCredentials] = useState<ExchangeCredentials>({
    apiKey: '',
    apiSecret: '',
    passphrase: '',
    testnet: false
  });
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter exchanges
  const filteredExchanges = EXCHANGES.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || ex.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category
  const groupedExchanges = filteredExchanges.reduce((acc, ex) => {
    if (!acc[ex.category]) acc[ex.category] = [];
    acc[ex.category].push(ex);
    return acc;
  }, {} as Record<string, ExchangeInfo[]>);

  const handleSelectExchange = (exchange: ExchangeInfo) => {
    if (!exchange.supported) {
      setError(`${exchange.name} is coming soon! Stay tuned.`);
      return;
    }
    setSelectedExchange(exchange);
    setStep('credentials');
    setError(null);
  };

  const handleTestConnection = useCallback(async () => {
    if (!selectedExchange || !credentials.apiKey || !credentials.apiSecret) {
      setError('Please enter your API credentials');
      return;
    }

    setTesting(true);
    setError(null);

    try {
      // Call backend to test connection
      const response = await fetch('/api/exchange-connections/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          exchange_id: selectedExchange.id,
          api_key: credentials.apiKey,
          api_secret: credentials.apiSecret,
          passphrase: credentials.passphrase || undefined,
          is_testnet: credentials.testnet
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Connection failed');
      }

      setStep('testing');

      // Wait a moment then call success
      setTimeout(() => {
        onSuccess(selectedExchange.id, credentials);
        handleClose();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to connect. Please check your credentials.');
    } finally {
      setTesting(false);
    }
  }, [selectedExchange, credentials, onSuccess]);

  const handleClose = () => {
    setStep('select');
    setSelectedExchange(null);
    setCredentials({ apiKey: '', apiSecret: '', passphrase: '', testnet: false });
    setError(null);
    setSearchQuery('');
    setSelectedCategory(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full max-w-2xl ${getCardBg(theme)} rounded-2xl border ${getCardBorder(theme)} shadow-2xl overflow-hidden`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#6A3DF4]/10 rounded-xl flex items-center justify-center">
                <Link2 className="w-5 h-5 text-[#6A3DF4]" />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${getTextColor(theme, 'primary')}`}>
                  {step === 'select' ? 'Connect Exchange' :
                   step === 'credentials' ? `Connect ${selectedExchange?.name}` :
                   'Connection Successful'}
                </h2>
                <p className={`text-sm ${getTextColor(theme, 'muted')}`}>
                  {step === 'select' ? 'Choose your exchange or broker' :
                   step === 'credentials' ? 'Enter your API credentials' :
                   'Your account is now connected'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className={`p-2 rounded-lg ${getHoverBg(theme)} transition-colors`}
            >
              <X className={`w-5 h-5 ${getTextColor(theme, 'secondary')}`} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Select Exchange */}
            {step === 'select' && (
              <div className="space-y-6">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search exchanges..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full px-4 py-3 pl-10 ${getCardBg(theme)} border ${getCardBorder(theme)} rounded-xl ${getTextColor(theme, 'primary')} placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6A3DF4]/50`}
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      !selectedCategory
                        ? 'bg-[#6A3DF4] text-white'
                        : `${getCardBg(theme)} ${getTextColor(theme, 'secondary')} hover:text-white`
                    }`}
                  >
                    All
                  </button>
                  {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedCategory === key
                          ? 'bg-[#6A3DF4] text-white'
                          : `${getCardBg(theme)} ${getTextColor(theme, 'secondary')} hover:text-white`
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Exchange List */}
                {Object.entries(groupedExchanges).map(([category, exchanges]) => (
                  <div key={category} className="space-y-3">
                    <h3 className={`text-sm font-medium ${getTextColor(theme, 'secondary')}`}>
                      {CATEGORY_LABELS[category]}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {exchanges.map(exchange => (
                        <button
                          key={exchange.id}
                          onClick={() => handleSelectExchange(exchange)}
                          className={`relative flex items-center gap-3 p-4 ${getCardBg(theme)} border ${getCardBorder(theme)} rounded-xl ${getHoverBg(theme)} transition-all group text-left ${
                            !exchange.supported ? 'opacity-50' : ''
                          }`}
                        >
                          {/* Logo Placeholder */}
                          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                            <span className="text-lg font-bold text-[#6A3DF4]">
                              {exchange.name.charAt(0)}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${getTextColor(theme, 'primary')}`}>
                                {exchange.name}
                              </span>
                              {exchange.supported && (
                                <Check className="w-4 h-4 text-[#2ECC71]" />
                              )}
                            </div>
                            <p className={`text-xs ${getTextColor(theme, 'muted')} truncate`}>
                              {exchange.features.slice(0, 2).join(' / ')}
                            </p>
                          </div>

                          <ChevronRight className={`w-4 h-4 ${getTextColor(theme, 'muted')} group-hover:text-[#6A3DF4] transition-colors`} />

                          {!exchange.supported && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 text-xs bg-[#6A3DF4]/20 text-[#6A3DF4] rounded">
                              Soon
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-4 bg-[#E74C3C]/10 border border-[#E74C3C]/20 rounded-xl"
                  >
                    <AlertCircle className="w-5 h-5 text-[#E74C3C]" />
                    <span className="text-[#E74C3C] text-sm">{error}</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step 2: Enter Credentials */}
            {step === 'credentials' && selectedExchange && (
              <div className="space-y-6">
                {/* Exchange Info */}
                <div className={`flex items-center gap-4 p-4 ${getCardBg(theme)} rounded-xl border ${getCardBorder(theme)}`}>
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <span className="text-xl font-bold text-[#6A3DF4]">
                      {selectedExchange.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className={`font-medium ${getTextColor(theme, 'primary')}`}>
                      {selectedExchange.name}
                    </h3>
                    <p className={`text-sm ${getTextColor(theme, 'muted')}`}>
                      {selectedExchange.features.join(' / ')}
                    </p>
                  </div>
                  {selectedExchange.apiDocsUrl && (
                    <a
                      href={selectedExchange.apiDocsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-sm text-[#6A3DF4] hover:underline"
                    >
                      API Docs <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Security Notice */}
                <div className="flex items-start gap-3 p-4 bg-[#6A3DF4]/10 rounded-xl">
                  <Shield className="w-5 h-5 text-[#6A3DF4] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-sm ${getTextColor(theme, 'primary')}`}>
                      Your API keys are encrypted and stored securely. We only require read-only access to sync your trades.
                    </p>
                  </div>
                </div>

                {/* Credentials Form */}
                <div className="space-y-4">
                  {/* API Key */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${getTextColor(theme, 'secondary')}`}>
                      API Key
                    </label>
                    <div className="relative">
                      <Key className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${getTextColor(theme, 'muted')}`} />
                      <input
                        type="text"
                        value={credentials.apiKey}
                        onChange={e => setCredentials(c => ({ ...c, apiKey: e.target.value }))}
                        placeholder="Enter your API key"
                        className={`w-full px-4 py-3 pl-10 ${getCardBg(theme)} border ${getCardBorder(theme)} rounded-xl ${getTextColor(theme, 'primary')} placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6A3DF4]/50`}
                      />
                    </div>
                  </div>

                  {/* API Secret */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${getTextColor(theme, 'secondary')}`}>
                      API Secret
                    </label>
                    <div className="relative">
                      <Key className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${getTextColor(theme, 'muted')}`} />
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={credentials.apiSecret}
                        onChange={e => setCredentials(c => ({ ...c, apiSecret: e.target.value }))}
                        placeholder="Enter your API secret"
                        className={`w-full px-4 py-3 pl-10 pr-10 ${getCardBg(theme)} border ${getCardBorder(theme)} rounded-xl ${getTextColor(theme, 'primary')} placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6A3DF4]/50`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showSecret ? (
                          <EyeOff className={`w-5 h-5 ${getTextColor(theme, 'muted')}`} />
                        ) : (
                          <Eye className={`w-5 h-5 ${getTextColor(theme, 'muted')}`} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Passphrase (for some exchanges) */}
                  {(selectedExchange.id === 'okx' || selectedExchange.id === 'coinbase') && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${getTextColor(theme, 'secondary')}`}>
                        Passphrase
                        <span className="text-[#6A3DF4] ml-1">(Required)</span>
                      </label>
                      <input
                        type="password"
                        value={credentials.passphrase}
                        onChange={e => setCredentials(c => ({ ...c, passphrase: e.target.value }))}
                        placeholder="Enter your API passphrase"
                        className={`w-full px-4 py-3 ${getCardBg(theme)} border ${getCardBorder(theme)} rounded-xl ${getTextColor(theme, 'primary')} placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6A3DF4]/50`}
                      />
                    </div>
                  )}

                  {/* Testnet Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={credentials.testnet}
                      onChange={e => setCredentials(c => ({ ...c, testnet: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${
                      credentials.testnet ? 'bg-[#6A3DF4]' : 'bg-gray-600'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${
                        credentials.testnet ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </div>
                    <span className={`text-sm ${getTextColor(theme, 'secondary')}`}>
                      Use Testnet
                    </span>
                    <HelpCircle className={`w-4 h-4 ${getTextColor(theme, 'muted')}`} />
                  </label>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-4 bg-[#E74C3C]/10 border border-[#E74C3C]/20 rounded-xl"
                  >
                    <AlertCircle className="w-5 h-5 text-[#E74C3C]" />
                    <span className="text-[#E74C3C] text-sm">{error}</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step 3: Success */}
            {step === 'testing' && (
              <div className="py-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 mx-auto mb-6 bg-[#2ECC71]/20 rounded-full flex items-center justify-center"
                >
                  <Check className="w-10 h-10 text-[#2ECC71]" />
                </motion.div>
                <h3 className={`text-xl font-semibold mb-2 ${getTextColor(theme, 'primary')}`}>
                  Connection Successful!
                </h3>
                <p className={`${getTextColor(theme, 'muted')}`}>
                  Your {selectedExchange?.name} account is now connected.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {step !== 'testing' && (
            <div className="flex items-center justify-between p-6 border-t border-white/10">
              {step === 'credentials' ? (
                <>
                  <button
                    onClick={() => { setStep('select'); setSelectedExchange(null); setError(null); }}
                    className={`px-4 py-2 ${getTextColor(theme, 'secondary')} hover:text-white transition-colors`}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={testing || !credentials.apiKey || !credentials.apiSecret}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#6A3DF4] hover:bg-[#5A2DE4] text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        Connect
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="w-full text-center">
                  <p className={`text-sm ${getTextColor(theme, 'muted')}`}>
                    Select an exchange to get started
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

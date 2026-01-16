/**
 * Exchange Connection Modal - Bitget Style
 *
 * Modal for connecting exchanges/brokers with real logos.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Link2, Key, Shield, Eye, EyeOff, Check, AlertCircle,
  ChevronRight, Loader2, ExternalLink, HelpCircle, Search
} from 'lucide-react';
import { buildApiUrl } from '../../hooks/useApi';

// ============================================================================
// Types
// ============================================================================

interface ExchangeInfo {
  id: string;
  name: string;
  logoUrl: string;
  logoBgColor: string;
  category: 'crypto_cex' | 'crypto_dex' | 'stocks' | 'forex';
  features: string[];
  supported: boolean;
  apiDocsUrl?: string;
  requiresPassphrase?: boolean;
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
// Exchange Logos (Real Logo URLs)
// ============================================================================

const EXCHANGE_LOGOS: Record<string, string> = {
  // Crypto Exchanges - Using official/CDN logos
  binance: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png',
  bybit: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/521.png',
  okx: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/294.png',
  coinbase: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/89.png',
  kraken: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/24.png',
  kucoin: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/311.png',
  gateio: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/302.png',
  mexc: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/544.png',
  bitget: 'https://s2.coinmarketcap.com/static/img/exchanges/64x64/513.png',
  hyperliquid: `data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#0d1117"/><path d="M8 20c0-5 3-9 7-9s5 4 5 9-1 9-5 9-7-4-7-9zm12 0c0-5 1-9 5-9s7 4 7 9-3 9-7 9-5-4-5-9z" fill="#7BEBC3"/></svg>')}`,

  // Stock/Forex Brokers - Fallback SVGs for brokers without public CDN
  interactive_brokers: `data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#D41F2C"/><text x="20" y="26" font-family="Arial" font-size="16" font-weight="bold" fill="#fff" text-anchor="middle">IB</text></svg>')}`,
  td_ameritrade: `data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#5DB761"/><text x="20" y="26" font-family="Arial" font-size="14" font-weight="bold" fill="#fff" text-anchor="middle">TD</text></svg>')}`,
  oanda: `data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#1D1D27"/><text x="20" y="26" font-family="Arial" font-size="9" font-weight="bold" fill="#fff" text-anchor="middle">OANDA</text></svg>')}`,
};

// ============================================================================
// Exchange Data
// ============================================================================

const EXCHANGES: ExchangeInfo[] = [
  // Crypto CEXs - Sorted by popularity
  {
    id: 'binance',
    name: 'Binance',
    logoUrl: EXCHANGE_LOGOS.binance,
    logoBgColor: '#F3BA2F',
    category: 'crypto_cex',
    features: ['Spot', 'Futures', 'Margin'],
    supported: true,
    apiDocsUrl: 'https://binance-docs.github.io/apidocs/'
  },
  {
    id: 'bybit',
    name: 'Bybit',
    logoUrl: EXCHANGE_LOGOS.bybit,
    logoBgColor: '#F7A600',
    category: 'crypto_cex',
    features: ['Spot', 'Futures', 'Options'],
    supported: true,
    apiDocsUrl: 'https://bybit-exchange.github.io/docs/'
  },
  {
    id: 'okx',
    name: 'OKX',
    logoUrl: EXCHANGE_LOGOS.okx,
    logoBgColor: '#000000',
    category: 'crypto_cex',
    features: ['Spot', 'Futures', 'Options'],
    supported: true,
    apiDocsUrl: 'https://www.okx.com/docs/',
    requiresPassphrase: true
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    logoUrl: EXCHANGE_LOGOS.coinbase,
    logoBgColor: '#0052FF',
    category: 'crypto_cex',
    features: ['Spot', 'Advanced Trading'],
    supported: true,
    apiDocsUrl: 'https://docs.cloud.coinbase.com/',
    requiresPassphrase: true
  },
  {
    id: 'kraken',
    name: 'Kraken',
    logoUrl: EXCHANGE_LOGOS.kraken,
    logoBgColor: '#5741D9',
    category: 'crypto_cex',
    features: ['Spot', 'Futures', 'Margin'],
    supported: true,
    apiDocsUrl: 'https://docs.kraken.com/'
  },
  {
    id: 'kucoin',
    name: 'KuCoin',
    logoUrl: EXCHANGE_LOGOS.kucoin,
    logoBgColor: '#23AF91',
    category: 'crypto_cex',
    features: ['Spot', 'Futures', 'Margin'],
    supported: true,
    apiDocsUrl: 'https://docs.kucoin.com/',
    requiresPassphrase: true
  },
  {
    id: 'gateio',
    name: 'Gate.io',
    logoUrl: EXCHANGE_LOGOS.gateio,
    logoBgColor: '#2354E6',
    category: 'crypto_cex',
    features: ['Spot', 'Futures'],
    supported: true,
    apiDocsUrl: 'https://www.gate.io/docs/'
  },
  {
    id: 'mexc',
    name: 'MEXC',
    logoUrl: EXCHANGE_LOGOS.mexc,
    logoBgColor: '#1B3D6D',
    category: 'crypto_cex',
    features: ['Spot', 'Futures'],
    supported: true,
    apiDocsUrl: 'https://mxcdevelop.github.io/apidocs/'
  },
  {
    id: 'bitget',
    name: 'Bitget',
    logoUrl: EXCHANGE_LOGOS.bitget,
    logoBgColor: '#03AAC7',
    category: 'crypto_cex',
    features: ['Spot', 'Futures', 'Copy Trading'],
    supported: true,
    apiDocsUrl: 'https://bitgetlimited.github.io/apidoc/',
    requiresPassphrase: true
  },

  // DEXs
  {
    id: 'hyperliquid',
    name: 'Hyperliquid',
    logoUrl: EXCHANGE_LOGOS.hyperliquid,
    logoBgColor: '#0D1117',
    category: 'crypto_dex',
    features: ['Perpetuals', 'Orderbook DEX'],
    supported: true,
    apiDocsUrl: 'https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api'
  },

  // Stock Brokers
  {
    id: 'interactive_brokers',
    name: 'Interactive Brokers',
    logoUrl: EXCHANGE_LOGOS.interactive_brokers,
    logoBgColor: '#D41F2C',
    category: 'stocks',
    features: ['Stocks', 'Options', 'Futures', 'Forex'],
    supported: true,
    apiDocsUrl: 'https://interactivebrokers.github.io/cpwebapi/'
  },
  {
    id: 'td_ameritrade',
    name: 'TD Ameritrade',
    logoUrl: EXCHANGE_LOGOS.td_ameritrade,
    logoBgColor: '#2E7D32',
    category: 'stocks',
    features: ['Stocks', 'Options', 'ETFs'],
    supported: true,
    apiDocsUrl: 'https://developer.tdameritrade.com/apis'
  },

  // Forex
  {
    id: 'oanda',
    name: 'OANDA',
    logoUrl: EXCHANGE_LOGOS.oanda,
    logoBgColor: '#1A1A2E',
    category: 'forex',
    features: ['Forex', 'CFDs'],
    supported: true,
    apiDocsUrl: 'https://developer.oanda.com/'
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  crypto_cex: 'Crypto Exchanges',
  crypto_dex: 'Decentralized Exchanges',
  stocks: 'Stock Brokers',
  forex: 'Forex Brokers',
};

const CATEGORY_ORDER = ['crypto_cex', 'stocks', 'forex', 'crypto_dex'];

// ============================================================================
// Component
// ============================================================================

export default function ExchangeConnectionModal({
  isOpen,
  onClose,
  onSuccess
}: ExchangeConnectionModalProps) {
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

  // Group by category in order
  const groupedExchanges = CATEGORY_ORDER.reduce((acc, category) => {
    const exchanges = filteredExchanges.filter(ex => ex.category === category);
    if (exchanges.length > 0) {
      acc[category] = exchanges;
    }
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

    if (selectedExchange.requiresPassphrase && !credentials.passphrase) {
      setError('Passphrase is required for this exchange');
      return;
    }

    setTesting(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/exchange-connections/test'), {
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

      setTimeout(() => {
        onSuccess(selectedExchange.id, credentials);
        handleClose();
      }, 1500);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect. Please check your credentials.';
      setError(message);
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
          className="relative w-full max-w-2xl bg-[#151517] rounded-2xl border border-[#2B2F36] shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2B2F36]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#03AAC7]/10 rounded-xl flex items-center justify-center">
                <Link2 className="w-5 h-5 text-[#03AAC7]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {step === 'select' ? 'Connect Exchange' :
                   step === 'credentials' ? `Connect ${selectedExchange?.name}` :
                   'Connection Successful'}
                </h2>
                <p className="text-sm text-[#9CA3AF]">
                  {step === 'select' ? 'Choose your exchange or broker' :
                   step === 'credentials' ? 'Enter your API credentials' :
                   'Your account is now connected'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-[#252629] transition-colors"
            >
              <X className="w-5 h-5 text-[#9CA3AF]" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Step 1: Select Exchange */}
            {step === 'select' && (
              <div className="space-y-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                  <input
                    type="text"
                    placeholder="Search exchanges..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-10 bg-[#1B1B1D] border border-[#2B2F36] rounded-xl text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#03AAC7] transition-colors"
                  />
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      !selectedCategory
                        ? 'bg-[#03AAC7] text-[#151517]'
                        : 'bg-[#252629] text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  {CATEGORY_ORDER.map(key => (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedCategory === key
                          ? 'bg-[#03AAC7] text-[#151517]'
                          : 'bg-[#252629] text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      {CATEGORY_LABELS[key]}
                    </button>
                  ))}
                </div>

                {/* Exchange List */}
                {Object.entries(groupedExchanges).map(([category, exchanges]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-medium text-[#6B7280] uppercase tracking-wider">
                      {CATEGORY_LABELS[category]}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {exchanges.map(exchange => (
                        <button
                          key={exchange.id}
                          onClick={() => handleSelectExchange(exchange)}
                          disabled={!exchange.supported}
                          className={`relative flex items-center gap-3 p-4 bg-[#1B1B1D] border border-[#2B2F36] rounded-xl hover:border-[#03AAC7]/50 hover:bg-[#252629] transition-all group text-left ${
                            !exchange.supported ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {/* Logo */}
                          <img
                            src={exchange.logoUrl}
                            alt={exchange.name}
                            className="w-10 h-10 rounded-lg"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">
                                {exchange.name}
                              </span>
                              {exchange.supported && (
                                <Check className="w-4 h-4 text-[#03AAC7]" />
                              )}
                            </div>
                            <p className="text-xs text-[#6B7280] truncate">
                              {exchange.features.join(' • ')}
                            </p>
                          </div>

                          <ChevronRight className="w-4 h-4 text-[#6B7280] group-hover:text-[#03AAC7] transition-colors" />

                          {!exchange.supported && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 text-xs bg-[#03AAC7]/20 text-[#03AAC7] rounded">
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
                    className="flex items-center gap-2 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-xl"
                  >
                    <AlertCircle className="w-5 h-5 text-[#F43F5E]" />
                    <span className="text-[#F43F5E] text-sm">{error}</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step 2: Enter Credentials */}
            {step === 'credentials' && selectedExchange && (
              <div className="space-y-6">
                {/* Exchange Info */}
                <div className="flex items-center gap-4 p-4 bg-[#1B1B1D] rounded-xl border border-[#2B2F36]">
                  <img
                    src={selectedExchange.logoUrl}
                    alt={selectedExchange.name}
                    className="w-12 h-12 rounded-xl"
                  />
                  <div>
                    <h3 className="font-medium text-white">
                      {selectedExchange.name}
                    </h3>
                    <p className="text-sm text-[#6B7280]">
                      {selectedExchange.features.join(' • ')}
                    </p>
                  </div>
                  {selectedExchange.apiDocsUrl && (
                    <a
                      href={selectedExchange.apiDocsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto flex items-center gap-1 text-sm text-[#03AAC7] hover:underline"
                    >
                      API Docs <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Security Notice */}
                <div className="flex items-start gap-3 p-4 bg-[#03AAC7]/10 rounded-xl border border-[#03AAC7]/20">
                  <Shield className="w-5 h-5 text-[#03AAC7] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[#9CA3AF]">
                    Your API keys are encrypted and stored securely. We only require read-only access to sync your trades.
                  </p>
                </div>

                {/* Credentials Form */}
                <div className="space-y-4">
                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">
                      API Key
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                      <input
                        type="text"
                        value={credentials.apiKey}
                        onChange={e => setCredentials(c => ({ ...c, apiKey: e.target.value }))}
                        placeholder="Enter your API key"
                        className="w-full px-4 py-3 pl-10 bg-[#1B1B1D] border border-[#2B2F36] rounded-xl text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#03AAC7] transition-colors"
                      />
                    </div>
                  </div>

                  {/* API Secret */}
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">
                      API Secret
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={credentials.apiSecret}
                        onChange={e => setCredentials(c => ({ ...c, apiSecret: e.target.value }))}
                        placeholder="Enter your API secret"
                        className="w-full px-4 py-3 pl-10 pr-10 bg-[#1B1B1D] border border-[#2B2F36] rounded-xl text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#03AAC7] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showSecret ? (
                          <EyeOff className="w-5 h-5 text-[#6B7280]" />
                        ) : (
                          <Eye className="w-5 h-5 text-[#6B7280]" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Passphrase (for some exchanges) */}
                  {selectedExchange.requiresPassphrase && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[#9CA3AF]">
                        Passphrase
                        <span className="text-[#03AAC7] ml-1">(Required)</span>
                      </label>
                      <input
                        type="password"
                        value={credentials.passphrase}
                        onChange={e => setCredentials(c => ({ ...c, passphrase: e.target.value }))}
                        placeholder="Enter your API passphrase"
                        className="w-full px-4 py-3 bg-[#1B1B1D] border border-[#2B2F36] rounded-xl text-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#03AAC7] transition-colors"
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
                      credentials.testnet ? 'bg-[#03AAC7]' : 'bg-[#2B2F36]'
                    }`}>
                      <div className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${
                        credentials.testnet ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </div>
                    <span className="text-sm text-[#9CA3AF]">
                      Use Testnet
                    </span>
                    <HelpCircle className="w-4 h-4 text-[#6B7280]" />
                  </label>
                </div>

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-4 bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-xl"
                  >
                    <AlertCircle className="w-5 h-5 text-[#F43F5E]" />
                    <span className="text-[#F43F5E] text-sm">{error}</span>
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
                  className="w-20 h-20 mx-auto mb-6 bg-[#03AAC7]/20 rounded-full flex items-center justify-center"
                >
                  <Check className="w-10 h-10 text-[#03AAC7]" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  Connection Successful!
                </h3>
                <p className="text-[#9CA3AF]">
                  Your {selectedExchange?.name} account is now connected.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {step !== 'testing' && (
            <div className="flex items-center justify-between p-6 border-t border-[#2B2F36]">
              {step === 'credentials' ? (
                <>
                  <button
                    onClick={() => { setStep('select'); setSelectedExchange(null); setError(null); }}
                    className="px-4 py-2 text-[#9CA3AF] hover:text-white transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={testing || !credentials.apiKey || !credentials.apiSecret}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#03AAC7] hover:bg-[#26BFD4] text-[#151517] font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  <p className="text-sm text-[#6B7280]">
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

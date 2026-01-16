/**
 * Lighter DEX Onboarding Modal (Simplified)
 *
 * Streamlined 3-step onboarding flow:
 * 1. Welcome + Connect Wallet (combined)
 * 2. Enter API credentials
 * 3. Success
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Wallet,
  Key,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ExternalLink,
  Zap,
  TrendingUp,
  DollarSign,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../hooks/useApi';

// ============================================================================
// Types
// ============================================================================

interface LighterOnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type OnboardingStep = 'connect' | 'credentials' | 'success';

// ============================================================================
// Constants
// ============================================================================

const LIGHTER_FEATURES = [
  { icon: DollarSign, text: '0% Fees', highlight: true },
  { icon: TrendingUp, text: '50x Leverage' },
  { icon: Zap, text: 'Instant' },
  { icon: Shield, text: 'Non-Custodial' }
];

// Arbitrum One Chain ID
const ARBITRUM_CHAIN_ID = '0xa4b1'; // 42161 in hex

// ============================================================================
// Component
// ============================================================================

export function LighterOnboarding({ isOpen, onClose, onSuccess }: LighterOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('connect');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [accountIndex, setAccountIndex] = useState<number>(3);
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  // Step titles
  const stepTitles: Record<OnboardingStep, { title: string; subtitle: string }> = {
    connect: { title: 'Connect to Lighter', subtitle: 'Zero-fee perpetual trading on Arbitrum' },
    credentials: { title: 'API Credentials', subtitle: 'Enter your Lighter API keys' },
    success: { title: 'All Set!', subtitle: 'Start trading with 0% fees' }
  };

  const currentConfig = stepTitles[currentStep];
  const stepIndex = currentStep === 'connect' ? 0 : currentStep === 'credentials' ? 1 : 2;

  // Connect MetaMask wallet
  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask nicht installiert. Bitte installiere MetaMask.');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('Keine Wallet gefunden. Bitte verbinde MetaMask.');
      }

      // Check/switch to Arbitrum
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== ARBITRUM_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: ARBITRUM_CHAIN_ID }]
          });
        } catch (switchError: unknown) {
          if ((switchError as { code?: number })?.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: ARBITRUM_CHAIN_ID,
                chainName: 'Arbitrum One',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://arb1.arbitrum.io/rpc'],
                blockExplorerUrls: ['https://arbiscan.io']
              }]
            });
          } else {
            throw new Error('Bitte wechsle zu Arbitrum in MetaMask.');
          }
        }
      }

      setWalletAddress(accounts[0]);
      setCurrentStep('credentials');
    } catch (err) {
      console.error('Wallet connection error:', err);
      setError(err instanceof Error ? err.message : 'Verbindung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Submit credentials and connect
  const submitCredentials = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!apiKey.trim()) {
        throw new Error('Bitte API Key eingeben');
      }
      if (!apiSecret.trim()) {
        throw new Error('Bitte API Secret eingeben');
      }

      const token = await user?.getIdToken();

      // First store wallet connection
      await fetch(buildApiUrl('/api/lighter/connect-wallet'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          wallet_address: walletAddress || '0x0000000000000000000000000000000000000000',
          signature: 'skip',
          message: 'skip'
        })
      });

      // Then create account with credentials
      const response = await fetch(buildApiUrl('/api/lighter/create-account'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          wallet_address: walletAddress || '0x0000000000000000000000000000000000000000',
          api_key: apiKey.trim(),
          api_secret: apiSecret.trim(),
          account_index: accountIndex
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Better error messages
        if (data.error?.includes('403')) {
          throw new Error('API Credentials ungültig. Bitte überprüfe Key, Secret und Account Index.');
        }
        throw new Error(data.error || 'Verbindung fehlgeschlagen');
      }

      setCurrentStep('success');
    } catch (err) {
      console.error('Credentials error:', err);
      setError(err instanceof Error ? err.message : 'Verbindung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, apiSecret, accountIndex, walletAddress, user]);

  // Close handler
  const handleClose = useCallback(() => {
    if (currentStep === 'success') {
      onSuccess();
    }
    onClose();
  }, [currentStep, onClose, onSuccess]);

  // Skip wallet and go directly to credentials
  const skipWallet = useCallback(() => {
    setCurrentStep('credentials');
    setError(null);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md mx-4 bg-[#141416] border border-[#2A2A2E] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2E]">
            <div>
              <h2 className="text-lg font-semibold text-white">{currentConfig.title}</h2>
              <p className="text-sm text-[#AAB0C0]">{currentConfig.subtitle}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-[#AAB0C0] hover:text-white hover:bg-[#2A2A2E] rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress Bar - 3 steps */}
          <div className="px-6 py-3 bg-[#0D0D0F]">
            <div className="flex gap-2">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index <= stepIndex ? 'bg-[#0D9488]' : 'bg-[#2A2A2E]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Connect Wallet */}
              {currentStep === 'connect' && (
                <motion.div
                  key="connect"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  {/* Features Grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {LIGHTER_FEATURES.map((feature, index) => (
                      <div
                        key={index}
                        className={`flex flex-col items-center p-3 rounded-xl ${
                          feature.highlight
                            ? 'bg-[#10B981]/10 border border-[#10B981]/30'
                            : 'bg-[#1A1A1C]'
                        }`}
                      >
                        <feature.icon
                          size={20}
                          className={feature.highlight ? 'text-[#10B981]' : 'text-[#AAB0C0]'}
                        />
                        <span
                          className={`text-xs mt-1 ${
                            feature.highlight ? 'text-[#10B981] font-medium' : 'text-[#E5E7EB]'
                          }`}
                        >
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Network Badge */}
                  <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#2563EB]/10 border border-[#2563EB]/30 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
                      <span className="text-sm text-[#2563EB]">Arbitrum One</span>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-[#EF4444] text-sm">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  <button
                    onClick={connectWallet}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#F59E0B]/50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Wallet size={18} />
                    )}
                    {isLoading ? 'Verbinde...' : 'MetaMask verbinden'}
                  </button>

                  <button
                    onClick={skipWallet}
                    className="w-full text-center text-sm text-[#AAB0C0] hover:text-white"
                  >
                    Ohne Wallet fortfahren →
                  </button>
                </motion.div>
              )}

              {/* Step 2: Credentials */}
              {currentStep === 'credentials' && (
                <motion.div
                  key="credentials"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="text-center mb-4">
                    <a
                      href="https://app.lighter.xyz/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#0D9488] hover:underline text-sm"
                    >
                      API Keys bei Lighter holen <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Public Key */}
                  <div>
                    <label className="block text-sm text-[#AAB0C0] mb-1.5">Public Key</label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="c42d53...730d"
                      className="w-full px-4 py-2.5 bg-[#1A1A1C] border border-[#2A2A2E] rounded-xl text-white placeholder-[#666] focus:border-[#0D9488] focus:outline-none text-sm font-mono"
                    />
                  </div>

                  {/* Private Key */}
                  <div>
                    <label className="block text-sm text-[#AAB0C0] mb-1.5">Private Key</label>
                    <div className="relative">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={apiSecret}
                        onChange={(e) => setApiSecret(e.target.value)}
                        placeholder="fcafc8...6700"
                        className="w-full px-4 py-2.5 pr-10 bg-[#1A1A1C] border border-[#2A2A2E] rounded-xl text-white placeholder-[#666] focus:border-[#0D9488] focus:outline-none text-sm font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AAB0C0] hover:text-white"
                      >
                        {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* API Key Index */}
                  <div>
                    <label className="block text-sm text-[#AAB0C0] mb-1.5">
                      API Key Index
                      <span className="text-[#666] ml-1">(wird beim Erstellen angezeigt)</span>
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={254}
                      value={accountIndex}
                      onChange={(e) => setAccountIndex(parseInt(e.target.value) || 3)}
                      className="w-full px-4 py-2.5 bg-[#1A1A1C] border border-[#2A2A2E] rounded-xl text-white focus:border-[#0D9488] focus:outline-none text-sm"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl text-[#EF4444] text-sm">
                      <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    onClick={submitCredentials}
                    disabled={isLoading || !apiKey || !apiSecret}
                    className="w-full py-3 px-4 bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-[#0D9488]/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Key size={18} />
                    )}
                    {isLoading ? 'Verbinde...' : 'Verbinden'}
                  </button>

                  <button
                    onClick={() => setCurrentStep('connect')}
                    className="w-full text-center text-sm text-[#AAB0C0] hover:text-white flex items-center justify-center gap-1"
                  >
                    <ChevronLeft size={16} />
                    Zurück
                  </button>
                </motion.div>
              )}

              {/* Step 3: Success */}
              {currentStep === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center space-y-6 py-4"
                >
                  <div className="w-20 h-20 mx-auto rounded-full bg-[#10B981]/20 flex items-center justify-center">
                    <Check size={40} className="text-[#10B981]" />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      Erfolgreich verbunden!
                    </h3>
                    <p className="text-[#AAB0C0]">
                      Du kannst jetzt mit 0% Gebühren auf Lighter traden.
                    </p>
                  </div>

                  <button
                    onClick={handleClose}
                    className="w-full py-3 px-4 bg-[#0D9488] hover:bg-[#0F766E] text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    Los geht's
                    <ChevronRight size={18} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default LighterOnboarding;

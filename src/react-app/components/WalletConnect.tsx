import { useState, useEffect } from 'react';
import { useWallet, WalletType, ChainType } from '../contexts/WalletContext';
import { Wallet, LogOut, Copy, Check, ChevronDown, ExternalLink, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { detectInstalledWallets, type DetectedWallet } from '../utils/walletDetection';

export default function WalletConnect() {
  const { wallet, connectWallet, disconnectWallet, switchChain } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState<WalletType | null>(null);
  const [availableWallets, setAvailableWallets] = useState<DetectedWallet[]>([]);

  // Detect installed wallets
  useEffect(() => {
    const detectWallets = () => {
      const wallets = detectInstalledWallets();
      setAvailableWallets(wallets);
      console.log('Detected wallets:', wallets);
    };

    // Initial detection
    detectWallets();

    // Wait for window.ethereum to be available (some wallets inject it asynchronously)
    const checkEthereum = setInterval(() => {
      if (window.ethereum || window.solana) {
        detectWallets();
      }
    }, 500); // Check every 500ms

    // Also listen for ethereum injection events
    const handleEthereumInjection = () => {
      detectWallets();
    };

    window.addEventListener('ethereum#initialized', handleEthereumInjection);
    window.addEventListener('ethereum#connect', handleEthereumInjection);

    // Re-detect periodically
    const interval = setInterval(detectWallets, 2000);

    return () => {
      clearInterval(checkEthereum);
      clearInterval(interval);
      window.removeEventListener('ethereum#initialized', handleEthereumInjection);
      window.removeEventListener('ethereum#connect', handleEthereumInjection);
    };
  }, []);

  const handleConnect = async (walletType: WalletType, chain: ChainType = 'ethereum') => {
    try {
      setConnecting(walletType);
      
      // Check if wallet is actually installed before attempting connection
      const walletInfo = availableWallets.find(w => w.type === walletType);
      if (walletInfo && !walletInfo.installed) {
        throw new Error(`${walletInfo.name} is not installed. Please install it first.`);
      }
      
      await connectWallet(walletType, chain);
      setIsOpen(false);
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      
      // Show user-friendly error message
      const errorMessage = error.message || 'Failed to connect wallet';
      
      // Check for common error cases
      if (errorMessage.includes('not installed')) {
        alert(`${errorMessage}\n\nPlease install the wallet extension and refresh the page.`);
      } else if (errorMessage.includes('No accounts found') || errorMessage.includes('unlock')) {
        alert(`${errorMessage}\n\nPlease unlock your wallet and try again.`);
      } else if (errorMessage.includes('User rejected')) {
        alert('Connection cancelled. Please approve the connection request in your wallet.');
      } else {
        alert(`Connection failed: ${errorMessage}`);
      }
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setIsOpen(false);
  };

  const handleCopyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainName = (chain: ChainType | null) => {
    if (!chain) return '';
    const names: Record<ChainType, string> = {
      ethereum: 'Ethereum',
      bsc: 'BNB Chain',
      polygon: 'Polygon',
      arbitrum: 'Arbitrum',
      optimism: 'Optimism',
      avalanche: 'Avalanche',
      solana: 'Solana',
    };
    return names[chain];
  };

  const getWalletName = (walletType: WalletType) => {
    const names: Record<string, string> = {
      metamask: 'MetaMask',
      trustwallet: 'Trust Wallet',
      phantom: 'Phantom',
      coinbase: 'Coinbase Wallet',
      walletconnect: 'WalletConnect',
    };
    return names[walletType || ''] || 'Wallet';
  };

  if (wallet.isConnected) {
    return (
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-4 py-2 bg-[#0D0F18] border border-white/10 rounded-xl hover:bg-white/5 transition-all"
        >
          <div className="w-2 h-2 bg-[#2ECC71] rounded-full animate-pulse" />
          <Wallet className="w-4 h-4 text-[#6A3DF4]" />
          <span className="text-white text-sm font-medium">{formatAddress(wallet.address!)}</span>
          <ChevronDown className={`w-4 h-4 text-[#7F8C8D] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 mt-2 bg-[#0D0F18] border border-white/10 rounded-xl p-4 min-w-[280px] z-50 shadow-lg"
            >
              <div className="space-y-4">
                {/* Wallet Info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7F8C8D] text-xs">Wallet</span>
                    <span className="text-white text-sm font-medium">{getWalletName(wallet.walletType)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7F8C8D] text-xs">Network</span>
                    <span className="text-white text-sm font-medium">{getChainName(wallet.chain)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7F8C8D] text-xs">Balance</span>
                    <span className="text-white text-sm font-medium">
                      {wallet.balance ? parseFloat(wallet.balance).toFixed(4) : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Address */}
                <div className="p-3 bg-[#0D0F18]/50 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7F8C8D] text-xs font-mono">{wallet.address}</span>
                    <button
                      onClick={handleCopyAddress}
                      className="p-1.5 hover:bg-white/5 rounded transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-[#2ECC71]" />
                      ) : (
                        <Copy className="w-4 h-4 text-[#7F8C8D]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Chain Switcher (for EVM wallets) */}
                {wallet.walletType !== 'phantom' && wallet.walletType !== null && (
                  <div className="space-y-2">
                    <span className="text-[#7F8C8D] text-xs">Switch Network</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(['ethereum', 'bsc', 'polygon', 'arbitrum'] as ChainType[]).map((chain) => (
                        <button
                          key={chain}
                          onClick={() => switchChain(chain)}
                          className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                            wallet.chain === chain
                              ? 'bg-[#6A3DF4]/20 border-[#6A3DF4] text-white'
                              : 'bg-[#0D0F18] border-white/10 text-[#7F8C8D] hover:bg-white/5'
                          }`}
                        >
                          {getChainName(chain)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disconnect */}
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-[#E74C3C]/10 hover:bg-[#E74C3C]/20 border border-[#E74C3C]/20 text-[#E74C3C] rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Disconnect</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white rounded-xl font-medium transition-all"
      >
        <Wallet className="w-4 h-4" />
        <span>Connect Wallet</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full right-0 mt-2 bg-[#0D0F18] border border-white/10 rounded-xl p-4 min-w-[320px] z-50 shadow-lg"
            >
              <div className="space-y-3">
                <h3 className="text-white font-semibold mb-4">Connect Wallet</h3>

                {/* EVM Wallets */}
                <div className="space-y-2">
                  <span className="text-[#7F8C8D] text-xs uppercase tracking-wide">EVM Wallets</span>
                  <div className="space-y-2">
                    {availableWallets
                      .filter((w) => w.type !== 'phantom')
                      .map((walletOption) => (
                        <button
                          key={walletOption.type}
                          onClick={() => {
                            if (!walletOption.installed) {
                              // Open wallet download page
                              const urls: Record<string, string> = {
                                metamask: 'https://metamask.io/download/',
                                trustwallet: 'https://trustwallet.com/download',
                                coinbase: 'https://www.coinbase.com/wallet',
                              };
                              window.open(urls[walletOption.type] || '#', '_blank');
                              return;
                            }
                            handleConnect(walletOption.type, 'ethereum');
                          }}
                          disabled={connecting === walletOption.type}
                          className={`w-full flex items-center justify-between p-3 bg-[#0D0F18] border rounded-lg transition-all ${
                            walletOption.installed
                              ? 'border-white/10 hover:bg-white/5'
                              : 'border-white/5 opacity-60'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{walletOption.icon}</span>
                            <div className="flex flex-col items-start">
                              <span className="text-white font-medium">{walletOption.name}</span>
                              {!walletOption.installed && (
                                <span className="text-[#7F8C8D] text-xs">Not installed</span>
                              )}
                            </div>
                          </div>
                          {connecting === walletOption.type ? (
                            <div className="w-4 h-4 border-2 border-[#6A3DF4] border-t-transparent rounded-full animate-spin" />
                          ) : walletOption.installed ? (
                            <ExternalLink className="w-4 h-4 text-[#7F8C8D]" />
                          ) : (
                            <Download className="w-4 h-4 text-[#7F8C8D]" />
                          )}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Solana Wallets */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <span className="text-[#7F8C8D] text-xs uppercase tracking-wide">Solana Wallets</span>
                  {availableWallets
                    .filter((w) => w.type === 'phantom')
                    .map((walletOption) => (
                      <button
                        key={walletOption.type}
                        onClick={() => {
                          if (!walletOption.installed) {
                            window.open('https://phantom.app/', '_blank');
                            return;
                          }
                          handleConnect('phantom', 'solana');
                        }}
                        disabled={connecting === 'phantom'}
                        className={`w-full flex items-center justify-between p-3 bg-[#0D0F18] border rounded-lg transition-all ${
                          walletOption.installed
                            ? 'border-white/10 hover:bg-white/5'
                            : 'border-white/5 opacity-60'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{walletOption.icon}</span>
                          <div className="flex flex-col items-start">
                            <span className="text-white font-medium">{walletOption.name}</span>
                            {!walletOption.installed && (
                              <span className="text-[#7F8C8D] text-xs">Not installed</span>
                            )}
                          </div>
                        </div>
                        {connecting === 'phantom' ? (
                          <div className="w-4 h-4 border-2 border-[#6A3DF4] border-t-transparent rounded-full animate-spin" />
                        ) : walletOption.installed ? (
                          <ExternalLink className="w-4 h-4 text-[#7F8C8D]" />
                        ) : (
                          <Download className="w-4 h-4 text-[#7F8C8D]" />
                        )}
                      </button>
                    ))}
                </div>

                {wallet.error && (
                  <div className="p-3 bg-[#E74C3C]/10 border border-[#E74C3C]/20 rounded-lg">
                    <p className="text-[#E74C3C] text-xs">{wallet.error}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

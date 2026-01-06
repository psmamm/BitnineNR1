import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { createPublicClient, http, formatEther, type Address, type Chain } from 'viem';
import { mainnet, bsc, polygon, arbitrum, optimism, avalanche } from 'viem/chains';
import { Connection, PublicKey } from '@solana/web3.js';

export type WalletType = 'metamask' | 'trustwallet' | 'phantom' | 'coinbase' | 'walletconnect' | null;
export type ChainType = 'ethereum' | 'bsc' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche' | 'solana';

export interface WalletState {
  isConnected: boolean;
  walletType: WalletType;
  address: string | null;
  chain: ChainType | null;
  chainId: number | null;
  balance: string | null;
  error: string | null;
}

interface WalletContextType {
  wallet: WalletState;
  connectWallet: (walletType: WalletType, chain?: ChainType) => Promise<void>;
  disconnectWallet: () => void;
  switchChain: (chain: ChainType) => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// EVM Chain configurations
const evmChains: Record<string, Chain> = {
  ethereum: mainnet,
  bsc: bsc,
  polygon: polygon,
  arbitrum: arbitrum,
  optimism: optimism,
  avalanche: avalanche,
};

// Solana RPC endpoints with fallbacks
const SOLANA_RPC_ENDPOINTS = [
  'https://solana-api.projectserum.com', // Public endpoint
  'https://rpc.ankr.com/solana', // Ankr public RPC
  'https://api.mainnet-beta.solana.com', // Official (may have rate limits)
  'https://solana.public-rpc.com', // Public RPC
];

// Helper function to try multiple RPC endpoints
const getSolanaConnection = async (): Promise<Connection> => {
  for (const endpoint of SOLANA_RPC_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint, 'confirmed');
      // Test connection with a simple request
      await connection.getSlot();
      return connection;
    } catch (error) {
      console.warn(`Failed to connect to ${endpoint}, trying next...`, error);
      continue;
    }
  }
  // If all fail, return the first one anyway (will show error to user)
  return new Connection(SOLANA_RPC_ENDPOINTS[0], 'confirmed');
};

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    walletType: null,
    address: null,
    chain: null,
    chainId: null,
    balance: null,
    error: null,
  });

  // Load wallet state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('wallet-connection');
    if (saved) {
      try {
        const savedState = JSON.parse(saved);
        if (savedState.isConnected && savedState.address) {
          setWallet(savedState);
          // Reconnect to wallet
          reconnectWallet(savedState.walletType, savedState.chain);
        }
      } catch (e) {
        console.error('Failed to load saved wallet state:', e);
      }
    }
  }, []);

  const reconnectWallet = async (walletType: WalletType, chain?: ChainType) => {
    if (!walletType) return;

    try {
      if (walletType === 'phantom') {
        await connectPhantom();
      } else if (walletType === 'metamask' || walletType === 'trustwallet' || walletType === 'coinbase') {
        await connectEVMWallet(walletType, chain || 'ethereum');
      }
    } catch (error) {
      console.error('Failed to reconnect wallet:', error);
      setWallet(prev => ({ ...prev, isConnected: false, error: 'Failed to reconnect wallet' }));
    }
  };

  const connectEVMWallet = async (walletType: WalletType, chain: ChainType) => {
    // Handle multiple providers
    let provider = window.ethereum;
    
    // Debug: Log available providers
    console.log('Available ethereum provider:', window.ethereum);
    console.log('Provider properties:', {
      isMetaMask: window.ethereum?.isMetaMask,
      isTrust: window.ethereum?.isTrust,
      isCoinbaseWallet: window.ethereum?.isCoinbaseWallet,
      hasProviders: !!(window as any).ethereum?.providers,
    });
    
    // If multiple providers exist, find the right one
    if ((window as any).ethereum?.providers && Array.isArray((window as any).ethereum.providers)) {
      const providers = (window as any).ethereum.providers;
      console.log('Multiple providers found:', providers.length);
      
      if (walletType === 'metamask') {
        provider = providers.find((p: any) => p.isMetaMask && !p.isCoinbaseWallet) || providers.find((p: any) => p.isMetaMask) || providers[0];
      } else if (walletType === 'trustwallet') {
        provider = providers.find((p: any) => p.isTrust) || providers[0];
      } else if (walletType === 'coinbase') {
        provider = providers.find((p: any) => p.isCoinbaseWallet) || providers[0];
      } else {
        provider = providers[0];
      }
    }

    if (!provider) {
      const errorMsg = `${walletType === 'metamask' ? 'MetaMask' : walletType === 'trustwallet' ? 'Trust Wallet' : 'Coinbase Wallet'} is not installed. Please install the wallet extension and refresh the page.`;
      console.error('No provider found:', { walletType, hasEthereum: !!window.ethereum });
      throw new Error(errorMsg);
    }

    console.log('Using provider:', {
      isMetaMask: provider.isMetaMask,
      isTrust: provider.isTrust,
      isCoinbaseWallet: provider.isCoinbaseWallet,
    });

    // Verify the correct wallet is being used (if specific wallet requested)
    if (walletType === 'metamask' && !provider.isMetaMask) {
      console.warn('MetaMask not detected, using available wallet');
    }
    if (walletType === 'trustwallet' && !provider.isTrust && !(window as any).trustwallet) {
      console.warn('Trust Wallet not detected, using available wallet');
    }
    if (walletType === 'coinbase' && !provider.isCoinbaseWallet && !(window as any).coinbaseWalletExtension) {
      console.warn('Coinbase Wallet not detected, using available wallet');
    }

    try {
      // Request account access
      console.log('Requesting account access...');
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });

      console.log('Accounts received:', accounts);

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet and try again.');
      }

      const address = accounts[0] as Address;
      const chainId = await provider.request({ method: 'eth_chainId' });
      const chainIdNumber = parseInt(chainId as string, 16);

      // Get balance
      const selectedChain = evmChains[chain];
      if (!selectedChain) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      const publicClient = createPublicClient({
        chain: selectedChain,
        transport: http(),
      });

      const balance = await publicClient.getBalance({ address });
      const balanceFormatted = formatEther(balance);

      const newState: WalletState = {
        isConnected: true,
        walletType,
        address,
        chain,
        chainId: chainIdNumber,
        balance: balanceFormatted,
        error: null,
      };

      setWallet(newState);
      localStorage.setItem('wallet-connection', JSON.stringify(newState));

      // Listen for account changes
      provider.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          connectEVMWallet(walletType, chain);
        }
      });

      // Listen for chain changes
      provider.on('chainChanged', () => {
        connectEVMWallet(walletType, chain);
      });
    } catch (error: any) {
      console.error('Failed to connect EVM wallet:', error);
      setWallet(prev => ({
        ...prev,
        error: error.message || 'Failed to connect wallet',
      }));
      throw error;
    }
  };

  const connectPhantom = async () => {
    if (!window.solana || !window.solana.isPhantom) {
      throw new Error('Phantom wallet is not installed');
    }

    try {
      const resp = await window.solana.connect();
      const publicKey = resp.publicKey.toString();

      // Get balance with fallback RPC endpoints
      let balanceFormatted = '0.0000';
      try {
        const connection = await getSolanaConnection();
        const balance = await connection.getBalance(resp.publicKey);
        balanceFormatted = (balance / 1e9).toFixed(4); // Convert lamports to SOL
      } catch (balanceError: any) {
        console.warn('Failed to fetch balance, wallet still connected:', balanceError);
        // Continue without balance - wallet is still connected
      }

      const newState: WalletState = {
        isConnected: true,
        walletType: 'phantom',
        address: publicKey,
        chain: 'solana',
        chainId: null,
        balance: balanceFormatted,
        error: null,
      };

      setWallet(newState);
      localStorage.setItem('wallet-connection', JSON.stringify(newState));

      // Listen for disconnect
      window.solana.on('disconnect', () => {
        disconnectWallet();
      });
    } catch (error: any) {
      console.error('Failed to connect Phantom wallet:', error);
      setWallet(prev => ({
        ...prev,
        error: error.message || 'Failed to connect Phantom wallet',
      }));
      throw error;
    }
  };

  const connectWallet = useCallback(async (walletType: WalletType, chain: ChainType = 'ethereum') => {
    if (!walletType) {
      throw new Error('Wallet type is required');
    }

    setWallet(prev => ({ ...prev, error: null }));

    try {
      if (walletType === 'phantom') {
        await connectPhantom();
      } else if (walletType === 'metamask' || walletType === 'trustwallet' || walletType === 'coinbase') {
        await connectEVMWallet(walletType, chain);
      } else {
        throw new Error(`Unsupported wallet type: ${walletType}`);
      }
    } catch (error: any) {
      setWallet(prev => ({
        ...prev,
        error: error.message || 'Failed to connect wallet',
      }));
      throw error;
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet({
      isConnected: false,
      walletType: null,
      address: null,
      chain: null,
      chainId: null,
      balance: null,
      error: null,
    });
    localStorage.removeItem('wallet-connection');

    // Disconnect Phantom if connected
    if (window.solana && window.solana.isConnected) {
      window.solana.disconnect();
    }
  }, []);

  const switchChain = useCallback(async (chain: ChainType) => {
    if (!wallet.isConnected || !wallet.walletType) {
      throw new Error('Wallet not connected');
    }

    if (chain === 'solana') {
      throw new Error('Cannot switch to Solana from EVM wallet');
    }

    if (wallet.chain === chain) {
      return; // Already on this chain
    }

    try {
      const targetChain = evmChains[chain];
      if (!targetChain) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      // Try to switch chain
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChain.id.toString(16)}` }],
        });
      } catch (switchError: any) {
        // If chain doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${targetChain.id.toString(16)}`,
                chainName: targetChain.name,
                nativeCurrency: {
                  name: targetChain.nativeCurrency.name,
                  symbol: targetChain.nativeCurrency.symbol,
                  decimals: targetChain.nativeCurrency.decimals,
                },
                rpcUrls: [targetChain.rpcUrls.default.http[0]],
                blockExplorerUrls: targetChain.blockExplorers
                  ? [targetChain.blockExplorers.default.url]
                  : [],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      // Reconnect to get updated chain info
      await connectEVMWallet(wallet.walletType, chain);
    } catch (error: any) {
      console.error('Failed to switch chain:', error);
      setWallet(prev => ({
        ...prev,
        error: error.message || 'Failed to switch chain',
      }));
      throw error;
    }
  }, [wallet.isConnected, wallet.walletType, wallet.chain]);

  const refreshBalance = useCallback(async () => {
    if (!wallet.isConnected || !wallet.address) return;

    try {
      if (wallet.chain === 'solana') {
        try {
          const connection = await getSolanaConnection();
          const publicKey = new PublicKey(wallet.address);
          const balance = await connection.getBalance(publicKey);
          const balanceFormatted = (balance / 1e9).toFixed(4);
          setWallet(prev => ({ ...prev, balance: balanceFormatted, error: null }));
        } catch (error: any) {
          console.warn('Failed to refresh Solana balance:', error);
          // Don't set error state, just keep existing balance
          setWallet(prev => ({ ...prev, error: null }));
        }
      } else {
        const selectedChain = wallet.chain ? evmChains[wallet.chain] : null;
        if (!selectedChain) return;

        const publicClient = createPublicClient({
          chain: selectedChain,
          transport: http(),
        });

        const balance = await publicClient.getBalance({ address: wallet.address as Address });
        const balanceFormatted = formatEther(balance);
        setWallet(prev => ({ ...prev, balance: balanceFormatted, error: null }));
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      // Don't show error to user, just log it
    }
  }, [wallet.isConnected, wallet.address, wallet.chain]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connectWallet,
        disconnectWallet,
        switchChain,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Extend Window interface for wallet providers
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (args: any) => void) => void;
      removeListener: (event: string, callback: (args: any) => void) => void;
      isMetaMask?: boolean;
      isTrust?: boolean;
      isCoinbaseWallet?: boolean;
      providers?: Array<{
        request: (args: { method: string; params?: any[] }) => Promise<any>;
        on: (event: string, callback: (args: any) => void) => void;
        removeListener: (event: string, callback: (args: any) => void) => void;
        isMetaMask?: boolean;
        isTrust?: boolean;
        isCoinbaseWallet?: boolean;
      }>;
    };
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: PublicKey }>;
      disconnect: () => Promise<void>;
      on: (event: string, callback: () => void) => void;
      isConnected: boolean;
      publicKey: PublicKey | null;
    };
    trustwallet?: any;
    coinbaseWalletExtension?: any;
  }
}


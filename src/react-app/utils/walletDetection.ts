import { WalletType } from '../contexts/WalletContext';

export interface DetectedWallet {
  type: WalletType;
  name: string;
  icon: string;
  installed: boolean;
}

/**
 * Detects which wallets are installed in the browser
 */
export function detectInstalledWallets(): DetectedWallet[] {
  const wallets: DetectedWallet[] = [];

  if (typeof window === 'undefined') {
    return wallets;
  }

  // Check for multiple ethereum providers (some users have multiple wallets)
  let ethereumProviders: any[] = [];
  
  if (window.ethereum) {
    // Check if providers array exists (EIP-6963 or multiple wallets)
    if (Array.isArray((window as any).ethereum.providers)) {
      ethereumProviders = (window as any).ethereum.providers;
    } else {
      // Single provider
      ethereumProviders = [window.ethereum];
    }
  }

  // Check each provider
  const detectedTypes = new Set<string>();

  for (const provider of ethereumProviders) {
    // MetaMask detection - check isMetaMask first, then exclude Coinbase
    if (provider.isMetaMask) {
      // Coinbase Wallet also sets isMetaMask to true, so we need to check both
      if (!provider.isCoinbaseWallet && !detectedTypes.has('metamask')) {
        wallets.push({
          type: 'metamask',
          name: 'MetaMask',
          icon: '🦊',
          installed: true,
        });
        detectedTypes.add('metamask');
      }
    }

    // Trust Wallet detection
    if (provider.isTrust && !detectedTypes.has('trustwallet')) {
      wallets.push({
        type: 'trustwallet',
        name: 'Trust Wallet',
        icon: '🔒',
        installed: true,
      });
      detectedTypes.add('trustwallet');
    }

    // Coinbase Wallet detection
    if (provider.isCoinbaseWallet && !detectedTypes.has('coinbase')) {
      wallets.push({
        type: 'coinbase',
        name: 'Coinbase Wallet',
        icon: '🔵',
        installed: true,
      });
      detectedTypes.add('coinbase');
    }
  }

  // Also check global wallet objects
  if ((window as any).trustwallet && !detectedTypes.has('trustwallet')) {
    wallets.push({
      type: 'trustwallet',
      name: 'Trust Wallet',
      icon: '🔒',
      installed: true,
    });
    detectedTypes.add('trustwallet');
  }

  if ((window as any).coinbaseWalletExtension && !detectedTypes.has('coinbase')) {
    wallets.push({
      type: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '🔵',
      installed: true,
    });
    detectedTypes.add('coinbase');
  }

  // If we have ethereum but no specific wallet detected, show as generic
  if (window.ethereum && wallets.filter(w => w.type !== 'phantom').length === 0) {
    wallets.push({
      type: 'metamask', // Default to MetaMask for generic EVM wallets
      name: 'EVM Wallet',
      icon: '💼',
      installed: true,
    });
  }

  // Show wallets as not installed if not detected
  if (!detectedTypes.has('metamask') && !window.ethereum) {
    wallets.push({
      type: 'metamask',
      name: 'MetaMask',
      icon: '🦊',
      installed: false,
    });
  }
  if (!detectedTypes.has('trustwallet') && !window.ethereum) {
    wallets.push({
      type: 'trustwallet',
      name: 'Trust Wallet',
      icon: '🔒',
      installed: false,
    });
  }
  if (!detectedTypes.has('coinbase') && !window.ethereum) {
    wallets.push({
      type: 'coinbase',
      name: 'Coinbase Wallet',
      icon: '🔵',
      installed: false,
    });
  }

  // Check for Phantom
  if (window.solana && window.solana.isPhantom) {
    wallets.push({
      type: 'phantom',
      name: 'Phantom',
      icon: '👻',
      installed: true,
    });
  } else {
    wallets.push({
      type: 'phantom',
      name: 'Phantom',
      icon: '👻',
      installed: false,
    });
  }

  return wallets;
}

/**
 * Gets the appropriate wallet type based on what's detected
 */
export function getWalletType(): WalletType | null {
  if (typeof window === 'undefined') return null;

  if (window.ethereum) {
    if (window.ethereum.isMetaMask && !window.ethereum.isCoinbaseWallet) {
      return 'metamask';
    }
    if (window.ethereum.isTrust || (window as any).trustwallet) {
      return 'trustwallet';
    }
    if (window.ethereum.isCoinbaseWallet || (window as any).coinbaseWalletExtension) {
      return 'coinbase';
    }
    // Generic EVM wallet
    return 'metamask';
  }

  if (window.solana && window.solana.isPhantom) {
    return 'phantom';
  }

  return null;
}


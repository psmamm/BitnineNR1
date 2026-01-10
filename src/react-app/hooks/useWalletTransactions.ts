import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { createPublicClient, http, type Address } from 'viem';
import { mainnet, bsc, polygon, arbitrum, optimism, avalanche } from 'viem/chains';
import { Connection, PublicKey } from '@solana/web3.js';
import { Trade } from './useTrades';

// EVM Chain configurations
const evmChains: Record<string, any> = {
  ethereum: mainnet,
  bsc: bsc,
  polygon: polygon,
  arbitrum: arbitrum,
  optimism: optimism,
  avalanche: avalanche,
};

// Solana RPC endpoints with fallbacks
const SOLANA_RPC_ENDPOINTS = [
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
  'https://api.mainnet-beta.solana.com',
  'https://solana.public-rpc.com',
];

// Helper function to try multiple RPC endpoints
const getSolanaConnection = async (): Promise<Connection> => {
  for (const endpoint of SOLANA_RPC_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint, 'confirmed');
      // Test connection
      await connection.getSlot();
      return connection;
    } catch (error) {
      console.warn(`Failed to connect to ${endpoint}, trying next...`, error);
      continue;
    }
  }
  // If all fail, return the first one anyway
  return new Connection(SOLANA_RPC_ENDPOINTS[0], 'confirmed');
};

// Popular DEX addresses for EVM chains
const DEX_ADDRESSES: Record<string, string[]> = {
  ethereum: [
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
    '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F', // SushiSwap Router
  ],
  bsc: [
    '0x10ED43C718714eb63d5aA57B78B54704E256024E', // PancakeSwap Router
  ],
  polygon: [
    '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff', // QuickSwap Router
  ],
  arbitrum: [
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
  ],
  optimism: [
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
  ],
  avalanche: [
    '0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106', // Pangolin Router
  ],
};

interface BlockchainTransaction {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  tokenSymbol?: string;
  tokenAmount?: string;
  type: 'swap' | 'transfer' | 'approval' | 'other';
  chain: string;
}

export function useWalletTransactions() {
  const { wallet } = useWallet();
  const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEVMTransactions = useCallback(async (address: string, chain: string) => {
    try {
      const selectedChain = evmChains[chain];
      if (!selectedChain) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      const publicClient = createPublicClient({
        chain: selectedChain,
        transport: http(),
      });

      // Get transaction count to determine how many to fetch
      const transactionCount = await publicClient.getTransactionCount({ address: address as Address });
      const limit = Math.min(100, transactionCount); // Fetch last 100 transactions

      // Fetch transactions from block explorer API (using Etherscan-like APIs)
      // For now, we'll use a simplified approach - fetch from the last 1000 blocks
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(1000);

      // Get logs for DEX interactions
      const dexAddresses = DEX_ADDRESSES[chain] || [];
      const allLogs = [];

      for (const dexAddress of dexAddresses) {
        try {
          const logs = await publicClient.getLogs({
            address: dexAddress as Address,
            fromBlock,
            toBlock: currentBlock,
          });
          allLogs.push(...logs);
        } catch (e) {
          console.error(`Failed to fetch logs from ${dexAddress}:`, e);
        }
      }

      // Filter logs related to user's address
      const userLogs = allLogs.filter((log) => {
        // This is simplified - in reality, you'd need to decode the logs
        return log.topics.some((topic) => topic.toLowerCase().includes(address.toLowerCase().slice(2)));
      });

      // Convert logs to transactions (simplified)
      const txList: BlockchainTransaction[] = userLogs.map((log) => ({
        hash: log.transactionHash,
        timestamp: Date.now(), // Would need to fetch block timestamp
        from: address,
        to: log.address,
        value: '0',
        type: 'swap',
        chain,
      }));

      setTransactions(txList);
      return txList;
    } catch (error: any) {
      console.error('Failed to fetch EVM transactions:', error);
      setError(error.message || 'Failed to fetch transactions');
      return [];
    }
  }, []);

  const fetchSolanaTransactions = useCallback(async (address: string) => {
    try {
      const connection = await getSolanaConnection();
      const publicKey = new PublicKey(address);

      // Fetch recent transactions
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 100 });

      const txList: BlockchainTransaction[] = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await connection.getTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0,
            });

            return {
              hash: sig.signature,
              timestamp: sig.blockTime ? sig.blockTime * 1000 : Date.now(),
              from: address,
              to: tx?.transaction.message.accountKeys[1]?.toString() || '',
              value: '0',
              type: 'swap',
              chain: 'solana',
            };
          } catch (e) {
            return null;
          }
        })
      );

      const validTxs = txList.filter((tx): tx is BlockchainTransaction => tx !== null);
      setTransactions(validTxs);
      return validTxs;
    } catch (error: any) {
      console.error('Failed to fetch Solana transactions:', error);
      setError(error.message || 'Failed to fetch Solana transactions');
      return [];
    }
  }, []);

  const convertTransactionsToTrades = useCallback((txs: BlockchainTransaction[]): Trade[] => {
    // Convert blockchain transactions to trade format
    // This is a simplified conversion - in reality, you'd need to:
    // 1. Decode DEX swap events to get token pairs and amounts
    // 2. Calculate entry/exit prices
    // 3. Determine direction (long/short based on token flow)

    return txs
      .filter((tx) => tx.type === 'swap')
      .map((tx, index) => {
        // Simplified trade conversion
        // In production, you'd decode the actual swap data
        const entryDate = new Date(tx.timestamp).toISOString().split('T')[0];
        const isClosed = Math.random() > 0.5; // Random for demo - would be based on actual data

        return {
          id: Date.now() + index,
          symbol: 'ETH/USDT', // Would be determined from swap data
          asset_type: 'crypto' as const,
          direction: Math.random() > 0.5 ? 'long' : 'short',
          quantity: parseFloat(tx.tokenAmount || '0'),
          entry_price: Math.random() * 3000 + 2000, // Would be from actual swap data
          exit_price: isClosed ? Math.random() * 3000 + 2000 : undefined,
          entry_date: entryDate,
          exit_date: isClosed ? entryDate : undefined,
          pnl: isClosed ? (Math.random() - 0.5) * 1000 : undefined,
          commission: 0.001,
          is_closed: isClosed,
          created_at: new Date(tx.timestamp).toISOString(),
          updated_at: new Date(tx.timestamp).toISOString(),
          source: 'wallet' as const,
          notes: `Blockchain transaction: ${tx.hash.slice(0, 10)}...`,
          tags: `wallet,${tx.chain}`,
        } as Trade;
      });
  }, []);

  const fetchTransactions = useCallback(async () => {
    if (!wallet.isConnected || !wallet.address) {
      setTransactions([]);
      setTrades([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let txs: BlockchainTransaction[] = [];

      if (wallet.chain === 'solana') {
        txs = await fetchSolanaTransactions(wallet.address);
      } else if (wallet.chain) {
        txs = await fetchEVMTransactions(wallet.address, wallet.chain);
      }

      // Convert transactions to trades
      const convertedTrades = convertTransactionsToTrades(txs);
      setTrades(convertedTrades);
    } catch (error: any) {
      console.error('Failed to fetch wallet transactions:', error);
      setError(error.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [wallet.isConnected, wallet.address, wallet.chain, fetchEVMTransactions, fetchSolanaTransactions, convertTransactionsToTrades]);

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      fetchTransactions();
    } else {
      setTransactions([]);
      setTrades([]);
    }
  }, [wallet.isConnected, wallet.address, wallet.chain, fetchTransactions]);

  return {
    transactions,
    trades,
    loading,
    error,
    refetch: fetchTransactions,
  };
}

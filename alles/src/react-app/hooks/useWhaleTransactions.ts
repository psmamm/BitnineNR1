import { useState, useEffect, useCallback } from 'react';

export interface WhaleTransaction {
  id: string;
  timestamp: Date;
  coin: string;
  amount: number;
  usdValue: number;
  transferType: 'wallet_to_exchange' | 'exchange_to_wallet' | 'whale_to_whale';
  hash: string;
  fromAddress?: string;
  toAddress?: string;
  blockchainExplorerUrl: string;
  chain: string;
}

export function useWhaleTransactions() {
  const [transactions, setTransactions] = useState<WhaleTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWhaleTransactions = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      console.log('🐋 Fetching real whale transactions from Explorer APIs...');
      
      const response = await fetch('/api/whale-transactions');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.transactions && Array.isArray(data.transactions)) {
        // Convert timestamp strings back to Date objects
        const processedTransactions = data.transactions.map((tx: any) => ({
          ...tx,
          timestamp: new Date(tx.timestamp)
        }));
        
        setTransactions(processedTransactions);
        console.log(`✅ Got ${processedTransactions.length} real whale transactions`);
        
        if (processedTransactions.length === 0) {
          setError(data.message || '🐋 No whale moves >$100K in the last hour');
        }
      } else {
        console.log('⚠️ No whale transactions found');
        setTransactions([]);
        setError(data.message || data.error || 'No whale transactions found');
      }
      
    } catch (err) {
      console.error('❌ Failed to fetch whale transactions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch whale data';
      setError(errorMessage);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWhaleTransactions();
    
    // Refresh every 5 minutes for better performance
    const interval = setInterval(fetchWhaleTransactions, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchWhaleTransactions]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchWhaleTransactions
  };
}

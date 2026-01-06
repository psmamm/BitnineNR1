/**
 * SBT (Soulbound Token) Hook
 * 
 * Fetches and displays SBT badges from Polygon network.
 * Integrates with TradeCircle SBT contract (ERC-5192).
 */

import { useState, useEffect } from 'react';
import { createPublicClient, http, type Address } from 'viem';
import { polygon } from 'viem/chains';
import { buildApiUrl } from './useApi';

export interface TraderBadge {
  achievement: string;
  timestamp: number;
  maxDrawdown: number;      // Basis Points (10000 = 100%)
  profitFactor: number;     // Scaled (10000 = 1.00)
  rMultiple: number;        // Scaled (10000 = 1.00)
  verified: boolean;
}

export interface SBTData {
  hasToken: boolean;
  tokenId?: string;
  badges: TraderBadge[];
  userAddress?: string;
}

const SBT_ABI = [
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'hasToken',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getTokenId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getBadges',
    outputs: [
      {
        components: [
          { name: 'achievement', type: 'string' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'maxDrawdown', type: 'uint256' },
          { name: 'profitFactor', type: 'uint256' },
          { name: 'rMultiple', type: 'uint256' },
          { name: 'verified', type: 'bool' }
        ],
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

export function useSBT(userAddress?: string) {
  const [sbtData, setSbtData] = useState<SBTData>({
    hasToken: false,
    badges: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userAddress) {
      fetchSBTData(userAddress);
    }
  }, [userAddress]);

  const fetchSBTData = async (address: string) => {
    setLoading(true);
    setError(null);

    try {
      // First, try to fetch from our API (which queries the blockchain)
      const response = await fetch(buildApiUrl(`/api/sbt/badges/${address}`), {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSbtData({
          hasToken: data.hasToken,
          tokenId: data.tokenId,
          badges: data.badges || [],
          userAddress: address
        });
      } else {
        // Fallback: query blockchain directly if API fails
        await fetchFromBlockchain(address);
      }
    } catch (err) {
      console.error('Failed to fetch SBT data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch SBT data');
      
      // Try blockchain fallback
      if (userAddress) {
        await fetchFromBlockchain(userAddress);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFromBlockchain = async (address: string) => {
    try {
      const contractAddress = import.meta.env.VITE_SBT_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('SBT contract address not configured');
      }

      const publicClient = createPublicClient({
        chain: polygon,
        transport: http(import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-rpc.com')
      });

      // Check if user has token
      const hasToken = await publicClient.readContract({
        address: contractAddress as Address,
        abi: SBT_ABI,
        functionName: 'hasToken',
        args: [address as Address]
      });

      if (!hasToken) {
        setSbtData({
          hasToken: false,
          badges: [],
          userAddress: address
        });
        return;
      }

      // Get token ID
      const tokenId = await publicClient.readContract({
        address: contractAddress as Address,
        abi: SBT_ABI,
        functionName: 'getTokenId',
        args: [address as Address]
      });

      // Get badges (if contract supports getBadges)
      try {
        const badgeData = await publicClient.readContract({
          address: contractAddress as Address,
          abi: SBT_ABI,
          functionName: 'getBadges',
          args: [address as Address]
        });

        setSbtData({
          hasToken: true,
          tokenId: tokenId.toString(),
          badges: [badgeData as any], // Type assertion for tuple
          userAddress: address
        });
      } catch {
        // If getBadges not available, just set hasToken
        setSbtData({
          hasToken: true,
          tokenId: tokenId.toString(),
          badges: [],
          userAddress: address
        });
      }
    } catch (err) {
      console.error('Blockchain fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch from blockchain');
    }
  };

  return {
    sbtData,
    loading,
    error,
    refetch: () => userAddress && fetchSBTData(userAddress)
  };
}

/**
 * Format badge metrics for display
 */
export function formatBadgeMetrics(badge: TraderBadge) {
  return {
    maxDrawdown: `${(badge.maxDrawdown / 100).toFixed(2)}%`,
    profitFactor: (badge.profitFactor / 10000).toFixed(2),
    rMultiple: (badge.rMultiple / 10000).toFixed(2)
  };
}

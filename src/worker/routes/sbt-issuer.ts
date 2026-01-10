/**
 * SBT Issuer API Routes
 * 
 * Handles badge minting for TradeCircle SBT (ERC-5192) on Polygon.
 * Only the TradeCircle validation node can mint badges.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { createPublicClient, http, createWalletClient, custom } from 'viem';
import { polygon } from 'viem/chains';

// SBT Contract ABI (simplified - full ABI would be imported)
const SBT_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'achievement', type: 'string' },
      { name: 'maxDrawdown', type: 'uint256' },
      { name: 'profitFactor', type: 'uint256' },
      { name: 'rMultiple', type: 'uint256' }
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'achievement', type: 'string' },
      { name: 'maxDrawdown', type: 'uint256' },
      { name: 'profitFactor', type: 'uint256' },
      { name: 'rMultiple', type: 'uint256' }
    ],
    name: 'addBadge',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
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
  }
] as const;

const MintBadgeSchema = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  achievement: z.string().min(1),
  maxDrawdown: z.number().int().min(0).max(10000), // Basis points (0-10000)
  profitFactor: z.number().int().min(0), // Scaled (10000 = 1.00)
  rMultiple: z.number().int().min(0) // Scaled (10000 = 1.00)
});

export const sbtIssuerRouter = new Hono<{
  Bindings: {
    DB: D1Database;
    ISSUER_PRIVATE_KEY: string;
    SBT_CONTRACT_ADDRESS: string;
    POLYGON_RPC_URL: string;
  };
}>();

// Middleware to check issuer authorization
// In production, this would verify the request comes from the issuer node
const issuerAuth = async (c: any, next: any) => {
  // TODO: Implement proper issuer authentication
  // For now, we'll use environment variable check
  if (!c.env.ISSUER_PRIVATE_KEY) {
    return c.json({ error: 'Issuer not configured' }, 500);
  }
  await next();
};

/**
 * POST /api/sbt/mint
 * Mint a new SBT badge for a user
 */
sbtIssuerRouter.post(
  '/mint',
  issuerAuth,
  zValidator('json', MintBadgeSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
      
      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const data = c.req.valid('json');
      const { userAddress, achievement, maxDrawdown, profitFactor, rMultiple } = data;

      // Validate contract address
      if (!c.env.SBT_CONTRACT_ADDRESS) {
        return c.json({ error: 'SBT contract not configured' }, 500);
      }

      // Setup Polygon client
      const publicClient = createPublicClient({
        chain: polygon,
        transport: http(c.env.POLYGON_RPC_URL || 'https://polygon-rpc.com')
      });

      // Create wallet client from issuer private key
      const issuerAccount = c.env.ISSUER_PRIVATE_KEY.startsWith('0x')
        ? c.env.ISSUER_PRIVATE_KEY
        : `0x${c.env.ISSUER_PRIVATE_KEY}`;

      // Check if user already has a token
      const hasToken = await publicClient.readContract({
        address: c.env.SBT_CONTRACT_ADDRESS as `0x${string}`,
        abi: SBT_ABI,
        functionName: 'hasToken',
        args: [userAddress as `0x${string}`]
      });

      // For now, we'll use a server-side wallet client
      // In production, you'd use a proper wallet client with the issuer key
      // This is a simplified version - full implementation would use ethers.js or viem wallet client
      
      // Log the mint request (actual minting would happen here)
      console.log('SBT Mint Request:', {
        userAddress,
        achievement,
        maxDrawdown,
        profitFactor,
        rMultiple,
        hasToken
      });

      // Store badge request in database
      await c.env.DB.prepare(`
        INSERT INTO sbt_badges (user_id, user_address, achievement, max_drawdown, profit_factor, r_multiple, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
      `).bind(
        userId,
        userAddress,
        achievement,
        maxDrawdown,
        profitFactor,
        rMultiple
      ).run();

      return c.json({
        success: true,
        message: 'Badge mint request submitted',
        userAddress,
        achievement,
        hasToken
      });
    } catch (error) {
      console.error('SBT mint error:', error);
      return c.json({ 
        error: 'Failed to mint badge',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  }
);

/**
 * GET /api/sbt/badges/:address
 * Get all badges for a user address
 */
sbtIssuerRouter.get('/badges/:address', async (c) => {
  try {
    const address = c.req.param('address');
    
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return c.json({ error: 'Invalid address format' }, 400);
    }

    if (!c.env.SBT_CONTRACT_ADDRESS) {
      return c.json({ error: 'SBT contract not configured' }, 500);
    }

    // Setup Polygon client
    const publicClient = createPublicClient({
      chain: polygon,
      transport: http(c.env.POLYGON_RPC_URL || 'https://polygon-rpc.com')
    });

    // Check if user has token
    const hasToken = await publicClient.readContract({
      address: c.env.SBT_CONTRACT_ADDRESS as `0x${string}`,
      abi: SBT_ABI,
      functionName: 'hasToken',
      args: [address as `0x${string}`]
    });

    if (!hasToken) {
      return c.json({ badges: [], hasToken: false });
    }

    // Get token ID
    const tokenId = await publicClient.readContract({
      address: c.env.SBT_CONTRACT_ADDRESS as `0x${string}`,
      abi: SBT_ABI,
      functionName: 'getTokenId',
      args: [address as `0x${string}`]
    });

    // Get badge data (simplified - would need getBadge function)
    const badges = await c.env.DB.prepare(`
      SELECT achievement, max_drawdown, profit_factor, r_multiple, created_at, status
      FROM sbt_badges
      WHERE user_address = ? AND status = 'minted'
      ORDER BY created_at DESC
    `).bind(address).all();

    return c.json({
      hasToken: true,
      tokenId: tokenId.toString(),
      badges: badges.results || []
    });
  } catch (error) {
    console.error('Get badges error:', error);
    return c.json({ 
      error: 'Failed to fetch badges',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});
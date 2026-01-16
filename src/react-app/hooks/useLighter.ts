/**
 * useLighter Hook
 *
 * Central state management for all Lighter DEX data.
 * Combines balance, positions, orders, and market data into one unified hook.
 *
 * Features:
 * - Centralized Lighter state
 * - Real-time WebSocket updates
 * - Order placement and management
 * - Position tracking with P&L
 * - Market data subscriptions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLighterBalance, type LighterAccountInfo } from './useLighterBalance';
import { useLighterPositions, type LighterPosition } from './useLighterPositions';
import { useLighterOrders, type LighterOrder, type PlaceOrderParams } from './useLighterOrders';
import { useLighterOrderbook } from './useLighterOrderbook';
import type { OrderbookLevel } from '../types/terminal';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

// Error message mappings for user-friendly display
export const LIGHTER_ERROR_MESSAGES: Record<string, string> = {
  insufficient_balance: '💸 Insufficient balance. Deposit more USDC to trade.',
  order_rejected: '❌ Order rejected. Check your position size and leverage.',
  invalid_symbol: '🔍 Trading pair not found. Check the symbol.',
  rate_limit: '⏱️ Too many requests. Please wait a moment.',
  network_error: '🌐 Network error. Check your connection.',
  wrong_network: '🔗 Please switch to Arbitrum network.',
  wallet_not_connected: '🦊 Please connect your wallet first.',
  liquidation_risk: '⚠️ Position at risk! Close or add margin.',
  api_key_error: '🔑 API key error. Please reconnect your account.',
  min_order_size: '📏 Order size below minimum. Increase size.',
  max_leverage: '⚡ Leverage exceeds maximum. Reduce leverage.',
  position_not_found: '📊 Position not found.',
  order_not_found: '📋 Order not found.',
  market_closed: '🚫 Market is currently closed.',
  invalid_price: '💵 Invalid price. Check your order price.',
  invalid_size: '📐 Invalid size. Check your order size.',
  connection_failed: '🔌 Failed to connect to Lighter DEX.',
  timeout: '⏰ Request timed out. Please try again.',
  unknown_error: '❓ An unexpected error occurred. Please try again.',
};

export interface LighterMarket {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  minOrderSize: number;
  maxLeverage: number;
  tickSize: number;
  lotSize: number;
  makerFee: number;
  takerFee: number;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface LighterTicker {
  symbol: string;
  lastPrice: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  timestamp: number;
}

export interface LighterOrderbook {
  symbol: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  spread: number;
  spreadPercent: number;
  timestamp: number;
}

export interface LighterState {
  // Connection
  isConnected: boolean;
  isLoading: boolean;
  needsSetup: boolean;
  account: LighterAccountInfo | null;

  // Balances
  balance: number;
  marginUsed: number;
  availableBalance: number;
  unrealizedPnl: number;

  // Positions
  positions: LighterPosition[];
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;

  // Orders
  activeOrders: LighterOrder[];
  orderHistory: LighterOrder[];

  // Market Data
  markets: LighterMarket[];
  selectedSymbol: string;
  currentPrice: number;
  orderbook: LighterOrderbook | null;
  ticker: LighterTicker | null;

  // Error state
  error: string | null;
}

export interface UseLighterResult {
  state: LighterState;

  // Actions
  setSelectedSymbol: (symbol: string) => void;
  placeOrder: (params: PlaceOrderParams) => Promise<LighterOrder>;
  cancelOrder: (orderId: string, symbol?: string) => Promise<void>;
  cancelAllOrders: (symbol?: string) => Promise<void>;
  closePosition: (symbol: string) => Promise<void>;

  // Refresh
  refreshAll: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  refreshPositions: () => Promise<void>;
  refreshOrders: () => Promise<void>;

  // Utilities
  getErrorMessage: (errorCode: string) => string;
  formatPrice: (price: number) => string;
  formatSize: (size: number) => string;
  formatPnl: (pnl: number) => { value: string; isPositive: boolean };
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export function useLighter(initialSymbol: string = 'BTC-USD'): UseLighterResult {
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const [markets, setMarkets] = useState<LighterMarket[]>([]);
  const [ticker, setTicker] = useState<LighterTicker | null>(null);
  const [marketsLoading, setMarketsLoading] = useState(false);

  const { lighter } = useWallet();
  const { user } = useAuth();

  // Use individual hooks
  const {
    account,
    isLoading: balanceLoading,
    error: balanceError,
    isConnected,
    needsSetup,
    refetch: refetchBalance,
  } = useLighterBalance();

  const {
    positions,
    isLoading: positionsLoading,
    error: positionsError,
    refetch: refetchPositions,
  } = useLighterPositions();

  const {
    orders: activeOrders,
    isLoading: ordersLoading,
    error: ordersError,
    placeOrder,
    cancelOrder,
    cancelAllOrders,
    refetch: refetchOrders,
  } = useLighterOrders(selectedSymbol);

  const {
    orderbook: rawOrderbook,
    isLoading: orderbookLoading,
    error: orderbookError,
  } = useLighterOrderbook(selectedSymbol);

  // Extract orderbook data
  const bids = rawOrderbook?.bids || [];
  const asks = rawOrderbook?.asks || [];
  const spread = rawOrderbook ? (asks[0]?.price || 0) - (bids[0]?.price || 0) : 0;
  const midPrice = rawOrderbook && bids[0] && asks[0] ? (bids[0].price + asks[0].price) / 2 : 0;

  // Fetch markets
  const fetchMarkets = useCallback(async () => {
    try {
      setMarketsLoading(true);
      const response = await fetch(`${API_BASE}/api/lighter/markets`);

      if (!response.ok) {
        throw new Error('Failed to fetch markets');
      }

      const data = await response.json();

      if (data.success && data.markets) {
        setMarkets(data.markets);
      }
    } catch (err) {
      logger.error('Error fetching Lighter markets:', err);
    } finally {
      setMarketsLoading(false);
    }
  }, []);

  // Fetch ticker for selected symbol
  const fetchTicker = useCallback(async () => {
    if (!selectedSymbol) return;

    try {
      const response = await fetch(`${API_BASE}/api/lighter/ticker/${selectedSymbol}`);

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (data.success && data.ticker) {
        setTicker({
          symbol: data.ticker.symbol,
          lastPrice: data.ticker.last_price,
          change24h: data.ticker.change_24h,
          changePercent24h: data.ticker.change_percent_24h,
          high24h: data.ticker.high_24h,
          low24h: data.ticker.low_24h,
          volume24h: data.ticker.volume_24h,
          quoteVolume24h: data.ticker.quote_volume_24h,
          timestamp: data.ticker.timestamp,
        });
      }
    } catch (err) {
      logger.error('Error fetching ticker:', err);
    }
  }, [selectedSymbol]);

  // Close position
  const closePosition = useCallback(async (symbol: string) => {
    if (!user) {
      throw new Error('Must be logged in');
    }

    const token = await user.getIdToken();
    const response = await fetch(`${API_BASE}/api/lighter/close-position`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ symbol }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to close position');
    }

    // Refresh positions after closing
    await refetchPositions();
  }, [user, refetchPositions]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      refetchBalance(),
      refetchPositions(),
      refetchOrders(),
      fetchTicker(),
    ]);
  }, [refetchBalance, refetchPositions, refetchOrders, fetchTicker]);

  // Calculate derived values
  const totalUnrealizedPnl = useMemo(() => {
    return positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
  }, [positions]);

  const totalRealizedPnl = useMemo(() => {
    return positions.reduce((sum, pos) => sum + pos.realizedPnl, 0);
  }, [positions]);

  // Build orderbook object
  const orderbook: LighterOrderbook | null = useMemo(() => {
    if (bids.length === 0 && asks.length === 0) return null;

    return {
      symbol: selectedSymbol,
      bids,
      asks,
      spread,
      spreadPercent: midPrice > 0 ? (spread / midPrice) * 100 : 0,
      timestamp: Date.now(),
    };
  }, [selectedSymbol, bids, asks, spread, midPrice]);

  // Get user-friendly error message
  const getErrorMessage = useCallback((errorCode: string): string => {
    const normalized = errorCode.toLowerCase().replace(/\s+/g, '_');
    return LIGHTER_ERROR_MESSAGES[normalized] || LIGHTER_ERROR_MESSAGES.unknown_error;
  }, []);

  // Format price with proper decimals
  const formatPrice = useCallback((price: number): string => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else if (price >= 1) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });
    } else {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 8,
      });
    }
  }, []);

  // Format size
  const formatSize = useCallback((size: number): string => {
    if (size >= 1) {
      return size.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      });
    } else {
      return size.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 8,
      });
    }
  }, []);

  // Format P&L with color indicator
  const formatPnl = useCallback((pnl: number): { value: string; isPositive: boolean } => {
    const isPositive = pnl >= 0;
    const formatted = `${isPositive ? '+' : ''}$${Math.abs(pnl).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    return { value: formatted, isPositive };
  }, []);

  // Initialize markets on mount
  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  // Fetch ticker when symbol changes
  useEffect(() => {
    fetchTicker();

    // Refresh ticker every 5 seconds
    const interval = setInterval(fetchTicker, 5000);
    return () => clearInterval(interval);
  }, [fetchTicker]);

  // Combine all errors
  const combinedError = balanceError || positionsError || ordersError || orderbookError;

  // Build combined state
  const state: LighterState = {
    // Connection
    isConnected: isConnected && lighter.isConnected,
    isLoading: balanceLoading || positionsLoading || ordersLoading || orderbookLoading || marketsLoading,
    needsSetup,
    account,

    // Balances
    balance: account?.totalValue || 0,
    marginUsed: account?.usedMargin || 0,
    availableBalance: account?.availableMargin || 0,
    unrealizedPnl: totalUnrealizedPnl,

    // Positions
    positions,
    totalUnrealizedPnl,
    totalRealizedPnl,

    // Orders
    activeOrders,
    orderHistory: [], // Will be fetched separately if needed

    // Market Data
    markets,
    selectedSymbol,
    currentPrice: ticker?.lastPrice || midPrice || 0,
    orderbook,
    ticker,

    // Error
    error: combinedError,
  };

  return {
    state,
    setSelectedSymbol,
    placeOrder,
    cancelOrder,
    cancelAllOrders,
    closePosition,
    refreshAll,
    refreshBalance: refetchBalance,
    refreshPositions: refetchPositions,
    refreshOrders: refetchOrders,
    getErrorMessage,
    formatPrice,
    formatSize,
    formatPnl,
  };
}

export default useLighter;

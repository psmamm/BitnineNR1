/**
 * Hyperliquid Broker Adapter
 *
 * Implementation of IBroker for Hyperliquid DEX.
 * Supports perpetual futures trading on the Hyperliquid orderbook DEX.
 */

import { BaseBroker } from '../IBroker';
import {
  BrokerMetadata,
  BrokerCredentials,
  BrokerAccount,
  Balance,
  Trade,
  Position,
  Order,
  Symbol,
  Ticker,
  SyncOptions,
  SyncResult,
  ConnectionTestResult,
  BrokerError,
  BrokerErrorCodes,
} from '../types';

// ============================================================================
// Hyperliquid API Types
// ============================================================================

interface HyperliquidUserState {
  assetPositions: HyperliquidAssetPosition[];
  crossMarginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  marginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  withdrawable: string;
}

interface HyperliquidAssetPosition {
  position: {
    coin: string;
    entryPx: string;
    leverage: {
      type: string;
      value: number;
    };
    liquidationPx: string | null;
    marginUsed: string;
    positionValue: string;
    returnOnEquity: string;
    szi: string;
    unrealizedPnl: string;
  };
  type: string;
}

interface HyperliquidFill {
  coin: string;
  px: string;
  sz: string;
  side: string;
  time: number;
  startPosition: string;
  dir: string;
  closedPnl: string;
  hash: string;
  oid: number;
  crossed: boolean;
  fee: string;
  tid: number;
}

interface HyperliquidMeta {
  universe: Array<{
    name: string;
    szDecimals: number;
    maxLeverage: number;
    onlyIsolated: boolean;
  }>;
}

interface HyperliquidAllMids {
  [coin: string]: string;
}

// ============================================================================
// Adapter Implementation
// ============================================================================

export class HyperliquidAdapter extends BaseBroker {
  readonly metadata: BrokerMetadata = {
    id: 'hyperliquid',
    name: 'hyperliquid',
    displayName: 'Hyperliquid',
    logo: '/exchanges/hyperliquid.svg',
    category: 'crypto_dex',
    connectionType: 'api_key',
    features: ['perpetuals'],
    supportedAssetTypes: ['crypto'],
    apiDocsUrl: 'https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api',
    websiteUrl: 'https://hyperliquid.xyz',
    supportsTestnet: true,
    rateLimits: {
      requestsPerMinute: 1200,
      ordersPerSecond: 10,
    },
  };

  private baseUrl = 'https://api.hyperliquid.xyz';
  private infoUrl = 'https://api.hyperliquid.xyz/info';

  // ==========================================================================
  // Connection
  // ==========================================================================

  async connect(credentials: BrokerCredentials): Promise<void> {
    this.credentials = credentials;

    if (credentials.isTestnet) {
      this.baseUrl = 'https://api.hyperliquid-testnet.xyz';
      this.infoUrl = 'https://api.hyperliquid-testnet.xyz/info';
    }

    const testResult = await this.testConnection(credentials);
    if (!testResult.success) {
      throw new BrokerError(
        testResult.error || 'Failed to connect',
        BrokerErrorCodes.INVALID_CREDENTIALS
      );
    }

    this.setConnected(true);
  }

  async disconnect(): Promise<void> {
    this.credentials = null;
    this.setConnected(false);
  }

  async testConnection(credentials: BrokerCredentials): Promise<ConnectionTestResult> {
    try {
      // For Hyperliquid, the API key is actually the wallet address
      // We test by fetching user state - just verify it doesn't throw
      await this.fetchUserState(credentials.apiKey);

      return {
        success: true,
        accountInfo: {
          id: credentials.apiKey,
          name: `Hyperliquid ${credentials.apiKey.slice(0, 6)}...${credentials.apiKey.slice(-4)}`,
          permissions: ['read', 'trade'],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  // ==========================================================================
  // Account Information
  // ==========================================================================

  async getAccount(): Promise<BrokerAccount> {
    if (!this.credentials) {
      throw new BrokerError('Not connected', BrokerErrorCodes.INVALID_CREDENTIALS);
    }

    const userState = await this.fetchUserState(this.credentials.apiKey);
    const accountValue = parseFloat(userState.crossMarginSummary.accountValue);

    return {
      id: this.credentials.apiKey,
      name: `Hyperliquid ${this.credentials.apiKey.slice(0, 6)}...${this.credentials.apiKey.slice(-4)}`,
      type: this.credentials.isTestnet ? 'testnet' : 'live',
      currency: 'USDC',
      balance: accountValue,
      availableBalance: parseFloat(userState.withdrawable),
      permissions: ['read', 'trade'],
    };
  }

  async getBalances(): Promise<Balance[]> {
    if (!this.credentials) {
      throw new BrokerError('Not connected', BrokerErrorCodes.INVALID_CREDENTIALS);
    }

    const userState = await this.fetchUserState(this.credentials.apiKey);
    const accountValue = parseFloat(userState.crossMarginSummary.accountValue);
    const marginUsed = parseFloat(userState.crossMarginSummary.totalMarginUsed);

    return [
      {
        asset: 'USDC',
        free: accountValue - marginUsed,
        locked: marginUsed,
        total: accountValue,
        usdValue: accountValue,
      },
    ];
  }

  // ==========================================================================
  // Trade History
  // ==========================================================================

  async getTrades(options?: {
    symbol?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
  }): Promise<Trade[]> {
    if (!this.credentials) {
      throw new BrokerError('Not connected', BrokerErrorCodes.INVALID_CREDENTIALS);
    }

    const fills = await this.fetchUserFills(this.credentials.apiKey);

    let filteredFills = fills;

    // Filter by symbol if provided
    if (options?.symbol) {
      const coin = options.symbol.replace('-PERP', '').replace('USDC', '').replace('USD', '');
      filteredFills = filteredFills.filter(f => f.coin === coin);
    }

    // Filter by time range
    if (options?.startTime) {
      const startMs = new Date(options.startTime).getTime();
      filteredFills = filteredFills.filter(f => f.time >= startMs);
    }
    if (options?.endTime) {
      const endMs = new Date(options.endTime).getTime();
      filteredFills = filteredFills.filter(f => f.time <= endMs);
    }

    // Apply limit
    if (options?.limit) {
      filteredFills = filteredFills.slice(0, options.limit);
    }

    return filteredFills.map(f => this.mapTrade(f));
  }

  // ==========================================================================
  // Positions
  // ==========================================================================

  async getPositions(): Promise<Position[]> {
    if (!this.credentials) {
      throw new BrokerError('Not connected', BrokerErrorCodes.INVALID_CREDENTIALS);
    }

    const userState = await this.fetchUserState(this.credentials.apiKey);

    return userState.assetPositions
      .filter(ap => parseFloat(ap.position.szi) !== 0)
      .map(ap => this.mapPosition(ap));
  }

  // ==========================================================================
  // Orders
  // ==========================================================================

  async getOpenOrders(_symbol?: string): Promise<Order[]> {
    if (!this.credentials) {
      throw new BrokerError('Not connected', BrokerErrorCodes.INVALID_CREDENTIALS);
    }

    const response = await fetch(this.infoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'openOrders',
        user: this.credentials.apiKey,
      }),
    });

    if (!response.ok) {
      throw new BrokerError('Failed to fetch orders', BrokerErrorCodes.UNKNOWN_ERROR);
    }

    const orders = await response.json() as Array<{
      coin: string;
      limitPx: string;
      oid: number;
      side: string;
      sz: string;
      timestamp: number;
    }>;

    return orders.map(o => ({
      id: String(o.oid),
      clientOrderId: String(o.oid),
      symbol: `${o.coin}-PERP`,
      side: o.side.toLowerCase() as 'buy' | 'sell',
      type: 'limit' as const,
      quantity: parseFloat(o.sz),
      price: parseFloat(o.limitPx),
      timeInForce: 'GTC' as const,
      status: 'open' as const,
      filledQuantity: 0,
      createdAt: new Date(o.timestamp).toISOString(),
      updatedAt: new Date(o.timestamp).toISOString(),
    }));
  }

  // ==========================================================================
  // Market Data
  // ==========================================================================

  async getSymbols(): Promise<Symbol[]> {
    const response = await fetch(this.infoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'meta' }),
    });

    if (!response.ok) {
      throw new BrokerError('Failed to fetch symbols', BrokerErrorCodes.UNKNOWN_ERROR);
    }

    const meta = await response.json() as HyperliquidMeta;

    return meta.universe.map(s => ({
      symbol: `${s.name}-PERP`,
      baseAsset: s.name,
      quoteAsset: 'USDC',
      status: 'trading',
      minQuantity: Math.pow(10, -s.szDecimals),
      maxQuantity: 1000000,
      stepSize: Math.pow(10, -s.szDecimals),
      minNotional: 10,
      pricePrecision: 5,
      quantityPrecision: s.szDecimals,
      isMarginTradingAllowed: true,
      maxLeverage: s.maxLeverage,
    }));
  }

  async getTicker(symbol: string): Promise<Ticker> {
    const coin = symbol.replace('-PERP', '');

    const response = await fetch(this.infoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'allMids' }),
    });

    if (!response.ok) {
      throw new BrokerError('Failed to fetch ticker', BrokerErrorCodes.UNKNOWN_ERROR);
    }

    const allMids = await response.json() as HyperliquidAllMids;
    const midPrice = parseFloat(allMids[coin] || '0');

    return {
      symbol: `${coin}-PERP`,
      lastPrice: midPrice,
      bidPrice: midPrice * 0.9999,
      askPrice: midPrice * 1.0001,
      high24h: midPrice * 1.05,
      low24h: midPrice * 0.95,
      volume24h: 0,
      priceChange24h: 0,
      priceChangePercent24h: 0,
      timestamp: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // Sync
  // ==========================================================================

  async sync(options?: SyncOptions): Promise<SyncResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let tradesImported = 0;
    let positionsUpdated = 0;
    let balancesUpdated = 0;

    try {
      // Sync trades
      const trades = await this.getTrades({
        startTime: options?.startDate,
        endTime: options?.endDate,
        symbol: options?.symbols?.[0],
      });
      tradesImported = trades.length;

      // Sync positions
      if (options?.includePositions !== false) {
        const positions = await this.getPositions();
        positionsUpdated = positions.length;
      }

      // Sync balances
      if (options?.includeBalances !== false) {
        const balances = await this.getBalances();
        balancesUpdated = balances.length;
      }

      this.setSyncTime();
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Sync failed');
    }

    return {
      success: errors.length === 0,
      tradesImported,
      tradesMapped: tradesImported,
      positionsUpdated,
      balancesUpdated,
      errors,
      warnings,
      syncedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // Mapping
  // ==========================================================================

  mapTrade(brokerTrade: unknown): Trade {
    const t = brokerTrade as HyperliquidFill;
    return {
      id: `hyperliquid_${t.tid}`,
      brokerId: 'hyperliquid',
      brokerOrderId: String(t.oid),
      symbol: `${t.coin}-PERP`,
      side: t.side.toLowerCase() as 'buy' | 'sell',
      type: t.crossed ? 'market' : 'limit',
      quantity: parseFloat(t.sz),
      price: parseFloat(t.px),
      filledQuantity: parseFloat(t.sz),
      avgFillPrice: parseFloat(t.px),
      status: 'filled',
      fee: parseFloat(t.fee),
      feeCurrency: 'USDC',
      realizedPnL: parseFloat(t.closedPnl),
      createdAt: new Date(t.time).toISOString(),
      updatedAt: new Date(t.time).toISOString(),
      raw: t as unknown as Record<string, unknown>,
    };
  }

  mapPosition(brokerPosition: unknown): Position {
    const ap = brokerPosition as HyperliquidAssetPosition;
    const p = ap.position;
    const szi = parseFloat(p.szi);

    return {
      id: `hyperliquid_${p.coin}`,
      symbol: `${p.coin}-PERP`,
      side: szi >= 0 ? 'long' : 'short',
      quantity: Math.abs(szi),
      entryPrice: parseFloat(p.entryPx),
      currentPrice: parseFloat(p.entryPx), // Will be updated with market price
      unrealizedPnL: parseFloat(p.unrealizedPnl),
      realizedPnL: 0,
      leverage: p.leverage.value,
      liquidationPrice: p.liquidationPx ? parseFloat(p.liquidationPx) : undefined,
      marginType: p.leverage.type === 'cross' ? 'cross' : 'isolated',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private async fetchUserState(address: string): Promise<HyperliquidUserState> {
    const response = await fetch(this.infoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'clearinghouseState',
        user: address,
      }),
    });

    if (!response.ok) {
      throw new BrokerError('Failed to fetch user state', BrokerErrorCodes.UNKNOWN_ERROR);
    }

    return response.json() as Promise<HyperliquidUserState>;
  }

  private async fetchUserFills(address: string): Promise<HyperliquidFill[]> {
    const response = await fetch(this.infoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'userFills',
        user: address,
      }),
    });

    if (!response.ok) {
      throw new BrokerError('Failed to fetch fills', BrokerErrorCodes.UNKNOWN_ERROR);
    }

    return response.json() as Promise<HyperliquidFill[]>;
  }
}

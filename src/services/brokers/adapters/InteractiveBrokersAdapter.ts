/**
 * Interactive Brokers Adapter
 *
 * Implementation of IBroker for Interactive Brokers.
 * Uses the Client Portal API for web-based access.
 *
 * Note: IB requires either:
 * 1. Client Portal Gateway running locally
 * 2. OAuth authentication for production use
 *
 * This adapter supports the Client Portal API.
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
// IB API Types
// ============================================================================

interface _IBAccount {
  id: string;
  accountId: string;
  accountVan: string;
  accountTitle: string;
  displayName: string;
  accountAlias: string;
  accountStatus: number;
  currency: string;
  type: string;
  tradingType: string;
  faclient: boolean;
  clearingStatus: string;
  parent: {
    mmc: string[];
    accountId: string;
    isMParent: boolean;
    isMChild: boolean;
    isMultiplex: boolean;
  };
}

interface IBPortfolioPosition {
  acctId: string;
  conid: number;
  contractDesc: string;
  position: number;
  mktPrice: number;
  mktValue: number;
  currency: string;
  avgCost: number;
  avgPrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  assetClass: string;
  sector: string;
  pageSize: number;
}

interface IBTrade {
  execution_id: string;
  symbol: string;
  side: string;
  order_description: string;
  trade_time: string;
  trade_time_r: number;
  size: number;
  price: string;
  submitter: string;
  exchange: string;
  commission: number;
  net_amount: number;
  account: string;
  company_name: string;
  contract_description_1: string;
  sec_type: string;
  conidex: string;
  clearing_id: string;
  clearing_name: string;
}

interface IBOrder {
  acct: string;
  conid: number;
  orderId: number;
  orderType: string;
  outsideRTH: boolean;
  price: number;
  auxPrice: number;
  side: string;
  ticker: string;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  status: string;
  lastExecutionTime: string;
  lastExecutionTime_r: number;
}

// ============================================================================
// Adapter Implementation
// ============================================================================

export class InteractiveBrokersAdapter extends BaseBroker {
  readonly metadata: BrokerMetadata = {
    id: 'interactive_brokers',
    name: 'interactive_brokers',
    displayName: 'Interactive Brokers',
    logo: '/brokers/ibkr.svg',
    category: 'stocks',
    connectionType: 'oauth',
    features: ['spot', 'margin', 'futures', 'options'],
    supportedAssetTypes: ['stock', 'etf', 'forex', 'option', 'future', 'bond'],
    apiDocsUrl: 'https://interactivebrokers.github.io/cpwebapi/',
    websiteUrl: 'https://www.interactivebrokers.com',
    supportsTestnet: true,
    supportsOAuth: true,
    rateLimits: {
      requestsPerMinute: 60,
      ordersPerSecond: 5,
    },
  };

  private baseUrl = 'https://localhost:5000/v1/api'; // Client Portal Gateway
  private accountId: string | null = null;

  // ==========================================================================
  // Connection
  // ==========================================================================

  async connect(credentials: BrokerCredentials): Promise<void> {
    this.credentials = credentials;

    // For IB, we use the access token from OAuth
    if (credentials.accessToken) {
      this.baseUrl = 'https://api.ibkr.com/v1/api';
    } else {
      // Local gateway
      this.baseUrl = credentials.isTestnet
        ? 'https://localhost:5000/v1/api' // Paper trading
        : 'https://localhost:5000/v1/api';
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
    this.accountId = null;
    this.setConnected(false);
  }

  async testConnection(_credentials: BrokerCredentials): Promise<ConnectionTestResult> {
    try {
      const response = await this.authenticatedRequest('/iserver/accounts');
      const data = response as { accounts: string[]; selectedAccount: string };

      if (!data.accounts?.length) {
        return {
          success: false,
          error: 'No accounts found. Please ensure Client Portal Gateway is authenticated.',
        };
      }

      this.accountId = data.selectedAccount || data.accounts[0];

      return {
        success: true,
        accountInfo: {
          id: this.accountId,
          name: `IBKR ${this.accountId}`,
          permissions: ['read', 'trade'],
        },
      };
    } catch (error) {
      // IB Gateway might need authentication
      if (error instanceof Error && error.message.includes('401')) {
        return {
          success: false,
          error: 'Session expired. Please re-authenticate with Client Portal Gateway.',
          errorCode: '401',
        };
      }
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
    if (!this.accountId) {
      throw new BrokerError('Not connected', BrokerErrorCodes.INVALID_CREDENTIALS);
    }

    const summary = await this.authenticatedRequest(
      `/portfolio/${this.accountId}/summary`
    ) as Record<string, { amount: number; currency: string }>;

    return {
      id: this.accountId,
      name: `Interactive Brokers ${this.accountId}`,
      type: this.credentials?.isTestnet ? 'paper' : 'live',
      currency: summary.totalcashvalue?.currency || 'USD',
      balance: summary.netliquidation?.amount || 0,
      availableBalance: summary.availablefunds?.amount || 0,
      marginUsed: summary.maintenancemarginreq?.amount,
      marginAvailable: summary.availablefunds?.amount,
      unrealizedPnL: summary.unrealizedpnl?.amount,
      permissions: ['read', 'trade', 'margin', 'futures', 'options'],
    };
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    const response = await this.authenticatedRequest('/iserver/accounts') as {
      accounts: string[];
    };

    const accounts: BrokerAccount[] = [];

    for (const accountId of response.accounts) {
      try {
        const summary = await this.authenticatedRequest(
          `/portfolio/${accountId}/summary`
        ) as Record<string, { amount: number; currency: string }>;

        accounts.push({
          id: accountId,
          name: `IBKR ${accountId}`,
          type: accountId.startsWith('DU') ? 'paper' : 'live',
          currency: summary.totalcashvalue?.currency || 'USD',
          balance: summary.netliquidation?.amount || 0,
          availableBalance: summary.availablefunds?.amount || 0,
          permissions: ['read', 'trade'],
        });
      } catch {
        // Skip accounts we can't access
      }
    }

    return accounts;
  }

  async getBalances(): Promise<Balance[]> {
    if (!this.accountId) {
      throw new BrokerError('Not connected', BrokerErrorCodes.INVALID_CREDENTIALS);
    }

    const summary = await this.authenticatedRequest(
      `/portfolio/${this.accountId}/summary`
    ) as Record<string, { amount: number; currency: string }>;

    // IB reports cash by currency
    const balances: Balance[] = [];

    if (summary.totalcashvalue) {
      balances.push({
        asset: summary.totalcashvalue.currency,
        free: summary.availablefunds?.amount || 0,
        locked: (summary.totalcashvalue.amount || 0) - (summary.availablefunds?.amount || 0),
        total: summary.totalcashvalue.amount || 0,
        usdValue: summary.totalcashvalue.amount,
      });
    }

    return balances;
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
    if (!this.accountId) {
      throw new BrokerError('Not connected', BrokerErrorCodes.INVALID_CREDENTIALS);
    }

    const params: string[] = [];
    if (options?.symbol) {
      // Need to resolve symbol to conid first
      // For now, get all trades
    }

    const trades = await this.authenticatedRequest(
      `/iserver/account/trades${params.length ? '?' + params.join('&') : ''}`
    ) as IBTrade[];

    return (trades || [])
      .slice(0, options?.limit || 100)
      .map((t) => this.mapTrade(t));
  }

  // ==========================================================================
  // Positions
  // ==========================================================================

  async getPositions(): Promise<Position[]> {
    if (!this.accountId) {
      throw new BrokerError('Not connected', BrokerErrorCodes.INVALID_CREDENTIALS);
    }

    const positions = await this.authenticatedRequest(
      `/portfolio/${this.accountId}/positions/0`
    ) as IBPortfolioPosition[];

    return (positions || [])
      .filter((p) => p.position !== 0)
      .map((p) => this.mapPosition(p));
  }

  // ==========================================================================
  // Orders
  // ==========================================================================

  async getOpenOrders(): Promise<Order[]> {
    const orders = await this.authenticatedRequest(
      '/iserver/account/orders'
    ) as { orders: IBOrder[] };

    return (orders.orders || []).map((o) => ({
      id: String(o.orderId),
      symbol: o.ticker,
      side: o.side.toLowerCase() as 'buy' | 'sell',
      type: this.mapIBOrderType(o.orderType),
      quantity: o.quantity,
      price: o.price || undefined,
      stopPrice: o.auxPrice || undefined,
      timeInForce: 'GTC' as const,
      status: this.mapOrderStatus(o.status),
      filledQuantity: o.filledQuantity,
      avgFillPrice: undefined,
      createdAt: new Date(o.lastExecutionTime_r).toISOString(),
      updatedAt: new Date(o.lastExecutionTime_r).toISOString(),
    }));
  }

  // ==========================================================================
  // Market Data
  // ==========================================================================

  async getSymbols(): Promise<Symbol[]> {
    // IB doesn't have a simple symbols endpoint
    // Symbols are searched/resolved via /iserver/secdef/search
    return [];
  }

  async getTicker(symbol: string): Promise<Ticker> {
    // First resolve symbol to conid
    const searchResult = await this.authenticatedRequest(
      `/iserver/secdef/search?symbol=${encodeURIComponent(symbol)}`
    ) as Array<{ conid: number; companyName: string; symbol: string }>;

    if (!searchResult?.[0]?.conid) {
      throw new BrokerError(
        `Symbol ${symbol} not found`,
        BrokerErrorCodes.INVALID_SYMBOL
      );
    }

    const conid = searchResult[0].conid;

    // Get snapshot
    const snapshot = await this.authenticatedRequest(
      `/iserver/marketdata/snapshot?conids=${conid}&fields=31,84,85,86,87,88`
    ) as Array<{
      conid: number;
      '31': string; // Last
      '84': string; // Bid
      '85': string; // Ask
      '86': string; // Bid Size
      '87': string; // Ask Size
      '88': string; // Volume
    }>;

    const data = snapshot?.[0];

    return {
      symbol,
      lastPrice: parseFloat(data?.['31'] || '0'),
      bidPrice: parseFloat(data?.['84'] || '0'),
      askPrice: parseFloat(data?.['85'] || '0'),
      high24h: 0,
      low24h: 0,
      volume24h: parseFloat(data?.['88'] || '0'),
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
    const t = brokerTrade as IBTrade;
    return {
      id: `ibkr_${t.execution_id}`,
      brokerId: 'interactive_brokers',
      brokerOrderId: t.execution_id,
      symbol: t.symbol,
      side: t.side.toLowerCase() as 'buy' | 'sell',
      type: 'market',
      quantity: Math.abs(t.size),
      price: parseFloat(t.price),
      filledQuantity: Math.abs(t.size),
      avgFillPrice: parseFloat(t.price),
      status: 'filled',
      fee: Math.abs(t.commission),
      feeCurrency: 'USD',
      createdAt: new Date(t.trade_time_r).toISOString(),
      updatedAt: new Date(t.trade_time_r).toISOString(),
      raw: t as unknown as Record<string, unknown>,
    };
  }

  mapPosition(brokerPosition: unknown): Position {
    const p = brokerPosition as IBPortfolioPosition;
    return {
      id: `ibkr_${p.conid}`,
      symbol: p.contractDesc,
      side: p.position >= 0 ? 'long' : 'short',
      quantity: Math.abs(p.position),
      entryPrice: p.avgCost,
      currentPrice: p.mktPrice,
      unrealizedPnL: p.unrealizedPnl,
      realizedPnL: p.realizedPnl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private async authenticatedRequest<T = unknown>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.credentials?.accessToken) {
      headers['Authorization'] = `Bearer ${this.credentials.accessToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
      // For local gateway, we need to handle self-signed certs
      // In browser, this would need CORS proxy
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new BrokerError(
        error.error || `Request failed with status ${response.status}`,
        response.status === 401
          ? BrokerErrorCodes.INVALID_CREDENTIALS
          : BrokerErrorCodes.UNKNOWN_ERROR,
        String(response.status)
      );
    }

    return response.json() as T;
  }

  private mapOrderStatus(
    status: string
  ): 'pending' | 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'expired' {
    const statusMap: Record<string, 'pending' | 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected' | 'expired'> = {
      PendingSubmit: 'pending',
      PreSubmitted: 'pending',
      Submitted: 'open',
      Filled: 'filled',
      Cancelled: 'cancelled',
      Inactive: 'cancelled',
    };
    return statusMap[status] || 'pending';
  }

  private mapIBOrderType(orderType: string): 'market' | 'limit' | 'stop' | 'stop_limit' {
    const typeMap: Record<string, 'market' | 'limit' | 'stop' | 'stop_limit'> = {
      MKT: 'market',
      LMT: 'limit',
      STP: 'stop',
      'STP LMT': 'stop_limit',
      STPLMT: 'stop_limit',
    };
    return typeMap[orderType] || 'market';
  }
}

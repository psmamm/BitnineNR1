/**
 * Abstract Exchange Interface
 *
 * Base interface for all exchange implementations.
 * Provides a unified API for connecting to different exchanges.
 * Supports: Crypto (Spot, Futures), Stocks, Forex, Options
 */

// ============================================================================
// Types & Enums
// ============================================================================

export type AssetClass = 'crypto' | 'stocks' | 'forex' | 'futures' | 'options';

export type ExchangeId =
  // Crypto CEXs
  | 'bybit' | 'binance' | 'coinbase' | 'kraken' | 'okx' | 'bitget'
  // Crypto DEXs
  | 'uniswap' | 'jupiter' | 'dydx' | 'gmx' | 'hyperliquid' | 'lighter'
  // Stock Brokers
  | 'interactive_brokers' | 'td_ameritrade' | 'robinhood' | 'webull' | 'fidelity'
  // Forex
  | 'oanda' | 'forex_com' | 'ig' | 'pepperstone'
  // Futures
  | 'ninjatrader' | 'tradestation' | 'tradovate'
  // Options
  | 'thinkorswim' | 'tastyworks';

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type OrderStatus = 'pending' | 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected';
export type PositionSide = 'long' | 'short';
export type MarginMode = 'isolated' | 'cross';
export type TimeInForce = 'gtc' | 'ioc' | 'fok' | 'post_only';

// ============================================================================
// Core Data Structures
// ============================================================================

/**
 * Exchange credentials for API authentication
 */
export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase?: string;    // Required for some exchanges (Coinbase, OKX)
  subaccount?: string;    // For exchanges with subaccount support
  testnet?: boolean;      // Use testnet/sandbox
}

/**
 * Unified balance representation
 */
export interface Balance {
  currency: string;
  total: number;
  available: number;
  locked: number;
  usdValue?: number;
}

/**
 * Unified wallet/account balance
 */
export interface WalletBalance {
  accountType: string;
  balances: Balance[];
  totalEquityUsd: number;
  availableMarginUsd: number;
  usedMarginUsd: number;
  marginLevel?: number;
}

/**
 * Unified trade representation
 */
export interface Trade {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  price: number;
  quantity: number;
  fee: number;
  feeCurrency: string;
  timestamp: Date;
  isMaker: boolean;

  // Additional metadata
  category?: string;        // spot, linear, inverse, option
  realizedPnl?: number;     // For futures/perpetuals
}

/**
 * Unified order representation
 */
export interface Order {
  id: string;
  clientOrderId?: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  price: number;
  quantity: number;
  filledQuantity: number;
  averagePrice?: number;
  stopPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeInForce: TimeInForce;
  leverage?: number;
  marginMode?: MarginMode;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Unified position representation
 */
export interface Position {
  id: string;
  symbol: string;
  side: PositionSide;
  quantity: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  leverage: number;
  marginMode: MarginMode;
  liquidationPrice?: number;
  marginUsed: number;
  createdAt: Date;
}

/**
 * Order creation request
 */
export interface CreateOrderRequest {
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;           // Required for limit orders
  stopPrice?: number;       // For stop orders
  stopLoss?: number;
  takeProfit?: number;
  timeInForce?: TimeInForce;
  leverage?: number;
  marginMode?: MarginMode;
  clientOrderId?: string;
  reduceOnly?: boolean;
}

/**
 * Position sizing calculation result
 */
export interface PositionSizeResult {
  positionSize: number;
  orderValue: number;
  marginRequired: number;
  leverage: number;
  availableBalance: number;
  accountType: string;
  canOpen: boolean;
  reason?: string;
  riskRewardRatio?: number;
}

/**
 * Risk validation result
 */
export interface RiskValidationResult {
  valid: boolean;
  reason?: string;
  warnings?: string[];
  riskMetrics?: {
    positionRisk: number;
    accountRisk: number;
    dailyLossUsed: number;
    totalLossUsed: number;
  };
}

/**
 * Market/Symbol info
 */
export interface MarketInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: 'trading' | 'halt' | 'break';
  minQuantity: number;
  maxQuantity: number;
  quantityPrecision: number;
  minPrice: number;
  maxPrice: number;
  pricePrecision: number;
  minNotional: number;
  contractSize?: number;
  tickSize: number;
  isSpot: boolean;
  isFutures: boolean;
  isMarginEnabled: boolean;
  maxLeverage?: number;
}

/**
 * OHLCV Candlestick data
 */
export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Exchange API rate limits
 */
export interface RateLimits {
  requestsPerSecond: number;
  requestsPerMinute: number;
  ordersPerSecond: number;
  ordersPerMinute: number;
}

/**
 * Exchange capabilities
 */
export interface ExchangeCapabilities {
  spot: boolean;
  futures: boolean;
  options: boolean;
  margin: boolean;
  crossMargin: boolean;
  isolatedMargin: boolean;
  websocket: boolean;
  orderTypes: OrderType[];
  maxLeverage: number;
  supportedTimeframes: string[];
}

// ============================================================================
// Abstract Exchange Interface
// ============================================================================

/**
 * Abstract base class for all exchange implementations
 *
 * Each exchange (Bybit, Binance, etc.) extends this class and
 * implements the abstract methods according to their specific API.
 */
export abstract class ExchangeInterface {
  protected credentials: ExchangeCredentials;
  protected exchangeId: ExchangeId;
  protected assetClass: AssetClass;
  protected baseUrl: string;
  protected testnetUrl?: string;

  constructor(
    exchangeId: ExchangeId,
    credentials: ExchangeCredentials,
    assetClass: AssetClass = 'crypto'
  ) {
    this.exchangeId = exchangeId;
    this.credentials = credentials;
    this.assetClass = assetClass;
    this.baseUrl = this.getBaseUrl();
  }

  // ============================================================================
  // Abstract Methods - Must be implemented by each exchange
  // ============================================================================

  /**
   * Get the base URL for this exchange
   */
  protected abstract getBaseUrl(): string;

  /**
   * Create signature for authenticated requests
   */
  protected abstract createSignature(
    method: string,
    endpoint: string,
    timestamp: string,
    params?: Record<string, string>
  ): Promise<string>;

  /**
   * Test connection to exchange
   * @returns true if connection successful
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Get account/wallet balance
   */
  abstract getBalance(): Promise<WalletBalance>;

  /**
   * Get trade history
   */
  abstract getTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<Trade[]>;

  /**
   * Get open orders
   */
  abstract getOpenOrders(symbol?: string): Promise<Order[]>;

  /**
   * Get order by ID
   */
  abstract getOrder(orderId: string, symbol?: string): Promise<Order>;

  /**
   * Create a new order
   */
  abstract createOrder(request: CreateOrderRequest): Promise<Order>;

  /**
   * Cancel an order
   */
  abstract cancelOrder(orderId: string, symbol?: string): Promise<boolean>;

  /**
   * Get open positions (for futures/margin)
   */
  abstract getPositions(symbol?: string): Promise<Position[]>;

  /**
   * Get market/symbol information
   */
  abstract getMarketInfo(symbol: string): Promise<MarketInfo>;

  /**
   * Get OHLCV candlestick data
   */
  abstract getOHLCV(
    symbol: string,
    timeframe: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<OHLCV[]>;

  /**
   * Calculate position size based on risk parameters
   */
  abstract calculatePositionSize(
    riskAmount: number,
    entryPrice: number,
    stopLossPrice: number,
    leverage?: number,
    marginMode?: MarginMode,
    symbol?: string
  ): Promise<PositionSizeResult>;

  /**
   * Validate risk before placing order
   */
  abstract validateRisk(
    riskAmount: number,
    entryPrice: number,
    stopLossPrice: number,
    leverage: number,
    marginMode: MarginMode,
    symbol: string,
    currentDailyLoss?: number,
    totalLoss?: number,
    startingCapital?: number
  ): Promise<RiskValidationResult>;

  // ============================================================================
  // Shared Helper Methods
  // ============================================================================

  /**
   * Get exchange ID
   */
  getExchangeId(): ExchangeId {
    return this.exchangeId;
  }

  /**
   * Get exchange name (human readable)
   */
  getExchangeName(): string {
    const names: Record<ExchangeId, string> = {
      bybit: 'Bybit',
      binance: 'Binance',
      coinbase: 'Coinbase',
      kraken: 'Kraken',
      okx: 'OKX',
      bitget: 'Bitget',
      uniswap: 'Uniswap',
      jupiter: 'Jupiter',
      dydx: 'dYdX',
      gmx: 'GMX',
      hyperliquid: 'Hyperliquid',
      lighter: 'Lighter',
      interactive_brokers: 'Interactive Brokers',
      td_ameritrade: 'TD Ameritrade',
      robinhood: 'Robinhood',
      webull: 'Webull',
      fidelity: 'Fidelity',
      oanda: 'OANDA',
      forex_com: 'Forex.com',
      ig: 'IG',
      pepperstone: 'Pepperstone',
      ninjatrader: 'NinjaTrader',
      tradestation: 'TradeStation',
      tradovate: 'Tradovate',
      thinkorswim: 'thinkorswim',
      tastyworks: 'Tastyworks'
    };
    return names[this.exchangeId] || this.exchangeId;
  }

  /**
   * Get asset class
   */
  getAssetClass(): AssetClass {
    return this.assetClass;
  }

  /**
   * Check if using testnet
   */
  isTestnet(): boolean {
    return this.credentials.testnet || false;
  }

  /**
   * Get exchange capabilities
   */
  abstract getCapabilities(): ExchangeCapabilities;

  /**
   * Get rate limits
   */
  abstract getRateLimits(): RateLimits;

  /**
   * Format symbol for this exchange (e.g., BTCUSDT vs BTC/USDT)
   */
  abstract formatSymbol(baseAsset: string, quoteAsset: string): string;

  /**
   * Parse symbol from exchange format to base/quote
   */
  abstract parseSymbol(symbol: string): { baseAsset: string; quoteAsset: string };

  // ============================================================================
  // Utility Methods (Shared across exchanges)
  // ============================================================================

  /**
   * Calculate stop distance percentage
   */
  protected calculateStopDistance(entryPrice: number, stopLossPrice: number): number {
    return Math.abs(entryPrice - stopLossPrice) / entryPrice;
  }

  /**
   * Calculate risk-reward ratio
   */
  protected calculateRiskReward(
    entryPrice: number,
    stopLossPrice: number,
    takeProfitPrice: number
  ): number {
    const risk = Math.abs(entryPrice - stopLossPrice);
    const reward = Math.abs(takeProfitPrice - entryPrice);
    return risk > 0 ? reward / risk : 0;
  }

  /**
   * Round to precision
   */
  protected roundToPrecision(value: number, precision: number): number {
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * Create HMAC-SHA256 signature (common for many exchanges)
   */
  protected async hmacSha256(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Make authenticated HTTP request
   */
  protected async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    params?: Record<string, string>,
    body?: Record<string, unknown>,
    timeout: number = 15000
  ): Promise<T> {
    const timestamp = Date.now().toString();
    const signature = await this.createSignature(method, endpoint, timestamp, params);

    const url = new URL(endpoint, this.isTestnet() && this.testnetUrl ? this.testnetUrl : this.baseUrl);

    if (params) {
      Object.keys(params).sort().forEach(key => {
        url.searchParams.append(key, params[key]);
      });
    }

    const headers = this.getAuthHeaders(timestamp, signature);

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${this.getExchangeName()} API error (${response.status}): ${text.substring(0, 500)}`);
    }

    return response.json();
  }

  /**
   * Get authentication headers (to be overridden by each exchange)
   */
  protected abstract getAuthHeaders(timestamp: string, signature: string): Record<string, string>;
}

// ============================================================================
// Exchange Error Types
// ============================================================================

export class ExchangeError extends Error {
  constructor(
    public exchangeId: ExchangeId,
    public code: string,
    message: string
  ) {
    super(`[${exchangeId}] ${message}`);
    this.name = 'ExchangeError';
  }
}

export class AuthenticationError extends ExchangeError {
  constructor(exchangeId: ExchangeId, message: string) {
    super(exchangeId, 'AUTH_ERROR', message);
    this.name = 'AuthenticationError';
  }
}

export class InsufficientBalanceError extends ExchangeError {
  constructor(exchangeId: ExchangeId, required: number, available: number) {
    super(exchangeId, 'INSUFFICIENT_BALANCE',
      `Insufficient balance. Required: $${required.toFixed(2)}, Available: $${available.toFixed(2)}`);
    this.name = 'InsufficientBalanceError';
  }
}

export class RateLimitError extends ExchangeError {
  constructor(exchangeId: ExchangeId, retryAfter?: number) {
    super(exchangeId, 'RATE_LIMIT',
      `Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}ms` : ''}`);
    this.name = 'RateLimitError';
  }
}

export class OrderError extends ExchangeError {
  constructor(exchangeId: ExchangeId, orderId: string, message: string) {
    super(exchangeId, 'ORDER_ERROR', `Order ${orderId}: ${message}`);
    this.name = 'OrderError';
  }
}

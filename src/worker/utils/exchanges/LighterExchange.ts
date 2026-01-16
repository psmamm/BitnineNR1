/**
 * Lighter DEX Exchange Implementation
 *
 * Implements the ExchangeInterface for Lighter DEX on Arbitrum.
 * Zero-fee perpetual trading with up to 50x leverage.
 *
 * API Documentation: https://docs.lighter.xyz/
 * Mainnet API: https://mainnet.zklighter.elliot.ai
 * WebSocket: wss://mainnet.zklighter.elliot.ai/ws
 *
 * Price Format: integers (multiply by 1e8)
 * Account Structure: integer-indexed accounts with API keys (index 3-254)
 */

import {
  ExchangeInterface,
  ExchangeCredentials,
  AssetClass,
  WalletBalance,
  Balance,
  Trade,
  Order,
  Position,
  CreateOrderRequest,
  PositionSizeResult,
  RiskValidationResult,
  MarketInfo,
  OHLCV,
  ExchangeCapabilities,
  RateLimits,
  OrderSide,
  OrderType,
  OrderStatus,
  MarginMode,
  TimeInForce,
  AuthenticationError,
  ExchangeError
} from './ExchangeInterface';

// ============================================================================
// Lighter-Specific Types
// ============================================================================

export interface LighterApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface LighterAccountInfo {
  account_index: number;
  owner: string;
  total_value: string;
  available_margin: string;
  used_margin: string;
  unrealized_pnl: string;
  realized_pnl: string;
}

interface LighterBalance {
  asset: string;
  total: string;
  available: string;
  locked: string;
}

interface LighterOrder {
  order_id: string;
  client_order_id?: string;
  market: string;
  side: 'buy' | 'sell';
  order_type: 'market' | 'limit' | 'stop_market' | 'stop_limit';
  price: string;        // Integer format (1e8)
  size: string;
  filled_size: string;
  avg_fill_price: string;
  status: string;
  reduce_only: boolean;
  time_in_force: string;
  leverage: string;
  created_at: number;
  updated_at: number;
}

interface LighterPosition {
  market: string;
  side: 'long' | 'short';
  size: string;
  entry_price: string;   // Integer format (1e8)
  mark_price: string;    // Integer format (1e8)
  unrealized_pnl: string;
  realized_pnl: string;
  leverage: string;
  margin_mode: 'isolated' | 'cross';
  liquidation_price: string;
  margin_used: string;
  created_at: number;
}

interface LighterTrade {
  trade_id: string;
  order_id: string;
  market: string;
  side: 'buy' | 'sell';
  price: string;
  size: string;
  fee: string;
  fee_asset: string;
  is_maker: boolean;
  realized_pnl: string;
  timestamp: number;
}

interface LighterMarket {
  market: string;
  base_asset: string;
  quote_asset: string;
  status: string;
  min_order_size: string;
  max_order_size: string;
  size_precision: number;
  min_price: string;
  max_price: string;
  price_precision: number;
  tick_size: string;
  max_leverage: number;
}

interface LighterKline {
  timestamp: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

// Extended credentials for Lighter (includes wallet + account index)
export interface LighterCredentials extends ExchangeCredentials {
  accountIndex?: number;       // Lighter account index (3-254)
  walletAddress?: string;      // Ethereum wallet address
}

// ============================================================================
// Lighter Exchange Class
// ============================================================================

export class LighterExchange extends ExchangeInterface {
  private static readonly PRICE_PRECISION = 1e8;
  private static readonly SIZE_PRECISION = 1e8;
  private accountIndex: number;
  private _walletAddress: string;

  constructor(credentials: LighterCredentials, assetClass: AssetClass = 'crypto') {
    super('lighter' as any, credentials, assetClass);
    this.accountIndex = credentials.accountIndex || 0;
    this._walletAddress = credentials.walletAddress || '';
  }

  /**
   * Set the Lighter account index
   */
  setAccountIndex(index: number): void {
    if (index < 3 || index > 254) {
      throw new ExchangeError('lighter' as any, 'INVALID_ACCOUNT', 'Account index must be between 3 and 254');
    }
    this.accountIndex = index;
  }

  /**
   * Set wallet address
   */
  setWalletAddress(address: string): void {
    this._walletAddress = address;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this._walletAddress;
  }

  protected getBaseUrl(): string {
    return 'https://mainnet.zklighter.elliot.ai';
  }

  protected async createSignature(
    method: string,
    endpoint: string,
    timestamp: string,
    params: Record<string, string> = {}
  ): Promise<string> {
    // Lighter uses API key + timestamp + body signature
    const sortedParams = Object.keys(params).sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const payload = `${timestamp}${method}${endpoint}${sortedParams}`;
    return this.hmacSha256(payload, this.credentials.apiSecret);
  }

  protected getAuthHeaders(timestamp: string, signature: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.credentials.apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'X-Account-Index': String(this.accountIndex)
    };
  }

  // ============================================================================
  // Price Conversion Helpers
  // ============================================================================

  /**
   * Convert decimal price to Lighter integer format
   */
  static toIntegerPrice(price: number): string {
    return Math.round(price * LighterExchange.PRICE_PRECISION).toString();
  }

  /**
   * Convert Lighter integer format to decimal price
   */
  static fromIntegerPrice(intPrice: string): number {
    return parseInt(intPrice) / LighterExchange.PRICE_PRECISION;
  }

  /**
   * Convert decimal size to Lighter integer format
   */
  static toIntegerSize(size: number): string {
    return Math.round(size * LighterExchange.SIZE_PRECISION).toString();
  }

  /**
   * Convert Lighter integer format to decimal size
   */
  static fromIntegerSize(intSize: string): number {
    return parseInt(intSize) / LighterExchange.SIZE_PRECISION;
  }

  // ============================================================================
  // Connection & Account Methods
  // ============================================================================

  async testConnection(): Promise<boolean> {
    try {
      const timestamp = Date.now().toString();
      const endpoint = `/api/v1/account/${this.accountIndex}`;
      const signature = await this.createSignature('GET', endpoint, timestamp);

      const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
        method: 'GET',
        headers: this.getAuthHeaders(timestamp, signature),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Lighter API error: ${response.status} - ${errorText}`);
      }

      const data: LighterApiResponse<LighterAccountInfo> = await response.json();

      if (!data.success) {
        this.handleLighterError(data.error || 'Connection test failed');
      }

      console.log('Lighter connection test successful');
      return true;
    } catch (error: unknown) {
      console.error('Lighter connection test failed:', error);
      throw error;
    }
  }

  async getBalance(): Promise<WalletBalance> {
    const timestamp = Date.now().toString();
    const endpoint = `/api/v1/account/${this.accountIndex}/balances`;
    const signature = await this.createSignature('GET', endpoint, timestamp);

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    const data: LighterApiResponse<{
      account: LighterAccountInfo;
      balances: LighterBalance[];
    }> = await response.json();

    if (!data.success || !data.data) {
      this.handleLighterError(data.error || 'Failed to fetch balance');
    }

    const accountData = data.data!.account;
    const balancesList = data.data!.balances || [];

    const balances: Balance[] = balancesList
      .filter(b => parseFloat(b.total) > 0)
      .map(b => ({
        currency: b.asset,
        total: parseFloat(b.total),
        available: parseFloat(b.available),
        locked: parseFloat(b.locked)
      }));

    return {
      accountType: 'LIGHTER',
      balances,
      totalEquityUsd: parseFloat(accountData.total_value),
      availableMarginUsd: parseFloat(accountData.available_margin),
      usedMarginUsd: parseFloat(accountData.used_margin)
    };
  }

  // ============================================================================
  // Trade Methods
  // ============================================================================

  async getTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 100
  ): Promise<Trade[]> {
    const timestamp = Date.now().toString();
    const params: Record<string, string> = {
      limit: limit.toString()
    };
    if (symbol) params.market = symbol;
    if (startTime) params.start_time = startTime.toString();
    if (endTime) params.end_time = endTime.toString();

    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/account/${this.accountIndex}/trades?${queryString}`;
    const signature = await this.createSignature('GET', endpoint, timestamp, params);

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(30000)
    });

    const data: LighterApiResponse<{ trades: LighterTrade[] }> = await response.json();

    if (!data.success || !data.data) {
      this.handleLighterError(data.error || 'Failed to fetch trades');
    }

    return (data.data!.trades || []).map(t => ({
      id: t.trade_id,
      orderId: t.order_id,
      symbol: t.market,
      side: t.side as OrderSide,
      price: LighterExchange.fromIntegerPrice(t.price),
      quantity: LighterExchange.fromIntegerSize(t.size),
      fee: parseFloat(t.fee),
      feeCurrency: t.fee_asset,
      timestamp: new Date(t.timestamp),
      isMaker: t.is_maker,
      category: 'perpetual',
      realizedPnl: parseFloat(t.realized_pnl)
    }));
  }

  // ============================================================================
  // Order Methods
  // ============================================================================

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    const timestamp = Date.now().toString();
    const params: Record<string, string> = {};
    if (symbol) params.market = symbol;

    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/account/${this.accountIndex}/orders${queryString ? '?' + queryString : ''}`;
    const signature = await this.createSignature('GET', endpoint, timestamp, params);

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    const data: LighterApiResponse<{ orders: LighterOrder[] }> = await response.json();

    if (!data.success || !data.data) {
      this.handleLighterError(data.error || 'Failed to fetch orders');
    }

    return (data.data!.orders || []).map(o => this.mapLighterOrder(o));
  }

  async getOrder(orderId: string, _symbol?: string): Promise<Order> {
    const timestamp = Date.now().toString();
    const endpoint = `/api/v1/order/${orderId}`;
    const signature = await this.createSignature('GET', endpoint, timestamp);

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    const data: LighterApiResponse<{ order: LighterOrder }> = await response.json();

    if (!data.success || !data.data) {
      this.handleLighterError(data.error || 'Order not found');
    }

    return this.mapLighterOrder(data.data!.order);
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const timestamp = Date.now().toString();

    const body: Record<string, string | number | boolean> = {
      account_index: this.accountIndex,
      market: request.symbol,
      side: request.side,
      order_type: this.mapOrderType(request.type),
      size: LighterExchange.toIntegerSize(request.quantity)
    };

    if (request.price && request.type !== 'market') {
      body.price = LighterExchange.toIntegerPrice(request.price);
    }

    if (request.stopPrice) {
      body.stop_price = LighterExchange.toIntegerPrice(request.stopPrice);
    }

    if (request.stopLoss) {
      body.stop_loss = LighterExchange.toIntegerPrice(request.stopLoss);
    }

    if (request.takeProfit) {
      body.take_profit = LighterExchange.toIntegerPrice(request.takeProfit);
    }

    if (request.timeInForce) {
      body.time_in_force = this.mapTimeInForce(request.timeInForce);
    }

    if (request.leverage) {
      body.leverage = request.leverage;
    }

    if (request.reduceOnly) {
      body.reduce_only = true;
    }

    if (request.clientOrderId) {
      body.client_order_id = request.clientOrderId;
    }

    const endpoint = '/api/v1/order';
    const bodyString = JSON.stringify(body);
    const signature = await this.createSignatureForPost(timestamp, bodyString);

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(timestamp, signature),
      body: bodyString,
      signal: AbortSignal.timeout(30000)
    });

    const data: LighterApiResponse<{ order: LighterOrder }> = await response.json();

    if (!data.success || !data.data) {
      this.handleLighterError(data.error || 'Failed to create order');
    }

    return this.mapLighterOrder(data.data!.order);
  }

  async cancelOrder(orderId: string, _symbol?: string): Promise<boolean> {
    const timestamp = Date.now().toString();
    const endpoint = `/api/v1/order/${orderId}`;
    const signature = await this.createSignature('DELETE', endpoint, timestamp);

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    const data: LighterApiResponse<unknown> = await response.json();

    if (!data.success) {
      this.handleLighterError(data.error || 'Failed to cancel order');
    }

    return true;
  }

  /**
   * Cancel all open orders
   */
  async cancelAllOrders(symbol?: string): Promise<boolean> {
    const timestamp = Date.now().toString();
    const body: Record<string, string | number> = {
      account_index: this.accountIndex
    };
    if (symbol) body.market = symbol;

    const endpoint = '/api/v1/orders/cancel-all';
    const bodyString = JSON.stringify(body);
    const signature = await this.createSignatureForPost(timestamp, bodyString);

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(timestamp, signature),
      body: bodyString,
      signal: AbortSignal.timeout(15000)
    });

    const data: LighterApiResponse<unknown> = await response.json();

    if (!data.success) {
      this.handleLighterError(data.error || 'Failed to cancel all orders');
    }

    return true;
  }

  private async createSignatureForPost(timestamp: string, body: string): Promise<string> {
    const payload = `${timestamp}POST${body}`;
    return this.hmacSha256(payload, this.credentials.apiSecret);
  }

  // ============================================================================
  // Position Methods
  // ============================================================================

  async getPositions(symbol?: string): Promise<Position[]> {
    const timestamp = Date.now().toString();
    const params: Record<string, string> = {};
    if (symbol) params.market = symbol;

    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/account/${this.accountIndex}/positions${queryString ? '?' + queryString : ''}`;
    const signature = await this.createSignature('GET', endpoint, timestamp, params);

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    const data: LighterApiResponse<{ positions: LighterPosition[] }> = await response.json();

    if (!data.success || !data.data) {
      this.handleLighterError(data.error || 'Failed to fetch positions');
    }

    return (data.data!.positions || [])
      .filter(p => parseFloat(p.size) !== 0)
      .map(p => ({
        id: `${p.market}-${this.accountIndex}`,
        symbol: p.market,
        side: p.side as 'long' | 'short',
        quantity: Math.abs(LighterExchange.fromIntegerSize(p.size)),
        entryPrice: LighterExchange.fromIntegerPrice(p.entry_price),
        markPrice: LighterExchange.fromIntegerPrice(p.mark_price),
        unrealizedPnl: parseFloat(p.unrealized_pnl),
        realizedPnl: parseFloat(p.realized_pnl),
        leverage: parseFloat(p.leverage),
        marginMode: p.margin_mode as MarginMode,
        liquidationPrice: LighterExchange.fromIntegerPrice(p.liquidation_price) || undefined,
        marginUsed: parseFloat(p.margin_used),
        createdAt: new Date(p.created_at)
      }));
  }

  // ============================================================================
  // Market Data Methods
  // ============================================================================

  async getMarketInfo(symbol: string): Promise<MarketInfo> {
    const endpoint = `/api/v1/markets/${symbol}`;

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      signal: AbortSignal.timeout(15000)
    });

    const data: LighterApiResponse<{ market: LighterMarket }> = await response.json();

    if (!data.success || !data.data) {
      this.handleLighterError(data.error || `Market ${symbol} not found`);
    }

    const market = data.data!.market;

    return {
      symbol: market.market,
      baseAsset: market.base_asset,
      quoteAsset: market.quote_asset,
      status: market.status === 'active' ? 'trading' : 'halt',
      minQuantity: parseFloat(market.min_order_size),
      maxQuantity: parseFloat(market.max_order_size),
      quantityPrecision: market.size_precision,
      minPrice: parseFloat(market.min_price),
      maxPrice: parseFloat(market.max_price),
      pricePrecision: market.price_precision,
      minNotional: 1, // Lighter default
      tickSize: parseFloat(market.tick_size),
      isSpot: false,
      isFutures: true,
      isMarginEnabled: true,
      maxLeverage: market.max_leverage || 50
    };
  }

  /**
   * Get all available markets
   */
  async getMarkets(): Promise<MarketInfo[]> {
    const endpoint = '/api/v1/markets';

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      signal: AbortSignal.timeout(15000)
    });

    const data: LighterApiResponse<{ markets: LighterMarket[] }> = await response.json();

    if (!data.success || !data.data) {
      this.handleLighterError(data.error || 'Failed to fetch markets');
    }

    return (data.data!.markets || []).map(m => ({
      symbol: m.market,
      baseAsset: m.base_asset,
      quoteAsset: m.quote_asset,
      status: m.status === 'active' ? 'trading' as const : 'halt' as const,
      minQuantity: parseFloat(m.min_order_size),
      maxQuantity: parseFloat(m.max_order_size),
      quantityPrecision: m.size_precision,
      minPrice: parseFloat(m.min_price),
      maxPrice: parseFloat(m.max_price),
      pricePrecision: m.price_precision,
      minNotional: 1,
      tickSize: parseFloat(m.tick_size),
      isSpot: false,
      isFutures: true,
      isMarginEnabled: true,
      maxLeverage: m.max_leverage || 50
    }));
  }

  async getOHLCV(
    symbol: string,
    timeframe: string,
    startTime?: number,
    endTime?: number,
    limit: number = 200
  ): Promise<OHLCV[]> {
    const params: Record<string, string> = {
      market: symbol,
      interval: this.mapTimeframe(timeframe),
      limit: String(limit)
    };
    if (startTime) params.start_time = String(startTime);
    if (endTime) params.end_time = String(endTime);

    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/api/v1/klines?${queryString}`;

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      signal: AbortSignal.timeout(30000)
    });

    const data: LighterApiResponse<{ klines: LighterKline[] }> = await response.json();

    if (!data.success || !data.data) {
      this.handleLighterError(data.error || 'Failed to fetch OHLCV');
    }

    return (data.data!.klines || []).map(k => ({
      timestamp: k.timestamp,
      open: parseFloat(k.open),
      high: parseFloat(k.high),
      low: parseFloat(k.low),
      close: parseFloat(k.close),
      volume: parseFloat(k.volume)
    }));
  }

  // ============================================================================
  // Risk & Position Sizing
  // ============================================================================

  async calculatePositionSize(
    riskAmount: number,
    entryPrice: number,
    stopLossPrice: number,
    leverage: number = 1,
    _marginMode: MarginMode = 'cross',
    _symbol?: string
  ): Promise<PositionSizeResult> {
    const balance = await this.getBalance();
    const availableBalance = balance.availableMarginUsd;

    const stopDistance = Math.abs(entryPrice - stopLossPrice);
    const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;
    const orderValue = positionSize * entryPrice;
    const marginRequired = orderValue / leverage;

    const canOpen = marginRequired <= availableBalance;
    const reason = !canOpen
      ? `Insufficient balance. Required: $${marginRequired.toFixed(2)}, Available: $${availableBalance.toFixed(2)}`
      : undefined;

    return {
      positionSize,
      orderValue,
      marginRequired,
      leverage,
      availableBalance,
      accountType: 'LIGHTER',
      canOpen,
      reason
    };
  }

  async validateRisk(
    riskAmount: number,
    entryPrice: number,
    stopLossPrice: number,
    leverage: number,
    marginMode: MarginMode,
    symbol: string,
    currentDailyLoss?: number,
    totalLoss?: number,
    startingCapital?: number
  ): Promise<RiskValidationResult> {
    const positionSize = await this.calculatePositionSize(
      riskAmount,
      entryPrice,
      stopLossPrice,
      leverage,
      marginMode,
      symbol
    );

    if (!positionSize.canOpen) {
      return { valid: false, reason: positionSize.reason };
    }

    const warnings: string[] = [];

    // Check MDL (5% daily limit)
    if (startingCapital && currentDailyLoss !== undefined) {
      const mdlLimit = startingCapital * 0.05;
      if (currentDailyLoss + riskAmount >= mdlLimit) {
        return {
          valid: false,
          reason: `Would exceed MDL limit: $${(currentDailyLoss + riskAmount).toFixed(2)} / $${mdlLimit.toFixed(2)}`
        };
      }

      if (currentDailyLoss + riskAmount >= mdlLimit * 0.8) {
        warnings.push(`Approaching MDL limit (80%)`);
      }
    }

    // Check ML (10% total limit)
    if (startingCapital && totalLoss !== undefined) {
      const mlLimit = startingCapital * 0.10;
      if (totalLoss >= mlLimit) {
        return {
          valid: false,
          reason: `Maximum Loss (ML) limit reached: $${totalLoss.toFixed(2)} / $${mlLimit.toFixed(2)}`
        };
      }
    }

    // Lighter-specific: Warn about high leverage
    if (leverage > 20) {
      warnings.push(`High leverage (${leverage}x) - increased liquidation risk`);
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      riskMetrics: startingCapital ? {
        positionRisk: riskAmount / startingCapital,
        accountRisk: positionSize.marginRequired / positionSize.availableBalance,
        dailyLossUsed: currentDailyLoss ? currentDailyLoss / (startingCapital * 0.05) : 0,
        totalLossUsed: totalLoss ? totalLoss / (startingCapital * 0.10) : 0
      } : undefined
    };
  }

  // ============================================================================
  // Exchange Info Methods
  // ============================================================================

  getCapabilities(): ExchangeCapabilities {
    return {
      spot: false,
      futures: true,
      options: false,
      margin: true,
      crossMargin: true,
      isolatedMargin: true,
      websocket: true,
      orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
      maxLeverage: 50,
      supportedTimeframes: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']
    };
  }

  getRateLimits(): RateLimits {
    return {
      requestsPerSecond: 10,
      requestsPerMinute: 600,
      ordersPerSecond: 5,
      ordersPerMinute: 100
    };
  }

  formatSymbol(baseAsset: string, quoteAsset: string): string {
    return `${baseAsset}-${quoteAsset}`.toUpperCase();
  }

  parseSymbol(symbol: string): { baseAsset: string; quoteAsset: string } {
    const parts = symbol.split('-');
    if (parts.length === 2) {
      return {
        baseAsset: parts[0],
        quoteAsset: parts[1]
      };
    }

    // Fallback for symbols without dash
    const quoteAssets = ['USDT', 'USDC', 'USD'];
    for (const quote of quoteAssets) {
      if (symbol.endsWith(quote)) {
        return {
          baseAsset: symbol.slice(0, -quote.length),
          quoteAsset: quote
        };
      }
    }

    return {
      baseAsset: symbol,
      quoteAsset: 'USDT'
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapLighterOrder(order: LighterOrder): Order {
    return {
      id: order.order_id,
      clientOrderId: order.client_order_id,
      symbol: order.market,
      side: order.side as OrderSide,
      type: this.reverseMapOrderType(order.order_type),
      status: this.mapOrderStatus(order.status),
      price: LighterExchange.fromIntegerPrice(order.price),
      quantity: LighterExchange.fromIntegerSize(order.size),
      filledQuantity: LighterExchange.fromIntegerSize(order.filled_size),
      averagePrice: order.avg_fill_price ? LighterExchange.fromIntegerPrice(order.avg_fill_price) : undefined,
      timeInForce: order.time_in_force.toLowerCase() as TimeInForce,
      leverage: parseFloat(order.leverage),
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at)
    };
  }

  private mapOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      'new': 'open',
      'open': 'open',
      'partially_filled': 'partially_filled',
      'filled': 'filled',
      'cancelled': 'cancelled',
      'rejected': 'rejected',
      'pending': 'pending',
      'expired': 'cancelled'
    };
    return mapping[status.toLowerCase()] || 'pending';
  }

  private mapOrderType(type: OrderType): string {
    const mapping: Record<OrderType, string> = {
      market: 'market',
      limit: 'limit',
      stop: 'stop_market',
      stop_limit: 'stop_limit'
    };
    return mapping[type] || 'market';
  }

  private reverseMapOrderType(type: string): OrderType {
    const mapping: Record<string, OrderType> = {
      'market': 'market',
      'limit': 'limit',
      'stop_market': 'stop',
      'stop_limit': 'stop_limit'
    };
    return mapping[type] || 'market';
  }

  private mapTimeInForce(tif: TimeInForce): string {
    const mapping: Record<TimeInForce, string> = {
      gtc: 'GTC',
      ioc: 'IOC',
      fok: 'FOK',
      post_only: 'POST_ONLY'
    };
    return mapping[tif] || 'GTC';
  }

  private mapTimeframe(timeframe: string): string {
    const mapping: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w'
    };
    return mapping[timeframe] || timeframe;
  }

  private handleLighterError(message: string): never {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('invalid api key') || lowerMsg.includes('unauthorized')) {
      throw new AuthenticationError('lighter' as any, 'Invalid API key or unauthorized');
    }

    if (lowerMsg.includes('invalid signature')) {
      throw new AuthenticationError('lighter' as any, 'Invalid signature. Check your API secret.');
    }

    if (lowerMsg.includes('account not found')) {
      throw new ExchangeError('lighter' as any, 'ACCOUNT_NOT_FOUND', 'Lighter account not found. Please create an account first.');
    }

    if (lowerMsg.includes('insufficient')) {
      throw new ExchangeError('lighter' as any, 'INSUFFICIENT_BALANCE', message);
    }

    if (lowerMsg.includes('rate limit')) {
      throw new ExchangeError('lighter' as any, 'RATE_LIMIT', 'Rate limit exceeded. Please try again later.');
    }

    throw new ExchangeError('lighter' as any, 'UNKNOWN', message);
  }
}

/**
 * Coinbase Exchange Implementation
 *
 * Connects to Coinbase Advanced Trade API (formerly Coinbase Pro).
 * Supports spot trading and portfolio management.
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
  TimeInForce,
  MarginMode,
  AuthenticationError,
  ExchangeError
} from './ExchangeInterface';

// ============================================================================
// Coinbase API Types
// ============================================================================

interface CoinbaseAccount {
  uuid: string;
  name: string;
  currency: string;
  available_balance: {
    value: string;
    currency: string;
  };
  hold: {
    value: string;
    currency: string;
  };
  type: string;
  ready: boolean;
}

interface CoinbaseFill {
  entry_id: string;
  trade_id: string;
  order_id: string;
  trade_time: string;
  trade_type: string;
  price: string;
  size: string;
  commission: string;
  product_id: string;
  sequence_timestamp: string;
  liquidity_indicator: string;
  size_in_quote: boolean;
  user_id: string;
  side: 'BUY' | 'SELL';
}

interface CoinbaseOrder {
  order_id: string;
  product_id: string;
  user_id: string;
  order_configuration: {
    market_market_ioc?: {
      quote_size?: string;
      base_size?: string;
    };
    limit_limit_gtc?: {
      base_size: string;
      limit_price: string;
      post_only: boolean;
    };
    limit_limit_fok?: {
      base_size: string;
      limit_price: string;
    };
  };
  side: 'BUY' | 'SELL';
  client_order_id: string;
  status: string;
  time_in_force: string;
  created_time: string;
  completion_percentage: string;
  filled_size: string;
  average_filled_price: string;
  fee: string;
  number_of_fills: string;
  filled_value: string;
  pending_cancel: boolean;
  size_in_quote: boolean;
  total_fees: string;
  size_inclusive_of_fees: boolean;
  total_value_after_fees: string;
  trigger_status: string;
  order_type: string;
  reject_reason: string;
  settled: boolean;
  product_type: string;
}

interface CoinbaseProduct {
  product_id: string;
  price: string;
  price_percentage_change_24h: string;
  volume_24h: string;
  volume_percentage_change_24h: string;
  base_increment: string;
  quote_increment: string;
  quote_min_size: string;
  quote_max_size: string;
  base_min_size: string;
  base_max_size: string;
  base_name: string;
  quote_name: string;
  watched: boolean;
  is_disabled: boolean;
  new: boolean;
  status: string;
  cancel_only: boolean;
  limit_only: boolean;
  post_only: boolean;
  trading_disabled: boolean;
  auction_mode: boolean;
  product_type: string;
  quote_currency_id: string;
  base_currency_id: string;
  mid_market_price: string;
  base_display_symbol: string;
  quote_display_symbol: string;
}

interface CoinbaseCandle {
  start: string;
  low: string;
  high: string;
  open: string;
  close: string;
  volume: string;
}

// ============================================================================
// Coinbase Exchange Class
// ============================================================================

export class CoinbaseExchange extends ExchangeInterface {
  protected testnetUrl = 'https://api-sandbox.coinbase.com';
  private apiVersion = '2024-01-01';

  constructor(credentials: ExchangeCredentials, assetClass: AssetClass = 'crypto') {
    super('coinbase', credentials, assetClass);
  }

  // ============================================================================
  // Abstract Method Implementations
  // ============================================================================

  protected getBaseUrl(): string {
    return this.credentials.testnet
      ? 'https://api-sandbox.coinbase.com'
      : 'https://api.coinbase.com';
  }

  protected async createSignature(
    method: string,
    endpoint: string,
    timestamp: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _params?: Record<string, string>
  ): Promise<string> {
    const message = `${timestamp}${method}${endpoint}`;
    return this.hmacSha256(message, this.credentials.apiSecret);
  }

  protected getAuthHeaders(timestamp: string, signature: string): Record<string, string> {
    const headers: Record<string, string> = {
      'CB-ACCESS-KEY': this.credentials.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'CB-VERSION': this.apiVersion,
      'Content-Type': 'application/json'
    };

    if (this.credentials.passphrase) {
      headers['CB-ACCESS-PASSPHRASE'] = this.credentials.passphrase;
    }

    return headers;
  }

  // ============================================================================
  // Connection & Account
  // ============================================================================

  async testConnection(): Promise<boolean> {
    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const endpoint = '/api/v3/brokerage/accounts';
      const signature = await this.createSignature('GET', endpoint, timestamp);

      const url = `${this.getBaseUrl()}${endpoint}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(timestamp, signature),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const text = await response.text();
        if (response.status === 401) {
          throw new AuthenticationError('coinbase', `Authentication failed: ${text}`);
        }
        throw new ExchangeError('coinbase', 'CONNECTION_ERROR', text);
      }

      return true;
    } catch (error: unknown) {
      console.error('Coinbase connection test failed:', error);
      if (error instanceof AuthenticationError || error instanceof ExchangeError) {
        throw error;
      }
      return false;
    }
  }

  async getBalance(): Promise<WalletBalance> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const endpoint = '/api/v3/brokerage/accounts';
    const signature = await this.createSignature('GET', endpoint, timestamp);

    const url = `${this.getBaseUrl()}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('coinbase', 'BALANCE_ERROR', text);
    }

    const data: { accounts: CoinbaseAccount[] } = await response.json();

    const balances: Balance[] = data.accounts
      .filter(acc => parseFloat(acc.available_balance.value) > 0 || parseFloat(acc.hold.value) > 0)
      .map(acc => ({
        currency: acc.currency,
        total: parseFloat(acc.available_balance.value) + parseFloat(acc.hold.value),
        available: parseFloat(acc.available_balance.value),
        locked: parseFloat(acc.hold.value)
      }));

    const usdBalance = balances.find(b => b.currency === 'USD');

    return {
      accountType: 'SPOT',
      balances,
      totalEquityUsd: usdBalance?.total || 0,
      availableMarginUsd: usdBalance?.available || 0,
      usedMarginUsd: usdBalance?.locked || 0
    };
  }

  // ============================================================================
  // Trading
  // ============================================================================

  async getTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<Trade[]> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    let endpoint = '/api/v3/brokerage/orders/historical/fills';

    const params: string[] = [];
    if (symbol) params.push(`product_id=${symbol}`);
    if (startTime) params.push(`start_sequence_timestamp=${new Date(startTime).toISOString()}`);
    if (endTime) params.push(`end_sequence_timestamp=${new Date(endTime).toISOString()}`);
    params.push(`limit=${limit || 100}`);

    if (params.length > 0) {
      endpoint += '?' + params.join('&');
    }

    const signature = await this.createSignature('GET', endpoint, timestamp);

    const url = `${this.getBaseUrl()}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('coinbase', 'TRADES_ERROR', text);
    }

    const data: { fills: CoinbaseFill[] } = await response.json();

    return data.fills.map(fill => this.mapFillToTrade(fill));
  }

  private mapFillToTrade(fill: CoinbaseFill): Trade {
    const [, quote] = fill.product_id.split('-');
    return {
      id: fill.trade_id,
      orderId: fill.order_id,
      symbol: fill.product_id,
      side: fill.side === 'BUY' ? 'buy' as OrderSide : 'sell' as OrderSide,
      price: parseFloat(fill.price),
      quantity: parseFloat(fill.size),
      fee: parseFloat(fill.commission),
      feeCurrency: quote,
      timestamp: new Date(fill.trade_time),
      isMaker: fill.liquidity_indicator === 'MAKER',
      category: 'spot'
    };
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    let endpoint = '/api/v3/brokerage/orders/historical';

    const params: string[] = ['order_status=OPEN'];
    if (symbol) params.push(`product_id=${symbol}`);

    endpoint += '?' + params.join('&');

    const signature = await this.createSignature('GET', endpoint, timestamp);

    const url = `${this.getBaseUrl()}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('coinbase', 'ORDERS_ERROR', text);
    }

    const data: { orders: CoinbaseOrder[] } = await response.json();

    return data.orders.map(order => this.mapCoinbaseOrder(order));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getOrder(orderId: string, _symbol?: string): Promise<Order> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const endpoint = `/api/v3/brokerage/orders/historical/${orderId}`;
    const signature = await this.createSignature('GET', endpoint, timestamp);

    const url = `${this.getBaseUrl()}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('coinbase', 'ORDER_ERROR', text);
    }

    const data: { order: CoinbaseOrder } = await response.json();

    return this.mapCoinbaseOrder(data.order);
  }

  private mapCoinbaseOrder(order: CoinbaseOrder): Order {
    let price = 0;
    let quantity = 0;

    if (order.order_configuration.limit_limit_gtc) {
      price = parseFloat(order.order_configuration.limit_limit_gtc.limit_price);
      quantity = parseFloat(order.order_configuration.limit_limit_gtc.base_size);
    } else if (order.order_configuration.market_market_ioc) {
      quantity = parseFloat(order.order_configuration.market_market_ioc.base_size || '0');
    } else if (order.order_configuration.limit_limit_fok) {
      price = parseFloat(order.order_configuration.limit_limit_fok.limit_price);
      quantity = parseFloat(order.order_configuration.limit_limit_fok.base_size);
    }

    return {
      id: order.order_id,
      clientOrderId: order.client_order_id,
      symbol: order.product_id,
      side: order.side === 'BUY' ? 'buy' as OrderSide : 'sell' as OrderSide,
      type: this.mapOrderType(order.order_type),
      status: this.mapOrderStatus(order.status),
      price,
      quantity,
      filledQuantity: parseFloat(order.filled_size) || 0,
      averagePrice: parseFloat(order.average_filled_price) || undefined,
      timeInForce: this.mapTimeInForce(order.time_in_force),
      createdAt: new Date(order.created_time),
      updatedAt: new Date(order.created_time)
    };
  }

  private mapOrderType(type: string): OrderType {
    const mapping: Record<string, OrderType> = {
      'MARKET': 'market',
      'LIMIT': 'limit',
      'STOP': 'stop',
      'STOP_LIMIT': 'stop_limit'
    };
    return mapping[type] || 'market';
  }

  private mapOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      'PENDING': 'pending',
      'OPEN': 'open',
      'FILLED': 'filled',
      'CANCELLED': 'cancelled',
      'EXPIRED': 'cancelled',
      'FAILED': 'rejected'
    };
    return mapping[status] || 'pending';
  }

  private mapTimeInForce(tif: string): TimeInForce {
    const mapping: Record<string, TimeInForce> = {
      'GTC': 'gtc',
      'IOC': 'ioc',
      'FOK': 'fok',
      'POST_ONLY': 'post_only'
    };
    return mapping[tif] || 'gtc';
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const endpoint = '/api/v3/brokerage/orders';
    const clientOrderId = request.clientOrderId || `circl_${Date.now()}`;

    let orderConfiguration: Record<string, unknown>;

    if (request.type === 'market') {
      orderConfiguration = {
        market_market_ioc: {
          base_size: request.quantity.toString()
        }
      };
    } else {
      orderConfiguration = {
        limit_limit_gtc: {
          base_size: request.quantity.toString(),
          limit_price: request.price!.toString(),
          post_only: request.timeInForce === 'post_only'
        }
      };
    }

    const body = {
      client_order_id: clientOrderId,
      product_id: request.symbol,
      side: request.side.toUpperCase(),
      order_configuration: orderConfiguration
    };

    const bodyStr = JSON.stringify(body);
    const signatureMessage = `${timestamp}POST${endpoint}${bodyStr}`;
    const signature = await this.hmacSha256(signatureMessage, this.credentials.apiSecret);

    const url = `${this.getBaseUrl()}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(timestamp, signature),
      body: bodyStr,
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('coinbase', 'CREATE_ORDER_ERROR', text);
    }

    const data: { success: boolean; order_id: string; order: CoinbaseOrder } = await response.json();

    if (!data.success) {
      throw new ExchangeError('coinbase', 'CREATE_ORDER_FAILED', 'Order creation failed');
    }

    return this.mapCoinbaseOrder(data.order);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async cancelOrder(orderId: string, _symbol?: string): Promise<boolean> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const endpoint = '/api/v3/brokerage/orders/batch_cancel';
    const body = { order_ids: [orderId] };
    const bodyStr = JSON.stringify(body);

    const signatureMessage = `${timestamp}POST${endpoint}${bodyStr}`;
    const signature = await this.hmacSha256(signatureMessage, this.credentials.apiSecret);

    const url = `${this.getBaseUrl()}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(timestamp, signature),
      body: bodyStr,
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('coinbase', 'CANCEL_ORDER_ERROR', text);
    }

    const data: { results: Array<{ success: boolean; order_id: string }> } = await response.json();

    return data.results?.[0]?.success || false;
  }

  // ============================================================================
  // Positions (Spot only - represented by balances)
  // ============================================================================

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getPositions(_symbol?: string): Promise<Position[]> {
    const balance = await this.getBalance();

    return balance.balances
      .filter(b => b.currency !== 'USD' && b.total > 0)
      .map(b => ({
        id: `${b.currency}-USD`,
        symbol: `${b.currency}-USD`,
        side: 'long' as const,
        quantity: b.total,
        entryPrice: 0,
        markPrice: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        leverage: 1,
        marginMode: 'cross' as MarginMode,
        marginUsed: 0,
        createdAt: new Date()
      }));
  }

  // ============================================================================
  // Market Data
  // ============================================================================

  async getMarketInfo(symbol: string): Promise<MarketInfo> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const endpoint = `/api/v3/brokerage/products/${symbol}`;
    const signature = await this.createSignature('GET', endpoint, timestamp);

    const url = `${this.getBaseUrl()}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('coinbase', 'MARKET_INFO_ERROR', text);
    }

    const product: CoinbaseProduct = await response.json();
    const [baseAsset, quoteAsset] = product.product_id.split('-');

    return {
      symbol: product.product_id,
      baseAsset,
      quoteAsset,
      status: product.trading_disabled ? 'halt' : 'trading',
      minQuantity: parseFloat(product.base_min_size),
      maxQuantity: parseFloat(product.base_max_size),
      quantityPrecision: this.getPrecision(product.base_increment),
      minPrice: 0,
      maxPrice: 0,
      pricePrecision: this.getPrecision(product.quote_increment),
      minNotional: parseFloat(product.quote_min_size),
      tickSize: parseFloat(product.quote_increment),
      isSpot: true,
      isFutures: false,
      isMarginEnabled: false,
      maxLeverage: 1
    };
  }

  async getOHLCV(
    symbol: string,
    timeframe: string,
    startTime?: number,
    endTime?: number,
    limit?: number
  ): Promise<OHLCV[]> {
    const granularityMap: Record<string, string> = {
      '1m': 'ONE_MINUTE',
      '5m': 'FIVE_MINUTE',
      '15m': 'FIFTEEN_MINUTE',
      '30m': 'THIRTY_MINUTE',
      '1h': 'ONE_HOUR',
      '2h': 'TWO_HOUR',
      '6h': 'SIX_HOUR',
      '1d': 'ONE_DAY'
    };

    const timestamp = Math.floor(Date.now() / 1000).toString();
    let endpoint = `/api/v3/brokerage/products/${symbol}/candles`;

    const params: string[] = [];
    params.push(`granularity=${granularityMap[timeframe] || 'ONE_HOUR'}`);
    if (startTime) params.push(`start=${Math.floor(startTime / 1000)}`);
    if (endTime) params.push(`end=${Math.floor(endTime / 1000)}`);

    endpoint += '?' + params.join('&');

    const signature = await this.createSignature('GET', endpoint, timestamp);

    const url = `${this.getBaseUrl()}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('coinbase', 'OHLCV_ERROR', text);
    }

    const data: { candles: CoinbaseCandle[] } = await response.json();

    return data.candles.slice(0, limit || 500).map(candle => ({
      timestamp: parseInt(candle.start) * 1000,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume)
    }));
  }

  // ============================================================================
  // Risk Management
  // ============================================================================

  async calculatePositionSize(
    riskAmount: number,
    entryPrice: number,
    stopLossPrice: number,
    leverage: number = 1,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _marginMode: MarginMode = 'cross',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      accountType: balance.accountType,
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
        warnings.push(`Approaching MDL limit (80%): $${(currentDailyLoss + riskAmount).toFixed(2)} / $${mdlLimit.toFixed(2)}`);
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
  // Exchange Info
  // ============================================================================

  getCapabilities(): ExchangeCapabilities {
    return {
      spot: true,
      futures: false,
      options: false,
      margin: false,
      crossMargin: false,
      isolatedMargin: false,
      websocket: true,
      orderTypes: ['market', 'limit'],
      maxLeverage: 1,
      supportedTimeframes: ['1m', '5m', '15m', '30m', '1h', '2h', '6h', '1d']
    };
  }

  getRateLimits(): RateLimits {
    return {
      requestsPerSecond: 10,
      requestsPerMinute: 600,
      ordersPerSecond: 5,
      ordersPerMinute: 30
    };
  }

  formatSymbol(baseAsset: string, quoteAsset: string): string {
    return `${baseAsset}-${quoteAsset}`.toUpperCase();
  }

  parseSymbol(symbol: string): { baseAsset: string; quoteAsset: string } {
    const parts = symbol.split('-');
    if (parts.length === 2) {
      return { baseAsset: parts[0], quoteAsset: parts[1] };
    }
    // Fallback
    return { baseAsset: symbol.slice(0, 3), quoteAsset: symbol.slice(3) };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getPrecision(stepSize: string): number {
    if (!stepSize || stepSize === '0') return 8;
    const parts = stepSize.split('.');
    if (parts.length === 2) {
      return parts[1].replace(/0+$/, '').length;
    }
    return 0;
  }
}

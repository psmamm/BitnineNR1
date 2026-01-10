/**
 * Bybit Exchange Implementation (V2)
 *
 * Implements the ExchangeInterface for Bybit V5 API.
 * Supports Spot, Linear (USDT Perpetual), Inverse, and Options.
 *
 * API Documentation: https://bybit-exchange.github.io/docs/
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
// Bybit-Specific Types
// ============================================================================

export interface BybitApiResponse<T> {
  retCode: number;
  retMsg: string;
  result?: T;
  time?: number;
}

interface BybitWalletCoin {
  coin: string;
  equity: string;
  availableToWithdraw: string;
  walletBalance: string;
  unrealisedPnl: string;
  cumRealisedPnl: string;
}

interface BybitExecution {
  execId: string;
  symbol: string;
  price: string;
  qty: string;
  side: 'Buy' | 'Sell';
  execTime: string;
  isMaker: boolean;
  execFee: string;
  feeRate: string;
  feeCurrency?: string;
  orderId: string;
  orderLinkId?: string;
  category: string;
  closedSize?: string;
}

interface BybitOrder {
  orderId: string;
  orderLinkId: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit';
  price: string;
  qty: string;
  cumExecQty: string;
  cumExecValue: string;
  avgPrice: string;
  orderStatus: string;
  timeInForce: string;
  stopLoss?: string;
  takeProfit?: string;
  createdTime: string;
  updatedTime: string;
  positionIdx?: number;
  leverage?: string;
}

interface BybitPosition {
  symbol: string;
  side: 'Buy' | 'Sell' | 'None';
  size: string;
  avgPrice: string;
  markPrice: string;
  unrealisedPnl: string;
  cumRealisedPnl: string;
  leverage: string;
  tradeMode: number; // 0: cross, 1: isolated
  liqPrice: string;
  positionValue: string;
  positionIdx: number;
  createdTime: string;
  updatedTime: string;
}

interface BybitInstrument {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  status: string;
  lotSizeFilter: {
    minOrderQty: string;
    maxOrderQty: string;
    qtyStep: string;
  };
  priceFilter: {
    minPrice: string;
    maxPrice: string;
    tickSize: string;
  };
  leverageFilter?: {
    maxLeverage: string;
  };
}


// ============================================================================
// Bybit Exchange Class
// ============================================================================

export class BybitExchangeV2 extends ExchangeInterface {
  protected testnetUrl = 'https://api-testnet.bybit.com';
  private recvWindow = '5000';
  private category: 'spot' | 'linear' | 'inverse' | 'option' = 'linear';

  constructor(credentials: ExchangeCredentials, assetClass: AssetClass = 'crypto') {
    super('bybit', credentials, assetClass);
  }

  /**
   * Set market category
   */
  setCategory(category: 'spot' | 'linear' | 'inverse' | 'option'): void {
    this.category = category;
  }

  protected getBaseUrl(): string {
    return this.credentials.testnet
      ? 'https://api-testnet.bybit.com'
      : 'https://api.bybit.com';
  }

  protected async createSignature(
    _method: string,
    _endpoint: string,
    timestamp: string,
    params: Record<string, string> = {}
  ): Promise<string> {
    // Sort all parameters alphabetically
    const sortedKeys = Object.keys(params).sort();
    const queryString = sortedKeys
      .map(key => `${key}=${params[key]}`)
      .join('&');

    // Bybit v5 signature: timestamp + apiKey + recvWindow + queryString
    const payload = timestamp + this.credentials.apiKey + this.recvWindow + queryString;

    return this.hmacSha256(payload, this.credentials.apiSecret);
  }

  protected getAuthHeaders(timestamp: string, signature: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-BAPI-API-KEY': this.credentials.apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': this.recvWindow,
      'X-BAPI-SIGN': signature
    };
  }

  // ============================================================================
  // Connection & Account Methods
  // ============================================================================

  async testConnection(): Promise<boolean> {
    try {
      const timestamp = Date.now().toString();
      const params: Record<string, string> = { accountType: 'UNIFIED' };
      const signature = await this.createSignature('GET', '/v5/account/wallet-balance', timestamp, params);

      const url = new URL('/v5/account/wallet-balance', this.getBaseUrl());
      url.searchParams.append('accountType', 'UNIFIED');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getAuthHeaders(timestamp, signature),
        signal: AbortSignal.timeout(15000)
      });

      const data: BybitApiResponse<unknown> = await response.json();

      if (data.retCode !== 0) {
        this.handleBybitError(data.retCode, data.retMsg);
      }

      console.log('Bybit connection test successful');
      return true;
    } catch (error: unknown) {
      console.error('Bybit connection test failed:', error);
      throw error;
    }
  }

  async getBalance(): Promise<WalletBalance> {
    const timestamp = Date.now().toString();
    const params: Record<string, string> = { accountType: 'UNIFIED' };
    const signature = await this.createSignature('GET', '/v5/account/wallet-balance', timestamp, params);

    const url = new URL('/v5/account/wallet-balance', this.getBaseUrl());
    url.searchParams.append('accountType', 'UNIFIED');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    const data: BybitApiResponse<{ list: Array<{ coin: BybitWalletCoin[]; totalEquity: string; totalMarginBalance: string; totalAvailableBalance: string }> }> = await response.json();

    if (data.retCode !== 0) {
      this.handleBybitError(data.retCode, data.retMsg);
    }

    const accountData = data.result?.list?.[0];
    const coins = accountData?.coin || [];

    const balances: Balance[] = coins
      .filter(c => parseFloat(c.walletBalance) > 0)
      .map(c => ({
        currency: c.coin,
        total: parseFloat(c.walletBalance),
        available: parseFloat(c.availableToWithdraw),
        locked: parseFloat(c.walletBalance) - parseFloat(c.availableToWithdraw)
      }));

    return {
      accountType: 'UNIFIED',
      balances,
      totalEquityUsd: parseFloat(accountData?.totalEquity || '0'),
      availableMarginUsd: parseFloat(accountData?.totalAvailableBalance || '0'),
      usedMarginUsd: parseFloat(accountData?.totalMarginBalance || '0') - parseFloat(accountData?.totalAvailableBalance || '0')
    };
  }

  // ============================================================================
  // Trade Methods
  // ============================================================================

  async getTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 50
  ): Promise<Trade[]> {
    const allTrades: Trade[] = [];
    const categories: Array<'spot' | 'linear' | 'inverse' | 'option'> = ['spot', 'linear', 'inverse', 'option'];

    const now = Date.now();
    const since = startTime || (now - (180 * 24 * 60 * 60 * 1000));
    const until = endTime || now;

    // Bybit API limit: max 7 days per request
    const MAX_MS_PER_REQUEST = 7 * 24 * 60 * 60 * 1000;

    for (const category of categories) {
      try {
        let currentStart = since;

        while (currentStart < until) {
          const currentEnd = Math.min(currentStart + MAX_MS_PER_REQUEST, until);

          const trades = await this.fetchTradesForCategory(
            category,
            symbol,
            currentStart,
            currentEnd,
            limit
          );

          allTrades.push(...trades);
          currentStart = currentEnd + 1;

          if (currentStart < until) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (message?.includes('category') || message?.includes('Permission')) {
          console.log(`Skipping category ${category}: ${message}`);
        } else {
          throw error;
        }
      }
    }

    // Remove duplicates and sort
    const uniqueTrades = Array.from(
      new Map(allTrades.map(t => [t.id, t])).values()
    );
    uniqueTrades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return uniqueTrades;
  }

  private async fetchTradesForCategory(
    category: 'spot' | 'linear' | 'inverse' | 'option',
    symbol: string | undefined,
    startTime: number,
    endTime: number,
    limit: number
  ): Promise<Trade[]> {
    const timestamp = Date.now().toString();
    const params: Record<string, string> = {
      category,
      startTime: startTime.toString(),
      endTime: endTime.toString(),
      limit: limit.toString()
    };
    if (symbol) params.symbol = symbol;

    const signature = await this.createSignature('GET', '/v5/execution/list', timestamp, params);

    const url = new URL('/v5/execution/list', this.getBaseUrl());
    Object.keys(params).sort().forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(30000)
    });

    const data: BybitApiResponse<{ list: BybitExecution[] }> = await response.json();

    if (data.retCode !== 0) {
      if (data.retCode === 10001 && data.retMsg?.includes('category')) {
        return [];
      }
      this.handleBybitError(data.retCode, data.retMsg);
    }

    return (data.result?.list || []).map(e => ({
      id: e.execId,
      orderId: e.orderId,
      symbol: e.symbol,
      side: e.side.toLowerCase() as OrderSide,
      price: parseFloat(e.price),
      quantity: parseFloat(e.qty),
      fee: parseFloat(e.execFee),
      feeCurrency: e.feeCurrency || 'USDT',
      timestamp: new Date(parseInt(e.execTime)),
      isMaker: e.isMaker,
      category: e.category
    }));
  }

  // ============================================================================
  // Order Methods
  // ============================================================================

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    const timestamp = Date.now().toString();
    const params: Record<string, string> = { category: this.category };
    if (symbol) params.symbol = symbol;

    const signature = await this.createSignature('GET', '/v5/order/realtime', timestamp, params);

    const url = new URL('/v5/order/realtime', this.getBaseUrl());
    Object.keys(params).sort().forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    const data: BybitApiResponse<{ list: BybitOrder[] }> = await response.json();

    if (data.retCode !== 0) {
      this.handleBybitError(data.retCode, data.retMsg);
    }

    return (data.result?.list || []).map(o => this.mapBybitOrder(o));
  }

  async getOrder(orderId: string, symbol?: string): Promise<Order> {
    const timestamp = Date.now().toString();
    const params: Record<string, string> = {
      category: this.category,
      orderId
    };
    if (symbol) params.symbol = symbol;

    const signature = await this.createSignature('GET', '/v5/order/realtime', timestamp, params);

    const url = new URL('/v5/order/realtime', this.getBaseUrl());
    Object.keys(params).sort().forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    const data: BybitApiResponse<{ list: BybitOrder[] }> = await response.json();

    if (data.retCode !== 0) {
      this.handleBybitError(data.retCode, data.retMsg);
    }

    const order = data.result?.list?.[0];
    if (!order) {
      throw new ExchangeError('bybit', 'ORDER_NOT_FOUND', `Order ${orderId} not found`);
    }

    return this.mapBybitOrder(order);
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const timestamp = Date.now().toString();

    const body: Record<string, string | number | boolean | undefined> = {
      category: this.category,
      symbol: request.symbol,
      side: request.side === 'buy' ? 'Buy' : 'Sell',
      orderType: request.type === 'market' ? 'Market' : 'Limit',
      qty: String(request.quantity)
    };

    if (request.price && request.type !== 'market') {
      body.price = String(request.price);
    }

    if (request.stopLoss) {
      body.stopLoss = String(request.stopLoss);
    }

    if (request.takeProfit) {
      body.takeProfit = String(request.takeProfit);
    }

    if (request.timeInForce) {
      body.timeInForce = this.mapTimeInForce(request.timeInForce);
    } else if (request.type === 'limit') {
      body.timeInForce = 'GTC';
    }

    if (request.clientOrderId) {
      body.orderLinkId = request.clientOrderId;
    }

    if (request.reduceOnly) {
      body.reduceOnly = true;
    }

    // For linear, need to specify positionIdx (0 = one-way mode)
    if (this.category === 'linear') {
      body.positionIdx = 0;
    }

    const bodyString = JSON.stringify(body);
    const signature = await this.createSignatureForPost(timestamp, bodyString);

    const response = await fetch(`${this.getBaseUrl()}/v5/order/create`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(timestamp, signature),
        'Content-Type': 'application/json'
      },
      body: bodyString,
      signal: AbortSignal.timeout(30000)
    });

    const data: BybitApiResponse<{ orderId: string; orderLinkId: string }> = await response.json();

    if (data.retCode !== 0) {
      this.handleBybitError(data.retCode, data.retMsg);
    }

    // Fetch the created order details
    return this.getOrder(data.result!.orderId, request.symbol);
  }

  async cancelOrder(orderId: string, symbol?: string): Promise<boolean> {
    if (!symbol) {
      throw new ExchangeError('bybit', 'SYMBOL_REQUIRED', 'Symbol is required for Bybit order cancellation');
    }

    const timestamp = Date.now().toString();
    const body = {
      category: this.category,
      symbol,
      orderId
    };

    const bodyString = JSON.stringify(body);
    const signature = await this.createSignatureForPost(timestamp, bodyString);

    const response = await fetch(`${this.getBaseUrl()}/v5/order/cancel`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(timestamp, signature),
        'Content-Type': 'application/json'
      },
      body: bodyString,
      signal: AbortSignal.timeout(15000)
    });

    const data: BybitApiResponse<unknown> = await response.json();

    if (data.retCode !== 0) {
      this.handleBybitError(data.retCode, data.retMsg);
    }

    return true;
  }

  private async createSignatureForPost(timestamp: string, body: string): Promise<string> {
    const payload = timestamp + this.credentials.apiKey + this.recvWindow + body;
    return this.hmacSha256(payload, this.credentials.apiSecret);
  }

  // ============================================================================
  // Position Methods
  // ============================================================================

  async getPositions(symbol?: string): Promise<Position[]> {
    if (this.category === 'spot') {
      return []; // Spot has no positions
    }

    const timestamp = Date.now().toString();
    const params: Record<string, string> = {
      category: this.category,
      settleCoin: 'USDT'
    };
    if (symbol) params.symbol = symbol;

    const signature = await this.createSignature('GET', '/v5/position/list', timestamp, params);

    const url = new URL('/v5/position/list', this.getBaseUrl());
    Object.keys(params).sort().forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    const data: BybitApiResponse<{ list: BybitPosition[] }> = await response.json();

    if (data.retCode !== 0) {
      this.handleBybitError(data.retCode, data.retMsg);
    }

    return (data.result?.list || [])
      .filter(p => parseFloat(p.size) !== 0)
      .map(p => ({
        id: `${p.symbol}-${p.positionIdx}`,
        symbol: p.symbol,
        side: p.side === 'Buy' ? 'long' as const : 'short' as const,
        quantity: Math.abs(parseFloat(p.size)),
        entryPrice: parseFloat(p.avgPrice),
        markPrice: parseFloat(p.markPrice),
        unrealizedPnl: parseFloat(p.unrealisedPnl),
        realizedPnl: parseFloat(p.cumRealisedPnl),
        leverage: parseFloat(p.leverage),
        marginMode: p.tradeMode === 0 ? 'cross' as MarginMode : 'isolated' as MarginMode,
        liquidationPrice: parseFloat(p.liqPrice) || undefined,
        marginUsed: parseFloat(p.positionValue) / parseFloat(p.leverage),
        createdAt: new Date(parseInt(p.createdTime))
      }));
  }

  // ============================================================================
  // Market Data Methods
  // ============================================================================

  async getMarketInfo(symbol: string): Promise<MarketInfo> {
    const url = new URL('/v5/market/instruments-info', this.getBaseUrl());
    url.searchParams.append('category', this.category);
    url.searchParams.append('symbol', symbol);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15000)
    });

    const data: BybitApiResponse<{ list: BybitInstrument[] }> = await response.json();

    if (data.retCode !== 0) {
      this.handleBybitError(data.retCode, data.retMsg);
    }

    const instrument = data.result?.list?.[0];
    if (!instrument) {
      throw new ExchangeError('bybit', 'SYMBOL_NOT_FOUND', `Symbol ${symbol} not found`);
    }

    return {
      symbol: instrument.symbol,
      baseAsset: instrument.baseCoin,
      quoteAsset: instrument.quoteCoin,
      status: instrument.status === 'Trading' ? 'trading' : 'halt',
      minQuantity: parseFloat(instrument.lotSizeFilter.minOrderQty),
      maxQuantity: parseFloat(instrument.lotSizeFilter.maxOrderQty),
      quantityPrecision: this.getPrecision(instrument.lotSizeFilter.qtyStep),
      minPrice: parseFloat(instrument.priceFilter.minPrice),
      maxPrice: parseFloat(instrument.priceFilter.maxPrice),
      pricePrecision: this.getPrecision(instrument.priceFilter.tickSize),
      minNotional: 5, // Bybit default
      tickSize: parseFloat(instrument.priceFilter.tickSize),
      isSpot: this.category === 'spot',
      isFutures: this.category === 'linear' || this.category === 'inverse',
      isMarginEnabled: true,
      maxLeverage: instrument.leverageFilter ? parseFloat(instrument.leverageFilter.maxLeverage) : 100
    };
  }

  async getOHLCV(
    symbol: string,
    timeframe: string,
    startTime?: number,
    endTime?: number,
    limit: number = 200
  ): Promise<OHLCV[]> {
    const url = new URL('/v5/market/kline', this.getBaseUrl());
    url.searchParams.append('category', this.category);
    url.searchParams.append('symbol', symbol);
    url.searchParams.append('interval', this.mapTimeframe(timeframe));
    url.searchParams.append('limit', String(limit));

    if (startTime) url.searchParams.append('start', String(startTime));
    if (endTime) url.searchParams.append('end', String(endTime));

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(30000)
    });

    const data: BybitApiResponse<{ list: string[][] }> = await response.json();

    if (data.retCode !== 0) {
      this.handleBybitError(data.retCode, data.retMsg);
    }

    return (data.result?.list || []).map(k => ({
      timestamp: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    })).reverse(); // Bybit returns newest first
  }

  // ============================================================================
  // Risk & Position Sizing
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
      accountType: 'UNIFIED',
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
      spot: true,
      futures: true,
      options: true,
      margin: true,
      crossMargin: true,
      isolatedMargin: true,
      websocket: true,
      orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
      maxLeverage: 100,
      supportedTimeframes: ['1', '3', '5', '15', '30', '60', '120', '240', '360', '720', 'D', 'W', 'M']
    };
  }

  getRateLimits(): RateLimits {
    return {
      requestsPerSecond: 10,
      requestsPerMinute: 600,
      ordersPerSecond: 10,
      ordersPerMinute: 100
    };
  }

  formatSymbol(baseAsset: string, quoteAsset: string): string {
    return `${baseAsset}${quoteAsset}`.toUpperCase();
  }

  parseSymbol(symbol: string): { baseAsset: string; quoteAsset: string } {
    const quoteAssets = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'EUR'];

    for (const quote of quoteAssets) {
      if (symbol.endsWith(quote)) {
        return {
          baseAsset: symbol.slice(0, -quote.length),
          quoteAsset: quote
        };
      }
    }

    return {
      baseAsset: symbol.slice(0, -4),
      quoteAsset: symbol.slice(-4)
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapBybitOrder(order: BybitOrder): Order {
    return {
      id: order.orderId,
      clientOrderId: order.orderLinkId || undefined,
      symbol: order.symbol,
      side: order.side.toLowerCase() as OrderSide,
      type: order.orderType.toLowerCase() as OrderType,
      status: this.mapOrderStatus(order.orderStatus),
      price: parseFloat(order.price),
      quantity: parseFloat(order.qty),
      filledQuantity: parseFloat(order.cumExecQty),
      averagePrice: parseFloat(order.avgPrice) || undefined,
      stopLoss: order.stopLoss ? parseFloat(order.stopLoss) : undefined,
      takeProfit: order.takeProfit ? parseFloat(order.takeProfit) : undefined,
      timeInForce: order.timeInForce.toLowerCase() as TimeInForce,
      leverage: order.leverage ? parseFloat(order.leverage) : undefined,
      createdAt: new Date(parseInt(order.createdTime)),
      updatedAt: new Date(parseInt(order.updatedTime))
    };
  }

  private mapOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      'New': 'open',
      'PartiallyFilled': 'partially_filled',
      'Filled': 'filled',
      'Cancelled': 'cancelled',
      'Rejected': 'rejected',
      'Untriggered': 'pending',
      'Triggered': 'open',
      'Deactivated': 'cancelled'
    };
    return mapping[status] || 'pending';
  }

  private mapTimeInForce(tif: TimeInForce): string {
    const mapping: Record<TimeInForce, string> = {
      gtc: 'GTC',
      ioc: 'IOC',
      fok: 'FOK',
      post_only: 'PostOnly'
    };
    return mapping[tif] || 'GTC';
  }

  private mapTimeframe(timeframe: string): string {
    const mapping: Record<string, string> = {
      '1m': '1',
      '3m': '3',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '2h': '120',
      '4h': '240',
      '6h': '360',
      '12h': '720',
      '1d': 'D',
      '1w': 'W',
      '1M': 'M'
    };
    return mapping[timeframe] || timeframe;
  }

  private getPrecision(stepSize: string): number {
    if (!stepSize || stepSize === '0') return 8;
    const match = stepSize.match(/0\.(0*)1/);
    return match ? match[1].length + 1 : 0;
  }

  private handleBybitError(code: number, message?: string): never {
    const errorMsg = message || 'Unknown error';

    switch (code) {
      case 10001:
        throw new ExchangeError('bybit', 'INVALID_PARAM', `Invalid parameter: ${errorMsg}`);
      case 10003:
        throw new AuthenticationError('bybit', 'Invalid API key');
      case 10004:
        throw new AuthenticationError('bybit', 'Invalid signature. Check your API secret.');
      case 10005:
        throw new AuthenticationError('bybit', 'Permission denied. Enable required API permissions.');
      case 10006:
        throw new AuthenticationError('bybit', 'IP not whitelisted');
      case 10016:
        throw new ExchangeError('bybit', 'SERVICE_UNAVAILABLE', 'Service unavailable');
      default:
        throw new ExchangeError('bybit', String(code), errorMsg);
    }
  }
}

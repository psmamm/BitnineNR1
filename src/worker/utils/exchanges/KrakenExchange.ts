/**
 * Kraken Exchange Implementation
 *
 * Connects to Kraken REST API.
 * Supports spot and margin trading.
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
// Kraken API Types
// ============================================================================

interface KrakenResponse<T> {
  error: string[];
  result: T;
}

interface KrakenBalance {
  [currency: string]: string;
}

interface KrakenTradeInfo {
  ordertxid: string;
  pair: string;
  time: number;
  type: string;
  ordertype: string;
  price: string;
  cost: string;
  fee: string;
  vol: string;
  margin: string;
  misc: string;
}

interface KrakenOrderInfo {
  refid: string | null;
  userref: number;
  status: string;
  opentm: number;
  starttm: number;
  expiretm: number;
  descr: {
    pair: string;
    type: string;
    ordertype: string;
    price: string;
    price2: string;
    leverage: string;
    order: string;
    close: string;
  };
  vol: string;
  vol_exec: string;
  cost: string;
  fee: string;
  price: string;
  stopprice: string;
  limitprice: string;
  misc: string;
  oflags: string;
}

interface KrakenAssetPair {
  altname: string;
  wsname: string;
  aclass_base: string;
  base: string;
  aclass_quote: string;
  quote: string;
  pair_decimals: number;
  lot_decimals: number;
  lot_multiplier: number;
  leverage_buy: number[];
  leverage_sell: number[];
  fees: Array<[number, number]>;
  margin_call: number;
  margin_stop: number;
  ordermin: string;
  costmin?: string;
  tick_size?: string;
  status?: string;
}

// ============================================================================
// Kraken Exchange Class
// ============================================================================

export class KrakenExchange extends ExchangeInterface {
  protected testnetUrl = 'https://api.kraken.com'; // No testnet for Kraken
  private nonce = 0;

  constructor(credentials: ExchangeCredentials, assetClass: AssetClass = 'crypto') {
    super('kraken', credentials, assetClass);
  }

  // ============================================================================
  // Abstract Method Implementations
  // ============================================================================

  protected getBaseUrl(): string {
    return 'https://api.kraken.com';
  }

  protected async createSignature(
    _method: string,
    endpoint: string,
     
    _timestamp: string,
     
    _params?: Record<string, string>
  ): Promise<string> {
    // Kraken uses a different signature method, handled in makeAuthRequest
    return endpoint;
  }

   
  protected getAuthHeaders(_timestamp: string, _signature: string): Record<string, string> {
    return {
      'Content-Type': 'application/x-www-form-urlencoded'
    };
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  private getNonce(): number {
    return Date.now() * 1000 + (this.nonce++ % 1000);
  }

  private async generateKrakenSignature(path: string, postData: string, nonce: number): Promise<string> {
    const encoder = new TextEncoder();

    // SHA256 of nonce + postData
    const sha256Hash = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(nonce.toString() + postData)
    );

    // HMAC-SHA512 of path + sha256Hash with base64 decoded secret
    const secretBytes = Uint8Array.from(atob(this.credentials.apiSecret), c => c.charCodeAt(0));

    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );

    const pathBytes = encoder.encode(path);
    const message = new Uint8Array(pathBytes.length + sha256Hash.byteLength);
    message.set(pathBytes, 0);
    message.set(new Uint8Array(sha256Hash), pathBytes.length);

    const signature = await crypto.subtle.sign('HMAC', key, message);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  private async makePublicRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    let url = `${this.getBaseUrl()}${endpoint}`;
    if (params && Object.keys(params).length > 0) {
      url += '?' + new URLSearchParams(params).toString();
    }

    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(15000)
    });

    const data = await response.json() as KrakenResponse<T>;

    if (data.error && data.error.length > 0) {
      throw new ExchangeError('kraken', 'API_ERROR', data.error.join(', '));
    }

    return data.result;
  }

  private async makeAuthRequest<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const nonce = this.getNonce();
    const postParams = new URLSearchParams({
      nonce: nonce.toString(),
      ...params
    });
    const postData = postParams.toString();

    const signature = await this.generateKrakenSignature(endpoint, postData, nonce);

    const response = await fetch(`${this.getBaseUrl()}${endpoint}`, {
      method: 'POST',
      headers: {
        'API-Key': this.credentials.apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: postData,
      signal: AbortSignal.timeout(15000)
    });

    const data = await response.json() as KrakenResponse<T>;

    if (data.error && data.error.length > 0) {
      if (data.error.some(e => e.includes('Invalid key') || e.includes('Invalid signature'))) {
        throw new AuthenticationError('kraken', `Authentication failed: ${data.error.join(', ')}`);
      }
      throw new ExchangeError('kraken', 'API_ERROR', data.error.join(', '));
    }

    return data.result;
  }

  // ============================================================================
  // Connection & Account
  // ============================================================================

  async testConnection(): Promise<boolean> {
    try {
      await this.makeAuthRequest<KrakenBalance>('/0/private/Balance');
      return true;
    } catch (error: unknown) {
      console.error('Kraken connection test failed:', error);
      if (error instanceof AuthenticationError) {
        throw error;
      }
      return false;
    }
  }

  async getBalance(): Promise<WalletBalance> {
    const result = await this.makeAuthRequest<KrakenBalance>('/0/private/Balance');

    const balances: Balance[] = Object.entries(result).map(([currency, amount]) => ({
      currency: this.normalizeAsset(currency),
      total: parseFloat(amount),
      available: parseFloat(amount),
      locked: 0
    }));

    const usdBalance = balances.find(b => b.currency === 'USD' || b.currency === 'ZUSD');
    const totalEquityUsd = usdBalance?.total || 0;

    return {
      accountType: 'SPOT',
      balances,
      totalEquityUsd,
      availableMarginUsd: usdBalance?.available || 0,
      usedMarginUsd: 0
    };
  }

  private normalizeAsset(krakenAsset: string): string {
    const prefixMap: Record<string, string> = {
      'XXBT': 'BTC',
      'XETH': 'ETH',
      'XXRP': 'XRP',
      'ZEUR': 'EUR',
      'ZUSD': 'USD',
      'ZGBP': 'GBP'
    };
    return prefixMap[krakenAsset] || krakenAsset.replace(/^[XZ]/, '');
  }

  // ============================================================================
  // Trading
  // ============================================================================

  async getTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
     
    _limit?: number
  ): Promise<Trade[]> {
    const params: Record<string, string> = {};

    if (startTime) {
      params.start = Math.floor(startTime / 1000).toString();
    }
    if (endTime) {
      params.end = Math.floor(endTime / 1000).toString();
    }

    const result = await this.makeAuthRequest<{ trades: Record<string, KrakenTradeInfo>; count: number }>(
      '/0/private/TradesHistory',
      params
    );

    let trades = Object.entries(result.trades).map(([id, trade]) =>
      this.mapKrakenTrade(id, trade)
    );

    if (symbol) {
      trades = trades.filter(t => t.symbol === symbol);
    }

    return trades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private mapKrakenTrade(id: string, trade: KrakenTradeInfo): Trade {
    return {
      id,
      orderId: trade.ordertxid,
      symbol: this.normalizeSymbol(trade.pair),
      side: trade.type === 'buy' ? 'buy' as OrderSide : 'sell' as OrderSide,
      price: parseFloat(trade.price),
      quantity: parseFloat(trade.vol),
      fee: parseFloat(trade.fee),
      feeCurrency: 'USD',
      timestamp: new Date(trade.time * 1000),
      isMaker: false,
      category: 'spot'
    };
  }

  private normalizeSymbol(krakenPair: string): string {
    const pairMap: Record<string, string> = {
      'XXBTZUSD': 'BTC/USD',
      'XETHZUSD': 'ETH/USD',
      'XXRPZUSD': 'XRP/USD',
      'XXBTZEUR': 'BTC/EUR',
      'XETHZEUR': 'ETH/EUR'
    };
    return pairMap[krakenPair] || krakenPair;
  }

  private toKrakenSymbol(symbol: string): string {
    const symbolMap: Record<string, string> = {
      'BTC/USD': 'XXBTZUSD',
      'ETH/USD': 'XETHZUSD',
      'XRP/USD': 'XXRPZUSD',
      'BTC/EUR': 'XXBTZEUR',
      'ETH/EUR': 'XETHZEUR'
    };
    return symbolMap[symbol] || symbol.replace('/', '');
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    const result = await this.makeAuthRequest<{ open: Record<string, KrakenOrderInfo> }>(
      '/0/private/OpenOrders'
    );

    let orders = Object.entries(result.open).map(([id, order]) =>
      this.mapKrakenOrder(id, order)
    );

    if (symbol) {
      orders = orders.filter(o => o.symbol === symbol);
    }

    return orders;
  }

   
  async getOrder(orderId: string, _symbol?: string): Promise<Order> {
    const result = await this.makeAuthRequest<Record<string, KrakenOrderInfo>>(
      '/0/private/QueryOrders',
      { txid: orderId }
    );

    const orderData = result[orderId];
    if (!orderData) {
      throw new ExchangeError('kraken', 'ORDER_NOT_FOUND', `Order ${orderId} not found`);
    }

    return this.mapKrakenOrder(orderId, orderData);
  }

  private mapKrakenOrder(id: string, order: KrakenOrderInfo): Order {
    return {
      id,
      clientOrderId: order.refid || undefined,
      symbol: this.normalizeSymbol(order.descr.pair),
      side: order.descr.type === 'buy' ? 'buy' as OrderSide : 'sell' as OrderSide,
      type: this.mapOrderType(order.descr.ordertype),
      status: this.mapOrderStatus(order.status),
      price: parseFloat(order.descr.price) || 0,
      quantity: parseFloat(order.vol),
      filledQuantity: parseFloat(order.vol_exec),
      averagePrice: parseFloat(order.price) || undefined,
      stopPrice: parseFloat(order.stopprice) || undefined,
      timeInForce: 'gtc' as TimeInForce,
      createdAt: new Date(order.opentm * 1000),
      updatedAt: new Date(order.opentm * 1000)
    };
  }

  private mapOrderType(type: string): OrderType {
    const mapping: Record<string, OrderType> = {
      'market': 'market',
      'limit': 'limit',
      'stop-loss': 'stop',
      'stop-loss-limit': 'stop_limit',
      'take-profit': 'stop',
      'take-profit-limit': 'stop_limit'
    };
    return mapping[type] || 'market';
  }

  private mapOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      'pending': 'pending',
      'open': 'open',
      'closed': 'filled',
      'canceled': 'cancelled',
      'cancelled': 'cancelled',
      'expired': 'cancelled'
    };
    return mapping[status] || 'pending';
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const krakenPair = this.toKrakenSymbol(request.symbol);

    const params: Record<string, string> = {
      pair: krakenPair,
      type: request.side,
      ordertype: request.type,
      volume: request.quantity.toString()
    };

    if (request.type === 'limit' && request.price) {
      params.price = request.price.toString();
    }

    if (request.stopPrice) {
      params.price = request.stopPrice.toString();
    }

    if (request.stopLoss) {
      params['close[ordertype]'] = 'stop-loss';
      params['close[price]'] = request.stopLoss.toString();
    }

    if (request.clientOrderId) {
      params.userref = request.clientOrderId;
    }

    const result = await this.makeAuthRequest<{ descr: { order: string }; txid: string[] }>(
      '/0/private/AddOrder',
      params
    );

    const orderId = result.txid[0];

    return {
      id: orderId,
      clientOrderId: request.clientOrderId,
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      status: 'pending' as OrderStatus,
      price: request.price || 0,
      quantity: request.quantity,
      filledQuantity: 0,
      timeInForce: request.timeInForce || 'gtc',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

   
  async cancelOrder(orderId: string, _symbol?: string): Promise<boolean> {
    const result = await this.makeAuthRequest<{ count: number }>(
      '/0/private/CancelOrder',
      { txid: orderId }
    );

    return result.count > 0;
  }

  // ============================================================================
  // Positions
  // ============================================================================

   
  async getPositions(_symbol?: string): Promise<Position[]> {
    const balance = await this.getBalance();

    return balance.balances
      .filter(b => !['USD', 'EUR', 'GBP', 'ZUSD', 'ZEUR', 'ZGBP'].includes(b.currency) && b.total > 0)
      .map(b => ({
        id: `${b.currency}/USD`,
        symbol: `${b.currency}/USD`,
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
    const krakenPair = this.toKrakenSymbol(symbol);
    const result = await this.makePublicRequest<Record<string, KrakenAssetPair>>(
      '/0/public/AssetPairs',
      { pair: krakenPair }
    );

    const pairInfo = Object.values(result)[0];
    if (!pairInfo) {
      throw new ExchangeError('kraken', 'SYMBOL_NOT_FOUND', `Symbol ${symbol} not found`);
    }

    return {
      symbol,
      baseAsset: this.normalizeAsset(pairInfo.base),
      quoteAsset: this.normalizeAsset(pairInfo.quote),
      status: pairInfo.status === 'online' ? 'trading' : 'halt',
      minQuantity: parseFloat(pairInfo.ordermin || '0'),
      maxQuantity: 0,
      quantityPrecision: pairInfo.lot_decimals,
      minPrice: 0,
      maxPrice: 0,
      pricePrecision: pairInfo.pair_decimals,
      minNotional: parseFloat(pairInfo.costmin || '0'),
      tickSize: parseFloat(pairInfo.tick_size || '0.01'),
      isSpot: true,
      isFutures: false,
      isMarginEnabled: pairInfo.leverage_buy?.length > 0,
      maxLeverage: pairInfo.leverage_buy?.length > 0 ? Math.max(...pairInfo.leverage_buy) : 1
    };
  }

  async getOHLCV(
    symbol: string,
    timeframe: string,
    startTime?: number,
    _endTime?: number,
    limit?: number
  ): Promise<OHLCV[]> {
    const krakenPair = this.toKrakenSymbol(symbol);

    const intervalMap: Record<string, string> = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '4h': '240',
      '1d': '1440',
      '1w': '10080'
    };

    const params: Record<string, string> = {
      pair: krakenPair,
      interval: intervalMap[timeframe] || '60'
    };

    if (startTime) {
      params.since = Math.floor(startTime / 1000).toString();
    }

    const result = await this.makePublicRequest<Record<string, unknown>>(
      '/0/public/OHLC',
      params
    );

    const candles = Object.values(result).find(v => Array.isArray(v)) as Array<[number, string, string, string, string, string, string, number]> | undefined;

    if (!candles) return [];

    return candles.slice(0, limit || 720).map(c => ({
      timestamp: c[0] * 1000,
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[6])
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
      margin: true,
      crossMargin: true,
      isolatedMargin: false,
      websocket: true,
      orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
      maxLeverage: 5,
      supportedTimeframes: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']
    };
  }

  getRateLimits(): RateLimits {
    return {
      requestsPerSecond: 1,
      requestsPerMinute: 60,
      ordersPerSecond: 1,
      ordersPerMinute: 60
    };
  }

  formatSymbol(baseAsset: string, quoteAsset: string): string {
    return `${baseAsset}/${quoteAsset}`.toUpperCase();
  }

  parseSymbol(symbol: string): { baseAsset: string; quoteAsset: string } {
    const parts = symbol.split('/');
    if (parts.length === 2) {
      return { baseAsset: parts[0], quoteAsset: parts[1] };
    }
    // Fallback for Kraken format
    return { baseAsset: symbol.slice(0, 3), quoteAsset: symbol.slice(3) };
  }
}

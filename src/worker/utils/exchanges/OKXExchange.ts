/**
 * OKX Exchange Implementation
 *
 * Connects to OKX REST API.
 * Supports spot, margin, futures, perpetuals, and options trading.
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
  PositionSide,
  AuthenticationError,
  ExchangeError
} from './ExchangeInterface';

// ============================================================================
// OKX API Types
// ============================================================================

interface OKXResponse<T> {
  code: string;
  msg: string;
  data: T;
}

interface OKXBalance {
  ccy: string;
  bal: string;
  frozenBal: string;
  availBal: string;
  uTime: string;
}

interface OKXAccountBalance {
  adjEq: string;
  details: OKXBalance[];
  imr: string;
  isoEq: string;
  mgnRatio: string;
  mmr: string;
  notionalUsd: string;
  ordFroz: string;
  totalEq: string;
  uTime: string;
}

interface OKXFill {
  instId: string;
  tradeId: string;
  ordId: string;
  clOrdId: string;
  billId: string;
  tag: string;
  fillPx: string;
  fillSz: string;
  side: 'buy' | 'sell';
  posSide: string;
  execType: string;
  feeCcy: string;
  fee: string;
  ts: string;
}

interface OKXOrder {
  instId: string;
  ordId: string;
  clOrdId: string;
  tag: string;
  px: string;
  sz: string;
  ordType: string;
  side: 'buy' | 'sell';
  posSide: string;
  tdMode: string;
  accFillSz: string;
  fillPx: string;
  tradeId: string;
  feeCcy: string;
  fee: string;
  state: string;
  avgPx: string;
  lever: string;
  tpTriggerPx: string;
  tpOrdPx: string;
  slTriggerPx: string;
  slOrdPx: string;
  attachAlgoClOrdId: string;
  cTime: string;
  uTime: string;
}

interface OKXPosition {
  instId: string;
  instType: string;
  mgnMode: string;
  posId: string;
  posSide: string;
  pos: string;
  baseBal: string;
  quoteBal: string;
  availPos: string;
  avgPx: string;
  upl: string;
  uplRatio: string;
  lever: string;
  liqPx: string;
  markPx: string;
  imr: string;
  margin: string;
  mgnRatio: string;
  mmr: string;
  notionalUsd: string;
  ccy: string;
  last: string;
  uTime: string;
  cTime: string;
}

interface OKXInstrument {
  instId: string;
  instType: string;
  uly?: string;
  instFamily?: string;
  category: string;
  baseCcy: string;
  quoteCcy: string;
  settleCcy?: string;
  ctVal?: string;
  ctMult?: string;
  ctValCcy?: string;
  optType?: string;
  stk?: string;
  listTime: string;
  expTime?: string;
  lever?: string;
  tickSz: string;
  lotSz: string;
  minSz: string;
  ctType?: string;
  state: string;
  maxLmtSz: string;
  maxMktSz: string;
  maxTwapSz?: string;
  maxIcebergSz?: string;
  maxTriggerSz?: string;
  maxStopSz?: string;
}

// ============================================================================
// OKX Exchange Class
// ============================================================================

export class OKXExchange extends ExchangeInterface {
  protected testnetUrl = 'https://www.okx.com'; // OKX uses demo trading mode instead of testnet
  private instType: 'SPOT' | 'MARGIN' | 'SWAP' | 'FUTURES' | 'OPTION' = 'SPOT';

  constructor(credentials: ExchangeCredentials, assetClass: AssetClass = 'crypto') {
    super('okx', credentials, assetClass);
  }

  /**
   * Set the instrument type for trading
   */
  setInstType(type: 'SPOT' | 'MARGIN' | 'SWAP' | 'FUTURES' | 'OPTION'): void {
    this.instType = type;
  }

  // ============================================================================
  // Abstract Method Implementations
  // ============================================================================

  protected getBaseUrl(): string {
    return 'https://www.okx.com';
  }

  protected async createSignature(
    method: string,
    endpoint: string,
    timestamp: string,
     
    _params?: Record<string, string>
  ): Promise<string> {
    const prehash = timestamp + method + endpoint;
    return this.hmacSha256Base64(prehash, this.credentials.apiSecret);
  }

  protected getAuthHeaders(timestamp: string, signature: string): Record<string, string> {
    const headers: Record<string, string> = {
      'OK-ACCESS-KEY': this.credentials.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.credentials.passphrase || '',
      'Content-Type': 'application/json'
    };

    // For demo trading mode (testnet equivalent)
    if (this.credentials.testnet) {
      headers['x-simulated-trading'] = '1';
    }

    return headers;
  }

  // ============================================================================
  // Authentication Helpers
  // ============================================================================

  private async hmacSha256Base64(message: string, secret: string): Promise<string> {
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
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  private async makeOKXRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    params?: Record<string, string>,
    body?: unknown
  ): Promise<T> {
    const timestamp = new Date().toISOString();
    let requestPath = endpoint;

    if (method === 'GET' && params && Object.keys(params).length > 0) {
      requestPath += '?' + new URLSearchParams(params).toString();
    }

    const bodyStr = body ? JSON.stringify(body) : '';
    const prehash = timestamp + method + requestPath + bodyStr;
    const signature = await this.hmacSha256Base64(prehash, this.credentials.apiSecret);

    const url = `${this.getBaseUrl()}${requestPath}`;

    const response = await fetch(url, {
      method,
      headers: this.getAuthHeaders(timestamp, signature),
      body: body ? bodyStr : undefined,
      signal: AbortSignal.timeout(15000)
    });

    const data = await response.json() as OKXResponse<T>;

    if (data.code !== '0') {
      if (data.code === '50111' || data.code === '50113') {
        throw new AuthenticationError('okx', `Authentication failed: ${data.msg}`);
      }
      throw new ExchangeError('okx', data.code, data.msg);
    }

    return data.data;
  }

  // ============================================================================
  // Connection & Account
  // ============================================================================

  async testConnection(): Promise<boolean> {
    try {
      await this.makeOKXRequest<OKXAccountBalance[]>('GET', '/api/v5/account/balance');
      return true;
    } catch (error: unknown) {
      console.error('OKX connection test failed:', error);
      if (error instanceof AuthenticationError) {
        throw error;
      }
      return false;
    }
  }

  async getBalance(): Promise<WalletBalance> {
    const result = await this.makeOKXRequest<OKXAccountBalance[]>('GET', '/api/v5/account/balance');

    if (!result || result.length === 0) {
      return {
        accountType: this.instType,
        balances: [],
        totalEquityUsd: 0,
        availableMarginUsd: 0,
        usedMarginUsd: 0
      };
    }

    const accountData = result[0];
    const balances: Balance[] = accountData.details.map(detail => ({
      currency: detail.ccy,
      total: parseFloat(detail.bal) || 0,
      available: parseFloat(detail.availBal) || 0,
      locked: parseFloat(detail.frozenBal) || 0
    }));

    return {
      accountType: this.instType,
      balances,
      totalEquityUsd: parseFloat(accountData.totalEq) || 0,
      availableMarginUsd: parseFloat(accountData.totalEq) - parseFloat(accountData.imr || '0'),
      usedMarginUsd: parseFloat(accountData.imr || '0'),
      marginLevel: parseFloat(accountData.mgnRatio || '0') || undefined
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
    const params: Record<string, string> = {
      instType: this.instType,
      limit: (limit || 100).toString()
    };

    if (symbol) params.instId = symbol;
    if (startTime) params.begin = startTime.toString();
    if (endTime) params.end = endTime.toString();

    const result = await this.makeOKXRequest<OKXFill[]>('GET', '/api/v5/trade/fills', params);

    return result.map(fill => this.mapFillToTrade(fill));
  }

  private mapFillToTrade(fill: OKXFill): Trade {
    const [, quote] = fill.instId.split('-');

    return {
      id: fill.tradeId,
      orderId: fill.ordId,
      symbol: fill.instId,
      side: fill.side as OrderSide,
      price: parseFloat(fill.fillPx),
      quantity: parseFloat(fill.fillSz),
      fee: Math.abs(parseFloat(fill.fee)),
      feeCurrency: fill.feeCcy || quote,
      timestamp: new Date(parseInt(fill.ts)),
      isMaker: fill.execType === 'M',
      category: this.instType.toLowerCase()
    };
  }

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    const params: Record<string, string> = {
      instType: this.instType
    };

    if (symbol) params.instId = symbol;

    const result = await this.makeOKXRequest<OKXOrder[]>('GET', '/api/v5/trade/orders-pending', params);

    return result.map(order => this.mapOKXOrder(order));
  }

  async getOrder(orderId: string, symbol?: string): Promise<Order> {
    if (!symbol) {
      throw new ExchangeError('okx', 'SYMBOL_REQUIRED', 'Symbol is required for OKX order lookup');
    }

    const params: Record<string, string> = {
      instId: symbol,
      ordId: orderId
    };

    const result = await this.makeOKXRequest<OKXOrder[]>('GET', '/api/v5/trade/order', params);

    if (!result || result.length === 0) {
      throw new ExchangeError('okx', 'ORDER_NOT_FOUND', `Order ${orderId} not found`);
    }

    return this.mapOKXOrder(result[0]);
  }

  private mapOKXOrder(order: OKXOrder): Order {
    return {
      id: order.ordId,
      clientOrderId: order.clOrdId || undefined,
      symbol: order.instId,
      side: order.side as OrderSide,
      type: this.mapOrderType(order.ordType),
      status: this.mapOrderState(order.state),
      price: parseFloat(order.px) || 0,
      quantity: parseFloat(order.sz),
      filledQuantity: parseFloat(order.accFillSz),
      averagePrice: parseFloat(order.avgPx) || undefined,
      stopPrice: parseFloat(order.slTriggerPx) || undefined,
      stopLoss: parseFloat(order.slTriggerPx) || undefined,
      takeProfit: parseFloat(order.tpTriggerPx) || undefined,
      timeInForce: 'gtc' as TimeInForce,
      leverage: parseFloat(order.lever) || undefined,
      createdAt: new Date(parseInt(order.cTime)),
      updatedAt: new Date(parseInt(order.uTime))
    };
  }

  private mapOrderType(type: string): OrderType {
    const mapping: Record<string, OrderType> = {
      'market': 'market',
      'limit': 'limit',
      'post_only': 'limit',
      'fok': 'market',
      'ioc': 'market'
    };
    return mapping[type] || 'limit';
  }

  private mapOrderState(state: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      'live': 'open',
      'partially_filled': 'partially_filled',
      'filled': 'filled',
      'canceled': 'cancelled',
      'cancelled': 'cancelled'
    };
    return mapping[state] || 'pending';
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const body: Record<string, unknown> = {
      instId: request.symbol,
      tdMode: this.instType === 'SPOT' ? 'cash' : (request.marginMode === 'isolated' ? 'isolated' : 'cross'),
      side: request.side,
      ordType: request.type,
      sz: request.quantity.toString()
    };

    if (request.type === 'limit' && request.price) {
      body.px = request.price.toString();
    }

    if (request.leverage && this.instType !== 'SPOT') {
      body.lever = request.leverage.toString();
    }

    if (request.clientOrderId) {
      body.clOrdId = request.clientOrderId;
    }

    if (request.reduceOnly) {
      body.reduceOnly = true;
    }

    // Add stop loss / take profit
    if (request.stopLoss) {
      body.slTriggerPx = request.stopLoss.toString();
      body.slOrdPx = '-1'; // Market price
    }

    if (request.takeProfit) {
      body.tpTriggerPx = request.takeProfit.toString();
      body.tpOrdPx = '-1';
    }

    const result = await this.makeOKXRequest<Array<{ ordId: string; clOrdId: string; sCode: string; sMsg: string }>>(
      'POST',
      '/api/v5/trade/order',
      undefined,
      body
    );

    if (!result || result.length === 0 || result[0].sCode !== '0') {
      throw new ExchangeError('okx', 'CREATE_ORDER_FAILED', result?.[0]?.sMsg || 'Unknown error');
    }

    return {
      id: result[0].ordId,
      clientOrderId: result[0].clOrdId || request.clientOrderId,
      symbol: request.symbol,
      side: request.side,
      type: request.type,
      status: 'pending' as OrderStatus,
      price: request.price || 0,
      quantity: request.quantity,
      filledQuantity: 0,
      timeInForce: request.timeInForce || 'gtc',
      leverage: request.leverage,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async cancelOrder(orderId: string, symbol?: string): Promise<boolean> {
    if (!symbol) {
      throw new ExchangeError('okx', 'SYMBOL_REQUIRED', 'Symbol is required to cancel OKX orders');
    }

    const result = await this.makeOKXRequest<Array<{ ordId: string; sCode: string; sMsg: string }>>(
      'POST',
      '/api/v5/trade/cancel-order',
      undefined,
      { instId: symbol, ordId: orderId }
    );

    return result?.[0]?.sCode === '0';
  }

  // ============================================================================
  // Positions
  // ============================================================================

  async getPositions(symbol?: string): Promise<Position[]> {
    const params: Record<string, string> = {
      instType: this.instType
    };

    if (symbol) params.instId = symbol;

    const result = await this.makeOKXRequest<OKXPosition[]>('GET', '/api/v5/account/positions', params);

    return result
      .filter(pos => parseFloat(pos.pos) !== 0)
      .map(pos => ({
        id: pos.posId,
        symbol: pos.instId,
        side: this.mapPositionSide(pos.posSide, parseFloat(pos.pos)),
        quantity: Math.abs(parseFloat(pos.pos)),
        entryPrice: parseFloat(pos.avgPx),
        markPrice: parseFloat(pos.markPx),
        unrealizedPnl: parseFloat(pos.upl),
        realizedPnl: 0,
        leverage: parseFloat(pos.lever),
        marginMode: pos.mgnMode === 'cross' ? 'cross' as MarginMode : 'isolated' as MarginMode,
        liquidationPrice: parseFloat(pos.liqPx) || undefined,
        marginUsed: parseFloat(pos.margin || pos.imr || '0'),
        createdAt: new Date(parseInt(pos.cTime))
      }));
  }

  private mapPositionSide(posSide: string, pos: number): PositionSide {
    if (posSide === 'long') return 'long';
    if (posSide === 'short') return 'short';
    return pos > 0 ? 'long' : 'short';
  }

  // ============================================================================
  // Market Data
  // ============================================================================

  async getMarketInfo(symbol: string): Promise<MarketInfo> {
    const params: Record<string, string> = {
      instType: this.instType,
      instId: symbol
    };

    const result = await this.makeOKXRequest<OKXInstrument[]>('GET', '/api/v5/public/instruments', params);

    if (!result || result.length === 0) {
      throw new ExchangeError('okx', 'SYMBOL_NOT_FOUND', `Symbol ${symbol} not found`);
    }

    const inst = result[0];

    return {
      symbol: inst.instId,
      baseAsset: inst.baseCcy,
      quoteAsset: inst.quoteCcy,
      status: inst.state === 'live' ? 'trading' : 'halt',
      minQuantity: parseFloat(inst.minSz),
      maxQuantity: parseFloat(inst.maxLmtSz || inst.maxMktSz || '0'),
      quantityPrecision: this.getPrecision(inst.lotSz),
      minPrice: 0,
      maxPrice: 0,
      pricePrecision: this.getPrecision(inst.tickSz),
      minNotional: 0,
      tickSize: parseFloat(inst.tickSz),
      contractSize: inst.ctVal ? parseFloat(inst.ctVal) : undefined,
      isSpot: this.instType === 'SPOT',
      isFutures: this.instType === 'FUTURES' || this.instType === 'SWAP',
      isMarginEnabled: this.instType !== 'SPOT',
      maxLeverage: inst.lever ? parseFloat(inst.lever) : (this.instType === 'SPOT' ? 1 : 100)
    };
  }

  async getOHLCV(
    symbol: string,
    timeframe: string,
    _startTime?: number,
    _endTime?: number,
    limit?: number
  ): Promise<OHLCV[]> {
    const intervalMap: Record<string, string> = {
      '1m': '1m',
      '3m': '3m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1H',
      '2h': '2H',
      '4h': '4H',
      '6h': '6H',
      '12h': '12H',
      '1d': '1D',
      '1w': '1W',
      '1M': '1M'
    };

    const params: Record<string, string> = {
      instId: symbol,
      bar: intervalMap[timeframe] || '1H',
      limit: (limit || 300).toString()
    };

    const result = await this.makeOKXRequest<string[][]>(
      'GET',
      '/api/v5/market/candles',
      params
    );

    return result.map(candle => ({
      timestamp: parseInt(candle[0]),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5])
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

    const effectiveLeverage = this.instType === 'SPOT' ? 1 : leverage;
    const stopDistance = Math.abs(entryPrice - stopLossPrice);
    const positionSize = stopDistance > 0 ? (riskAmount * effectiveLeverage) / stopDistance : 0;
    const orderValue = positionSize * entryPrice;
    const marginRequired = orderValue / effectiveLeverage;

    const canOpen = marginRequired <= availableBalance;
    const reason = !canOpen
      ? `Insufficient balance. Required: $${marginRequired.toFixed(2)}, Available: $${availableBalance.toFixed(2)}`
      : undefined;

    return {
      positionSize,
      orderValue,
      marginRequired,
      leverage: effectiveLeverage,
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

    // Check leverage warning
    if (leverage > 20) {
      warnings.push(`High leverage (${leverage}x) increases liquidation risk`);
    }

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
      futures: true,
      options: true,
      margin: true,
      crossMargin: true,
      isolatedMargin: true,
      websocket: true,
      orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
      maxLeverage: 125,
      supportedTimeframes: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w', '1M']
    };
  }

  getRateLimits(): RateLimits {
    return {
      requestsPerSecond: 20,
      requestsPerMinute: 1200,
      ordersPerSecond: 60,
      ordersPerMinute: 600
    };
  }

  formatSymbol(baseAsset: string, quoteAsset: string): string {
    return `${baseAsset}-${quoteAsset}`.toUpperCase();
  }

  parseSymbol(symbol: string): { baseAsset: string; quoteAsset: string } {
    const parts = symbol.split('-');
    if (parts.length >= 2) {
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

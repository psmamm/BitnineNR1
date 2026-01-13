/**
 * Bitget Exchange Implementation
 *
 * Implements the ExchangeInterface for Bitget V2 API.
 * Supports Spot, USDT-M Futures, Coin-M Futures.
 *
 * API Documentation: https://www.bitget.com/api-doc/
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
// Bitget-Specific Types
// ============================================================================

interface BitgetApiResponse<T> {
  code: string;
  msg: string;
  data?: T;
  requestTime?: number;
}

interface BitgetAccountAsset {
  marginCoin: string;
  locked: string;
  available: string;
  crossedMaxAvailable: string;
  isolatedMaxAvailable: string;
  maxTransferOut: string;
  accountEquity: string;
  usdtEquity: string;
  btcEquity: string;
  crossedRiskRate: string;
  crossedMarginLeverage: string;
  isolatedLongLever: string;
  isolatedShortLever: string;
  marginMode: string;
  posMode: string;
  unrealizedPL: string;
  coupon: string;
}

interface BitgetPosition {
  marginCoin: string;
  symbol: string;
  holdSide: 'long' | 'short';
  openDelegateSize: string;
  marginSize: string;
  available: string;
  locked: string;
  total: string;
  leverage: string;
  achievedProfits: string;
  openPriceAvg: string;
  marginMode: 'crossed' | 'isolated';
  posMode: string;
  unrealizedPL: string;
  liquidationPrice: string;
  keepMarginRate: string;
  markPrice: string;
  marginRatio: string;
  cTime: string;
  uTime: string;
}

interface BitgetClosedPosition {
  symbol: string;
  oderId: string;
  clientOid: string;
  size: string;
  openAvgPrice: string;
  closeAvgPrice: string;
  openTotalPos: string;
  closeTotalPos: string;
  pnl: string;
  netProfit: string;
  totalFunding: string;
  openFee: string;
  closeFee: string;
  settleTime: string;
  cTime: string;
  uTime: string;
  marginMode: string;
  posMode: string;
  holdSide: string;
  lever: string;
  direction: string;
}

interface BitgetOrder {
  orderId: string;
  clientOid: string;
  symbol: string;
  marginCoin: string;
  size: string;
  price: string;
  side: string;
  orderType: string;
  state: string;
  filledQty: string;
  filledAmount: string;
  priceAvg: string;
  leverage: string;
  marginMode: string;
  reduceOnly: boolean;
  cTime: string;
  uTime: string;
}

interface BitgetInstrument {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  symbolStatus: string;
  minTradeNum: string;
  maxTradeNum: string;
  minTradeUSDT: string;
  pricePlace: string;
  sizePlace: string;
  volumePlace: string;
  priceEndStep: string;
  sizeMultiplier: string;
  quotePrecision: string;
}

// ============================================================================
// Bitget Exchange Class
// ============================================================================

export class BitgetExchange extends ExchangeInterface {
  private productType: 'USDT-FUTURES' | 'COIN-FUTURES' | 'USDC-FUTURES' | 'SPOT' = 'USDT-FUTURES';

  constructor(credentials: ExchangeCredentials, assetClass: AssetClass = 'crypto') {
    super('bitget', credentials, assetClass);

    if (!credentials.passphrase) {
      throw new AuthenticationError('bitget', 'Passphrase is required for Bitget API');
    }
  }

  /**
   * Set product type (market type)
   */
  setProductType(type: 'USDT-FUTURES' | 'COIN-FUTURES' | 'USDC-FUTURES' | 'SPOT'): void {
    this.productType = type;
  }

  protected getBaseUrl(): string {
    return this.credentials.testnet
      ? 'https://api.bitget.com' // Bitget uses same URL, testnet via header
      : 'https://api.bitget.com';
  }

  protected async createSignature(
    method: string,
    endpoint: string,
    timestamp: string,
    params?: Record<string, string>
  ): Promise<string> {
    // For GET requests, params are in the query string (already in endpoint)
    // For POST requests, params would be stringified body
    const body = params ? JSON.stringify(params) : '';
    return this.createBitgetSignature(method, endpoint, timestamp, body);
  }

  private async createBitgetSignature(
    method: string,
    endpoint: string,
    timestamp: string,
    body: string = ''
  ): Promise<string> {
    // Bitget signature: timestamp + method + requestPath + body
    const message = timestamp + method.toUpperCase() + endpoint + body;
    return this.hmacSha256Base64(message, this.credentials.apiSecret);
  }

  private async hmacSha256Base64(message: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

    // Convert to base64
    const bytes = new Uint8Array(signature);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  protected getAuthHeaders(timestamp: string, signature: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'ACCESS-KEY': this.credentials.apiKey,
      'ACCESS-SIGN': signature,
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-PASSPHRASE': this.credentials.passphrase || '',
      'locale': 'en-US',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9'
    };
  }

  // ============================================================================
  // Connection & Account Methods
  // ============================================================================

  async testConnection(): Promise<boolean> {
    try {
      const timestamp = Date.now().toString();
      // Use accounts endpoint which doesn't require symbol
      const endpoint = '/api/v2/mix/account/accounts';
      const queryString = `?productType=${this.productType}`;
      const fullEndpoint = endpoint + queryString;

      console.log('[Bitget] Testing connection...');
      console.log('[Bitget] Endpoint:', fullEndpoint);
      console.log('[Bitget] Timestamp:', timestamp);

      const signature = await this.createBitgetSignature('GET', fullEndpoint, timestamp, '');

      console.log('[Bitget] Headers:', JSON.stringify({
        'ACCESS-KEY': this.credentials.apiKey.substring(0, 10) + '...',
        'ACCESS-TIMESTAMP': timestamp,
        'ACCESS-PASSPHRASE': this.credentials.passphrase ? '***' : 'MISSING'
      }));

      const response = await fetch(this.getBaseUrl() + fullEndpoint, {
        method: 'GET',
        headers: this.getAuthHeaders(timestamp, signature),
        signal: AbortSignal.timeout(15000)
      });

      const responseText = await response.text();
      console.log('[Bitget] Response status:', response.status);
      console.log('[Bitget] Response body:', responseText.substring(0, 500));

      if (!responseText) {
        throw new ExchangeError('bitget', 'EMPTY_RESPONSE', 'Empty response from Bitget API');
      }

      const data: BitgetApiResponse<unknown> = JSON.parse(responseText);

      if (data.code !== '00000') {
        console.log('[Bitget] Error code:', data.code, 'Message:', data.msg);
        this.handleBitgetError(data.code, data.msg);
      }

      console.log('[Bitget] Connection test successful');
      return true;
    } catch (error: unknown) {
      console.error('[Bitget] Connection test failed:', error);
      throw error;
    }
  }

  async getBalance(): Promise<WalletBalance> {
    const timestamp = Date.now().toString();
    const endpoint = '/api/v2/mix/account/accounts';
    const queryString = `?productType=${this.productType}`;
    const fullEndpoint = endpoint + queryString;

    const signature = await this.createSignature('GET', fullEndpoint, timestamp);

    const response = await fetch(this.getBaseUrl() + fullEndpoint, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    const data: BitgetApiResponse<BitgetAccountAsset[]> = await response.json();

    if (data.code !== '00000') {
      this.handleBitgetError(data.code, data.msg);
    }

    const accounts = data.data || [];

    const balances: Balance[] = accounts
      .filter(a => parseFloat(a.accountEquity) > 0)
      .map(a => ({
        currency: a.marginCoin,
        total: parseFloat(a.accountEquity),
        available: parseFloat(a.available),
        locked: parseFloat(a.locked),
        usdValue: parseFloat(a.usdtEquity)
      }));

    const totalEquity = accounts.reduce((sum, a) => sum + parseFloat(a.usdtEquity || '0'), 0);
    const totalAvailable = accounts.reduce((sum, a) => sum + parseFloat(a.available || '0'), 0);

    return {
      accountType: this.productType,
      balances,
      totalEquityUsd: totalEquity,
      availableMarginUsd: totalAvailable,
      usedMarginUsd: totalEquity - totalAvailable
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
    const allTrades: Trade[] = [];
    const now = Date.now();
    const since = startTime || (now - (30 * 24 * 60 * 60 * 1000));
    const until = endTime || now;

    console.log(`[Bitget] getTrades called - fetching from ${new Date(since).toISOString()} to ${new Date(until).toISOString()}`);

    // Bitget allows max 90 days per request
    const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;
    const chunks: Array<{ start: number; end: number }> = [];

    let chunkStart = since;
    while (chunkStart < until) {
      const chunkEnd = Math.min(chunkStart + NINETY_DAYS, until);
      chunks.push({ start: chunkStart, end: chunkEnd });
      chunkStart = chunkEnd;
    }

    console.log(`[Bitget] Split into ${chunks.length} chunks`);

    for (const chunk of chunks) {
      try {
        const trades = await this.fetchClosedPositions(symbol, chunk.start, chunk.end, limit);
        console.log(`[Bitget] Received ${trades.length} closed positions in this chunk`);
        allTrades.push(...trades);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[Bitget] Error fetching chunk: ${message}`);
      }
    }

    // Remove duplicates and sort
    const uniqueTrades = Array.from(
      new Map(allTrades.map(t => [t.id, t])).values()
    );
    uniqueTrades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    console.log(`[Bitget] Total unique trades fetched: ${uniqueTrades.length}`);

    return uniqueTrades;
  }

  private async fetchClosedPositions(
    symbol: string | undefined,
    startTime: number,
    endTime: number,
    limit: number
  ): Promise<Trade[]> {
    const timestamp = Date.now().toString();
    const endpoint = '/api/v2/mix/position/history-position';

    let queryString = `?productType=${this.productType}&startTime=${startTime}&endTime=${endTime}&pageSize=${limit}`;
    if (symbol) {
      queryString += `&symbol=${symbol}`;
    }

    const fullEndpoint = endpoint + queryString;
    const signature = await this.createSignature('GET', fullEndpoint, timestamp);

    const response = await fetch(this.getBaseUrl() + fullEndpoint, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(30000)
    });

    const data: BitgetApiResponse<{ list: BitgetClosedPosition[] }> = await response.json();

    if (data.code !== '00000') {
      console.log(`[Bitget] API Error: code=${data.code}, msg=${data.msg}`);
      if (data.code === '40034' || data.msg?.includes('not exist')) {
        return [];
      }
      this.handleBitgetError(data.code, data.msg);
    }

    const closedPositions = data.data?.list || [];
    console.log(`[Bitget] Received ${closedPositions.length} closed positions`);

    return closedPositions.map(p => ({
      id: p.oderId || `${p.symbol}-${p.cTime}`,
      orderId: p.oderId,
      symbol: p.symbol,
      side: p.holdSide === 'long' ? 'buy' as OrderSide : 'sell' as OrderSide,
      price: parseFloat(p.openAvgPrice),
      quantity: parseFloat(p.closeTotalPos),
      fee: parseFloat(p.openFee) + parseFloat(p.closeFee),
      feeCurrency: 'USDT',
      timestamp: new Date(parseInt(p.uTime)),
      isMaker: false,
      category: this.productType,
      realizedPnl: parseFloat(p.netProfit)
    }));
  }

  // ============================================================================
  // Order Methods
  // ============================================================================

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    const timestamp = Date.now().toString();
    const endpoint = '/api/v2/mix/order/orders-pending';

    let queryString = `?productType=${this.productType}`;
    if (symbol) {
      queryString += `&symbol=${symbol}`;
    }

    const fullEndpoint = endpoint + queryString;
    const signature = await this.createSignature('GET', fullEndpoint, timestamp);

    const response = await fetch(this.getBaseUrl() + fullEndpoint, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    const data: BitgetApiResponse<{ entrustedList: BitgetOrder[] }> = await response.json();

    if (data.code !== '00000') {
      this.handleBitgetError(data.code, data.msg);
    }

    return (data.data?.entrustedList || []).map(o => this.mapBitgetOrder(o));
  }

  async getOrder(orderId: string, symbol?: string): Promise<Order> {
    if (!symbol) {
      throw new ExchangeError('bitget', 'SYMBOL_REQUIRED', 'Symbol is required for Bitget order lookup');
    }

    const timestamp = Date.now().toString();
    const endpoint = '/api/v2/mix/order/detail';
    const queryString = `?symbol=${symbol}&productType=${this.productType}&orderId=${orderId}`;
    const fullEndpoint = endpoint + queryString;

    const signature = await this.createSignature('GET', fullEndpoint, timestamp);

    const response = await fetch(this.getBaseUrl() + fullEndpoint, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    const data: BitgetApiResponse<BitgetOrder> = await response.json();

    if (data.code !== '00000') {
      this.handleBitgetError(data.code, data.msg);
    }

    if (!data.data) {
      throw new ExchangeError('bitget', 'ORDER_NOT_FOUND', `Order ${orderId} not found`);
    }

    return this.mapBitgetOrder(data.data);
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const timestamp = Date.now().toString();
    const endpoint = '/api/v2/mix/order/place-order';

    const body: Record<string, string | number | boolean> = {
      symbol: request.symbol,
      productType: this.productType,
      marginMode: 'crossed',
      marginCoin: 'USDT',
      size: String(request.quantity),
      side: request.side === 'buy' ? 'buy' : 'sell',
      tradeSide: request.side === 'buy' ? 'open' : 'close',
      orderType: request.type === 'market' ? 'market' : 'limit'
    };

    if (request.price && request.type !== 'market') {
      body.price = String(request.price);
    }

    if (request.clientOrderId) {
      body.clientOid = request.clientOrderId;
    }

    if (request.reduceOnly) {
      body.reduceOnly = 'YES';
    }

    const bodyString = JSON.stringify(body);
    const signature = await this.createBitgetSignature('POST', endpoint, timestamp, bodyString);

    const response = await fetch(this.getBaseUrl() + endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(timestamp, signature),
      body: bodyString,
      signal: AbortSignal.timeout(30000)
    });

    const data: BitgetApiResponse<{ orderId: string; clientOid: string }> = await response.json();

    if (data.code !== '00000') {
      this.handleBitgetError(data.code, data.msg);
    }

    return this.getOrder(data.data!.orderId, request.symbol);
  }

  async cancelOrder(orderId: string, symbol?: string): Promise<boolean> {
    if (!symbol) {
      throw new ExchangeError('bitget', 'SYMBOL_REQUIRED', 'Symbol is required for Bitget order cancellation');
    }

    const timestamp = Date.now().toString();
    const endpoint = '/api/v2/mix/order/cancel-order';

    const body = {
      symbol,
      productType: this.productType,
      orderId
    };

    const bodyString = JSON.stringify(body);
    const signature = await this.createBitgetSignature('POST', endpoint, timestamp, bodyString);

    const response = await fetch(this.getBaseUrl() + endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(timestamp, signature),
      body: bodyString,
      signal: AbortSignal.timeout(15000)
    });

    const data: BitgetApiResponse<unknown> = await response.json();

    if (data.code !== '00000') {
      this.handleBitgetError(data.code, data.msg);
    }

    return true;
  }

  // ============================================================================
  // Position Methods
  // ============================================================================

  async getPositions(symbol?: string): Promise<Position[]> {
    if (this.productType === 'SPOT') {
      return [];
    }

    const timestamp = Date.now().toString();
    const endpoint = '/api/v2/mix/position/all-position';

    let queryString = `?productType=${this.productType}&marginCoin=USDT`;
    if (symbol) {
      queryString += `&symbol=${symbol}`;
    }

    const fullEndpoint = endpoint + queryString;
    const signature = await this.createSignature('GET', fullEndpoint, timestamp);

    const response = await fetch(this.getBaseUrl() + fullEndpoint, {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    const data: BitgetApiResponse<BitgetPosition[]> = await response.json();

    if (data.code !== '00000') {
      this.handleBitgetError(data.code, data.msg);
    }

    return (data.data || [])
      .filter(p => parseFloat(p.total) !== 0)
      .map(p => ({
        id: `${p.symbol}-${p.holdSide}`,
        symbol: p.symbol,
        side: p.holdSide as 'long' | 'short',
        quantity: Math.abs(parseFloat(p.total)),
        entryPrice: parseFloat(p.openPriceAvg),
        markPrice: parseFloat(p.markPrice),
        unrealizedPnl: parseFloat(p.unrealizedPL),
        realizedPnl: parseFloat(p.achievedProfits),
        leverage: parseFloat(p.leverage),
        marginMode: p.marginMode === 'crossed' ? 'cross' as MarginMode : 'isolated' as MarginMode,
        liquidationPrice: parseFloat(p.liquidationPrice) || undefined,
        marginUsed: parseFloat(p.marginSize),
        createdAt: new Date(parseInt(p.cTime))
      }));
  }

  // ============================================================================
  // Market Data Methods
  // ============================================================================

  async getMarketInfo(symbol: string): Promise<MarketInfo> {
    const endpoint = '/api/v2/mix/market/contracts';
    const queryString = `?productType=${this.productType}&symbol=${symbol}`;

    const response = await fetch(this.getBaseUrl() + endpoint + queryString, {
      signal: AbortSignal.timeout(15000)
    });

    const data: BitgetApiResponse<BitgetInstrument[]> = await response.json();

    if (data.code !== '00000') {
      this.handleBitgetError(data.code, data.msg);
    }

    const instrument = data.data?.find(i => i.symbol === symbol);
    if (!instrument) {
      throw new ExchangeError('bitget', 'SYMBOL_NOT_FOUND', `Symbol ${symbol} not found`);
    }

    return {
      symbol: instrument.symbol,
      baseAsset: instrument.baseCoin,
      quoteAsset: instrument.quoteCoin,
      status: instrument.symbolStatus === 'normal' ? 'trading' : 'halt',
      minQuantity: parseFloat(instrument.minTradeNum),
      maxQuantity: parseFloat(instrument.maxTradeNum),
      quantityPrecision: parseInt(instrument.sizePlace),
      minPrice: 0,
      maxPrice: 0,
      pricePrecision: parseInt(instrument.pricePlace),
      minNotional: parseFloat(instrument.minTradeUSDT),
      tickSize: parseFloat(instrument.priceEndStep),
      isSpot: this.productType === 'SPOT',
      isFutures: this.productType !== 'SPOT',
      isMarginEnabled: true,
      maxLeverage: 125
    };
  }

  async getOHLCV(
    symbol: string,
    timeframe: string,
    startTime?: number,
    endTime?: number,
    limit: number = 200
  ): Promise<OHLCV[]> {
    const endpoint = '/api/v2/mix/market/candles';
    let queryString = `?symbol=${symbol}&productType=${this.productType}&granularity=${this.mapTimeframe(timeframe)}&limit=${limit}`;

    if (startTime) queryString += `&startTime=${startTime}`;
    if (endTime) queryString += `&endTime=${endTime}`;

    const response = await fetch(this.getBaseUrl() + endpoint + queryString, {
      signal: AbortSignal.timeout(30000)
    });

    const data: BitgetApiResponse<string[][]> = await response.json();

    if (data.code !== '00000') {
      this.handleBitgetError(data.code, data.msg);
    }

    return (data.data || []).map(k => ({
      timestamp: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
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
      accountType: this.productType,
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
      options: false,
      margin: true,
      crossMargin: true,
      isolatedMargin: true,
      websocket: true,
      orderTypes: ['market', 'limit', 'stop', 'stop_limit'],
      maxLeverage: 125,
      supportedTimeframes: ['1m', '5m', '15m', '30m', '1H', '4H', '12H', '1D', '1W']
    };
  }

  getRateLimits(): RateLimits {
    return {
      requestsPerSecond: 20,
      requestsPerMinute: 1200,
      ordersPerSecond: 10,
      ordersPerMinute: 300
    };
  }

  formatSymbol(baseAsset: string, quoteAsset: string): string {
    return `${baseAsset}${quoteAsset}`.toUpperCase();
  }

  parseSymbol(symbol: string): { baseAsset: string; quoteAsset: string } {
    const quoteAssets = ['USDT', 'USDC', 'USD', 'PERP'];

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

  private mapBitgetOrder(order: BitgetOrder): Order {
    return {
      id: order.orderId,
      clientOrderId: order.clientOid || undefined,
      symbol: order.symbol,
      side: order.side === 'buy' ? 'buy' as OrderSide : 'sell' as OrderSide,
      type: order.orderType === 'market' ? 'market' as OrderType : 'limit' as OrderType,
      status: this.mapOrderStatus(order.state),
      price: parseFloat(order.price),
      quantity: parseFloat(order.size),
      filledQuantity: parseFloat(order.filledQty),
      averagePrice: parseFloat(order.priceAvg) || undefined,
      timeInForce: 'gtc' as TimeInForce,
      leverage: parseFloat(order.leverage) || undefined,
      createdAt: new Date(parseInt(order.cTime)),
      updatedAt: new Date(parseInt(order.uTime))
    };
  }

  private mapOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      'init': 'pending',
      'new': 'open',
      'partially_filled': 'partially_filled',
      'filled': 'filled',
      'cancelled': 'cancelled',
      'rejected': 'rejected'
    };
    return mapping[status.toLowerCase()] || 'pending';
  }

  private mapTimeframe(timeframe: string): string {
    const mapping: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1H',
      '4h': '4H',
      '12h': '12H',
      '1d': '1D',
      '1w': '1W'
    };
    return mapping[timeframe] || timeframe;
  }

  private handleBitgetError(code: string, message?: string): never {
    const errorMsg = message || 'Unknown error';

    switch (code) {
      case '40001':
        throw new AuthenticationError('bitget', 'Invalid API key');
      case '40002':
        throw new AuthenticationError('bitget', 'Invalid request timestamp');
      case '40003':
        throw new AuthenticationError('bitget', 'Invalid signature');
      case '40004':
        throw new AuthenticationError('bitget', 'Invalid passphrase');
      case '40005':
        throw new AuthenticationError('bitget', 'Invalid IP');
      case '40006':
        throw new AuthenticationError('bitget', 'Permission denied');
      case '40007':
        throw new AuthenticationError('bitget', 'API key expired');
      case '40034':
        throw new ExchangeError('bitget', 'SYMBOL_NOT_FOUND', `Symbol not found: ${errorMsg}`);
      case '43011':
        throw new ExchangeError('bitget', 'INSUFFICIENT_BALANCE', `Insufficient balance: ${errorMsg}`);
      default:
        throw new ExchangeError('bitget', code, errorMsg);
    }
  }
}

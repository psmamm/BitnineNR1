/**
 * Binance Exchange Implementation
 *
 * Implements the ExchangeInterface for Binance.
 * Supports both Spot and Futures (USDT-M, COIN-M) markets.
 *
 * API Documentation:
 * - Spot: https://binance-docs.github.io/apidocs/spot/en/
 * - Futures: https://binance-docs.github.io/apidocs/futures/en/
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
// Binance-Specific Types
// ============================================================================

interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
  withdrawAvailable?: string;
  marginAvailable?: string;
}

interface BinanceFuturesBalance {
  asset: string;
  walletBalance: string;
  unrealizedProfit: string;
  marginBalance: string;
  availableBalance: string;
  crossWalletBalance?: string;
}

interface BinanceTrade {
  id: number;
  symbol: string;
  orderId: number;
  orderListId: number;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  isBestMatch?: boolean;
}

interface BinanceFuturesTrade {
  buyer: boolean;
  commission: string;
  commissionAsset: string;
  id: number;
  maker: boolean;
  orderId: number;
  price: string;
  qty: string;
  quoteQty: string;
  realizedPnl: string;
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
  symbol: string;
  time: number;
}

interface BinanceOrder {
  orderId: number;
  clientOrderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: string;
  status: string;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  stopPrice?: string;
  timeInForce: string;
  time: number;
  updateTime: number;
}

interface BinancePosition {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  marginType: 'isolated' | 'cross';
  isolatedMargin: string;
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
  updateTime: number;
}

interface BinanceExchangeInfo {
  symbols: Array<{
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    filters: Array<{
      filterType: string;
      minPrice?: string;
      maxPrice?: string;
      tickSize?: string;
      minQty?: string;
      maxQty?: string;
      stepSize?: string;
      minNotional?: string;
    }>;
    orderTypes: string[];
    isSpotTradingAllowed?: boolean;
    isMarginTradingAllowed?: boolean;
  }>;
}

interface BinanceKline {
  0: number;   // Open time
  1: string;   // Open
  2: string;   // High
  3: string;   // Low
  4: string;   // Close
  5: string;   // Volume
  6: number;   // Close time
  7: string;   // Quote asset volume
  8: number;   // Number of trades
  9: string;   // Taker buy base asset volume
  10: string;  // Taker buy quote asset volume
  11: string;  // Ignore
}

// ============================================================================
// Binance Exchange Class
// ============================================================================

export class BinanceExchange extends ExchangeInterface {
  protected testnetUrl = 'https://testnet.binance.vision';
  private futuresBaseUrl = 'https://fapi.binance.com';
  private futuresTestnetUrl = 'https://testnet.binancefuture.com';
  private market: 'spot' | 'futures' = 'spot';

  constructor(credentials: ExchangeCredentials, assetClass: AssetClass = 'crypto') {
    super('binance', credentials, assetClass);
  }

  /**
   * Set market type (spot or futures)
   */
  setMarket(market: 'spot' | 'futures'): void {
    this.market = market;
  }

  protected getBaseUrl(): string {
    if (this.market === 'futures') {
      return this.credentials.testnet ? this.futuresTestnetUrl : this.futuresBaseUrl;
    }
    return this.credentials.testnet
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com';
  }

  protected async createSignature(
    _method: string,
    _endpoint: string,
    timestamp: string,
    params: Record<string, string> = {}
  ): Promise<string> {
    // Binance signature: HMAC SHA256 of query string
    const queryParams: Record<string, string> = { ...params, timestamp };
    const queryString = Object.keys(queryParams)
      .sort()
      .map(key => `${key}=${queryParams[key]}`)
      .join('&');

    return this.hmacSha256(queryString, this.credentials.apiSecret);
  }

   
  protected getAuthHeaders(_timestamp: string, _signature: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-MBX-APIKEY': this.credentials.apiKey
    };
  }

  // ============================================================================
  // Connection & Account Methods
  // ============================================================================

  async testConnection(): Promise<boolean> {
    try {
      const timestamp = Date.now().toString();
      const params: Record<string, string> = { timestamp };
      const signature = await this.createSignature('GET', '/api/v3/account', timestamp, params);

      const url = new URL('/api/v3/account', this.getBaseUrl());
      url.searchParams.append('timestamp', timestamp);
      url.searchParams.append('signature', signature);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getAuthHeaders(timestamp, signature),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        const text = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
        }

        if (errorData.code === -2015) {
          throw new AuthenticationError('binance', 'Invalid API key or IP not whitelisted');
        } else if (errorData.code === -1022) {
          throw new AuthenticationError('binance', 'Invalid signature. Check your API secret.');
        }

        throw new ExchangeError('binance', String(errorData.code), errorData.msg);
      }

      console.log('Binance connection test successful');
      return true;
    } catch (error: unknown) {
      console.error('Binance connection test failed:', error);
      throw error;
    }
  }

  async getBalance(): Promise<WalletBalance> {
    const timestamp = Date.now().toString();

    if (this.market === 'futures') {
      return this.getFuturesBalance(timestamp);
    }

    return this.getSpotBalance(timestamp);
  }

  private async getSpotBalance(timestamp: string): Promise<WalletBalance> {
    const params: Record<string, string> = { timestamp };
    const signature = await this.createSignature('GET', '/api/v3/account', timestamp, params);

    const url = new URL('/api/v3/account', this.getBaseUrl());
    url.searchParams.append('timestamp', timestamp);
    url.searchParams.append('signature', signature);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('binance', 'BALANCE_ERROR', text);
    }

    const data: { balances: BinanceBalance[] } = await response.json();

    const balances: Balance[] = data.balances
      .filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map(b => ({
        currency: b.asset,
        total: parseFloat(b.free) + parseFloat(b.locked),
        available: parseFloat(b.free),
        locked: parseFloat(b.locked)
      }));

    const usdtBalance = balances.find(b => b.currency === 'USDT');

    return {
      accountType: 'SPOT',
      balances,
      totalEquityUsd: usdtBalance?.total || 0,
      availableMarginUsd: usdtBalance?.available || 0,
      usedMarginUsd: usdtBalance?.locked || 0
    };
  }

  private async getFuturesBalance(timestamp: string): Promise<WalletBalance> {
    const params: Record<string, string> = { timestamp };
    const signature = await this.createSignature('GET', '/fapi/v2/balance', timestamp, params);

    const url = new URL('/fapi/v2/balance', this.futuresBaseUrl);
    url.searchParams.append('timestamp', timestamp);
    url.searchParams.append('signature', signature);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('binance', 'BALANCE_ERROR', text);
    }

    const data: BinanceFuturesBalance[] = await response.json();

    const balances: Balance[] = data
      .filter(b => parseFloat(b.walletBalance) > 0)
      .map(b => ({
        currency: b.asset,
        total: parseFloat(b.walletBalance),
        available: parseFloat(b.availableBalance),
        locked: parseFloat(b.walletBalance) - parseFloat(b.availableBalance)
      }));

    const usdtBalance = data.find(b => b.asset === 'USDT');

    return {
      accountType: 'FUTURES',
      balances,
      totalEquityUsd: usdtBalance ? parseFloat(usdtBalance.marginBalance) : 0,
      availableMarginUsd: usdtBalance ? parseFloat(usdtBalance.availableBalance) : 0,
      usedMarginUsd: usdtBalance
        ? parseFloat(usdtBalance.walletBalance) - parseFloat(usdtBalance.availableBalance)
        : 0
    };
  }

  // ============================================================================
  // Trade Methods
  // ============================================================================

  async getTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 500
  ): Promise<Trade[]> {
    if (this.market === 'futures') {
      return this.getFuturesTrades(symbol, startTime, endTime, limit);
    }
    return this.getSpotTrades(symbol, startTime, endTime, limit);
  }

  private async getSpotTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 500
  ): Promise<Trade[]> {
    if (!symbol) {
      throw new ExchangeError('binance', 'SYMBOL_REQUIRED', 'Symbol is required for Binance trade history');
    }

    const timestamp = Date.now().toString();
    const params: Record<string, string> = {
      symbol,
      limit: String(limit),
      timestamp
    };

    if (startTime) params.startTime = String(startTime);
    if (endTime) params.endTime = String(endTime);

    const signature = await this.createSignature('GET', '/api/v3/myTrades', timestamp, params);

    const url = new URL('/api/v3/myTrades', this.getBaseUrl());
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    url.searchParams.append('signature', signature);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('binance', 'TRADES_ERROR', text);
    }

    const data: BinanceTrade[] = await response.json();

    return data.map(t => ({
      id: String(t.id),
      orderId: String(t.orderId),
      symbol: t.symbol,
      side: t.isBuyer ? 'buy' as OrderSide : 'sell' as OrderSide,
      price: parseFloat(t.price),
      quantity: parseFloat(t.qty),
      fee: parseFloat(t.commission),
      feeCurrency: t.commissionAsset,
      timestamp: new Date(t.time),
      isMaker: t.isMaker,
      category: 'spot'
    }));
  }

  private async getFuturesTrades(
    symbol?: string,
    startTime?: number,
    endTime?: number,
    limit: number = 500
  ): Promise<Trade[]> {
    if (!symbol) {
      throw new ExchangeError('binance', 'SYMBOL_REQUIRED', 'Symbol is required for Binance trade history');
    }

    const timestamp = Date.now().toString();
    const params: Record<string, string> = {
      symbol,
      limit: String(limit),
      timestamp
    };

    if (startTime) params.startTime = String(startTime);
    if (endTime) params.endTime = String(endTime);

    const signature = await this.createSignature('GET', '/fapi/v1/userTrades', timestamp, params);

    const url = new URL('/fapi/v1/userTrades', this.futuresBaseUrl);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    url.searchParams.append('signature', signature);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('binance', 'TRADES_ERROR', text);
    }

    const data: BinanceFuturesTrade[] = await response.json();

    return data.map(t => ({
      id: String(t.id),
      orderId: String(t.orderId),
      symbol: t.symbol,
      side: t.side.toLowerCase() as OrderSide,
      price: parseFloat(t.price),
      quantity: parseFloat(t.qty),
      fee: parseFloat(t.commission),
      feeCurrency: t.commissionAsset,
      timestamp: new Date(t.time),
      isMaker: t.maker,
      category: 'linear',
      realizedPnl: parseFloat(t.realizedPnl)
    }));
  }

  // ============================================================================
  // Order Methods
  // ============================================================================

  async getOpenOrders(symbol?: string): Promise<Order[]> {
    const timestamp = Date.now().toString();
    const endpoint = this.market === 'futures' ? '/fapi/v1/openOrders' : '/api/v3/openOrders';
    const baseUrl = this.market === 'futures' ? this.futuresBaseUrl : this.getBaseUrl();

    const params: Record<string, string> = { timestamp };
    if (symbol) params.symbol = symbol;

    const signature = await this.createSignature('GET', endpoint, timestamp, params);

    const url = new URL(endpoint, baseUrl);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    url.searchParams.append('signature', signature);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('binance', 'ORDERS_ERROR', text);
    }

    const data: BinanceOrder[] = await response.json();

    return data.map(o => this.mapBinanceOrder(o));
  }

  async getOrder(orderId: string, symbol?: string): Promise<Order> {
    if (!symbol) {
      throw new ExchangeError('binance', 'SYMBOL_REQUIRED', 'Symbol is required for Binance order lookup');
    }

    const timestamp = Date.now().toString();
    const endpoint = this.market === 'futures' ? '/fapi/v1/order' : '/api/v3/order';
    const baseUrl = this.market === 'futures' ? this.futuresBaseUrl : this.getBaseUrl();

    const params: Record<string, string> = {
      symbol,
      orderId,
      timestamp
    };

    const signature = await this.createSignature('GET', endpoint, timestamp, params);

    const url = new URL(endpoint, baseUrl);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    url.searchParams.append('signature', signature);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('binance', 'ORDER_ERROR', text);
    }

    const data: BinanceOrder = await response.json();

    return this.mapBinanceOrder(data);
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const timestamp = Date.now().toString();
    const endpoint = this.market === 'futures' ? '/fapi/v1/order' : '/api/v3/order';
    const baseUrl = this.market === 'futures' ? this.futuresBaseUrl : this.getBaseUrl();

    const params: Record<string, string> = {
      symbol: request.symbol,
      side: request.side.toUpperCase(),
      type: this.mapOrderType(request.type),
      quantity: String(request.quantity),
      timestamp
    };

    if (request.price && (request.type === 'limit' || request.type === 'stop_limit')) {
      params.price = String(request.price);
    }

    if (request.stopPrice && (request.type === 'stop' || request.type === 'stop_limit')) {
      params.stopPrice = String(request.stopPrice);
    }

    if (request.timeInForce) {
      params.timeInForce = request.timeInForce.toUpperCase();
    } else if (request.type === 'limit') {
      params.timeInForce = 'GTC';
    }

    if (request.clientOrderId) {
      params.newClientOrderId = request.clientOrderId;
    }

    if (this.market === 'futures' && request.reduceOnly) {
      params.reduceOnly = 'true';
    }

    const signature = await this.createSignature('POST', endpoint, timestamp, params);

    const url = new URL(endpoint, baseUrl);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    url.searchParams.append('signature', signature);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('binance', 'CREATE_ORDER_ERROR', text);
    }

    const data: BinanceOrder = await response.json();

    return this.mapBinanceOrder(data);
  }

  async cancelOrder(orderId: string, symbol?: string): Promise<boolean> {
    if (!symbol) {
      throw new ExchangeError('binance', 'SYMBOL_REQUIRED', 'Symbol is required for Binance order cancellation');
    }

    const timestamp = Date.now().toString();
    const endpoint = this.market === 'futures' ? '/fapi/v1/order' : '/api/v3/order';
    const baseUrl = this.market === 'futures' ? this.futuresBaseUrl : this.getBaseUrl();

    const params: Record<string, string> = {
      symbol,
      orderId,
      timestamp
    };

    const signature = await this.createSignature('DELETE', endpoint, timestamp, params);

    const url = new URL(endpoint, baseUrl);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    url.searchParams.append('signature', signature);

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('binance', 'CANCEL_ORDER_ERROR', text);
    }

    return true;
  }

  // ============================================================================
  // Position Methods
  // ============================================================================

  async getPositions(symbol?: string): Promise<Position[]> {
    if (this.market !== 'futures') {
      return []; // Spot has no positions
    }

    const timestamp = Date.now().toString();
    const params: Record<string, string> = { timestamp };
    if (symbol) params.symbol = symbol;

    const signature = await this.createSignature('GET', '/fapi/v2/positionRisk', timestamp, params);

    const url = new URL('/fapi/v2/positionRisk', this.futuresBaseUrl);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    url.searchParams.append('signature', signature);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders(timestamp, signature),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('binance', 'POSITIONS_ERROR', text);
    }

    const data: BinancePosition[] = await response.json();

    return data
      .filter(p => parseFloat(p.positionAmt) !== 0)
      .map(p => ({
        id: `${p.symbol}-${p.positionSide}`,
        symbol: p.symbol,
        side: parseFloat(p.positionAmt) > 0 ? 'long' as const : 'short' as const,
        quantity: Math.abs(parseFloat(p.positionAmt)),
        entryPrice: parseFloat(p.entryPrice),
        markPrice: parseFloat(p.markPrice),
        unrealizedPnl: parseFloat(p.unRealizedProfit),
        realizedPnl: 0, // Not provided in this endpoint
        leverage: parseFloat(p.leverage),
        marginMode: p.marginType as MarginMode,
        liquidationPrice: parseFloat(p.liquidationPrice) || undefined,
        marginUsed: parseFloat(p.isolatedMargin) || 0,
        createdAt: new Date(p.updateTime)
      }));
  }

  // ============================================================================
  // Market Data Methods
  // ============================================================================

  async getMarketInfo(symbol: string): Promise<MarketInfo> {
    const endpoint = this.market === 'futures' ? '/fapi/v1/exchangeInfo' : '/api/v3/exchangeInfo';
    const baseUrl = this.market === 'futures' ? this.futuresBaseUrl : this.getBaseUrl();

    const response = await fetch(`${baseUrl}${endpoint}`, {
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('binance', 'MARKET_INFO_ERROR', text);
    }

    const data: BinanceExchangeInfo = await response.json();
    const symbolInfo = data.symbols.find(s => s.symbol === symbol);

    if (!symbolInfo) {
      throw new ExchangeError('binance', 'SYMBOL_NOT_FOUND', `Symbol ${symbol} not found`);
    }

    const priceFilter = symbolInfo.filters.find(f => f.filterType === 'PRICE_FILTER');
    const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
    const notionalFilter = symbolInfo.filters.find(f => f.filterType === 'MIN_NOTIONAL' || f.filterType === 'NOTIONAL');

    return {
      symbol: symbolInfo.symbol,
      baseAsset: symbolInfo.baseAsset,
      quoteAsset: symbolInfo.quoteAsset,
      status: symbolInfo.status === 'TRADING' ? 'trading' : 'halt',
      minQuantity: parseFloat(lotSizeFilter?.minQty || '0'),
      maxQuantity: parseFloat(lotSizeFilter?.maxQty || '0'),
      quantityPrecision: this.getPrecision(lotSizeFilter?.stepSize || '0.00000001'),
      minPrice: parseFloat(priceFilter?.minPrice || '0'),
      maxPrice: parseFloat(priceFilter?.maxPrice || '0'),
      pricePrecision: this.getPrecision(priceFilter?.tickSize || '0.01'),
      minNotional: parseFloat(notionalFilter?.minNotional || '10'),
      tickSize: parseFloat(priceFilter?.tickSize || '0.01'),
      isSpot: this.market === 'spot',
      isFutures: this.market === 'futures',
      isMarginEnabled: symbolInfo.isMarginTradingAllowed || false,
      maxLeverage: this.market === 'futures' ? 125 : 1
    };
  }

  async getOHLCV(
    symbol: string,
    timeframe: string,
    startTime?: number,
    endTime?: number,
    limit: number = 500
  ): Promise<OHLCV[]> {
    const endpoint = this.market === 'futures' ? '/fapi/v1/klines' : '/api/v3/klines';
    const baseUrl = this.market === 'futures' ? this.futuresBaseUrl : this.getBaseUrl();

    const url = new URL(endpoint, baseUrl);
    url.searchParams.append('symbol', symbol);
    url.searchParams.append('interval', this.mapTimeframe(timeframe));
    url.searchParams.append('limit', String(limit));

    if (startTime) url.searchParams.append('startTime', String(startTime));
    if (endTime) url.searchParams.append('endTime', String(endTime));

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ExchangeError('binance', 'OHLCV_ERROR', text);
    }

    const data: BinanceKline[] = await response.json();

    return data.map(k => ({
      timestamp: k[0],
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

    // Calculate stop distance
    const stopDistance = Math.abs(entryPrice - stopLossPrice);

    // Position Size = Risk Amount / Stop Distance
    const positionSize = stopDistance > 0 ? riskAmount / stopDistance : 0;

    // Order value (notional)
    const orderValue = positionSize * entryPrice;

    // Margin required
    const marginRequired = orderValue / leverage;

    // Check if we can open this position
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
      supportedTimeframes: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M']
    };
  }

  getRateLimits(): RateLimits {
    return {
      requestsPerSecond: 10,
      requestsPerMinute: 1200,
      ordersPerSecond: 10,
      ordersPerMinute: 100
    };
  }

  formatSymbol(baseAsset: string, quoteAsset: string): string {
    return `${baseAsset}${quoteAsset}`.toUpperCase();
  }

  parseSymbol(symbol: string): { baseAsset: string; quoteAsset: string } {
    // Common quote assets
    const quoteAssets = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB', 'EUR', 'GBP', 'TRY', 'TUSD', 'DAI', 'FDUSD'];

    for (const quote of quoteAssets) {
      if (symbol.endsWith(quote)) {
        return {
          baseAsset: symbol.slice(0, -quote.length),
          quoteAsset: quote
        };
      }
    }

    // Fallback: assume last 4 chars are quote
    return {
      baseAsset: symbol.slice(0, -4),
      quoteAsset: symbol.slice(-4)
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapBinanceOrder(order: BinanceOrder): Order {
    return {
      id: String(order.orderId),
      clientOrderId: order.clientOrderId,
      symbol: order.symbol,
      side: order.side.toLowerCase() as OrderSide,
      type: this.reverseMapOrderType(order.type),
      status: this.mapOrderStatus(order.status),
      price: parseFloat(order.price),
      quantity: parseFloat(order.origQty),
      filledQuantity: parseFloat(order.executedQty),
      averagePrice: parseFloat(order.cummulativeQuoteQty) / parseFloat(order.executedQty) || 0,
      stopPrice: order.stopPrice ? parseFloat(order.stopPrice) : undefined,
      timeInForce: order.timeInForce.toLowerCase() as TimeInForce,
      createdAt: new Date(order.time),
      updatedAt: new Date(order.updateTime)
    };
  }

  private mapOrderType(type: OrderType): string {
    const mapping: Record<OrderType, string> = {
      market: 'MARKET',
      limit: 'LIMIT',
      stop: 'STOP_MARKET',
      stop_limit: 'STOP'
    };
    return mapping[type] || 'MARKET';
  }

  private reverseMapOrderType(type: string): OrderType {
    const mapping: Record<string, OrderType> = {
      MARKET: 'market',
      LIMIT: 'limit',
      STOP_MARKET: 'stop',
      STOP: 'stop_limit',
      STOP_LOSS: 'stop',
      STOP_LOSS_LIMIT: 'stop_limit',
      TAKE_PROFIT: 'stop',
      TAKE_PROFIT_LIMIT: 'stop_limit'
    };
    return mapping[type] || 'market';
  }

  private mapOrderStatus(status: string): OrderStatus {
    const mapping: Record<string, OrderStatus> = {
      NEW: 'open',
      PARTIALLY_FILLED: 'partially_filled',
      FILLED: 'filled',
      CANCELED: 'cancelled',
      PENDING_CANCEL: 'pending',
      REJECTED: 'rejected',
      EXPIRED: 'cancelled'
    };
    return mapping[status] || 'pending';
  }

  private mapTimeframe(timeframe: string): string {
    // Binance uses the same format for most timeframes
    const mapping: Record<string, string> = {
      '1m': '1m',
      '3m': '3m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '2h': '2h',
      '4h': '4h',
      '6h': '6h',
      '8h': '8h',
      '12h': '12h',
      '1d': '1d',
      '3d': '3d',
      '1w': '1w',
      '1M': '1M'
    };
    return mapping[timeframe] || timeframe;
  }

  private getPrecision(stepSize: string): number {
    if (!stepSize || stepSize === '0') return 8;
    const match = stepSize.match(/0\.(0*)1/);
    return match ? match[1].length + 1 : 0;
  }
}

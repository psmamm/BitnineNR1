/**
 * Bybit V5 Order Execution
 * 
 * Handles order placement, position sizing, and risk validation for Bybit V5 API.
 * Supports UTA 2.0 Cross-Margin calculations.
 */

import type { BybitApiResponse } from './BybitExchange';

export interface BybitOrderRequest {
  apiKey: string;
  apiSecret: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  orderType: 'Market' | 'Limit' | 'Conditional';
  qty: string;
  price?: string;           // Required for Limit orders
  stopLoss?: string;
  takeProfit?: string;
  leverage?: string;
  marginMode?: 'isolated' | 'cross';
  category: 'spot' | 'linear' | 'inverse' | 'option';
  positionIdx?: number;     // 0: One-Way, 1: Buy side of Hedge, 2: Sell side of Hedge
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'PostOnly';
}

export interface BybitOrderResponse {
  orderId: string;
  orderLinkId: string;
  symbol: string;
  side: string;
  orderType: string;
  qty: string;
  price: string;
  status: string;
  createTime: string;
}

export interface BybitWalletBalance {
  coin: string;
  equity: string;
  availableToWithdraw: string;
  availableToBorrow: string;
  walletBalance: string;
  usedMargin: string;
}

export interface BybitPositionSizeResult {
  positionSize: number;
  orderValue: number;
  marginRequired: number;
  availableBalance: number;
  canOpen: boolean;
  reason?: string;
}

/**
 * Creates signature for Bybit API (reused from BybitExchange)
 */
async function createSignature(
  apiKey: string,
  apiSecret: string,
  timestamp: string,
  recvWindow: string,
  queryParams: Record<string, string> = {}
): Promise<string> {
  const sortedKeys = Object.keys(queryParams).sort();
  const queryString = sortedKeys
    .map(key => `${key}=${queryParams[key]}`)
    .join('&');
  
  const payload = timestamp + apiKey + recvWindow + queryString;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const signatureHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return signatureHex;
}

/**
 * Fetches wallet balance from Bybit V5 API
 */
export async function getBybitWalletBalance(
  apiKey: string,
  apiSecret: string,
  accountType: 'UNIFIED' | 'CONTRACT' | 'SPOT' = 'UNIFIED'
): Promise<BybitWalletBalance[]> {
  const baseUrl = 'https://api.bybit.com';
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  
  const queryParams: Record<string, string> = {
    accountType
  };
  
  const signature = await createSignature(apiKey, apiSecret, timestamp, recvWindow, queryParams);
  
  const url = new URL(`${baseUrl}/v5/account/wallet-balance`);
  Object.keys(queryParams).sort().forEach(key => {
    url.searchParams.append(key, queryParams[key]);
  });
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'X-BAPI-SIGN': signature
    },
    signal: AbortSignal.timeout(15000)
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bybit API error (${response.status}): ${text.substring(0, 200)}`);
  }
  
  const data: BybitApiResponse<{ list: Array<{ coin: Array<BybitWalletBalance> }> }> = await response.json();
  
  if (data.retCode !== 0) {
    throw new Error(`Bybit API error: ${data.retMsg}`);
  }
  
  // Extract USDT balance
  const coins = data.result?.list?.[0]?.coin || [];
  return coins;
}

/**
 * Calculates position size for Bybit V5 with Cross-Margin support
 */
export async function calculateBybitPositionSize(
  apiKey: string,
  apiSecret: string,
  riskAmount: number,
  entryPrice: number,
  stopLossPrice: number,
  leverage: number,
   
  _marginMode: 'isolated' | 'cross',
   
  _symbol: string
): Promise<BybitPositionSizeResult> {
  // Get available balance
  const balances = await getBybitWalletBalance(apiKey, apiSecret, 'UNIFIED');
  const usdtBalance = balances.find(b => b.coin === 'USDT');
  const availableBalance = parseFloat(usdtBalance?.availableToWithdraw || '0');
  
  // Calculate stop distance
  const stopDistance = Math.abs(entryPrice - stopLossPrice);
  
  // Core formula: Position Size = Risk Amount ($) / ((Entry Price - Stop Loss Price) * Point Value)
  const positionSize = stopDistance > 0 
    ? riskAmount / stopDistance
    : 0;
  
  // Calculate order value (notional)
  const orderValue = positionSize * entryPrice;
  
  // Calculate margin required
  const marginRequired = orderValue / leverage;
  
  // Check if we have enough balance
  const canOpen = marginRequired <= availableBalance;
  const reason = !canOpen 
    ? `Insufficient balance. Required: $${marginRequired.toFixed(2)}, Available: $${availableBalance.toFixed(2)}`
    : undefined;
  
  return {
    positionSize,
    orderValue,
    marginRequired,
    availableBalance,
    canOpen,
    reason
  };
}

/**
 * Validates risk before placing order
 */
export async function validateBybitRisk(
  apiKey: string,
  apiSecret: string,
  riskAmount: number,
  entryPrice: number,
  stopLossPrice: number,
  leverage: number,
  marginMode: 'isolated' | 'cross',
  symbol: string,
  currentDailyLoss?: number,
  totalLoss?: number,
  startingCapital?: number
): Promise<{ valid: boolean; reason?: string }> {
  // Check position size
  const positionSizeResult = await calculateBybitPositionSize(
    apiKey,
    apiSecret,
    riskAmount,
    entryPrice,
    stopLossPrice,
    leverage,
    marginMode,
    symbol
  );
  
  if (!positionSizeResult.canOpen) {
    return { valid: false, reason: positionSizeResult.reason };
  }
  
  // Check MDL/ML limits if provided
  if (startingCapital && currentDailyLoss !== undefined) {
    const mdlLimit = startingCapital * 0.05; // 5%
    if (currentDailyLoss + riskAmount >= mdlLimit) {
      return { 
        valid: false, 
        reason: `Would exceed MDL limit: $${(currentDailyLoss + riskAmount).toFixed(2)} / $${mdlLimit.toFixed(2)}` 
      };
    }
  }
  
  if (startingCapital && totalLoss !== undefined) {
    const mlLimit = startingCapital * 0.10; // 10%
    if (totalLoss >= mlLimit) {
      return { 
        valid: false, 
        reason: `Maximum Loss (ML) limit reached: $${totalLoss.toFixed(2)} / $${mlLimit.toFixed(2)}` 
      };
    }
  }
  
  return { valid: true };
}

/**
 * Places an order on Bybit V5 API
 */
export async function placeBybitOrder(request: BybitOrderRequest): Promise<BybitOrderResponse> {
  const baseUrl = 'https://api.bybit.com';
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  
  // Build request body
  const body: Record<string, string | number | boolean | undefined> = {
    category: request.category,
    symbol: request.symbol,
    side: request.side,
    orderType: request.orderType,
    qty: request.qty
  };
  
  if (request.price) {
    body.price = request.price;
  }
  
  if (request.stopLoss) {
    body.stopLoss = request.stopLoss;
  }
  
  if (request.takeProfit) {
    body.takeProfit = request.takeProfit;
  }
  
  if (request.leverage) {
    body.leverage = request.leverage;
  }
  
  if (request.positionIdx !== undefined) {
    body.positionIdx = request.positionIdx;
  }
  
  if (request.timeInForce) {
    body.timeInForce = request.timeInForce;
  } else if (request.orderType === 'Limit') {
    body.timeInForce = 'GTC'; // Good Till Cancel by default
  }
  
  // For linear futures, set margin mode
  if (request.category === 'linear' && request.marginMode) {
    // Bybit uses positionMode and reduceOnly for margin mode
    // Cross margin is default, isolated requires specific handling
    // This is simplified - full implementation would handle position mode switching
  }
  
  // Convert body to query string for signature
  const queryParams: Record<string, string> = {};
  Object.keys(body).sort().forEach(key => {
    queryParams[key] = String(body[key]);
  });
  
  const signature = await createSignature(request.apiKey, request.apiSecret, timestamp, recvWindow, queryParams);
  
  // Bybit V5 order creation uses POST with body
  const response = await fetch(`${baseUrl}/v5/order/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-BAPI-API-KEY': request.apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'X-BAPI-SIGN': signature
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bybit API error (${response.status}): ${text.substring(0, 500)}`);
  }
  
  const data: BybitApiResponse<BybitOrderResponse> = await response.json();
  
  if (data.retCode !== 0) {
    throw new Error(`Bybit API error: ${data.retMsg} (Code: ${data.retCode})`);
  }
  
  if (!data.result) {
    throw new Error('No result in Bybit API response');
  }
  
  return data.result;
}

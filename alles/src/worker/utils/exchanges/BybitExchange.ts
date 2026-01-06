/**
 * Bybit Exchange API Implementation
 * Direct API calls without ccxt dependency
 */

export interface BybitTrade {
  execId: string;
  symbol: string;
  price: string;
  size: string;
  side: 'Buy' | 'Sell';
  time: string;
  isMaker: boolean;
  fee: string;
  feeCoin: string;
  tradeId: string;
}

export interface BybitApiResponse<T> {
  retCode: number;
  retMsg: string;
  result?: T;
  time?: number;
}

/**
 * Creates signature for Bybit API authentication
 * Bybit v5 API signature format: HMAC-SHA256(timestamp + apiKey + recvWindow + queryString, apiSecret)
 * Query parameters must be sorted alphabetically (excluding timestamp, recvWindow, apiKey, sign)
 * 
 * Official format: signature = HMAC-SHA256(timestamp + apiKey + recvWindow + queryString, apiSecret)
 */
async function createBybitSignature(
  apiKey: string,
  apiSecret: string,
  timestamp: string,
  recvWindow: string,
  queryParams: Record<string, string> = {}
): Promise<string> {
  // Sort all parameters alphabetically
  const sortedKeys = Object.keys(queryParams).sort();
  
  // Build query string from sorted parameters: key1=value1&key2=value2
  const queryString = sortedKeys
    .map(key => `${key}=${queryParams[key]}`)
    .join('&');
  
  // Bybit v5 signature payload: timestamp + apiKey + recvWindow + queryString
  // If queryString is empty, just use: timestamp + apiKey + recvWindow
  const payload = timestamp + apiKey + recvWindow + queryString;
  
  console.log('Bybit signature payload:', payload.substring(0, 100) + '...');
  
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
  
  console.log('Bybit signature (first 20 chars):', signatureHex.substring(0, 20) + '...');
  
  return signatureHex;
}

/**
 * Fetches trades for a specific category and time range
 */
async function fetchBybitTradesForCategory(
  apiKey: string,
  apiSecret: string,
  category: 'spot' | 'linear' | 'inverse' | 'option',
  symbol: string | undefined,
  startTime: number,
  endTime: number,
  limit: number = 50
): Promise<BybitTrade[]> {
  const baseUrl = 'https://api.bybit.com';
  const timestamp = Date.now().toString();
  const recvWindow = '5000';
  
  // Build query parameters
  const queryParams: Record<string, string> = {
    category: category
  };
  if (symbol) queryParams.symbol = symbol;
  queryParams.startTime = startTime.toString();
  queryParams.endTime = endTime.toString();
  queryParams.limit = limit.toString();
  
  // Create signature
  const signature = await createBybitSignature(apiKey, apiSecret, timestamp, recvWindow, queryParams);
  
  // Build final URL
  const url = new URL(`${baseUrl}/v5/execution/list`);
  Object.keys(queryParams).sort().forEach(key => {
    url.searchParams.append(key, queryParams[key]);
  });
  
  console.log(`📡 Bybit API: Fetching ${category} trades from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}...`);
  
  // Bybit v5 uses headers for authentication
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'X-BAPI-SIGN': signature
    },
    signal: AbortSignal.timeout(30000)
  });
  
  const responseText = await response.text();
  
  // Parse response
  let data: BybitApiResponse<{ list: BybitTrade[] }>;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    if (!response.ok) {
      throw new Error(`Bybit API error (${response.status}): Invalid JSON response - ${responseText.substring(0, 500)}`);
    }
    throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
  }
  
  // Check for errors
  if (data.retCode !== 0) {
    const errorMsg = data.retMsg || 'Unknown error';
    // Skip categories that don't have trades (e.g., if user doesn't have option trades)
    if (data.retCode === 10001 && errorMsg.includes('category')) {
      console.log(`⚠️ Category ${category} not available or no trades: ${errorMsg}`);
      return [];
    }
    throw new Error(`Bybit API error (${category}): ${errorMsg} (Code: ${data.retCode})`);
  }
  
  if (!response.ok) {
    throw new Error(`Bybit API HTTP error (${response.status}): ${responseText.substring(0, 300)}`);
  }
  
  const trades = data.result?.list || [];
  console.log(`✅ Bybit API: Fetched ${trades.length} ${category} trades`);
  
  return trades;
}

/**
 * Fetches my trades from Bybit API
 * Fetches from all categories (spot, linear, inverse, option) and handles pagination
 * Bybit API limits: max 7 days per request, so we split longer periods into chunks
 */
export async function fetchBybitMyTrades(
  apiKey: string,
  apiSecret: string,
  symbol?: string,
  startTime?: number,
  endTime?: number,
  limit: number = 50
): Promise<BybitTrade[]> {
  try {
    const now = Date.now();
    const since = startTime || (now - (180 * 24 * 60 * 60 * 1000)); // Default: 180 days
    const until = endTime || now;
    
    console.log(`📥 Fetching Bybit trades from ${new Date(since).toISOString()} to ${new Date(until).toISOString()}`);
    
    // Bybit API limit: max 7 days per request
    const MAX_DAYS_PER_REQUEST = 7;
    const MAX_MS_PER_REQUEST = MAX_DAYS_PER_REQUEST * 24 * 60 * 60 * 1000;
    
    const allTrades: BybitTrade[] = [];
    const categories: Array<'spot' | 'linear' | 'inverse' | 'option'> = ['spot', 'linear', 'inverse', 'option'];
    
    // Fetch from all categories
    for (const category of categories) {
      try {
        // Split time range into 7-day chunks
        let currentStart = since;
        
        while (currentStart < until) {
          const currentEnd = Math.min(currentStart + MAX_MS_PER_REQUEST, until);
          
          const trades = await fetchBybitTradesForCategory(
            apiKey,
            apiSecret,
            category,
            symbol,
            currentStart,
            currentEnd,
            limit
          );
          
          allTrades.push(...trades);
          
          // Move to next chunk
          currentStart = currentEnd + 1;
          
          // Small delay to avoid rate limiting
          if (currentStart < until) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (error: any) {
        // If a category fails (e.g., user doesn't have that type of trades), log and continue
        if (error.message?.includes('category') || error.message?.includes('Permission')) {
          console.log(`⚠️ Skipping category ${category}: ${error.message}`);
        } else {
          console.error(`❌ Error fetching ${category} trades:`, error);
          // Re-throw if it's not a category/permission issue
          throw error;
        }
      }
    }
    
    // Remove duplicates based on execId
    const uniqueTrades = Array.from(
      new Map(allTrades.map(trade => [trade.execId, trade])).values()
    );
    
    // Sort by timestamp
    uniqueTrades.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    console.log(`✅ Bybit API: Total ${uniqueTrades.length} unique trades fetched across all categories`);
    
    return uniqueTrades;
  } catch (error: any) {
    console.error('❌ Error fetching Bybit trades:', error);
    throw error;
  }
}

/**
 * Tests connection to Bybit API
 * Uses the wallet balance endpoint with SPOT account type
 * Bybit v5 uses headers for authentication, not query parameters
 */
export async function testBybitConnection(
  apiKey: string,
  apiSecret: string
): Promise<boolean> {
  try {
    const timestamp = Date.now().toString();
    const recvWindow = '5000';
    
    // Build query parameters (only accountType, excluding auth params)
    // Bybit v5 wallet-balance endpoint only supports UNIFIED account type
    const queryParams: Record<string, string> = {
      accountType: 'UNIFIED'
    };
    
    // Create signature with query parameters
    const signature = await createBybitSignature(apiKey, apiSecret, timestamp, recvWindow, queryParams);
    
    // Build URL with only query parameters (no auth params in URL)
    const url = new URL('https://api.bybit.com/v5/account/wallet-balance');
    url.searchParams.append('accountType', 'UNIFIED');
    
    console.log('🔍 Testing Bybit connection...');
    console.log('API Key:', apiKey.substring(0, 10) + '...');
    console.log('Timestamp:', timestamp);
    
    // Bybit v5 uses headers for authentication
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
    
    const responseText = await response.text();
    console.log('Bybit response status:', response.status);
    console.log('Bybit response:', responseText.substring(0, 1000)); // Limit log size
    
    if (!response.ok) {
      throw new Error(`Connection test failed: ${response.status} - ${responseText.substring(0, 200)}`);
    }
    
    let data: BybitApiResponse<any>;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
    }
    
    if (data.retCode !== 0) {
      const errorMsg = data.retMsg || 'Unknown error';
      console.error('Bybit API error:', errorMsg, 'Code:', data.retCode);
      
      // Provide more helpful error messages based on Bybit error codes
      if (data.retCode === 10001) {
        throw new Error(`Invalid parameter: ${errorMsg}. Please check your API key permissions.`);
      } else if (data.retCode === 10003) {
        throw new Error('Invalid API key. Please check your API key.');
      } else if (data.retCode === 10004) {
        throw new Error('Invalid signature. Please check your API secret and ensure it matches your API key.');
      } else if (data.retCode === 10005) {
        throw new Error('Permission denied. Your API key needs "Read-Only" permissions with access to "Trade" data. Go to Bybit → API Management → Edit your API key → Enable "Trade" under Read-Only permissions.');
      } else if (data.retCode === 10006) {
        throw new Error('IP address not whitelisted. Please add your IP to the API key whitelist or remove IP restrictions in Bybit settings.');
      } else if (data.retCode === 10016) {
        throw new Error('Service unavailable. Please try again later.');
      }
      
      throw new Error(`Connection test failed: ${errorMsg} (Code: ${data.retCode})`);
    }
    
    console.log('✅ Bybit connection test successful');
    return true;
  } catch (error: any) {
    console.error('❌ Bybit connection test failed:', error);
    
    // Provide more specific error messages
    if (error.message?.includes('Invalid signature')) {
      throw new Error('Invalid API secret. Please double-check your API secret key.');
    } else if (error.message?.includes('Invalid API key')) {
      throw new Error('Invalid API key. Please double-check your API key.');
    } else if (error.message?.includes('timeout')) {
      throw new Error('Connection timeout. Please check your internet connection and try again.');
    }
    
    throw new Error(`Connection test failed: ${error.message || 'Unknown error'}`);
  }
}


import { Hono } from "hono";

type Env = {
  ETHERSCAN_API_KEY: string;
  BSCSCAN_API_KEY: string;
  SNOWTRACE_API_KEY: string;
  ARBISCAN_API_KEY: string;
  OPTIMISM_API_KEY: string;
  TRON_API_KEY: string;
  SOLSCAN_API_KEY: string;
  DB: D1Database;
};

export const debugWhaleRouter = new Hono<{ Bindings: Env }>();

// Debug endpoint to test whale detection manually
debugWhaleRouter.get('/debug', async (c) => {
  try {
    console.log('🔍 Debug Whale Detection System');
    
    // Check API keys
    const apiKeys = {
      ethereum: c.env.ETHERSCAN_API_KEY,
      bsc: c.env.BSCSCAN_API_KEY,
      arbitrum: c.env.ARBISCAN_API_KEY,
      optimism: c.env.OPTIMISM_API_KEY,
      avalanche: c.env.SNOWTRACE_API_KEY,
      tron: c.env.TRON_API_KEY,
      solana: c.env.SOLSCAN_API_KEY
    };
    
    const keyStatus = Object.entries(apiKeys).map(([chain, key]) => ({
      chain,
      hasKey: !!key,
      keyPrefix: key ? key.substring(0, 8) + '...' : 'MISSING'
    }));
    
    // Test database connection
    let dbStatus = 'Unknown';
    let dbRowCount = 0;
    try {
      const result = await c.env.DB.prepare('SELECT COUNT(*) as count FROM whale_transactions').first();
      dbRowCount = result?.count as number || 0;
      dbStatus = 'Connected';
    } catch (error) {
      dbStatus = `Error: ${error}`;
    }
    
    // Test API connectivity
    let apiTestResults: any[] = [];
    
    // Test Ethereum API
    if (c.env.ETHERSCAN_API_KEY) {
      try {
        const response = await fetch(
          `https://api.etherscan.io/api?module=proxy&action=eth_blockNumber&apikey=${c.env.ETHERSCAN_API_KEY}`,
          { signal: AbortSignal.timeout(5000) }
        );
        const data: any = await response.json();
        apiTestResults.push({
          chain: 'ethereum',
          status: response.ok ? 'Success' : 'Failed',
          latestBlock: data.result ? parseInt(data.result, 16) : 'N/A',
          response: data
        });
      } catch (error) {
        apiTestResults.push({
          chain: 'ethereum',
          status: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Test BSC API
    if (c.env.BSCSCAN_API_KEY) {
      try {
        const response = await fetch(
          `https://api.bscscan.com/api?module=proxy&action=eth_blockNumber&apikey=${c.env.BSCSCAN_API_KEY}`,
          { signal: AbortSignal.timeout(5000) }
        );
        const data: any = await response.json();
        apiTestResults.push({
          chain: 'bsc',
          status: response.ok ? 'Success' : 'Failed',
          latestBlock: data.result ? parseInt(data.result, 16) : 'N/A',
          response: data
        });
      } catch (error) {
        apiTestResults.push({
          chain: 'bsc',
          status: 'Error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Get recent transactions from database
    let recentDbTransactions: any[] = [];
    try {
      const result = await c.env.DB.prepare(`
        SELECT * FROM whale_transactions 
        ORDER BY block_timestamp DESC 
        LIMIT 10
      `).all();
      
      recentDbTransactions = result.results.map((row: any) => ({
        hash: row.transaction_hash.substring(0, 10) + '...',
        chain: row.chain,
        coin: row.coin_symbol,
        usdValue: row.usd_value,
        timestamp: new Date(row.block_timestamp * 1000).toISOString(),
        transferType: row.transfer_type
      }));
    } catch (error) {
      recentDbTransactions = [{ error: error instanceof Error ? error.message : 'Unknown error' }];
    }
    
    return c.json({
      timestamp: new Date().toISOString(),
      system: {
        description: 'Whale Transaction Detection System Debug',
        version: '2.0.0'
      },
      apiKeys: keyStatus,
      database: {
        status: dbStatus,
        totalTransactions: dbRowCount
      },
      apiConnectivity: apiTestResults,
      recentTransactions: recentDbTransactions,
      configuration: {
        displayThreshold: '$100K USD',
        storageThreshold: '$50K USD',
        timeWindow: '24 hours',
        chainsMonitored: Object.keys(apiKeys),
        maxResults: 100
      },
      troubleshooting: {
        commonIssues: [
          'API rate limits (1-5 requests per second)',
          'Missing or invalid API keys',
          'Network connectivity issues',
          'Whale addresses may not have recent large transactions',
          'Time window may be too restrictive'
        ],
        recommendations: [
          'Verify all API keys are valid and have sufficient quota',
          'Check if explorer APIs are experiencing downtime',
          'Lower thresholds temporarily to test detection',
          'Expand time window for testing',
          'Check database for historical data'
        ]
      }
    });
    
  } catch (error) {
    return c.json({
      error: 'Debug system failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Manual whale detection test
debugWhaleRouter.get('/test-detection', async (c) => {
  try {
    console.log('🧪 Testing whale detection manually...');
    
    // Test with known whale address
    const testAddress = '0x28c6c06298d514db089934071355e5743bf21d60'; // Binance
    
    if (!c.env.ETHERSCAN_API_KEY) {
      return c.json({ error: 'Etherscan API key missing' }, 400);
    }
    
    const response = await fetch(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${testAddress}&sort=desc&page=1&offset=10&apikey=${c.env.ETHERSCAN_API_KEY}`,
      { signal: AbortSignal.timeout(10000) }
    );
    
    if (!response.ok) {
      return c.json({ 
        error: 'API request failed', 
        status: response.status,
        statusText: response.statusText 
      }, 400);
    }
    
    const data: any = await response.json();
    
    if (data.status !== '1') {
      return c.json({
        error: 'API returned error',
        message: data.message,
        result: data.result
      }, 400);
    }
    
    // Analyze transactions
    const transactions = data.result || [];
    const processedTxs = transactions.map((tx: any) => {
      const amount = parseFloat(tx.value) / Math.pow(10, 18); // ETH decimals
      const ethPrice = 2500; // Estimate
      const usdValue = amount * ethPrice;
      
      return {
        hash: tx.hash.substring(0, 12) + '...',
        timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
        from: tx.from.substring(0, 8) + '...',
        to: tx.to.substring(0, 8) + '...',
        ethAmount: amount.toFixed(4),
        usdValue: usdValue.toFixed(0),
        isWhaleSize: usdValue >= 50000
      };
    });
    
    const whaleTransactions = processedTxs.filter((tx: any) => tx.isWhaleSize);
    
    return c.json({
      testAddress: testAddress.substring(0, 10) + '...',
      timestamp: new Date().toISOString(),
      totalTransactions: transactions.length,
      whaleTransactions: whaleTransactions.length,
      transactions: processedTxs.slice(0, 5), // Show first 5
      whaleDetected: whaleTransactions.slice(0, 3), // Show first 3 whale txs
      summary: {
        hasRecentActivity: transactions.length > 0,
        hasWhaleActivity: whaleTransactions.length > 0,
        message: whaleTransactions.length > 0 
          ? `Found ${whaleTransactions.length} whale-sized transactions` 
          : 'No whale-sized transactions in recent history'
      }
    });
    
  } catch (error) {
    return c.json({
      error: 'Test detection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

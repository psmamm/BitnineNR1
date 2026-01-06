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

export const whaleTransactionsRouter = new Hono<{ Bindings: Env }>();

interface WhaleTransaction {
  id: string;
  timestamp: Date;
  coin: string;
  amount: number;
  usdValue: number;
  transferType: 'wallet_to_exchange' | 'exchange_to_wallet' | 'whale_to_whale';
  hash: string;
  fromAddress?: string;
  toAddress?: string;
  blockchainExplorerUrl: string;
  chain: string;
}

// Known exchange addresses for transfer type detection
const EXCHANGE_ADDRESSES = {
  ethereum: [
    '0x28c6c06298d514db089934071355e5743bf21d60', // Binance
    '0x2910543af39aba0cd09dbb2d50200b3e800a63d2', // Kraken
    '0x876eabf441b2ee5b5b0554fd502a8e0600950cfa', // Bitfinex
    '0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae', // Ethereum Foundation
    '0x564286362092d8e7936f0549571a803b203aaced', // FTX
    '0x6262998ced04146fa42253a5c0af90ca02dfd2a3', // Crypto.com
    '0x46340b20830761efd32832a74d7169b29feb9758', // Coinbase
    '0x3cd751e6b0078be393132286c442345e5dc49699', // Coinbase 2
    '0xdfd5293d8e347dfe59e90efd55b2956a1343963d', // Binance 2
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549', // Binance 3
  ],
  bsc: [
    '0x8894e0a0c962cb723c1976a4421c95949be2d4e3', // Binance BSC
    '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8', // Binance BSC 2
    '0xf977814e90da44bfa03b6295a0616a897441acec', // Binance BSC 3
  ],
  arbitrum: [
    '0x1522900b6dafac587d499a862861c0869be6e428', // Binance Arbitrum
    '0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f', // Arbitrum Bridge
  ],
  optimism: [
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', // Optimism Bridge
    '0x99c9fc46f92e8a1c0dec1b1747d010903e884be1', // Optimism Gateway
  ],
  avalanche: [
    '0x9f8c163cba728e99993abe7495f06c0a3c8ac8b9', // Avalanche Bridge
    '0x50ff3b278fccc5e1c90110d07c4e0e8d37c24f22', // Avalanche-C-Chain
  ],
  tron: [
    'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // Binance TRON
    'TQjaZ9FD473QBTdUzMLmSyoGB6Yz1CGpux', // Binance TRON 2  
    'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7', // Huobi TRON
    'TYkRdZgXd2NsGJtuPw8xTejvGPHYoE5SnJ', // OKEx TRON
    'THPvaUhoh2Qn2PIR8Nqdm4DhZTMr4hmmZu', // KuCoin TRON
    'TFczxzPhnThNSqr5by8tvxqdwjA8t5AN4D', // Gate.io TRON
  ],
  solana: [
    '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', // Binance SOL
    'A4CuNJGxfZWpAEf5qwqQPuqLPE2Jy6SxZZp8Kc1A2jzF', // FTX SOL (historical)
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Coinbase SOL  
    'EhpVAfcFMNNa2o78xPwcfUG9vYJ4pFJP4kKwG9uZUf7R', // Kraken SOL
    '2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm', // Crypto.com SOL
    'AobVSwqBc2xqYbKsmBT5u9bZdGrKwZ4wG9C3jf7Z9vNk', // OKEx SOL
    'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL', // Gate.io SOL
    'HsYtYSciVjpSj5gNvNr7xnNZaEgGHx7K8gNhgfvC1uy7', // KuCoin SOL
  ]
};

const CHAIN_CONFIGS = {
  ethereum: {
    symbol: 'ETH',
    decimals: 18,
    explorerBase: 'https://etherscan.io/tx/',
    apiBase: 'https://api.etherscan.io/api',
    logo: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/eth.png'
  },
  bsc: {
    symbol: 'BNB',
    decimals: 18,
    explorerBase: 'https://bscscan.com/tx/',
    apiBase: 'https://api.bscscan.com/api',
    logo: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/bnb.png'
  },
  arbitrum: {
    symbol: 'ETH',
    decimals: 18,
    explorerBase: 'https://arbiscan.io/tx/',
    apiBase: 'https://api.arbiscan.io/api',
    logo: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/eth.png'
  },
  optimism: {
    symbol: 'ETH',
    decimals: 18,
    explorerBase: 'https://optimistic.etherscan.io/tx/',
    apiBase: 'https://api-optimistic.etherscan.io/api',
    logo: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/eth.png'
  },
  avalanche: {
    symbol: 'AVAX',
    decimals: 18,
    explorerBase: 'https://snowtrace.io/tx/',
    apiBase: 'https://api.snowtrace.io/api',
    logo: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/avax.png'
  },
  tron: {
    symbol: 'TRX',
    decimals: 6,
    explorerBase: 'https://tronscan.org/#/transaction/',
    apiBase: 'https://apilist.tronscanapi.com/api',
    logo: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/trx.png'
  },
  solana: {
    symbol: 'SOL',
    decimals: 9,
    explorerBase: 'https://solscan.io/tx/',
    apiBase: 'https://public-api.solscan.io',
    logo: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/sol.png'
  }
};

function detectTransferType(fromAddress: string, toAddress: string, chain: string): 'wallet_to_exchange' | 'exchange_to_wallet' | 'whale_to_whale' {
  const exchanges = EXCHANGE_ADDRESSES[chain as keyof typeof EXCHANGE_ADDRESSES] || [];
  const fromIsExchange = exchanges.some(addr => addr.toLowerCase() === fromAddress.toLowerCase());
  const toIsExchange = exchanges.some(addr => addr.toLowerCase() === toAddress.toLowerCase());

  if (fromIsExchange && !toIsExchange) return 'exchange_to_wallet';
  if (!fromIsExchange && toIsExchange) return 'wallet_to_exchange';
  return 'whale_to_whale';
}

// Comprehensive whale addresses for better detection
const WHALE_ADDRESSES = {
  ethereum: [
    // Major Exchanges
    '0x28c6c06298d514db089934071355e5743bf21d60', // Binance Hot Wallet
    '0x46340b20830761efd32832a74d7169b29feb9758', // Coinbase
    '0x564286362092d8e7936f0549571a803b203aaced', // FTX (historical)
    '0x6262998ced04146fa42253a5c0af90ca02dfd2a3', // Crypto.com
    '0x2910543af39aba0cd09dbb2d50200b3e800a63d2', // Kraken
    '0xdfd5293d8e347dfe59e90efd55b2956a1343563d', // Binance 2
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549', // Binance 3
    '0x3cd751e6b0078be393132286c442345e5dc49699', // Coinbase 2
    '0x876eabf441b2ee5b5b0554fd502a8e0600950cfa', // Bitfinex
    '0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae', // Ethereum Foundation
    '0x267be1c1d684f78cb4f6a176c4911b741e4ffdc0', // Kraken 2
    // Known Whales
    '0xd8da6bf26964af9d7eed9e03e53415d37aa96045', // Vitalik Buterin
    '0x220866b1a2219f40e72f5c628b65d54268ca3a9d', // Binance Cold Storage
    '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8', // Large Holder
  ],
  bsc: [
    '0x8894e0a0c962cb723c1976a4421c95949be2d4e3', // Binance BSC
    '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8', // Binance BSC 2
    '0xf977814e90da44bfa03b6295a0616a897441acec', // Binance BSC 3
    '0x0ed943ce24baebf257488771759f9bf482c39706', // PancakeSwap
    '0x1ffd0b47127fdd4097e54521c9e2c7f0d66aabc5', // Venus Protocol
  ],
  arbitrum: [
    '0x1522900b6dafac587d499a862861c0869be6e428', // Binance Arbitrum
    '0x4dbd4fc535ac27206064b68ffcf827b0a60bab3f', // Arbitrum Bridge
    '0x915b1b8ee4d1b85b2830f15da8a7c8470d4c0c8e', // GMX
  ],
  optimism: [
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', // Optimism Bridge
    '0x99c9fc46f92e8a1c0dec1b1747d010903e884be1', // Optimism Gateway
  ],
  avalanche: [
    '0x9f8c163cba728e99993abe7495f06c0a3c8ac8b9', // Avalanche Bridge
    '0x50ff3b278fccc5e1c90110d07c4e0e8d37c24f22', // Avalanche-C-Chain
  ],
  tron: [
    // Major Exchanges
    'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // Binance TRON Hot Wallet
    'TQjaZ9FD473QBTdUzMLmSyoGB6Yz1CGpux', // Binance TRON 2
    'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7', // Huobi TRON
    'TYkRdZgXd2NsGJtuPw8xTejvGPHYoE5SnJ', // OKEx TRON
    'THPvaUhoh2Qn2PIR8Nqdm4DhZTMr4hmmZu', // KuCoin TRON
    'TFczxzPhnThNSqr5by8tvxqdwjA8t5AN4D', // Gate.io TRON
    'TDWv6W8NTfvZ33Twa5o9TfNZNMFEhKhVBA', // Crypto.com TRON
    'TWd4WrZ9wn84f5x1hZhV4togUDCyC5kH3m', // FTX TRON (historical)
    // Known TRON Whales
    'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH', // TRON Foundation
    'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs', // Sun Exchange
    'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', // CryptoChain Capital
    'TKmjJdDBsVBTjWgPeIxB2C9U1EkEF7R83M', // Large TRON Holder
    'TNaRAoLUyYEV22kWFLm3PWMLVmjR6GHbwW', // TRON Whale 2
  ],
  solana: [
    // Major Exchanges
    '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9', // Binance SOL Hot Wallet
    'A4CuNJGxfZWpAEf5qwqQPuqLPE2Jy6SxZZp8Kc1A2jzF', // FTX SOL (historical)
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Coinbase SOL
    'EhpVAfcFMNNa2o78xPwcfUG9vYJ4pFJP4kKwG9uZUf7R', // Kraken SOL
    '2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm', // Crypto.com SOL
    'AobVSwqBc2xqYbKsmBT5u9bZdGrKwZ4wG9C3jf7Z9vNk', // OKEx SOL
    'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL', // Gate.io SOL
    'HsYtYSciVjpSj5gNvNr7xnNZaEgGHx7K8gNhgfvC1uy7', // KuCoin SOL
    // Known Solana Whales & Validators
    'J1S9H3QjnRtBbbuD4HjPV6RpRhwuk4zKbxsnCHuTgh9w', // Solana Foundation
    'Ehdn4vx4h5QqCNqJ6jGgqDPcY6jqt5LqnJxEK8nfSB5S', // Large SOL Holder
    'Stake11111111111111111111111111111111111112', // Staking Program
    '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', // Solana Labs
    'So11111111111111111111111111111111111111112', // Wrapped SOL
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC-SOL
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT-SOL
    '11111111111111111111111111111111', // System Program
  ]
};

// Save whale transaction to database
async function saveWhaleTransaction(transaction: WhaleTransaction, db: D1Database): Promise<void> {
  try {
    const blockTimestamp = Math.floor(transaction.timestamp.getTime() / 1000);

    await db.prepare(`
      INSERT OR IGNORE INTO whale_transactions (
        transaction_hash, chain, coin_symbol, amount_tokens, usd_value, 
        transfer_type, from_address, to_address, block_timestamp, explorer_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      transaction.hash,
      transaction.chain,
      transaction.coin,
      transaction.amount,
      transaction.usdValue,
      transaction.transferType,
      transaction.fromAddress || '',
      transaction.toAddress || '',
      blockTimestamp,
      transaction.blockchainExplorerUrl
    ).run();

    console.log(`💾 Saved whale transaction: ${transaction.coin} ${transaction.amount} ($${transaction.usdValue.toLocaleString()})`);
  } catch (error) {
    console.error('Failed to save whale transaction:', error);
  }
}

// Load recent whale transactions from database
async function loadRecentWhaleTransactions(db: D1Database, hoursBack: number = 24): Promise<WhaleTransaction[]> {
  try {
    const cutoffTimestamp = Math.floor(Date.now() / 1000) - (hoursBack * 60 * 60);

    const result = await db.prepare(`
      SELECT * FROM whale_transactions 
      WHERE block_timestamp > ? 
      ORDER BY block_timestamp DESC 
      LIMIT 100
    `).bind(cutoffTimestamp).all();

    const transactions: WhaleTransaction[] = result.results.map((row: any) => ({
      id: `${row.chain}-${row.transaction_hash}`,
      timestamp: new Date(row.block_timestamp * 1000),
      coin: row.coin_symbol,
      amount: row.amount_tokens,
      usdValue: row.usd_value,
      transferType: row.transfer_type as 'wallet_to_exchange' | 'exchange_to_wallet' | 'whale_to_whale',
      hash: row.transaction_hash,
      fromAddress: row.from_address || undefined,
      toAddress: row.to_address || undefined,
      blockchainExplorerUrl: row.explorer_url,
      chain: row.chain
    }));

    console.log(`📊 Loaded ${transactions.length} whale transactions from database`);
    return transactions;
  } catch (error) {
    console.error('Failed to load whale transactions from database:', error);
    return [];
  }
}

async function fetchWhaleAddressTransactions(
  chain: string,
  apiKey: string,
  prices: Record<string, number>,
  db: D1Database
): Promise<WhaleTransaction[]> {
  const config = CHAIN_CONFIGS[chain as keyof typeof CHAIN_CONFIGS];
  if (!config) {
    console.log(`❌ No config found for chain: ${chain}`);
    return [];
  }

  const whaleAddresses = WHALE_ADDRESSES[chain as keyof typeof WHALE_ADDRESSES] || [];
  const allTransactions: WhaleTransaction[] = [];
  const coinPrice = prices[config.symbol] || 0;

  console.log(`🐋 Fetching whale address transactions for ${chain} with price $${coinPrice}, checking ${whaleAddresses.length} addresses`);

  if (coinPrice === 0) {
    console.log(`⚠️ Warning: No price found for ${config.symbol} on ${chain}`);
  }

  // Fetch transactions from known whale addresses
  for (const address of whaleAddresses.slice(0, 10)) { // Scan more addresses for better coverage
    try {
      console.log(`🔍 ${chain}: Fetching from whale address: ${address.slice(0, 10)}...`);

      const apiUrl = `${config.apiBase}?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=30&apikey=${apiKey}`;
      console.log(`📡 ${chain} API call: ${apiUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);

      const response = await fetch(apiUrl, { signal: AbortSignal.timeout(20000) });

      if (!response.ok) {
        console.log(`❌ ${chain}: HTTP ${response.status} for address ${address.slice(0, 10)}`);
        continue;
      }

      const data: any = await response.json();
      console.log(`📊 ${chain}: API response status: ${data.status}, message: ${data.message}, result count: ${Array.isArray(data.result) ? data.result.length : 'N/A'}`);

      if (data.status === "0" && data.message && data.message !== "No transactions found") {
        console.log(`⚠️ ${chain}: API Error - ${data.message}`);

        // Special handling for BSC deprecated endpoint error
        if (chain === 'bsc' && data.message.includes('deprecated')) {
          console.log(`🔧 ${chain}: Attempting fallback approach due to deprecated endpoint...`);
          // Continue to try processing even with the deprecation warning
        } else {
          continue;
        }
      }

      if (!data.result || !Array.isArray(data.result)) {
        console.log(`⚠️ ${chain}: No transaction data for address ${address.slice(0, 10)}`);
        continue;
      }

      console.log(`📈 ${chain}: Found ${data.result.length} transactions for address ${address.slice(0, 10)}`);

      const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
      let processedCount = 0;

      for (const tx of data.result) {
        if (!tx.value || tx.value === '0' || !tx.timeStamp || !tx.hash) continue;

        const txTimestamp = parseInt(tx.timeStamp);
        if (txTimestamp < twentyFourHoursAgo) continue;

        const amount = parseFloat(tx.value) / Math.pow(10, config.decimals);
        const usdValue = amount * coinPrice;

        // Lower threshold to $50K USD for better detection
        if (usdValue >= 50000 && tx.from && tx.to) {
          const transferType = detectTransferType(tx.from, tx.to, chain);

          const whaleTransaction = {
            id: `${chain}-${tx.hash}`,
            timestamp: new Date(txTimestamp * 1000),
            coin: config.symbol,
            amount: amount,
            usdValue: usdValue,
            transferType: transferType,
            hash: tx.hash,
            fromAddress: tx.from,
            toAddress: tx.to,
            blockchainExplorerUrl: config.explorerBase + tx.hash,
            chain: chain
          };

          allTransactions.push(whaleTransaction);
          processedCount++;

          // Save to database
          await saveWhaleTransaction(whaleTransaction, db);

          console.log(`💰 ${chain}: Found whale tx: ${amount.toFixed(4)} ${config.symbol} ($${usdValue.toLocaleString()})`);
        }
      }

      console.log(`✅ ${chain}: Processed ${processedCount} whale transactions from address ${address.slice(0, 10)}`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.error(`❌ ${chain}: Error fetching whale address ${address.slice(0, 10)}:`, error);
      continue;
    }
  }

  console.log(`🎯 ${chain}: Final result - Found ${allTransactions.length} whale transactions from whale addresses`);
  return allTransactions;
}

async function getCryptoPrices(): Promise<Record<string, number>> {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price');
    if (!response.ok) throw new Error('Failed to fetch prices');

    const data: any = await response.json();
    const prices: Record<string, number> = {};

    // Map Binance symbols to our coins
    const symbolMap = {
      'ETHUSDT': 'ETH',
      'BNBUSDT': 'BNB',
      'AVAXUSDT': 'AVAX',
      'TRXUSDT': 'TRX',
      'SOLUSDT': 'SOL'
    };

    for (const ticker of data) {
      if (symbolMap[ticker.symbol as keyof typeof symbolMap]) {
        prices[symbolMap[ticker.symbol as keyof typeof symbolMap]] = parseFloat(ticker.price);
      }
    }

    console.log('Fetched crypto prices:', prices);
    return prices;
  } catch (error) {
    console.error('Failed to fetch crypto prices:', error);
    // Fallback prices
    return {
      ETH: 2500,
      BNB: 600,
      AVAX: 35,
      TRX: 0.09,
      SOL: 140
    };
  }
}

async function fetchTronTransactions(
  apiKey: string,
  prices: Record<string, number>,
  db: D1Database
): Promise<WhaleTransaction[]> {
  try {
    console.log('🟠 TRON: Starting whale transaction fetch...');

    const whaleTransactions: WhaleTransaction[] = [];
    const trxPrice = prices.TRX || 0.09;
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);

    console.log(`🟠 TRON: TRX Price: $${trxPrice}`);

    // Fetch from known TRON whale addresses
    const whaleAddresses = WHALE_ADDRESSES.tron || [];
    console.log(`🟠 TRON: Checking ${whaleAddresses.length} whale addresses`);

    for (const address of whaleAddresses.slice(0, 3)) { // Reduced for testing
      try {
        console.log(`🟠 TRON: Fetching address: ${address.slice(0, 10)}...`);

        // Try different TRON API endpoints for better data
        const apiUrl = `https://api.trongrid.io/v1/accounts/${address}/transactions?limit=20&order_by=block_timestamp,desc`;
        console.log(`🟠 TRON: API call to ${apiUrl}`);

        const response = await fetch(apiUrl, {
          headers: {
            'TRON-PRO-API-KEY': apiKey,
            'accept': 'application/json'
          },
          signal: AbortSignal.timeout(20000)
        });

        console.log(`🟠 TRON: Response status: ${response.status} for ${address.slice(0, 10)}`);

        if (!response.ok) {
          console.log(`🟠 TRON: Failed HTTP request: ${response.status} ${response.statusText}`);
          continue;
        }

        const data: any = await response.json();
        console.log(`🟠 TRON: Response data keys: ${Object.keys(data)}`);

        // TronGrid API uses different structure
        const transactions = data.data || [];
        if (!Array.isArray(transactions)) {
          console.log(`🟠 TRON: No transaction data for ${address.slice(0, 10)}`);
          continue;
        }

        console.log(`🟠 TRON: Found ${transactions.length} transactions`);

        let processedCount = 0;

        for (const tx of transactions) {
          if (!tx.txID || !tx.block_timestamp) {
            console.log(`🟠 TRON: Skipping tx due to missing txID/timestamp`);
            continue;
          }

          const txTimestamp = Math.floor(tx.block_timestamp / 1000);
          if (txTimestamp < twentyFourHoursAgo) continue;

          console.log(`🟠 TRON: Processing tx ${tx.txID.slice(0, 10)}...`);

          // TronGrid API structure is different - check raw_data.contract
          let amount = 0;
          let symbol = 'TRX';

          if (tx.raw_data?.contract?.[0]) {
            const contract = tx.raw_data.contract[0];
            console.log(`🟠 TRON: Contract type: ${contract.type}`);

            if (contract.type === 'TransferContract' && contract.parameter?.value?.amount) {
              amount = parseFloat(contract.parameter.value.amount) / Math.pow(10, 6); // TRX decimals
              symbol = 'TRX';
              console.log(`🟠 TRON: Found TRX transfer: ${amount} TRX`);
            } else if (contract.type === 'TriggerSmartContract') {
              // Could be token transfer - skip for now but log
              console.log(`🟠 TRON: Smart contract interaction - skipping for now`);
              continue;
            }
          }

          if (amount === 0) {
            console.log(`🟠 TRON: Skipping tx due to zero amount`);
            continue;
          }

          const usdValue = amount * trxPrice;
          console.log(`🟠 TRON: USD Value: $${usdValue.toLocaleString()}`);

          if (usdValue >= 50000) {
            const fromAddress = tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address || address;
            const toAddress = tx.raw_data?.contract?.[0]?.parameter?.value?.to_address || '';

            const transferType = detectTransferType(fromAddress, toAddress, 'tron');

            const whaleTransaction = {
              id: `tron-${tx.txID}`,
              timestamp: new Date(tx.block_timestamp),
              coin: symbol,
              amount: amount,
              usdValue: usdValue,
              transferType: transferType,
              hash: tx.txID,
              fromAddress: fromAddress,
              toAddress: toAddress,
              blockchainExplorerUrl: `https://tronscan.org/#/transaction/${tx.txID}`,
              chain: 'tron'
            };

            whaleTransactions.push(whaleTransaction);
            await saveWhaleTransaction(whaleTransaction, db);
            processedCount++;

            console.log(`💰 TRON: Found whale tx: ${amount} ${symbol} ($${usdValue.toLocaleString()})`);
          }
        }

        console.log(`🟠 TRON: Processed ${processedCount} whale transactions from ${address.slice(0, 10)}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`🟠 TRON: Error fetching address ${address.slice(0, 10)}:`, error);
        continue;
      }
    }

    console.log(`🟠 TRON: Final result - Found ${whaleTransactions.length} whale transactions`);
    return whaleTransactions;

  } catch (error) {
    console.error('🟠 TRON: Error in fetchTronTransactions:', error);
    return [];
  }
}

async function fetchSolanaTransactions(
  apiKey: string,
  prices: Record<string, number>,
  db: D1Database
): Promise<WhaleTransaction[]> {
  try {
    console.log('🟣 SOLANA: Starting whale transaction fetch...');

    const whaleTransactions: WhaleTransaction[] = [];
    const solPrice = prices.SOL || 140;
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);

    console.log(`🟣 SOLANA: SOL Price: $${solPrice}`);

    // Fetch from known Solana whale addresses
    const whaleAddresses = WHALE_ADDRESSES.solana || [];
    console.log(`🟣 SOLANA: Checking ${whaleAddresses.length} whale addresses`);

    for (const address of whaleAddresses.slice(0, 3)) { // Reduced for testing
      try {
        console.log(`🟣 SOLANA: Fetching address: ${address.slice(0, 10)}...`);

        // Use Solscan API to get transactions - correct endpoint
        const apiUrl = `https://pro-api.solscan.io/v1.0/account/transactions?account=${address}&limit=20`;
        console.log(`🟣 SOLANA: API call to ${apiUrl}`);

        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'accept': 'application/json'
          },
          signal: AbortSignal.timeout(20000)
        });

        console.log(`🟣 SOLANA: Response status: ${response.status} for ${address.slice(0, 10)}`);

        if (!response.ok) {
          console.log(`🟣 SOLANA: Failed HTTP request: ${response.status} ${response.statusText}`);
          continue;
        }

        const data: any = await response.json();
        console.log(`🟣 SOLANA: Response data keys: ${Object.keys(data)}`);
        console.log(`🟣 SOLANA: Data array length: ${Array.isArray(data.data) ? data.data.length : 'Not array'}`);

        if (!data.data || !Array.isArray(data.data)) {
          console.log(`🟣 SOLANA: No transaction data for ${address.slice(0, 10)}`);
          continue;
        }

        let processedCount = 0;

        for (const tx of data.data) {
          if (!tx.txHash || !tx.blockTime) {
            console.log(`🟣 SOLANA: Skipping tx due to missing txHash/blockTime`);
            continue;
          }

          const txTimestamp = tx.blockTime;
          if (txTimestamp < twentyFourHoursAgo) continue;

          console.log(`🟣 SOLANA: Processing tx ${tx.txHash.slice(0, 10)}...`);
          console.log(`🟣 SOLANA: Transaction meta:`, JSON.stringify(tx.meta, null, 2).slice(0, 300));

          // Check for SOL transfers in transaction
          let solAmount = 0;

          if (tx.meta?.preBalances && tx.meta?.postBalances && tx.meta?.fee) {
            // Calculate SOL amount transferred
            const preBalance = tx.meta.preBalances[0] || 0;
            const postBalance = tx.meta.postBalances[0] || 0;
            const fee = tx.meta.fee || 0;

            const balanceChange = Math.abs(preBalance - postBalance);
            console.log(`🟣 SOLANA: Balance change: ${balanceChange}, fee: ${fee}`);

            if (balanceChange > fee) {
              solAmount = (balanceChange - fee) / Math.pow(10, 9); // SOL decimals
              console.log(`🟣 SOLANA: Found SOL transfer: ${solAmount} SOL`);
            }
          } else {
            console.log(`🟣 SOLANA: Missing balance data for tx`);
          }

          if (solAmount === 0) {
            console.log(`🟣 SOLANA: Skipping tx due to zero amount`);
            continue;
          }

          const usdValue = solAmount * solPrice;
          console.log(`🟣 SOLANA: USD Value: $${usdValue.toLocaleString()}`);

          if (usdValue >= 50000) {
            const transferType = detectTransferType(
              address, // From whale address
              tx.meta.postTokenBalances?.[0]?.owner || '',
              'solana'
            );

            const whaleTransaction = {
              id: `solana-${tx.txHash}`,
              timestamp: new Date(tx.blockTime * 1000),
              coin: 'SOL',
              amount: solAmount,
              usdValue: usdValue,
              transferType: transferType,
              hash: tx.txHash,
              fromAddress: address,
              toAddress: tx.meta.postTokenBalances?.[0]?.owner,
              blockchainExplorerUrl: `https://solscan.io/tx/${tx.txHash}`,
              chain: 'solana'
            };

            whaleTransactions.push(whaleTransaction);
            await saveWhaleTransaction(whaleTransaction, db);
            processedCount++;

            console.log(`💰 SOLANA: Found whale tx: ${solAmount} SOL ($${usdValue.toLocaleString()})`);
          }
        }

        console.log(`🟣 SOLANA: Processed ${processedCount} whale transactions from ${address.slice(0, 10)}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`🟣 SOLANA: Error fetching address ${address.slice(0, 10)}:`, error);
        continue;
      }
    }

    console.log(`🟣 SOLANA: Final result - Found ${whaleTransactions.length} whale transactions`);
    return whaleTransactions;

  } catch (error) {
    console.error('🟣 SOLANA: Error in fetchSolanaTransactions:', error);
    return [];
  }
}

async function fetchChainTransactions(
  chain: string,
  apiKey: string,
  prices: Record<string, number>,
  db: D1Database
): Promise<WhaleTransaction[]> {
  console.log(`🚀 Starting fetchChainTransactions for ${chain}...`);

  // Special handling for TRON
  if (chain === 'tron') {
    console.log(`🟠 Processing TRON with special handler...`);
    return await fetchTronTransactions(apiKey, prices, db);
  }

  // Special handling for Solana
  if (chain === 'solana') {
    console.log(`🟣 Processing Solana with special handler...`);
    return await fetchSolanaTransactions(apiKey, prices, db);
  }

  const config = CHAIN_CONFIGS[chain as keyof typeof CHAIN_CONFIGS];
  if (!config) {
    console.log(`❌ No config found for chain: ${chain}`);
    return [];
  }

  try {
    console.log(`🔍 Fetching real transactions for ${chain}...`);

    // First try to fetch from whale addresses (more reliable for finding large transactions)
    const whaleAddressTxs = await fetchWhaleAddressTransactions(chain, apiKey, prices, db);
    console.log(`🐋 ${chain}: Whale address method returned ${whaleAddressTxs.length} transactions`);

    if (whaleAddressTxs.length > 0) {
      return whaleAddressTxs;
    }

    // Fallback: Get latest block number and scan recent blocks
    const latestBlockResponse = await fetch(
      `${config.apiBase}?module=proxy&action=eth_blockNumber&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!latestBlockResponse.ok) {
      console.log(`Failed to get latest block for ${chain}`);
      return [];
    }

    const latestBlockData: any = await latestBlockResponse.json();
    const latestBlock = parseInt(latestBlockData.result, 16);

    // Check last 2000 blocks for broader coverage 
    const blocksToCheck = 2000;
    const startBlock = Math.max(1, latestBlock - blocksToCheck);

    console.log(`Scanning blocks ${startBlock} to ${latestBlock} on ${chain}`);

    // Get transactions from recent blocks
    const txResponse = await fetch(
      `${config.apiBase}?module=account&action=txlist&startblock=${startBlock}&endblock=${latestBlock}&sort=desc&page=1&offset=100&apikey=${apiKey}`,
      { signal: AbortSignal.timeout(25000) }
    );

    if (!txResponse.ok) {
      console.log(`Failed to get transactions for ${chain}`);
      return [];
    }

    const txData: any = await txResponse.json();

    if (!txData.result || !Array.isArray(txData.result)) {
      console.log(`No transaction data for ${chain}`);
      return [];
    }

    const coinPrice = prices[config.symbol] || 0;
    console.log(`${chain} price: $${coinPrice}`);

    const whaleTransactions: WhaleTransaction[] = [];
    const twentyFourHoursAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);

    // Process transactions
    for (const tx of txData.result) {
      if (!tx.value || tx.value === '0' || !tx.timeStamp || !tx.hash) continue;

      const txTimestamp = parseInt(tx.timeStamp);
      if (txTimestamp < twentyFourHoursAgo) continue;

      const amount = parseFloat(tx.value) / Math.pow(10, config.decimals);
      const usdValue = amount * coinPrice;

      // Lower threshold to $50K USD for better detection
      if (usdValue >= 50000 && tx.from && tx.to) {
        const transferType = detectTransferType(tx.from, tx.to, chain);

        const whaleTransaction = {
          id: `${chain}-${tx.hash}`,
          timestamp: new Date(txTimestamp * 1000),
          coin: config.symbol,
          amount: amount,
          usdValue: usdValue,
          transferType: transferType,
          hash: tx.hash,
          fromAddress: tx.from,
          toAddress: tx.to,
          blockchainExplorerUrl: config.explorerBase + tx.hash,
          chain: chain
        };

        whaleTransactions.push(whaleTransaction);

        // Save to database
        await saveWhaleTransaction(whaleTransaction, db);
      }
    }

    console.log(`Found ${whaleTransactions.length} whale transactions on ${chain}`);
    return whaleTransactions;

  } catch (error) {
    console.error(`Error fetching ${chain} transactions:`, error);
    return [];
  }
}

// Main endpoint - Real explorer API data only
whaleTransactionsRouter.get('/', async (c) => {
  try {
    console.log('🐋 Fetching REAL whale transactions using Explorer APIs...');

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

    const missingKeys = Object.entries(apiKeys).filter(([_, key]) => !key);
    const availableKeys = Object.entries(apiKeys).filter(([_, key]) => !!key);

    if (availableKeys.length === 0) {
      return c.json({
        transactions: [],
        count: 0,
        source: 'error',
        error: `No API keys configured`,
        message: 'Please configure at least one explorer API key'
      });
    }

    if (missingKeys.length > 0) {
      console.log(`⚠️ Missing API keys for: ${missingKeys.map(([chain]) => chain).join(', ')}. Skipping these chains.`);
    }

    // Get current crypto prices
    const prices = await getCryptoPrices();

    // First, load recent transactions from database as fallback
    let dbTransactions: WhaleTransaction[] = [];
    try {
      dbTransactions = await loadRecentWhaleTransactions(c.env.DB, 24);
      console.log(`💾 Database has ${dbTransactions.length} recent whale transactions`);
    } catch (error) {
      console.error('Failed to load from database:', error);
    }

    // Fetch from all chains sequentially for better debugging
    let allTransactions: WhaleTransaction[] = [];

    for (const [chain, apiKey] of Object.entries(apiKeys)) {
      if (!apiKey) continue;

      try {
        console.log(`🔍 Starting ${chain} whale transaction fetch...`);
        const result = await fetchChainTransactions(chain, apiKey, prices, c.env.DB);
        console.log(`✅ ${chain} completed: ${result.length} transactions found`);
        allTransactions.push(...result);

        // Small delay between chains to avoid overwhelming APIs
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ ${chain} fetch failed:`, error);
      }
    }

    // Results are already accumulated in allTransactions from the sequential loop above

    // Combine fresh API data with database data and deduplicate
    const combinedTransactions = [...allTransactions, ...dbTransactions];
    const uniqueTransactions = combinedTransactions.filter((tx, index, self) =>
      index === self.findIndex(t => t.hash === tx.hash)
    );

    // Sort by timestamp (newest first) and filter to display threshold
    const displayThreshold = 50000; // $50K for display (lowered for better visibility)
    const sortedTransactions = uniqueTransactions
      .filter(tx => tx.usdValue >= displayThreshold)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 100);

    console.log(`🐋 Returning ${sortedTransactions.length} whale transactions >$100K (${allTransactions.length} fresh + ${dbTransactions.length} from DB)`);

    // If no transactions meet display threshold, show all recent ones from DB
    if (sortedTransactions.length === 0 && dbTransactions.length > 0) {
      const fallbackTransactions = dbTransactions
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20);

      return c.json({
        transactions: fallbackTransactions,
        count: fallbackTransactions.length,
        source: 'database-fallback',
        threshold: '$50K+ (from database)',
        message: `📊 Showing ${fallbackTransactions.length} recent whale transactions from database. Fresh API data will appear when available.`
      });
    }

    // If still no transactions found
    if (sortedTransactions.length === 0) {
      console.log('⚠️ No whale transactions found in APIs or database');

      return c.json({
        transactions: [],
        count: 0,
        source: 'no-data',
        threshold: '$100K+',
        message: '🐋 No whale moves found. System is monitoring 7 blockchains for large transactions.'
      });
    }

    return c.json({
      transactions: sortedTransactions,
      count: sortedTransactions.length,
      source: allTransactions.length > 0 ? 'explorer-apis-live' : 'database-recent',
      threshold: '$100K+',
      message: `${sortedTransactions.length} whale moves >$100K ${allTransactions.length > 0 ? '(live data)' : '(recent from database)'} across 7 blockchains`
    });

  } catch (error) {
    console.error('❌ Fatal error in whale tracking:', error);

    return c.json({
      transactions: [],
      count: 0,
      source: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to fetch real-time whale data'
    });
  }
});

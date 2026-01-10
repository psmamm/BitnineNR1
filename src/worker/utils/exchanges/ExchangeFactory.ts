/**
 * Exchange Factory
 *
 * Factory pattern for creating exchange instances.
 * Centralizes exchange instantiation and configuration.
 */

import {
  ExchangeInterface,
  ExchangeCredentials,
  ExchangeId,
  AssetClass,
  ExchangeError
} from './ExchangeInterface';
import { BinanceExchange } from './BinanceExchange';
import { BybitExchangeV2 } from './BybitExchangeV2';
import { CoinbaseExchange } from './CoinbaseExchange';
import { KrakenExchange } from './KrakenExchange';
import { OKXExchange } from './OKXExchange';

// ============================================================================
// Types
// ============================================================================

export interface ExchangeConfig {
  exchangeId: ExchangeId;
  credentials: ExchangeCredentials;
  assetClass?: AssetClass;
  market?: 'spot' | 'futures';
  testnet?: boolean;
}

export interface ExchangeInfo {
  id: ExchangeId;
  name: string;
  logo: string;
  assetClasses: AssetClass[];
  features: string[];
  website: string;
  apiDocs: string;
  supported: boolean;
}

// ============================================================================
// Exchange Registry
// ============================================================================

const EXCHANGE_REGISTRY: Record<ExchangeId, ExchangeInfo> = {
  // Crypto CEXs
  bybit: {
    id: 'bybit',
    name: 'Bybit',
    logo: '/exchanges/bybit.svg',
    assetClasses: ['crypto'],
    features: ['spot', 'futures', 'options', 'copy_trading'],
    website: 'https://www.bybit.com',
    apiDocs: 'https://bybit-exchange.github.io/docs/',
    supported: true
  },
  binance: {
    id: 'binance',
    name: 'Binance',
    logo: '/exchanges/binance.svg',
    assetClasses: ['crypto'],
    features: ['spot', 'futures', 'margin', 'staking'],
    website: 'https://www.binance.com',
    apiDocs: 'https://binance-docs.github.io/apidocs/',
    supported: true
  },
  coinbase: {
    id: 'coinbase',
    name: 'Coinbase',
    logo: '/exchanges/coinbase.svg',
    assetClasses: ['crypto'],
    features: ['spot', 'advanced_trading'],
    website: 'https://www.coinbase.com',
    apiDocs: 'https://docs.cloud.coinbase.com/',
    supported: true
  },
  kraken: {
    id: 'kraken',
    name: 'Kraken',
    logo: '/exchanges/kraken.svg',
    assetClasses: ['crypto'],
    features: ['spot', 'futures', 'margin', 'staking'],
    website: 'https://www.kraken.com',
    apiDocs: 'https://docs.kraken.com/',
    supported: true
  },
  okx: {
    id: 'okx',
    name: 'OKX',
    logo: '/exchanges/okx.svg',
    assetClasses: ['crypto'],
    features: ['spot', 'futures', 'options', 'copy_trading'],
    website: 'https://www.okx.com',
    apiDocs: 'https://www.okx.com/docs/',
    supported: true
  },

  // Crypto DEXs
  uniswap: {
    id: 'uniswap',
    name: 'Uniswap',
    logo: '/exchanges/uniswap.svg',
    assetClasses: ['crypto'],
    features: ['swap', 'liquidity'],
    website: 'https://uniswap.org',
    apiDocs: 'https://docs.uniswap.org/',
    supported: false
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter',
    logo: '/exchanges/jupiter.svg',
    assetClasses: ['crypto'],
    features: ['swap', 'dca', 'limit_orders'],
    website: 'https://jup.ag',
    apiDocs: 'https://station.jup.ag/docs/',
    supported: false
  },
  dydx: {
    id: 'dydx',
    name: 'dYdX',
    logo: '/exchanges/dydx.svg',
    assetClasses: ['crypto'],
    features: ['perpetuals', 'margin'],
    website: 'https://dydx.exchange',
    apiDocs: 'https://dydxprotocol.github.io/v4-clients/',
    supported: false
  },
  gmx: {
    id: 'gmx',
    name: 'GMX',
    logo: '/exchanges/gmx.svg',
    assetClasses: ['crypto'],
    features: ['perpetuals', 'swap'],
    website: 'https://gmx.io',
    apiDocs: 'https://gmxio.gitbook.io/',
    supported: false
  },
  hyperliquid: {
    id: 'hyperliquid',
    name: 'Hyperliquid',
    logo: '/exchanges/hyperliquid.svg',
    assetClasses: ['crypto'],
    features: ['perpetuals', 'orderbook'],
    website: 'https://hyperliquid.xyz',
    apiDocs: 'https://hyperliquid.gitbook.io/',
    supported: false
  },

  // Stock Brokers
  interactive_brokers: {
    id: 'interactive_brokers',
    name: 'Interactive Brokers',
    logo: '/brokers/ibkr.svg',
    assetClasses: ['stocks', 'forex', 'futures', 'options'],
    features: ['stocks', 'options', 'futures', 'forex', 'bonds'],
    website: 'https://www.interactivebrokers.com',
    apiDocs: 'https://interactivebrokers.github.io/tws-api/',
    supported: false
  },
  td_ameritrade: {
    id: 'td_ameritrade',
    name: 'TD Ameritrade',
    logo: '/brokers/tda.svg',
    assetClasses: ['stocks', 'options'],
    features: ['stocks', 'options', 'etfs'],
    website: 'https://www.tdameritrade.com',
    apiDocs: 'https://developer.tdameritrade.com/',
    supported: false
  },
  robinhood: {
    id: 'robinhood',
    name: 'Robinhood',
    logo: '/brokers/robinhood.svg',
    assetClasses: ['stocks', 'crypto'],
    features: ['stocks', 'options', 'crypto'],
    website: 'https://robinhood.com',
    apiDocs: 'N/A', // No public API
    supported: false
  },
  webull: {
    id: 'webull',
    name: 'Webull',
    logo: '/brokers/webull.svg',
    assetClasses: ['stocks', 'crypto'],
    features: ['stocks', 'options', 'crypto'],
    website: 'https://www.webull.com',
    apiDocs: 'N/A', // No public API
    supported: false
  },
  fidelity: {
    id: 'fidelity',
    name: 'Fidelity',
    logo: '/brokers/fidelity.svg',
    assetClasses: ['stocks', 'options'],
    features: ['stocks', 'options', 'etfs', 'mutual_funds'],
    website: 'https://www.fidelity.com',
    apiDocs: 'N/A', // No public API
    supported: false
  },

  // Forex
  oanda: {
    id: 'oanda',
    name: 'OANDA',
    logo: '/brokers/oanda.svg',
    assetClasses: ['forex'],
    features: ['forex', 'cfds'],
    website: 'https://www.oanda.com',
    apiDocs: 'https://developer.oanda.com/',
    supported: false
  },
  forex_com: {
    id: 'forex_com',
    name: 'Forex.com',
    logo: '/brokers/forexcom.svg',
    assetClasses: ['forex'],
    features: ['forex', 'cfds'],
    website: 'https://www.forex.com',
    apiDocs: 'https://www.forex.com/en-us/trading-platforms/api-trading/',
    supported: false
  },
  ig: {
    id: 'ig',
    name: 'IG',
    logo: '/brokers/ig.svg',
    assetClasses: ['forex', 'stocks'],
    features: ['forex', 'cfds', 'spread_betting'],
    website: 'https://www.ig.com',
    apiDocs: 'https://labs.ig.com/rest-trading-api-reference',
    supported: false
  },
  pepperstone: {
    id: 'pepperstone',
    name: 'Pepperstone',
    logo: '/brokers/pepperstone.svg',
    assetClasses: ['forex'],
    features: ['forex', 'cfds'],
    website: 'https://www.pepperstone.com',
    apiDocs: 'N/A', // Uses MT4/MT5
    supported: false
  },

  // Futures
  ninjatrader: {
    id: 'ninjatrader',
    name: 'NinjaTrader',
    logo: '/brokers/ninjatrader.svg',
    assetClasses: ['futures'],
    features: ['futures', 'forex'],
    website: 'https://ninjatrader.com',
    apiDocs: 'https://ninjatrader.com/support/helpGuides/',
    supported: false
  },
  tradestation: {
    id: 'tradestation',
    name: 'TradeStation',
    logo: '/brokers/tradestation.svg',
    assetClasses: ['stocks', 'futures', 'options'],
    features: ['stocks', 'options', 'futures', 'crypto'],
    website: 'https://www.tradestation.com',
    apiDocs: 'https://api.tradestation.com/docs/',
    supported: false
  },
  tradovate: {
    id: 'tradovate',
    name: 'Tradovate',
    logo: '/brokers/tradovate.svg',
    assetClasses: ['futures'],
    features: ['futures'],
    website: 'https://www.tradovate.com',
    apiDocs: 'https://api.tradovate.com/',
    supported: false
  },

  // Options
  thinkorswim: {
    id: 'thinkorswim',
    name: 'thinkorswim',
    logo: '/brokers/thinkorswim.svg',
    assetClasses: ['stocks', 'options', 'futures'],
    features: ['stocks', 'options', 'futures'],
    website: 'https://www.schwab.com/trading/thinkorswim',
    apiDocs: 'https://developer.tdameritrade.com/', // Same as TD Ameritrade
    supported: false
  },
  tastyworks: {
    id: 'tastyworks',
    name: 'Tastyworks',
    logo: '/brokers/tastyworks.svg',
    assetClasses: ['stocks', 'options'],
    features: ['stocks', 'options', 'futures', 'crypto'],
    website: 'https://www.tastytrade.com/platform',
    apiDocs: 'https://developer.tastytrade.com/',
    supported: false
  }
};

// ============================================================================
// Exchange Factory
// ============================================================================

export class ExchangeFactory {
  /**
   * Create an exchange instance
   */
  static create(config: ExchangeConfig): ExchangeInterface {
    const { exchangeId, credentials, assetClass = 'crypto', market = 'spot' } = config;

    const info = EXCHANGE_REGISTRY[exchangeId];
    if (!info) {
      throw new ExchangeError(exchangeId, 'UNKNOWN_EXCHANGE', `Unknown exchange: ${exchangeId}`);
    }

    if (!info.supported) {
      throw new ExchangeError(exchangeId, 'NOT_SUPPORTED', `${info.name} is not yet supported. Coming soon!`);
    }

    switch (exchangeId) {
      case 'binance': {
        const exchange = new BinanceExchange(credentials, assetClass);
        exchange.setMarket(market);
        return exchange;
      }

      case 'bybit': {
        const exchange = new BybitExchangeV2(credentials, assetClass);
        exchange.setCategory(market === 'futures' ? 'linear' : 'spot');
        return exchange;
      }

      case 'coinbase': {
        return new CoinbaseExchange(credentials);
      }

      case 'kraken': {
        return new KrakenExchange(credentials);
      }

      case 'okx': {
        const exchange = new OKXExchange(credentials);
        if (market === 'futures') {
          exchange.setInstType('SWAP');
        } else {
          exchange.setInstType('SPOT');
        }
        return exchange;
      }

      default:
        throw new ExchangeError(exchangeId, 'NOT_IMPLEMENTED',
          `${info.name} implementation is not available yet.`);
    }
  }

  /**
   * Get exchange info
   */
  static getExchangeInfo(exchangeId: ExchangeId): ExchangeInfo | null {
    return EXCHANGE_REGISTRY[exchangeId] || null;
  }

  /**
   * Get all exchanges
   */
  static getAllExchanges(): ExchangeInfo[] {
    return Object.values(EXCHANGE_REGISTRY);
  }

  /**
   * Get supported exchanges
   */
  static getSupportedExchanges(): ExchangeInfo[] {
    return Object.values(EXCHANGE_REGISTRY).filter(e => e.supported);
  }

  /**
   * Get exchanges by asset class
   */
  static getExchangesByAssetClass(assetClass: AssetClass): ExchangeInfo[] {
    return Object.values(EXCHANGE_REGISTRY).filter(e => e.assetClasses.includes(assetClass));
  }

  /**
   * Get exchanges with a specific feature
   */
  static getExchangesByFeature(feature: string): ExchangeInfo[] {
    return Object.values(EXCHANGE_REGISTRY).filter(e => e.features.includes(feature));
  }

  /**
   * Check if exchange is supported
   */
  static isSupported(exchangeId: ExchangeId): boolean {
    const info = EXCHANGE_REGISTRY[exchangeId];
    return info?.supported || false;
  }

  /**
   * Test connection for an exchange
   */
  static async testConnection(config: ExchangeConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const exchange = this.create(config);
      await exchange.testConnection();
      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Get exchange balance
   */
  static async getBalance(config: ExchangeConfig) {
    const exchange = this.create(config);
    return exchange.getBalance();
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a Binance Spot exchange instance
 */
export function createBinanceSpot(apiKey: string, apiSecret: string, testnet = false): BinanceExchange {
  const exchange = new BinanceExchange({ apiKey, apiSecret, testnet }, 'crypto');
  exchange.setMarket('spot');
  return exchange;
}

/**
 * Create a Binance Futures exchange instance
 */
export function createBinanceFutures(apiKey: string, apiSecret: string, testnet = false): BinanceExchange {
  const exchange = new BinanceExchange({ apiKey, apiSecret, testnet }, 'crypto');
  exchange.setMarket('futures');
  return exchange;
}


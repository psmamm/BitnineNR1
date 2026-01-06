/**
 * API Configuration
 * Centralizes all external API endpoints for easier management and security
 */

const BINANCE_API_BASE_URL = import.meta.env.VITE_BINANCE_API_BASE_URL || 'https://api.binance.com';

const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';

export const apiConfig = {
  binance: {
    baseUrl: BINANCE_API_BASE_URL,
    endpoints: {
      exchangeInfo: `${BINANCE_API_BASE_URL}/api/v3/exchangeInfo`,
      ticker24hr: `${BINANCE_API_BASE_URL}/api/v3/ticker/24hr`,
      klines: (symbol: string, interval: string, limit: number, endTime?: number) => {
        const params = new URLSearchParams({
          symbol,
          interval,
          limit: limit.toString(),
        });
        if (endTime) {
          params.append('endTime', endTime.toString());
        }
        return `${BINANCE_API_BASE_URL}/api/v3/klines?${params.toString()}`;
      },
    },
  },
  coingecko: {
    baseUrl: COINGECKO_API_BASE_URL,
    endpoints: {
      markets: (vsCurrency: string = 'usd', perPage: number = 250, page: number = 1) => {
        const params = new URLSearchParams({
          vs_currency: vsCurrency,
          order: 'market_cap_desc',
          per_page: perPage.toString(),
          page: page.toString(),
          sparkline: 'false',
          price_change_percentage: '24h',
        });
        return `${COINGECKO_API_BASE_URL}/coins/markets?${params.toString()}`;
      },
      coin: (id: string) => `${COINGECKO_API_BASE_URL}/coins/${id}`,
    },
  },
} as const;


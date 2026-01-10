/**
 * Exchange Module
 *
 * Exports all exchange-related classes, types, and utilities.
 */

// Core Interface & Types
export {
  ExchangeInterface,
  type ExchangeCredentials,
  type Balance,
  type WalletBalance,
  type Trade,
  type Order,
  type Position,
  type CreateOrderRequest,
  type PositionSizeResult,
  type RiskValidationResult,
  type MarketInfo,
  type OHLCV,
  type RateLimits,
  type ExchangeCapabilities,
  type AssetClass,
  type ExchangeId,
  type OrderSide,
  type OrderType,
  type OrderStatus,
  type PositionSide,
  type MarginMode,
  type TimeInForce,
  // Error classes
  ExchangeError,
  AuthenticationError,
  InsufficientBalanceError,
  RateLimitError,
  OrderError
} from './ExchangeInterface';

// Exchange Implementations
export { BinanceExchange } from './BinanceExchange';
export { BybitExchangeV2 } from './BybitExchangeV2';
export { CoinbaseExchange } from './CoinbaseExchange';
export { KrakenExchange } from './KrakenExchange';
export { OKXExchange } from './OKXExchange';

// Factory & Registry
export {
  ExchangeFactory,
  createBinanceSpot,
  createBinanceFutures,
  type ExchangeConfig,
  type ExchangeInfo
} from './ExchangeFactory';

// Legacy Bybit (until refactored)
export {
  fetchBybitMyTrades,
  testBybitConnection,
  type BybitTrade,
  type BybitApiResponse
} from './BybitExchange';

export {
  placeBybitOrder,
  getBybitWalletBalance,
  calculateBybitPositionSize,
  validateBybitRisk,
  type BybitOrderRequest,
  type BybitOrderResponse,
  type BybitWalletBalance,
  type BybitPositionSizeResult
} from './BybitOrderExecution';

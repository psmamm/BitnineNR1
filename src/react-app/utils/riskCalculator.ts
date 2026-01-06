/**
 * Risk-First Position Size Calculator
 * 
 * Core formula: Position Size = Risk Amount ($) / ((Entry Price - Stop Loss Price) * Point Value)
 * 
 * This calculator ensures all position sizing is based on mathematical risk in Fiat,
 * not on lots or arbitrary size values.
 */

export interface PositionSizeInput {
  riskAmount: number;        // $ Risk in Fiat
  entryPrice: number;
  stopLossPrice: number;
  pointValue?: number;       // Default: 1 for Crypto, variable for Forex/Stocks
  leverage?: number;          // Default: 1
  marginMode?: 'isolated' | 'cross';
}

export interface PositionSizeResult {
  positionSize: number;
  orderValue: number;        // Position Size * Entry Price
  riskAmount: number;        // Confirmed risk amount
  stopDistance: number;      // Price distance to stop loss
  riskPercent: number;       // Risk as % of account
  marginRequired: number;    // Margin needed for the position
  liquidationPrice?: number; // Estimated liquidation price
  isValid: boolean;
  errors: string[];
}

/**
 * Calculates position size based on risk-first methodology
 */
export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  const errors: string[] = [];
  const pointValue = input.pointValue ?? 1;
  const leverage = input.leverage ?? 1;
  const marginMode = input.marginMode ?? 'isolated';

  // Validation
  if (input.riskAmount <= 0) {
    errors.push('Risk amount must be greater than 0');
  }
  if (input.entryPrice <= 0) {
    errors.push('Entry price must be greater than 0');
  }
  if (input.stopLossPrice <= 0) {
    errors.push('Stop loss price must be greater than 0');
  }
  if (leverage < 1) {
    errors.push('Leverage must be at least 1x');
  }
  if (input.entryPrice === input.stopLossPrice) {
    errors.push('Entry price and stop loss price cannot be equal');
  }

  if (errors.length > 0) {
    return {
      positionSize: 0,
      orderValue: 0,
      riskAmount: input.riskAmount,
      stopDistance: 0,
      riskPercent: 0,
      marginRequired: 0,
      isValid: false,
      errors
    };
  }

  // Calculate stop distance
  const stopDistance = Math.abs(input.entryPrice - input.stopLossPrice);
  
  // Core formula: Position Size = Risk Amount ($) / ((Entry Price - Stop Loss Price) * Point Value)
  const positionSize = stopDistance > 0 
    ? input.riskAmount / (stopDistance * pointValue)
    : 0;

  // Calculate order value (notional)
  const orderValue = positionSize * input.entryPrice;

  // Calculate margin required
  // For isolated margin: margin = orderValue / leverage
  // For cross margin: margin is shared across positions
  const marginRequired = marginMode === 'isolated'
    ? orderValue / leverage
    : orderValue / leverage; // Simplified - cross margin calculation is more complex

  // Estimate liquidation price (simplified)
  // For long: liquidation ≈ entryPrice * (1 - 1/leverage)
  // For short: liquidation ≈ entryPrice * (1 + 1/leverage)
  const isLong = input.entryPrice > input.stopLossPrice;
  const liquidationPrice = isLong
    ? input.entryPrice * (1 - 0.95 / leverage) // 95% of max leverage
    : input.entryPrice * (1 + 0.95 / leverage);

  // Risk as percentage (would need account balance to calculate accurately)
  const riskPercent = 0; // Placeholder - needs account balance

  return {
    positionSize: Math.max(0, positionSize),
    orderValue: Math.max(0, orderValue),
    riskAmount: input.riskAmount,
    stopDistance,
    riskPercent,
    marginRequired: Math.max(0, marginRequired),
    liquidationPrice,
    isValid: true,
    errors: []
  };
}

/**
 * Calculates position size for Bybit V5 UTA 2.0 Cross-Margin
 * 
 * Bybit UTA 2.0 uses unified account type with cross-margin support.
 * This function accounts for available balance and position mode.
 */
export interface BybitPositionSizeInput extends PositionSizeInput {
  availableBalance?: number;  // Available balance in USDT
  accountType?: 'UNIFIED' | 'CONTRACT';
  positionMode?: 'One-Way' | 'Hedge';
}

export interface BybitPositionSizeResult extends PositionSizeResult {
  availableBalance: number;
  accountType: string;
  canOpen: boolean;
  reason?: string;
}

export function calculateBybitPositionSize(input: BybitPositionSizeInput): BybitPositionSizeResult {
  const baseResult = calculatePositionSize(input);
  const availableBalance = input.availableBalance ?? 0;
  const accountType = input.accountType ?? 'UNIFIED';
  const positionMode = input.positionMode ?? 'One-Way';

  const errors = [...baseResult.errors];
  let canOpen = baseResult.isValid;

  // Check if we have enough margin
  if (baseResult.marginRequired > availableBalance) {
    canOpen = false;
    errors.push(`Insufficient balance. Required: $${baseResult.marginRequired.toFixed(2)}, Available: $${availableBalance.toFixed(2)}`);
  }

  // For cross-margin, we need to consider existing positions
  // This is a simplified check - full implementation would query existing positions
  if (input.marginMode === 'cross' && availableBalance < baseResult.marginRequired * 1.1) {
    errors.push('Cross-margin requires additional buffer for existing positions');
  }

  return {
    ...baseResult,
    availableBalance,
    accountType,
    canOpen,
    isValid: canOpen && errors.length === 0,
    errors
  };
}

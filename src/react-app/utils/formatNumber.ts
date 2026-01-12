/**
 * Number Formatting Utilities
 *
 * Provides consistent number formatting across the application
 */

/**
 * Format a number with thousand separators and optional decimal places
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 *
 * @example
 * formatNumber(12450) // "12,450"
 * formatNumber(12450.567, 2) // "12,450.57"
 * formatNumber(0.123456, 6) // "0.123456"
 */
export const formatNumber = (num: number, decimals: number = 2): string => {
  if (isNaN(num) || !isFinite(num)) {
    return '0';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Format a number as currency (USD)
 * @param amount - The amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(12450) // "$12,450.00"
 * formatCurrency(12450.567) // "$12,450.57"
 */
export const formatCurrency = (amount: number, decimals: number = 2): string => {
  if (isNaN(amount) || !isFinite(amount)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

/**
 * Format a number as a percentage
 * @param value - The value to format (0.5 = 50%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(0.1234) // "12.34%"
 * formatPercentage(0.5) // "50.00%"
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  if (isNaN(value) || !isFinite(value)) {
    return '0%';
  }

  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Fix floating point precision issues
 * @param num - The number to fix
 * @param decimals - Number of decimal places (default: 2)
 * @returns Fixed number
 *
 * @example
 * fixFloatingPoint(0.1 + 0.2) // 0.3 (not 0.30000000000000004)
 * fixFloatingPoint(price * 0.98) // Proper stop loss calculation
 */
export const fixFloatingPoint = (num: number, decimals: number = 2): number => {
  if (isNaN(num) || !isFinite(num)) {
    return 0;
  }

  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Calculate stop loss with proper floating point handling
 * @param price - Entry price
 * @param percent - Stop loss percentage (0.02 = 2%)
 * @returns Stop loss price
 *
 * @example
 * calculateStopLoss(100, 0.02) // 98.00
 */
export const calculateStopLoss = (price: number, percent: number): number => {
  return fixFloatingPoint(price * (1 - percent));
};

/**
 * Calculate take profit with proper floating point handling
 * @param price - Entry price
 * @param percent - Take profit percentage (0.05 = 5%)
 * @returns Take profit price
 *
 * @example
 * calculateTakeProfit(100, 0.05) // 105.00
 */
export const calculateTakeProfit = (price: number, percent: number): number => {
  return fixFloatingPoint(price * (1 + percent));
};

/**
 * Calculate Risk-Reward ratio
 * @param entry - Entry price
 * @param stopLoss - Stop loss price
 * @param takeProfit - Take profit price
 * @returns R:R ratio or "∞" for invalid ratios
 *
 * @example
 * calculateRiskReward(100, 98, 104) // "2.00" (2:1 ratio)
 * calculateRiskReward(100, 100, 104) // "∞" (no risk = infinite reward)
 */
export const calculateRiskReward = (
  entry: number,
  stopLoss: number,
  takeProfit: number
): string => {
  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);

  if (risk === 0) {
    return '∞'; // Infinite R:R when there's no risk
  }

  const ratio = reward / risk;

  if (!isFinite(ratio) || isNaN(ratio)) {
    return '∞';
  }

  return ratio.toFixed(2);
};

/**
 * Format large numbers with K/M/B suffixes
 * @param num - The number to format
 * @returns Formatted string with suffix
 *
 * @example
 * formatLargeNumber(1200) // "1.2K"
 * formatLargeNumber(1500000) // "1.5M"
 * formatLargeNumber(2400000000) // "2.4B"
 */
export const formatLargeNumber = (num: number): string => {
  if (isNaN(num) || !isFinite(num)) {
    return '0';
  }

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum >= 1e9) {
    return `${sign}${(absNum / 1e9).toFixed(1)}B`;
  } else if (absNum >= 1e6) {
    return `${sign}${(absNum / 1e6).toFixed(1)}M`;
  } else if (absNum >= 1e3) {
    return `${sign}${(absNum / 1e3).toFixed(1)}K`;
  }

  return `${sign}${absNum.toFixed(0)}`;
};

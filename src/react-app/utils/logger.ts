/**
 * Logger utility that only logs in development mode
 * Suppresses console output in production to keep console clean
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Log errors - only in development
   */
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    }
  },

  /**
   * Log warnings - only in development
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log info - only in development
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log debug info - only in development
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Critical errors - always logged (even in production)
   * Use sparingly for truly critical issues
   */
  critical: (...args: unknown[]) => {
    console.error('[CRITICAL]', ...args);
  }
};

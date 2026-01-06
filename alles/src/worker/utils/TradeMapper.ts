/**
 * Maps normalized exchange trades to the internal Trade schema
 */

import { NormalizedTrade } from './ExchangeImporter';

export interface MappedTrade {
  symbol: string;
  asset_type: 'crypto';
  direction: 'long' | 'short';
  quantity: number;
  entry_price: number;
  exit_price?: number;
  entry_date: string;
  exit_date?: string;
  commission?: number;
  pnl?: number;
  is_closed: boolean;
  external_id: string;
  exchange: string;
  imported_from_exchange: boolean;
}

/**
 * Maps a normalized trade from exchange to internal trade format
 * 
 * @param trade - Normalized trade from exchange
 * @returns Mapped trade ready for database insertion
 */
export function mapNormalizedTradeToTrade(trade: NormalizedTrade): MappedTrade {
  // Convert symbol format (e.g., "BTC/USDT" -> "BTCUSDT")
  const symbol = trade.symbol.replace('/', '').toUpperCase();
  
  // Map side to direction
  // buy = long, sell = short
  const direction: 'long' | 'short' = trade.side === 'buy' ? 'long' : 'short';
  
  // Check if this is a closed position (from closed-pnl endpoint)
  const isClosedPosition = trade.isClosedPosition === true;
  
  // Format dates
  const entryDate = new Date(trade.timestamp);
  const entry_date = entryDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // For closed positions, use the provided data
  let exit_date: string | undefined = undefined;
  let exit_price: number | undefined = undefined;
  let pnl: number | undefined = undefined;
  
  if (isClosedPosition) {
    // Use exit timestamp if available, otherwise use entry timestamp
    const exitTimestamp = trade.exitTimestamp || trade.timestamp;
    const exitDate = new Date(exitTimestamp);
    exit_date = exitDate.toISOString().split('T')[0];
    
    // Use avgExitPrice if available
    exit_price = trade.avgExitPrice || trade.price;
    
    // Use closedPnl if available
    pnl = trade.closedPnl;
    
    // Use avgEntryPrice for entry price if available
    const entry_price = trade.avgEntryPrice || trade.price;
    
    return {
      symbol,
      asset_type: 'crypto',
      direction,
      quantity: trade.amount,
      entry_price: entry_price,
      exit_price: exit_price,
      entry_date,
      exit_date: exit_date,
      commission: trade.fee.cost || 0,
      pnl: pnl,
      is_closed: true, // Closed positions are always closed
      external_id: trade.external_id,
      exchange: trade.exchange,
      imported_from_exchange: true
    };
  }
  
  // For non-closed positions (spot trades, etc.), treat as open
  return {
    symbol,
    asset_type: 'crypto',
    direction,
    quantity: trade.amount,
    entry_price: trade.price,
    exit_price: undefined,
    entry_date,
    exit_date: undefined,
    commission: trade.fee.cost || 0,
    pnl: undefined,
    is_closed: false,
    external_id: trade.external_id,
    exchange: trade.exchange,
    imported_from_exchange: true
  };
}

/**
 * Maps multiple normalized trades
 * For exchange imports, we treat each trade individually without automatic pairing
 * Each trade is imported as a separate entry (open position)
 * Users can manually close positions later if needed
 * 
 * @param trades - Array of normalized trades
 * @returns Array of mapped trades
 */
export function mapNormalizedTrades(trades: NormalizedTrade[]): MappedTrade[] {
  // Sort by timestamp
  const sortedTrades = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  
  const mappedTrades: MappedTrade[] = [];
  
  // Import each trade individually without automatic pairing
  // For Futures/Perpetuals, each execution is a separate trade
  // Buy = Long position entry/exit
  // Sell = Short position entry/exit
  // We don't automatically pair them - each trade stands alone
  for (const trade of sortedTrades) {
    // Each trade is imported as an open position
    // Users can manually mark them as closed if needed
    mappedTrades.push(mapNormalizedTradeToTrade(trade));
  }
  
  return mappedTrades;
}

/**
 * Formats a symbol from exchange format to internal format
 * Example: "BTC/USDT" -> "BTCUSDT"
 */
export function formatSymbol(exchangeSymbol: string): string {
  return exchangeSymbol.replace('/', '').toUpperCase();
}


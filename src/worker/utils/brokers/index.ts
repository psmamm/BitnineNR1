/**
 * Brokers Module Index
 *
 * Exports broker interface and parsers for trade imports.
 */

// Types and interfaces
export {
  type AssetClass,
  type TradeSide,
  type ParsedTrade,
  type ParseResult,
  type BrokerInfo,
  type ColumnMapping,
  BrokerParser,
  BROKER_REGISTRY
} from './BrokerInterface';

// Parsers
export {
  GenericCSVParser,
  createGenericParser,
  type GenericCSVOptions,
  TDAmeritradeParser,
  createTDAmeritradeParser,
  InteractiveBrokersParser,
  createInteractiveBrokersParser,
  MetaTraderParser,
  createMetaTraderParser
} from './parsers';

// ============================================================================
// Parser Factory
// ============================================================================

import { BrokerParser, BROKER_REGISTRY } from './BrokerInterface';
import { GenericCSVParser } from './parsers/GenericCSV';
import { TDAmeritradeParser } from './parsers/TDAmeritrade';
import { InteractiveBrokersParser } from './parsers/InteractiveBrokers';
import { MetaTraderParser } from './parsers/MetaTrader';

/**
 * Create a parser for the specified broker
 */
export function createBrokerParser(brokerId: string): BrokerParser {
  const brokerInfo = BROKER_REGISTRY[brokerId];

  if (!brokerInfo) {
    throw new Error(`Unknown broker: ${brokerId}. Available: ${Object.keys(BROKER_REGISTRY).join(', ')}`);
  }

  switch (brokerId) {
    case 'td_ameritrade':
      return new TDAmeritradeParser();

    case 'interactive_brokers':
      return new InteractiveBrokersParser();

    case 'metatrader':
      return new MetaTraderParser();

    case 'generic':
    default:
      return new GenericCSVParser();
  }
}

/**
 * Get all supported brokers
 */
export function getSupportedBrokers(): Array<{ id: string; name: string; assetClasses: string[] }> {
  return Object.values(BROKER_REGISTRY).map(broker => ({
    id: broker.id,
    name: broker.name,
    assetClasses: broker.supportedAssetClasses
  }));
}

/**
 * Auto-detect broker from CSV content
 */
export function detectBroker(csvContent: string): string | undefined {
  // Check for IBKR markers
  if (csvContent.includes('Interactive Brokers') || csvContent.includes('Trades,Header')) {
    return 'interactive_brokers';
  }

  // Check for TD Ameritrade markers
  if (csvContent.includes('TD Ameritrade') || csvContent.includes('Schwab')) {
    return 'td_ameritrade';
  }

  // Check for MetaTrader markers
  if (csvContent.includes('MetaTrader') || csvContent.includes('MT4') || csvContent.includes('MT5')) {
    return 'metatrader';
  }

  // Check for common MT export format (tab-separated with specific columns)
  const firstLine = csvContent.split('\n')[0].toLowerCase();
  if (firstLine.includes('ticket') && firstLine.includes('symbol') &&
      (firstLine.includes('profit') || firstLine.includes('swap'))) {
    return 'metatrader';
  }

  return undefined;
}

/**
 * Parse CSV with auto-detection
 */
export async function parseTradesCSV(csvContent: string, brokerId?: string): Promise<{
  brokerId: string;
  result: import('./BrokerInterface').ParseResult;
}> {
  const detectedBroker = brokerId || detectBroker(csvContent) || 'generic';
  const parser = createBrokerParser(detectedBroker);
  const result = await parser.parse(csvContent);

  return {
    brokerId: detectedBroker,
    result
  };
}

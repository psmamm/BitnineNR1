/**
 * Broker Interface
 *
 * Base interface for broker trade parsers.
 * Standardizes trade data from various broker CSV formats.
 */

// ============================================================================
// Types
// ============================================================================

export type AssetClass = 'crypto' | 'stocks' | 'forex' | 'futures' | 'options';
export type TradeSide = 'buy' | 'sell' | 'long' | 'short';

export interface ParsedTrade {
  // Identifiers
  externalId?: string;
  symbol: string;

  // Asset info
  assetClass: AssetClass;
  baseAsset?: string;
  quoteAsset?: string;

  // Trade details
  side: TradeSide;
  quantity: number;
  entryPrice: number;
  exitPrice?: number;

  // Options specific
  optionType?: 'call' | 'put';
  strikePrice?: number;
  expirationDate?: string;

  // Costs
  fee?: number;
  feeCurrency?: string;

  // P&L
  realizedPnl?: number;

  // Dates
  entryDate: Date;
  exitDate?: Date;

  // Metadata
  orderType?: string;
  notes?: string;

  // Source tracking
  importSource: string;
  rawData?: Record<string, unknown>;
}

export interface ParseResult {
  success: boolean;
  trades: ParsedTrade[];
  errors: string[];
  warnings: string[];
  totalRows: number;
  parsedRows: number;
  skippedRows: number;
}

export interface BrokerInfo {
  id: string;
  name: string;
  supportedAssetClasses: AssetClass[];
  csvFormat: 'standard' | 'custom';
  dateFormat?: string;
  delimiter?: string;
  skipRows?: number;
}

export interface ColumnMapping {
  symbol: string | string[];
  side: string | string[];
  quantity: string | string[];
  price: string | string[];
  exitPrice?: string | string[];
  date: string | string[];
  exitDate?: string | string[];
  fee?: string | string[];
  pnl?: string | string[];
  orderId?: string | string[];
  orderType?: string | string[];
  notes?: string | string[];
}

// ============================================================================
// Abstract Parser Class
// ============================================================================

export abstract class BrokerParser {
  protected brokerId: string;
  protected brokerName: string;

  constructor(brokerId: string, brokerName: string) {
    this.brokerId = brokerId;
    this.brokerName = brokerName;
  }

  /**
   * Get broker info
   */
  abstract getBrokerInfo(): BrokerInfo;

  /**
   * Parse CSV content
   */
  abstract parse(csvContent: string): Promise<ParseResult>;

  /**
   * Validate if CSV matches expected format
   */
  abstract validate(csvContent: string): { valid: boolean; errors: string[] };

  // ============================================================================
  // Common Helpers
  // ============================================================================

  protected parseCSV(
    content: string,
    delimiter: string = ',',
    skipRows: number = 0
  ): { headers: string[]; rows: string[][] } {
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    // Skip header rows
    const dataLines = lines.slice(skipRows);

    if (dataLines.length === 0) {
      return { headers: [], rows: [] };
    }

    // Parse headers
    const headers = this.parseCSVLine(dataLines[0], delimiter);

    // Parse data rows
    const rows = dataLines.slice(1).map(line => this.parseCSVLine(line, delimiter));

    return { headers, rows };
  }

  protected parseCSVLine(line: string, delimiter: string = ','): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"' && !inQuotes) {
        inQuotes = true;
      } else if (char === '"' && inQuotes) {
        if (nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  protected getColumnValue(
    row: string[],
    headers: string[],
    columnNames: string | string[]
  ): string | undefined {
    const names = Array.isArray(columnNames) ? columnNames : [columnNames];

    for (const name of names) {
      const index = headers.findIndex(
        h => h.toLowerCase().trim() === name.toLowerCase().trim()
      );
      if (index !== -1 && row[index] !== undefined) {
        return row[index].trim();
      }
    }

    return undefined;
  }

  protected parseNumber(value: string | undefined): number | undefined {
    if (!value) return undefined;

    // Remove currency symbols, commas, and parentheses (negative)
    let cleaned = value.replace(/[$€£¥,]/g, '').trim();

    // Handle parentheses for negative (common in accounting)
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }

  protected parseDate(
    value: string | undefined,
     
    _format?: string
  ): Date | undefined {
    if (!value) return undefined;

    // Try ISO format first
    const isoDate = new Date(value);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Try common formats
    const formats = [
      // US formats
      { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})/, parts: [1, 2, 3], order: 'MDY' },
      { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})/, parts: [1, 2, 3], order: 'MDY' },
      // EU formats
      { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})/, parts: [1, 2, 3], order: 'DMY' },
      { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})/, parts: [1, 2, 3], order: 'DMY' },
      // ISO-like
      { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})/, parts: [1, 2, 3], order: 'YMD' },
      { regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})/, parts: [1, 2, 3], order: 'YMD' },
    ];

    for (const fmt of formats) {
      const match = value.match(fmt.regex);
      if (match) {
        let year: number, month: number, day: number;

        switch (fmt.order) {
          case 'MDY':
            month = parseInt(match[1]);
            day = parseInt(match[2]);
            year = parseInt(match[3]);
            break;
          case 'DMY':
            day = parseInt(match[1]);
            month = parseInt(match[2]);
            year = parseInt(match[3]);
            break;
          case 'YMD':
          default:
            year = parseInt(match[1]);
            month = parseInt(match[2]);
            day = parseInt(match[3]);
        }

        // Validate
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900) {
          return new Date(year, month - 1, day);
        }
      }
    }

    return undefined;
  }

  protected parseSide(value: string | undefined): TradeSide | undefined {
    if (!value) return undefined;

    const normalized = value.toLowerCase().trim();

    const buyTerms = ['buy', 'bought', 'long', 'open long', 'b', 'bid'];
    const sellTerms = ['sell', 'sold', 'short', 'open short', 's', 'ask'];

    if (buyTerms.includes(normalized)) return 'buy';
    if (sellTerms.includes(normalized)) return 'sell';

    return undefined;
  }

  protected determineAssetClass(symbol: string): AssetClass {
    // Crypto patterns
    const cryptoPatterns = [
      /^(BTC|ETH|XRP|SOL|ADA|DOGE|DOT|LINK|AVAX|MATIC)/i,
      /(USDT|USDC|BUSD|DAI)$/i,
      /^[A-Z]{3,5}[-/](USDT|USDC|BTC|ETH)$/i
    ];

    for (const pattern of cryptoPatterns) {
      if (pattern.test(symbol)) return 'crypto';
    }

    // Forex patterns (currency pairs)
    const forexPatterns = [
      /^(EUR|GBP|USD|JPY|CHF|AUD|NZD|CAD)(EUR|GBP|USD|JPY|CHF|AUD|NZD|CAD)$/i,
      /^[A-Z]{3}\/[A-Z]{3}$/
    ];

    for (const pattern of forexPatterns) {
      if (pattern.test(symbol)) return 'forex';
    }

    // Options patterns
    const optionPatterns = [
      /\d{6}[CP]\d+/i, // Standard OCC format
      /^[A-Z]+\s*\d+[CP]/i
    ];

    for (const pattern of optionPatterns) {
      if (pattern.test(symbol)) return 'options';
    }

    // Futures patterns
    const futuresPatterns = [
      /^(ES|NQ|YM|CL|GC|SI|ZB|ZN|6E|6J)/i, // Common futures symbols
      /[A-Z]+[FGHJKMNQUVXZ]\d{2}$/i // Futures month codes
    ];

    for (const pattern of futuresPatterns) {
      if (pattern.test(symbol)) return 'futures';
    }

    // Default to stocks
    return 'stocks';
  }
}

// ============================================================================
// Parser Registry
// ============================================================================

export const BROKER_REGISTRY: Record<string, BrokerInfo> = {
  'td_ameritrade': {
    id: 'td_ameritrade',
    name: 'TD Ameritrade',
    supportedAssetClasses: ['stocks', 'options'],
    csvFormat: 'custom',
    dateFormat: 'MM/DD/YYYY',
    delimiter: ','
  },
  'interactive_brokers': {
    id: 'interactive_brokers',
    name: 'Interactive Brokers',
    supportedAssetClasses: ['stocks', 'forex', 'futures', 'options'],
    csvFormat: 'custom',
    dateFormat: 'YYYY-MM-DD',
    delimiter: ','
  },
  'metatrader': {
    id: 'metatrader',
    name: 'MetaTrader 4/5',
    supportedAssetClasses: ['forex', 'crypto'],
    csvFormat: 'custom',
    dateFormat: 'YYYY.MM.DD',
    delimiter: '\t'
  },
  'robinhood': {
    id: 'robinhood',
    name: 'Robinhood',
    supportedAssetClasses: ['stocks', 'options', 'crypto'],
    csvFormat: 'custom',
    dateFormat: 'YYYY-MM-DD',
    delimiter: ','
  },
  'webull': {
    id: 'webull',
    name: 'Webull',
    supportedAssetClasses: ['stocks', 'options', 'crypto'],
    csvFormat: 'custom',
    dateFormat: 'MM/DD/YYYY',
    delimiter: ','
  },
  'generic': {
    id: 'generic',
    name: 'Generic CSV',
    supportedAssetClasses: ['crypto', 'stocks', 'forex', 'futures', 'options'],
    csvFormat: 'standard',
    delimiter: ','
  }
};

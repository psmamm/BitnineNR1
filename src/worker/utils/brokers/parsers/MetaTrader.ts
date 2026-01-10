/**
 * MetaTrader 4/5 Parser
 *
 * Parses trade history exports from MetaTrader platforms.
 * Supports forex and CFD trading.
 */

import {
  BrokerParser,
  BrokerInfo,
  ParseResult,
  ParsedTrade
} from '../BrokerInterface';

// ============================================================================
// MetaTrader Parser
// ============================================================================

export class MetaTraderParser extends BrokerParser {
  constructor() {
    super('metatrader', 'MetaTrader 4/5');
  }

  getBrokerInfo(): BrokerInfo {
    return {
      id: 'metatrader',
      name: 'MetaTrader 4/5',
      supportedAssetClasses: ['forex', 'crypto'],
      csvFormat: 'custom',
      dateFormat: 'YYYY.MM.DD',
      delimiter: '\t'
    };
  }

  validate(csvContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // MT4/5 exports can be tab or comma delimited
    const delimiter = this.detectDelimiter(csvContent);
    const { headers, rows } = this.parseCSV(csvContent, delimiter);

    if (headers.length === 0) {
      errors.push('No headers found in export');
      return { valid: false, errors };
    }

    // MetaTrader expected columns
    const expectedColumns = ['symbol', 'type', 'volume', 'open price', 'close price'];
    const headerLower = headers.map(h => h.toLowerCase().trim());

    const missingColumns = expectedColumns.filter(col =>
      !headerLower.some(h => h.includes(col.replace(' ', '')))
    );

    if (missingColumns.length > 2) {
      errors.push(`Missing expected columns. Found: ${headers.join(', ')}`);
    }

    if (rows.length === 0) {
      errors.push('No trade data found');
    }

    return { valid: errors.length === 0, errors };
  }

  async parse(csvContent: string): Promise<ParseResult> {
    const result: ParseResult = {
      success: false,
      trades: [],
      errors: [],
      warnings: [],
      totalRows: 0,
      parsedRows: 0,
      skippedRows: 0
    };

    const delimiter = this.detectDelimiter(csvContent);
    const { headers, rows } = this.parseCSV(csvContent, delimiter);

    // Filter to only closed trades (not balance operations, deposits, etc.)
    const tradeRows = rows.filter(row => {
      const type = this.getColumnValue(row, headers, ['type', 'order type'])?.toLowerCase() || '';
      return type.includes('buy') || type.includes('sell') ||
             type === 'balance' === false; // Exclude balance operations
    });

    result.totalRows = tradeRows.length;

    for (let i = 0; i < tradeRows.length; i++) {
      const row = tradeRows[i];
      const rowNum = i + 2;

      try {
        // Get symbol
        const symbol = this.getColumnValue(row, headers, ['symbol', 'instrument']);

        if (!symbol) {
          result.warnings.push(`Row ${rowNum}: Missing symbol, skipping`);
          result.skippedRows++;
          continue;
        }

        // Get type/side
        const typeStr = this.getColumnValue(row, headers, ['type', 'order type', 'direction']);
        const side = this.parseSide(typeStr);

        if (!side) {
          result.warnings.push(`Row ${rowNum}: Invalid type "${typeStr}", skipping`);
          result.skippedRows++;
          continue;
        }

        // Get volume/lots
        const volumeStr = this.getColumnValue(row, headers, ['volume', 'lots', 'size']);
        const volume = this.parseNumber(volumeStr);

        if (!volume) {
          result.warnings.push(`Row ${rowNum}: Invalid volume "${volumeStr}", skipping`);
          result.skippedRows++;
          continue;
        }

        // Get prices
        const openPriceStr = this.getColumnValue(row, headers, ['open price', 'openprice', 'entry price', 'price']);
        const closePriceStr = this.getColumnValue(row, headers, ['close price', 'closeprice', 'exit price', 's/l', 't/p']);

        const openPrice = this.parseNumber(openPriceStr);
        const closePrice = this.parseNumber(closePriceStr);

        if (!openPrice) {
          result.warnings.push(`Row ${rowNum}: Invalid open price, skipping`);
          result.skippedRows++;
          continue;
        }

        // Get dates
        const openTimeStr = this.getColumnValue(row, headers, ['open time', 'opentime', 'time', 'open date']);
        const closeTimeStr = this.getColumnValue(row, headers, ['close time', 'closetime', 'close date']);

        const entryDate = this.parseMTDate(openTimeStr);
        const exitDate = closeTimeStr ? this.parseMTDate(closeTimeStr) : undefined;

        if (!entryDate) {
          result.warnings.push(`Row ${rowNum}: Invalid open time "${openTimeStr}", skipping`);
          result.skippedRows++;
          continue;
        }

        // Get P&L
        const pnlStr = this.getColumnValue(row, headers, ['profit', 'pnl', 'result', 'net profit']);
        const swapStr = this.getColumnValue(row, headers, ['swap', 'rollover']);
        const commStr = this.getColumnValue(row, headers, ['commission', 'comm']);

        const pnl = this.parseNumber(pnlStr);
        const swap = this.parseNumber(swapStr) || 0;
        const commission = Math.abs(this.parseNumber(commStr) || 0);

        // Get order ticket
        const ticket = this.getColumnValue(row, headers, ['ticket', 'order', 'order id', 'deal']);

        // Get magic number / comment
        const magic = this.getColumnValue(row, headers, ['magic', 'magic number']);
        const comment = this.getColumnValue(row, headers, ['comment', 'note', 'notes']);

        // Determine asset class
        const assetClass = this.determineAssetClass(symbol);

        // Create trade
        const trade: ParsedTrade = {
          externalId: ticket,
          symbol: this.normalizeSymbol(symbol),
          assetClass,
          side,
          quantity: this.lotsToUnits(volume, symbol),
          entryPrice: openPrice,
          exitPrice: closePrice,
          fee: commission + Math.abs(swap),
          feeCurrency: this.getAccountCurrency(row, headers),
          realizedPnl: pnl,
          entryDate,
          exitDate,
          notes: [magic && `Magic: ${magic}`, comment].filter(Boolean).join(' | ') || undefined,
          importSource: 'metatrader',
          rawData: Object.fromEntries(headers.map((h, idx) => [h, row[idx]]))
        };

        result.trades.push(trade);
        result.parsedRows++;

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        result.warnings.push(`Row ${rowNum}: Parse error - ${message}`);
        result.skippedRows++;
      }
    }

    result.success = result.parsedRows > 0;
    return result;
  }

  private detectDelimiter(content: string): string {
    const firstLine = content.split(/\r?\n/)[0];
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;

    if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
    if (semicolonCount > commaCount) return ';';
    return ',';
  }

  private parseMTDate(dateStr: string | undefined): Date | undefined {
    if (!dateStr) return undefined;

    // MT format: "2023.01.15 10:30:00" or "2023.01.15"
    const mtMatch = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})\s*(\d{2})?:?(\d{2})?:?(\d{2})?/);

    if (mtMatch) {
      const [, year, month, day, hour, minute, second] = mtMatch;
      return new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour || '0'),
        parseInt(minute || '0'),
        parseInt(second || '0')
      );
    }

    // Fallback to generic date parsing
    return this.parseDate(dateStr);
  }

  private normalizeSymbol(symbol: string): string {
    // Remove common suffixes (.m, .pro, etc.)
    const normalized = symbol.replace(/\.(m|pro|mini|ecn|raw|std)$/i, '');

    // Format forex pairs
    if (normalized.length === 6 && !normalized.includes('/')) {
      return `${normalized.slice(0, 3)}/${normalized.slice(3)}`.toUpperCase();
    }

    return normalized.toUpperCase();
  }

  private lotsToUnits(lots: number, symbol: string): number {
    // Standard forex lot = 100,000 units
    // Mini lot = 10,000 units
    // Micro lot = 1,000 units

    const sym = symbol.toUpperCase();

    // Forex pairs
    if (this.determineAssetClass(sym) === 'forex') {
      return lots * 100000;
    }

    // Indices (typically $1-10 per point)
    if (['US30', 'US500', 'NAS100', 'DAX30', 'FTSE100', 'DJ30', 'SPX500'].some(i => sym.includes(i))) {
      return lots;
    }

    // Gold/Silver
    if (sym.includes('XAU') || sym.includes('GOLD')) {
      return lots * 100; // 1 lot = 100 oz
    }

    if (sym.includes('XAG') || sym.includes('SILVER')) {
      return lots * 5000; // 1 lot = 5000 oz
    }

    // Crypto
    if (this.determineAssetClass(sym) === 'crypto') {
      return lots; // Usually 1:1 for crypto CFDs
    }

    // Default
    return lots;
  }

  private getAccountCurrency(row: string[], headers: string[]): string {
    // Try to find account currency in the data
    const currency = this.getColumnValue(row, headers, ['currency', 'account currency']);
    return currency?.toUpperCase() || 'USD';
  }
}

// ============================================================================
// Export Factory
// ============================================================================

export function createMetaTraderParser(): MetaTraderParser {
  return new MetaTraderParser();
}

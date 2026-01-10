/**
 * Generic CSV Parser
 *
 * Flexible CSV parser with configurable column mappings.
 * Use this when the broker is not explicitly supported.
 */

import {
  BrokerParser,
  BrokerInfo,
  ParseResult,
  ParsedTrade,
  ColumnMapping,
  TradeSide
} from '../BrokerInterface';

// ============================================================================
// Generic CSV Parser
// ============================================================================

export interface GenericCSVOptions {
  delimiter?: string;
  skipRows?: number;
  dateFormat?: string;
  columnMapping: ColumnMapping;
  assetClass?: 'crypto' | 'stocks' | 'forex' | 'futures' | 'options';
}

const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  symbol: ['symbol', 'ticker', 'instrument', 'asset', 'pair', 'market'],
  side: ['side', 'type', 'direction', 'action', 'trade_type'],
  quantity: ['quantity', 'qty', 'size', 'amount', 'volume', 'shares'],
  price: ['price', 'entry_price', 'fill_price', 'avg_price', 'execution_price'],
  exitPrice: ['exit_price', 'close_price', 'sell_price'],
  date: ['date', 'time', 'datetime', 'timestamp', 'executed_at', 'trade_date'],
  exitDate: ['exit_date', 'close_date', 'closed_at'],
  fee: ['fee', 'commission', 'fees', 'commissions', 'cost'],
  pnl: ['pnl', 'profit', 'pl', 'realized_pnl', 'net_pnl', 'gain_loss'],
  orderId: ['order_id', 'trade_id', 'id', 'execution_id'],
  orderType: ['order_type', 'type'],
  notes: ['notes', 'comment', 'comments', 'description']
};

export class GenericCSVParser extends BrokerParser {
  private options: GenericCSVOptions;

  constructor(options?: Partial<GenericCSVOptions>) {
    super('generic', 'Generic CSV');
    this.options = {
      delimiter: options?.delimiter ?? ',',
      skipRows: options?.skipRows ?? 0,
      dateFormat: options?.dateFormat,
      columnMapping: { ...DEFAULT_COLUMN_MAPPING, ...options?.columnMapping },
      assetClass: options?.assetClass
    };
  }

  getBrokerInfo(): BrokerInfo {
    return {
      id: 'generic',
      name: 'Generic CSV',
      supportedAssetClasses: ['crypto', 'stocks', 'forex', 'futures', 'options'],
      csvFormat: 'standard',
      delimiter: this.options.delimiter
    };
  }

  validate(csvContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const { headers, rows } = this.parseCSV(
      csvContent,
      this.options.delimiter,
      this.options.skipRows
    );

    if (headers.length === 0) {
      errors.push('No headers found in CSV');
      return { valid: false, errors };
    }

    if (rows.length === 0) {
      errors.push('No data rows found in CSV');
      return { valid: false, errors };
    }

    // Check for required columns
    const mapping = this.options.columnMapping;
    const headerLower = headers.map(h => h.toLowerCase().trim());

    const checkColumn = (names: string | string[], label: string) => {
      const nameList = Array.isArray(names) ? names : [names];
      const found = nameList.some(n => headerLower.includes(n.toLowerCase()));
      if (!found) {
        errors.push(`Missing required column: ${label} (expected: ${nameList.join(', ')})`);
      }
    };

    checkColumn(mapping.symbol, 'Symbol');
    checkColumn(mapping.quantity, 'Quantity');
    checkColumn(mapping.price, 'Price');
    checkColumn(mapping.date, 'Date');

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

    // Validate first
    const validation = this.validate(csvContent);
    if (!validation.valid) {
      result.errors = validation.errors;
      return result;
    }

    const { headers, rows } = this.parseCSV(
      csvContent,
      this.options.delimiter,
      this.options.skipRows
    );

    result.totalRows = rows.length;
    const mapping = this.options.columnMapping;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2 + (this.options.skipRows || 0); // +2 for 1-indexed and header

      try {
        // Get values
        const symbol = this.getColumnValue(row, headers, mapping.symbol);
        const sideStr = this.getColumnValue(row, headers, mapping.side);
        const quantityStr = this.getColumnValue(row, headers, mapping.quantity);
        const priceStr = this.getColumnValue(row, headers, mapping.price);
        const dateStr = this.getColumnValue(row, headers, mapping.date);

        // Validate required fields
        if (!symbol) {
          result.warnings.push(`Row ${rowNum}: Missing symbol, skipping`);
          result.skippedRows++;
          continue;
        }

        const quantity = this.parseNumber(quantityStr);
        if (quantity === undefined || quantity === 0) {
          result.warnings.push(`Row ${rowNum}: Invalid quantity "${quantityStr}", skipping`);
          result.skippedRows++;
          continue;
        }

        const price = this.parseNumber(priceStr);
        if (price === undefined) {
          result.warnings.push(`Row ${rowNum}: Invalid price "${priceStr}", skipping`);
          result.skippedRows++;
          continue;
        }

        const entryDate = this.parseDate(dateStr);
        if (!entryDate) {
          result.warnings.push(`Row ${rowNum}: Invalid date "${dateStr}", skipping`);
          result.skippedRows++;
          continue;
        }

        // Parse optional fields
        const side = this.parseSide(sideStr) || this.inferSide(row, headers);
        const exitPriceStr = mapping.exitPrice ? this.getColumnValue(row, headers, mapping.exitPrice) : undefined;
        const exitDateStr = mapping.exitDate ? this.getColumnValue(row, headers, mapping.exitDate) : undefined;
        const feeStr = mapping.fee ? this.getColumnValue(row, headers, mapping.fee) : undefined;
        const pnlStr = mapping.pnl ? this.getColumnValue(row, headers, mapping.pnl) : undefined;
        const orderId = mapping.orderId ? this.getColumnValue(row, headers, mapping.orderId) : undefined;
        const orderType = mapping.orderType ? this.getColumnValue(row, headers, mapping.orderType) : undefined;
        const notes = mapping.notes ? this.getColumnValue(row, headers, mapping.notes) : undefined;

        // Create trade
        const trade: ParsedTrade = {
          externalId: orderId,
          symbol: symbol.toUpperCase(),
          assetClass: this.options.assetClass || this.determineAssetClass(symbol),
          side: side || 'buy',
          quantity: Math.abs(quantity),
          entryPrice: price,
          exitPrice: this.parseNumber(exitPriceStr),
          fee: this.parseNumber(feeStr),
          realizedPnl: this.parseNumber(pnlStr),
          entryDate,
          exitDate: this.parseDate(exitDateStr),
          orderType,
          notes,
          importSource: 'generic_csv',
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

    if (result.parsedRows === 0 && result.totalRows > 0) {
      result.errors.push('Failed to parse any trades from CSV');
    }

    return result;
  }

  private inferSide(row: string[], headers: string[]): TradeSide | undefined {
    // Try to infer side from quantity sign
    const quantityStr = this.getColumnValue(row, headers, this.options.columnMapping.quantity);
    if (quantityStr) {
      const num = this.parseNumber(quantityStr);
      if (num !== undefined && num < 0) {
        return 'sell';
      }
    }

    // Try to infer from P&L and prices
    const pnlStr = this.options.columnMapping.pnl
      ? this.getColumnValue(row, headers, this.options.columnMapping.pnl)
      : undefined;

    if (pnlStr) {
      // If P&L exists, this is likely a closed trade
      return undefined; // Can't determine from P&L alone
    }

    return undefined;
  }

  /**
   * Update column mapping for custom formats
   */
  setColumnMapping(mapping: Partial<ColumnMapping>): void {
    this.options.columnMapping = { ...this.options.columnMapping, ...mapping };
  }
}

// ============================================================================
// Export Factory
// ============================================================================

export function createGenericParser(options?: Partial<GenericCSVOptions>): GenericCSVParser {
  return new GenericCSVParser(options);
}
